import { Clock, XCircle, ArrowUpDown, ArrowDown, ArrowUp, Network, Search, AlertTriangle, ShieldAlert, Activity, ShieldBan, ChevronLeft, ChevronRight, MessageSquare, User, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "../../components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useEffect, useState, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HexViewer } from "./HexViewer";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useUser } from "@clerk/react";

interface AlertData {
  id: number;
  timestamp: string;
  impact_score: number;
  severity: string;
  port: string;
  protocol: string;
  info: string;
  payload: string;
  src_country: string;
  dst_country: string;
  src_ip: string;
}

interface TelemetryStats {
  total_alerts: number;
  last_24h_alerts: number;
}

const Monitoring = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<TelemetryStats>({ total_alerts: 0, last_24h_alerts: 0 });
  // ⚡ Bolt Optimization: Buffer high-frequency incoming alerts to avoid excessive synchronous re-renders
  const alertsBufferRef = useRef<AlertData[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { user } = useUser();
  const [comments, setComments] = useState<{user: string, text: string, time: string}[]>([]);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState("Open");

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      { user: user?.firstName || "Analyst", text: newComment, time: new Date().toLocaleTimeString() }
    ]);
    setNewComment("");
  };

  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [showOnlyStarred, setShowOnlyStarred] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [severityFilter, searchQuery, showOnlyStarred]);

  const handleBlockIp = async (ip: string) => {
    try {
      await invoke("block_ip", { ip, reason: "Manual Block from Suspicious Traffic" });
      toast.success(`Successfully blocked IP: ${ip}`, {
        description: "Active IPS rules updated. Traffic from this IP will now be dropped."
      });
    } catch (error) {
      toast.error(`Failed to block IP: ${ip}`, {
        description: String(error)
      });
    }
  };

  const filteredAlerts = useMemo(() => {
    // ⚡ Bolt Optimization: Pre-compute static search term to prevent redundant string operations inside the filter loop
    const lowerSearchQuery = searchQuery.toLowerCase();
    return alerts.filter(a => {
      const matchSeverity = severityFilter === "All" || a.severity === severityFilter;
      const matchStarred = !showOnlyStarred;
      const matchSearch = searchQuery === "" || 
                          (a.src_ip && a.src_ip.includes(searchQuery)) || 
                          (a.info && a.info.toLowerCase().includes(lowerSearchQuery));
      return matchSeverity && matchStarred && matchSearch;
    });
  }, [alerts, severityFilter, showOnlyStarred, searchQuery]);

  const sortedAlerts = useMemo(() => {
    const sortableAlerts = [...filteredAlerts];
    if (sortConfig !== null) {
      sortableAlerts.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        switch (sortConfig.key) {
          case "Impact Score":
            aValue = a.impact_score;
            bValue = b.impact_score;
            break;
          case "Severity":
            const sevMap: Record<string, number> = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };
            aValue = sevMap[a.severity] || 0;
            bValue = sevMap[b.severity] || 0;
            break;
          case "Timestamp":
            aValue = new Date(a.timestamp).getTime();
            bValue = new Date(b.timestamp).getTime();
            break;
          case "Port":
            aValue = parseInt(a.port) || 0;
            bValue = parseInt(b.port) || 0;
            break;
          case "Protocol":
            aValue = a.protocol;
            bValue = b.protocol;
            break;
          case "Info":
            aValue = a.info;
            bValue = b.info;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableAlerts;
  }, [filteredAlerts, sortConfig]);

  const totalPages = Math.ceil(sortedAlerts.length / itemsPerPage);

  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAlerts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAlerts, currentPage, itemsPerPage]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-3 w-3" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3" />
    );
  };

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const histAlerts: AlertData[] = await invoke("get_alerts");
        setAlerts(histAlerts);
        
        const histStats: TelemetryStats = await invoke("get_telemetry_stats");
        setStats(histStats);
      } catch (e) {
        console.error("Failed to fetch telemetry", e);
      }
    };
    fetchTelemetry();

    const setupListener = async () => {
      const unlisten = await listen<AlertData>("intrusion-alert", (event) => {
          alertsBufferRef.current.push(event.payload);
        alertsBufferRef.current.push(event.payload);
      });
      return unlisten;
    };
    
    let unlistenFn: (() => void) | undefined;
    setupListener().then(fn => unlistenFn = fn);

    // ⚡ Bolt Optimization: Batch process high-frequency alert updates via interval
    // This prevents main thread blocking on rapid sequential updates
    const flushInterval = setInterval(() => {
      if (alertsBufferRef.current.length > 0) {
        const newAlerts = [...alertsBufferRef.current];
        alertsBufferRef.current = [];

        setAlerts((prev) => {
          const merged = [...newAlerts.reverse(), ...prev];
          return merged.slice(0, 500);
        });

        setStats((prev) => ({
          total_alerts: prev.total_alerts + newAlerts.length,
          last_24h_alerts: prev.last_24h_alerts + newAlerts.length
        }));
      }
    }, 1000);

    return () => {
      if (unlistenFn) unlistenFn();
      clearInterval(flushInterval);
    };
  }, []);

  const getImpactColor = (impact: number) => {
    if (impact >= 8) return "bg-destructive text-white";
    if (impact >= 6) return "bg-orange-500 text-white";
    if (impact >= 4) return "bg-yellow-500 text-black";
    return "bg-blue-500 text-white";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-destructive text-white";
      case "High": return "bg-orange-500 text-white";
      case "Medium": return "bg-yellow-500 text-black";
      default: return "bg-blue-500 text-white";
    }
  };

  const getRowGlowColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "hover:bg-destructive/10 border-l-2 border-l-destructive";
      case "High": return "hover:bg-orange-500/10 border-l-2 border-l-orange-500";
      case "Medium": return "hover:bg-yellow-500/10 border-l-2 border-l-yellow-500";
      default: return "hover:bg-blue-500/10 border-l-2 border-l-transparent";
    }
  };

  // Recharts Data Processing
  const severityCounts = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alerts.forEach(a => {
      if (counts[a.severity as keyof typeof counts] !== undefined) {
        counts[a.severity as keyof typeof counts]++;
      }
    });
    return [
      { name: "Critical", value: counts.Critical, color: "#ef4444" },
      { name: "High", value: counts.High, color: "#f97316" },
      { name: "Medium", value: counts.Medium, color: "#eab308" },
      { name: "Low", value: counts.Low, color: "#3b82f6" }
    ].filter(d => d.value > 0);
  }, [alerts]);

  // ⚡ Bolt Optimization: Memoize criticalCount calculation to prevent unnecessary O(n) array filter on every render.
  const criticalCount = useMemo(() => {
    const criticalData = severityCounts.find(s => s.name === "Critical");
    return criticalData ? criticalData.value : 0;
  }, [severityCounts]);

  return (
    <div className="flex flex-col gap-6 p-4 h-full w-full bg-background overflow-hidden">
      
      {/* Hero Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Intrusions</CardTitle>
            <ShieldAlert className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_alerts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time events captured</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 24 Hours</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.last_24h_alerts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent suspicious activity</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {criticalCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm flex items-center justify-center h-full p-0">
          {severityCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie
                  data={severityCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {severityCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted-foreground flex flex-col items-center">
              <Activity className="h-6 w-6 mb-2 opacity-20" />
              No Data Available
            </div>
          )}
        </Card>
      </div>

      {/* Main Table Section */}
      <div className="flex-1 border border-border/50 rounded-xl bg-card/30 backdrop-blur shadow-sm overflow-hidden flex flex-col relative min-h-0">
        
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-border/50 bg-muted/20">
          <Tabs value={severityFilter} onValueChange={setSeverityFilter} className="w-full sm:w-auto">
            <TabsList className="bg-background/50 border border-border/50">
              <TabsTrigger value="All" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="Critical" className="text-xs data-[state=active]:bg-destructive data-[state=active]:text-white">Critical</TabsTrigger>
              <TabsTrigger value="High" className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white">High</TabsTrigger>
              <TabsTrigger value="Medium" className="text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black">Medium</TabsTrigger>
              <TabsTrigger value="Low" className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white">Low</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Search IPs or payloads..." 
                className="w-full sm:w-64 pl-8 h-8 text-xs bg-background/50 border-border/50 focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2 border-l border-border/50 pl-3">
              <Switch id="starred-mode" checked={showOnlyStarred} onCheckedChange={setShowOnlyStarred} className="scale-75 origin-center" />
              <Label htmlFor="starred-mode" className="text-xs cursor-pointer select-none text-muted-foreground">Starred</Label>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead 
                  className="flex gap-3 items-center text-center cursor-pointer select-none h-10 py-2"
                  onClick={() => requestSort("Impact Score")}
                >
                  <div className="flex items-center font-semibold">Impact {renderSortIcon("Impact Score")}</div>
                </TableHead>
                <TableHead className="cursor-pointer select-none font-semibold h-10 py-2" onClick={() => requestSort("Severity")}>
                  <div className="flex items-center">Severity {renderSortIcon("Severity")}</div>
                </TableHead>
                <TableHead className="cursor-pointer select-none font-semibold h-10 py-2" onClick={() => requestSort("Timestamp")}>
                  <div className="flex items-center">Timestamp {renderSortIcon("Timestamp")}</div>
                </TableHead>
                <TableHead className="font-semibold h-10 py-2">Source IP</TableHead>
                <TableHead className="cursor-pointer select-none font-semibold h-10 py-2" onClick={() => requestSort("Port")}>
                  <div className="flex items-center">Port {renderSortIcon("Port")}</div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none font-semibold h-10 py-2" onClick={() => requestSort("Protocol")}>
                  <div className="flex items-center justify-end">Protocol {renderSortIcon("Protocol")}</div>
                </TableHead>
                <TableHead className="cursor-pointer select-none font-semibold h-10 py-2" onClick={() => requestSort("Info")}>
                  <div className="flex items-center">Info {renderSortIcon("Info")}</div>
                </TableHead>
                <TableHead className="text-right font-semibold h-10 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="group/tbody">
              {sortedAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground border-border/50">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldBan className="h-8 w-8 mb-2 opacity-20" />
                      <p>No intrusion attempts found matching criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAlerts.map((item) => (
                  <TableRow 
                    key={item.id} 
                    onClick={() => setSelectedAlert(item)} 
                    className={`group cursor-pointer transition-colors duration-200 border-border/50 ${getRowGlowColor(item.severity)}`}
                  >
                    <TableCell className="font-medium w-24">
                      <Badge variant="outline" className={`rounded font-mono border-0 shadow-sm ${getImpactColor(item.impact_score)}`}>
                        {item.impact_score.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider rounded font-bold border-0 shadow-sm ${getSeverityColor(item.severity)}`}>
                        {item.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{item.src_ip || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.port}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{item.protocol}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px] font-medium">
                      {item.info || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); if(item.src_ip) handleBlockIp(item.src_ip); }}>
                                <ShieldBan className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Block Source IP</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/50 bg-muted/10 text-xs">
          <div className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{sortedAlerts.length > 0 ? Math.min((currentPage - 1) * itemsPerPage + 1, sortedAlerts.length) : 0}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, sortedAlerts.length)}</span> of{" "}
            <span className="font-semibold text-foreground">{sortedAlerts.length}</span> alerts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsisBefore && <span className="px-2 text-muted-foreground">...</span>}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-out Sheet for Alert Details */}
      <Sheet open={selectedAlert !== null} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto w-[90vw] border-l border-border/50 p-0 bg-background/95 backdrop-blur-xl shadow-2xl [&>button]:hidden">
          {selectedAlert && (
            <div className="flex flex-col h-full relative">
              {/* Sheet Header with Gradient */}
              <div className="relative p-6 border-b border-border/50 overflow-hidden">
                <div className={`absolute inset-0 opacity-10 ${getSeverityColor(selectedAlert.severity)}`} />
                <div className="relative flex justify-between items-start">
                  <div>
                    <Badge className={`mb-3 border-0 shadow-sm ${getSeverityColor(selectedAlert.severity)}`}>
                      {selectedAlert.severity} Alert
                    </Badge>
                    <SheetTitle className="text-xl font-bold tracking-tight">Threat Details</SheetTitle>
                    <SheetDescription className="text-xs font-mono mt-1 opacity-80">
                      Event ID: #{selectedAlert.id} | {selectedAlert.timestamp}
                    </SheetDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50" onClick={() => setSelectedAlert(null)}>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Sheet Content */}
              <div className="p-6 flex-1 space-y-6">
                
                {/* Critical Action Bar */}
                <div className="flex gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Source Origin</span>
                    <span className="font-mono text-sm font-bold text-foreground">{selectedAlert.src_ip}</span>
                  </div>
                  <Button size="sm" variant="destructive" className="shadow-sm font-semibold" onClick={() => handleBlockIp(selectedAlert.src_ip)}>
                    <ShieldBan className="h-3.5 w-3.5 mr-2" />
                    Block Origin
                  </Button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1.5 bg-muted/10 p-3 rounded-md border border-border/30">
                    <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Protocol</span>
                    <div className="font-mono text-foreground">{selectedAlert.protocol}</div>
                  </div>
                  <div className="space-y-1.5 bg-muted/10 p-3 rounded-md border border-border/30">
                    <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Target Port</span>
                    <div className="font-mono text-foreground">{selectedAlert.port}</div>
                  </div>
                  <div className="space-y-1.5 bg-muted/10 p-3 rounded-md border border-border/30">
                    <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Impact Score</span>
                    <div>
                      <Badge variant="outline" className={`border-0 shadow-sm ${getImpactColor(selectedAlert.impact_score)}`}>
                        {selectedAlert.impact_score.toFixed(1)} / 10
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 bg-muted/10 p-3 rounded-md border border-border/30">
                    <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Geo Origin</span>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      {selectedAlert.src_country === "LOCAL" ? (
                        <div className="flex items-center gap-1.5 text-blue-500">
                          <Network className="h-3.5 w-3.5" /> Local
                        </div>
                      ) : selectedAlert.src_country && selectedAlert.src_country !== "MOCK" ? (
                        <>
                          <img 
                            src={`https://flagcdn.com/16x12/${selectedAlert.src_country.toLowerCase()}.png`} 
                            alt={selectedAlert.src_country} 
                            className="h-3 w-4 rounded-sm shadow-sm" 
                          /> 
                          {selectedAlert.src_country}
                        </>
                      ) : selectedAlert.src_country === "MOCK" ? (
                        "Dev Simulation"
                      ) : "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Detection Info</span>
                  <div className="bg-muted/20 p-3 rounded-md text-sm border border-border/50 leading-relaxed text-foreground shadow-inner">
                    {selectedAlert.info}
                  </div>
                </div>

                {/* Hex Payload Viewer */}
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                      Packet Payload <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted">RAW HEX</Badge>
                    </span>
                  </div>
                  <div className="border border-border/50 rounded-md overflow-hidden bg-black/60 shadow-inner">
                    <HexViewer payloadHex={selectedAlert.payload || ""} />
                  </div>
                </div>

                {/* Status Controls */}
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={status === "Open" ? "default" : "outline"}
                      onClick={() => setStatus("Open")}
                    >
                      Open
                    </Button>
                    <Button 
                      size="sm" 
                      variant={status === "Investigating" ? "secondary" : "outline"}
                      onClick={() => setStatus("Investigating")}
                    >
                      Investigating
                    </Button>
                    <Button 
                      size="sm" 
                      variant={status === "Resolved" ? "default" : "outline"}
                      className={status === "Resolved" ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => setStatus("Resolved")}
                    >
                      <CheckCircle2 className="size-4 mr-1" /> Resolved
                    </Button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t border-border/50 pt-4 pb-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="size-4" /> Investigation Notes
                  </h3>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-4">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No notes added yet.</p>
                    ) : (
                      comments.map((c, i) => (
                        <div key={i} className="flex gap-3 bg-muted/30 p-3 rounded-lg">
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="size-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{c.user}</span>
                              <span className="text-xs text-muted-foreground">{c.time}</span>
                            </div>
                            <p className="text-sm">{c.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input 
                      value={newComment} 
                      onChange={(e) => setNewComment(e.target.value)} 
                      placeholder="Add a note..." 
                    />
                    <Button type="submit" size="sm">Post</Button>
                  </form>
                </div>

              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default Monitoring;
