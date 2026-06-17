import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import Monitoring from "./Monitoring";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ShieldAlert, Activity, ShieldCheck, AlertTriangle } from "lucide-react";

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

export default function AnalyticsDashboard() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<TelemetryStats>({ total_alerts: 0, last_24h_alerts: 0 });

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

    let unlistenFn: (() => void) | undefined;
    const setupListener = async () => {
      unlistenFn = await listen<AlertData>("intrusion-alert", (event) => {
        setAlerts((prev) => [event.payload, ...prev].slice(0, 1000));
        setStats((prev) => ({
          total_alerts: prev.total_alerts + 1,
          last_24h_alerts: prev.last_24h_alerts + 1
        }));
      });
    };
    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const timelineData = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return sorted.slice(-30).map(a => {
      const timeParts = a.timestamp.split("T");
      return {
        time: timeParts.length > 1 ? timeParts[1].substring(0, 8) : a.timestamp,
        impact: a.impact_score
      };
    });
  }, [alerts]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alerts.forEach(a => { if (counts[a.severity] !== undefined) counts[a.severity]++; });
    return [
      { name: "Critical", value: counts.Critical, color: "var(--destructive)" },
      { name: "High", value: counts.High, color: "var(--chart-5)" },
      { name: "Medium", value: counts.Medium, color: "var(--chart-4)" },
      { name: "Low", value: counts.Low, color: "var(--chart-2)" },
    ].filter(d => d.value > 0);
  }, [alerts]);

  const protocolData = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { counts[a.protocol] = (counts[a.protocol] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [alerts]);

  const criticalCount = alerts.filter(a => a.severity === "Critical").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="m-1 p-4 flex-1 min-w-0 overflow-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">Analytics Overview</h1>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-full">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Alerts</p>
                <h3 className="text-2xl font-bold">{stats.total_alerts}</h3>
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
              <div className="p-3 bg-destructive/10 text-destructive rounded-full">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Critical Threats</p>
                <h3 className="text-2xl font-bold">{criticalCount}</h3>
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 text-chart-2 rounded-full">
                <Activity className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Alerts (24h)</p>
                <h3 className="text-2xl font-bold">{stats.last_24h_alerts}</h3>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="col-span-2 p-5 rounded-xl border bg-card shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                Alert Impact Timeline
              </h3>
              <div className="flex-1 min-h-[250px]">
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorImpact" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 10]} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "8px", color: "var(--popover-foreground)" }}
                        itemStyle={{ color: "var(--destructive)" }}
                      />
                      <Area type="monotone" dataKey="impact" stroke="var(--destructive)" strokeWidth={3} fillOpacity={1} fill="url(#colorImpact)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No timeline data
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 p-5 rounded-xl border bg-card shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <ShieldAlert className="size-5 text-chart-4" />
                Severity Breakdown
              </h3>
              <div className="flex-1 min-h-[250px]">
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "8px" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No severity data
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="col-span-1 p-5 rounded-xl border bg-card shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Top Protocols</h3>
              <div className="flex-1 min-h-[200px]">
                {protocolData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={protocolData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={60} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "8px", color: "var(--popover-foreground)" }} cursor={{fill: 'var(--accent)'}} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No protocol data
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2">
               {/* Reserved for future analytics widgets or top talkers */}
            </div>
          </div>

          {/* Monitoring Alerts Table below charts */}
          <div className="mt-4 border-t pt-8">
            <h2 className="text-xl font-bold mb-4">Alert Details</h2>
            <Monitoring />
          </div>
        </div>
      </div>
    </div>
  );
}
