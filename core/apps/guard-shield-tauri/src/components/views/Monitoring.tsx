import { Clock, Info, ShieldBan, Eye, XCircle, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HexViewer } from "./HexViewer";

interface AlertData {
  id: number;
  timestamp: string;
  impact_score: number;
  severity: string;
  port: string;
  protocol: string;
  info: string;
  payload: string;
}

interface TelemetryStats {
  total_alerts: number;
  last_24h_alerts: number;
}

const Monitoring = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<TelemetryStats>({ total_alerts: 0, last_24h_alerts: 0 });
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [showOnlyStarred, setShowOnlyStarred] = useState<boolean>(false);
  const [starredAlertIds, setStarredAlertIds] = useState<Set<number>>(new Set());

  const [showDevModal, setShowDevModal] = useState<boolean>(false);
  const [devSeverity, setDevSeverity] = useState<string>("Critical");
  const [devImpact, setDevImpact] = useState<number>(9.5);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const filteredAlerts = (severityFilter === "All" 
    ? alerts 
    : alerts.filter(a => a.severity === severityFilter))
    .filter(a => !showOnlyStarred || starredAlertIds.has(a.id));

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
          setAlerts((prev) => [event.payload, ...prev].slice(0, 100));
          setStats((prev) => ({
              total_alerts: prev.total_alerts + 1,
              last_24h_alerts: prev.last_24h_alerts + 1
          }));
      });
      return unlisten;
    };
    
    let unlistenFn: (() => void) | undefined;
    setupListener().then(fn => unlistenFn = fn);

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);



  const getImpactColor = (impact: number) => {
    if (impact >= 8) return "bg-destructive text-white";
    if (impact >= 6) return "bg-chart-5 text-primary-foreground";
    if (impact >= 4) return "bg-chart-4 text-primary-foreground";
    return "bg-chart-2 text-white";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-destructive text-white";
      case "High": return "bg-chart-5 text-primary-foreground";
      case "Medium": return "bg-chart-4 text-primary-foreground";
      default: return "bg-chart-2 text-white";
    }
  };

  return (
    <div className="border rounded-md p-4">
      <div className="text-sm font-semibold tracking-widest flex gap-12 items-center">
        INTRUSION ATTEMPTS
        <span className="flex gap-12 font-normal tracking-normal text-muted-foreground">
          Total : {stats.total_alerts}{" "}
          <span className="flex gap-3 items-center">
            <Clock className="size-4" />
            24 Hrs. : {stats.last_24h_alerts}
          </span>
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2 my-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter:</span>
          {["All", "Critical", "High", "Medium", "Low"].map((level) => (
            <button
              key={level}
              onClick={() => setSeverityFilter(level)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                severityFilter === level
                  ? level === "Critical" ? "bg-destructive text-white"
                    : level === "High" ? "bg-chart-5 text-primary-foreground"
                    : level === "Medium" ? "bg-chart-4 text-primary-foreground"
                    : level === "Low" ? "bg-chart-2 text-white"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {level}
            </button>
          ))}
          <div className="flex items-center space-x-2 border-l pl-4 border-border/50 ml-2">
            <Switch id="starred-mode" checked={showOnlyStarred} onCheckedChange={setShowOnlyStarred} />
            <Label htmlFor="starred-mode" className="text-xs cursor-pointer select-none">Show Starred</Label>
          </div>
          <div className="flex-1"></div>
          <Button variant="outline" size="sm" onClick={() => setShowDevModal(true)} className="gap-2 text-xs h-7 border-dashed">
            <ShieldBan className="size-3" />
            Simulate Alert (Dev)
          </Button>
        </div>
        <ScrollArea className="h-52">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="flex gap-3 items-center text-center cursor-pointer hover:bg-muted/60 transition-colors select-none"
                  onClick={() => requestSort("Impact Score")}
                >
                  <div className="flex items-center">
                    Impact Score {renderSortIcon("Impact Score")}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="text-blue-500 size-4 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-72">
                          Impact Score represents the calculated risk or potential effect of an intrusion attempt, based on various factors associated with each unique ID. It is distinct from Severity, which categorizes the overall threat level.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors select-none" onClick={() => requestSort("Severity")}>
                  <div className="flex items-center">Severity {renderSortIcon("Severity")}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors select-none" onClick={() => requestSort("Timestamp")}>
                  <div className="flex items-center">Timestamp {renderSortIcon("Timestamp")}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors select-none" onClick={() => requestSort("Port")}>
                  <div className="flex items-center">Port {renderSortIcon("Port")}</div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/60 transition-colors select-none" onClick={() => requestSort("Protocol")}>
                  <div className="flex items-center justify-end">Protocol {renderSortIcon("Protocol")}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors select-none" onClick={() => requestSort("Info")}>
                  <div className="flex items-center">Info {renderSortIcon("Info")}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No intrusion attempts detected.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAlerts.map((item) => (
                  <TableRow key={item.id} onClick={() => setSelectedAlert(item)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium w-[25%]">
                      <Badge className={`rounded-sm px-2 text-md ${getImpactColor(item.impact_score)}`}>
                        {item.impact_score.toFixed(1)}
                      </Badge>
                      <span className="ml-2 text-xs text-muted-foreground">ID: {item.id}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-md rounded-sm text-center ${getSeverityColor(item.severity)}`}>
                        {item.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "—"}
                    </TableCell>
                    <TableCell>{item.port}</TableCell>
                    <TableCell className="text-right">{item.protocol}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {item.info || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1 rounded hover:bg-accent transition-colors cursor-pointer">
                                <ShieldBan className="size-3.5 text-destructive" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Block Source IP</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1 rounded hover:bg-accent transition-colors cursor-pointer">
                                <Eye className="size-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">View Details</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1 rounded hover:bg-accent transition-colors cursor-pointer">
                                <XCircle className="size-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">False Positive</p></TooltipContent>
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
      </div>

      <Dialog open={selectedAlert !== null} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Alert Details
              {selectedAlert && (
                <Badge className={`${getSeverityColor(selectedAlert.severity)} mr-6`}>
                  {selectedAlert.severity}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (() => {
            const isStarred = starredAlertIds.has(selectedAlert.id);
            return (
              <div className="grid gap-4 py-4 text-sm">
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold text-muted-foreground">ID</span>
                  <span className="col-span-3">#{selectedAlert.id}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold text-muted-foreground">Timestamp</span>
                  <span className="col-span-3">{selectedAlert.timestamp}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold text-muted-foreground">Protocol</span>
                  <span className="col-span-3">{selectedAlert.protocol}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold text-muted-foreground">Port</span>
                  <span className="col-span-3">{selectedAlert.port}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold text-muted-foreground flex items-center gap-2">
                    Impact
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="size-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px] text-xs">Score indicating the potential risk level.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="col-span-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getImpactColor(selectedAlert.impact_score)}`}>
                      {selectedAlert.impact_score.toFixed(1)}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="font-semibold text-muted-foreground mt-1">Info</span>
                  <div className="col-span-3 bg-muted p-3 rounded-md border font-mono text-xs break-all">
                    {selectedAlert.info}
                  </div>
                </div>

                {selectedAlert.payload && (
                  <div className="mt-4">
                    <span className="font-semibold text-muted-foreground mb-2 block">Deep Packet Inspection (DPI)</span>
                    <HexViewer payloadHex={selectedAlert.payload} />
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedAlert(null)}>Close</Button>
                  <Button 
                    variant={isStarred ? "destructive" : "default"}
                    onClick={() => {
                      setStarredAlertIds(prev => {
                        const newSet = new Set(prev);
                        if (isStarred) {
                          newSet.delete(selectedAlert.id);
                        } else {
                          newSet.add(selectedAlert.id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    {isStarred ? "Unstar Alert" : "Star / Flag Alert"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showDevModal} onOpenChange={setShowDevModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dev Options: Test Alert</DialogTitle>
            <DialogDescription>
              Simulate an incoming intrusion alert with a custom severity and impact score.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="severity">Severity</Label>
              <select 
                id="severity" 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={devSeverity}
                onChange={(e) => setDevSeverity(e.target.value)}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="impact">Impact Score (0.0 - 10.0)</Label>
              <Input
                id="impact"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={devImpact}
                onChange={(e) => setDevImpact(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDevModal(false)}>Cancel</Button>
            <Button onClick={() => {
              invoke("trigger_mock_alert", { severity: devSeverity, impact: devImpact }).catch(console.error);
              setShowDevModal(false);
            }}>Send Alert</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Monitoring;
