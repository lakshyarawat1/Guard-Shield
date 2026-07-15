import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import IncidentPanel from "./IncidentPanel";
import { Button } from "../../components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  ShieldAlert, 
  Activity, 
  ShieldBan,
  Clock
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

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

export default function SuspiciousTraffic() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);

  // Fetch initial alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const histAlerts: AlertData[] = await invoke("get_alerts");
        // Pre-filter for Suspicious Dashboard
        setAlerts(histAlerts.filter(a => a.severity === "Critical" || a.severity === "High"));
      } catch (e) {
        console.error("Failed to fetch alerts", e);
      }
    };
    fetchAlerts();

    let unlistenFn: (() => void) | undefined;
    let alertBuffer: AlertData[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const setupListener = async () => {
      const unlisten = await listen<AlertData>("intrusion-alert", (event) => {
        if (event.payload.severity === "Critical" || event.payload.severity === "High") {
          alertBuffer.push(event.payload);

          if (!timeoutId) {
            timeoutId = setTimeout(() => {
              const pendingAlerts = [...alertBuffer];
              alertBuffer = [];

              setAlerts((prev) => [...pendingAlerts.reverse(), ...prev].slice(0, 500));
              timeoutId = null;
            }, 500); // ⚡ Bolt: Throttle React state updates to 2fps for better performance during high-frequency alerts
          }
        }
      });
      return unlisten;
    };
    
    setupListener().then(fn => unlistenFn = fn);

    return () => {
      if (unlistenFn) unlistenFn();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Aggregation for Visualizations
  const { topIps, topPorts, threatTypes } = useMemo(() => {
    const ipCounts: Record<string, number> = {};
    const portCounts: Record<string, number> = {};
    const threatCounts: Record<string, number> = {};

    alerts.forEach(a => {
      if (a.src_ip) {
        ipCounts[a.src_ip] = (ipCounts[a.src_ip] || 0) + 1;
      }
      if (a.port && a.port !== "N/A") {
        portCounts[a.port] = (portCounts[a.port] || 0) + 1;
      }
      if (a.info) {
        const key = a.info.includes("SQL") ? "SQLi" 
                  : a.info.includes("Travers") ? "Directory Traversal"
                  : a.info.includes("Code Exec") ? "RCE"
                  : a.info.includes("XSS") ? "XSS"
                  : a.info;
        threatCounts[key] = (threatCounts[key] || 0) + 1;
      }
    });

    const formatData = (obj: Record<string, number>, limit: number) => 
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);

    return {
      topIps: formatData(ipCounts, 5),
      topPorts: formatData(portCounts, 5),
      threatTypes: formatData(threatCounts, 5)
    };
  }, [alerts]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

  const getImpactColor = (impact: number) => {
    if (impact >= 8) return "bg-destructive text-white";
    if (impact >= 6) return "bg-orange-500 text-white";
    return "bg-yellow-500 text-black";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "Critical") return "bg-destructive text-white";
    return "bg-orange-500 text-white";
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-col h-[calc(100vh-50px)]">
        <Infobar />
        <div className="flex h-full w-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 relative overflow-y-auto overflow-x-hidden bg-muted/10 flex flex-col p-4 gap-6">
            
            <div className="flex items-center gap-2 px-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <h1 className="text-2xl font-bold tracking-tight">Threat Analysis Dashboard</h1>
            </div>

            {/* Dashboard Visualizations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              {/* Top Attacker IPs */}
              <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm relative overflow-hidden h-64">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Top Attacker IPs
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                  {topIps.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topIps} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <RechartsTooltip 
                          cursor={{fill: 'var(--muted)'}} 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-sm">No critical data</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Targeted Ports */}
              <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm relative overflow-hidden h-64">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Top Targeted Ports
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                  {topPorts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topPorts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <RechartsTooltip 
                          cursor={{fill: 'var(--muted)'}} 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-sm">No critical data</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Threat Breakdown */}
              <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm relative overflow-hidden h-64">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-400"></div>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Threat Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[190px]">
                  {threatTypes.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={threatTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {threatTypes.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-sm">No critical data</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* High-Severity Alert Stream Table */}
            <div className="flex-1 min-h-[300px] border border-border/50 rounded-xl bg-card/30 backdrop-blur shadow-sm overflow-hidden flex flex-col relative">
              <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldBan className="h-4 w-4 text-destructive" />
                  Recent High-Severity Events
                </h2>
                <Badge variant="outline" className="text-xs bg-background/50">{alerts.length} Events Logged</Badge>
              </div>
              
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="font-semibold h-10 py-2">Impact</TableHead>
                      <TableHead className="font-semibold h-10 py-2">Severity</TableHead>
                      <TableHead className="font-semibold h-10 py-2">Timestamp</TableHead>
                      <TableHead className="font-semibold h-10 py-2">Source IP</TableHead>
                      <TableHead className="font-semibold h-10 py-2">Port</TableHead>
                      <TableHead className="font-semibold h-10 py-2">Threat Info</TableHead>
                      <TableHead className="font-semibold h-10 py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground border-border/50">
                          <div className="flex flex-col items-center justify-center">
                            <ShieldAlert className="h-8 w-8 mb-2 opacity-20" />
                            <p>No high-severity threats detected.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      alerts.slice(0, 50).map((item) => (
                        <TableRow key={item.id} className="border-border/50 hover:bg-destructive/10 border-l-2 border-l-destructive/50 transition-colors">
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
                          <TableCell className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                            <Clock className="size-3" />
                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-destructive">{item.src_ip || "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.port}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[250px] font-medium">
                            {item.info || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(item)}>
                              Investigate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

          </div>
        </div>
      </div>
      <IncidentPanel 
        isOpen={!!selectedAlert} 
        onClose={() => setSelectedAlert(null)} 
        alert={selectedAlert} 
      />
    </div>
  );
}
