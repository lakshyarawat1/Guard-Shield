
import { Clock, Info, ShieldBan, Eye, XCircle } from "lucide-react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ToolTip, XAxis,
  YAxis,
} from "recharts";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface AlertData {
  id: number;
  timestamp: string;
  impact_score: number;
  severity: string;
  port: string;
  protocol: string;
  info: string;
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

  const filteredAlerts = (severityFilter === "All" 
    ? alerts 
    : alerts.filter(a => a.severity === severityFilter))
    .filter(a => !showOnlyStarred || starredAlertIds.has(a.id));

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

  const chartData = useMemo(() => {
    return [...alerts].reverse().slice(-20).map((a) => {
      const timeParts = a.timestamp.split("T");
      const timeStr = timeParts.length > 1 ? timeParts[1] : a.timestamp;
      
      return {
        time: timeStr,
        impact: a.impact_score,
      };
    });
  }, [alerts]);

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
        <ResponsiveContainer width="100%" height={200} className="my-6">
          {chartData.length > 0 ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 10]} />
              <ToolTip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  color: "var(--popover-foreground)",
                  borderRadius: "var(--radius)",
                  fontSize: "0.875rem",
                }}
              />
              <Legend />
              <Line type="step" dataKey="impact" name="Impact Score" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
              <span className="text-sm">No telemetry data available yet</span>
            </div>
          )}
        </ResponsiveContainer>
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
        </div>
        <ScrollArea className="h-52">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="flex gap-3 items-center text-center">
                  Impact Score{" "}
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
                    </Tooltip>{" "}
                  </TooltipProvider>
                </TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Port</TableHead>
                <TableHead className="text-right">Protocol</TableHead>
                <TableHead>Info</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No intrusion attempts detected.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((item) => (
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

      {/* Alert Details Modal */}
      <Dialog open={selectedAlert !== null} onOpenChange={(open) => { if (!open) setSelectedAlert(null); }}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">Alert Details</DialogTitle>
            <DialogDescription>
              Detailed view of the intrusion attempt.
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (() => {
            const isStarred = starredAlertIds.has(selectedAlert.id);
            return (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg border">
                  <div><strong className="text-muted-foreground mr-2">ID:</strong> {selectedAlert.id}</div>
                  <div><strong className="text-muted-foreground mr-2">Time:</strong> {selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : "—"}</div>
                  <div><strong className="text-muted-foreground mr-2">Severity:</strong> <Badge className={getSeverityColor(selectedAlert.severity)}>{selectedAlert.severity}</Badge></div>
                  <div><strong className="text-muted-foreground mr-2">Impact Score:</strong> <Badge className={getImpactColor(selectedAlert.impact_score)}>{selectedAlert.impact_score.toFixed(1)}</Badge></div>
                  <div><strong className="text-muted-foreground mr-2">Protocol:</strong> {selectedAlert.protocol}</div>
                  <div><strong className="text-muted-foreground mr-2">Port:</strong> {selectedAlert.port}</div>
                </div>
                <div className="text-sm bg-muted/20 p-4 rounded-lg border">
                  <strong className="text-muted-foreground block mb-2">Alert Info:</strong> 
                  <span className="break-all font-mono text-xs">{selectedAlert.info || "No details provided"}</span>
                </div>
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
    </div>
  );
};

export default Monitoring;
