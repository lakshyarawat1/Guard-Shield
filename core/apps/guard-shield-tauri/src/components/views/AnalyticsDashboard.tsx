import { useEffect, useState, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import Monitoring from "./Monitoring";
import ReactECharts from "echarts-for-react";
import { useTheme } from "../ThemeProvider";
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

const getChartColors = (theme: "dark" | "light") => ({
  text: theme === "dark" ? "#a1a1aa" : "#71717a",
  border: theme === "dark" ? "#27272a" : "#e4e4e7",
  popover: theme === "dark" ? "#09090b" : "#ffffff",
  popoverText: theme === "dark" ? "#fafafa" : "#09090b",
  foreground: theme === "dark" ? "#fafafa" : "#09090b",
  destructive: "#ef4444",
  chart5: "#f97316",
  chart4: "#eab308",
  chart2: "#22c55e",
  primary: "#3b82f6",
});

export default function AnalyticsDashboard() {
  const { resolvedTheme } = useTheme();
  const colors = getChartColors(resolvedTheme);
  
  const isSmooth = localStorage.getItem("guard_shield_chart_smooth") !== "false";
  const isFilled = localStorage.getItem("guard_shield_chart_filled") !== "false";
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<TelemetryStats>({ total_alerts: 0, last_24h_alerts: 0 });
  const newAlertsBuffer = useRef<AlertData[]>([]);
  const [timeRangeStr, setTimeRangeStr] = useState<string>("5m");
  const timeRangeMs = useMemo(() => {
    if (timeRangeStr === "1m") return 60 * 1000;
    if (timeRangeStr === "5m") return 5 * 60 * 1000;
    if (timeRangeStr === "15m") return 15 * 60 * 1000;
    if (timeRangeStr === "60m") return 60 * 60 * 1000;
    if (timeRangeStr === "24h") return 24 * 60 * 60 * 1000;
    return 60 * 1000;
  }, [timeRangeStr]);

  const [trafficHistory, setTrafficHistory] = useState<{ time: number, pkts: number, alerts: number }[]>(() => {
    const now = Date.now();
    return Array.from({ length: 60 }).map((_, i) => ({
      time: now - (59 - i) * 1000,
      pkts: 0,
      alerts: 0
    }));
  });

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
    let unlistenPackets: (() => void) | undefined;
    let alertCountInSec = 0;
    let packetCountInSec = 0;

    const setupListener = async () => {
      unlistenFn = await listen<AlertData>("intrusion-alert", (event) => {
        alertCountInSec += 1;
        // ⚡ Bolt Optimization: Buffer incoming alerts to avoid triggering O(n) array derivations on every event
        newAlertsBuffer.current.push(event.payload);
      });
      unlistenPackets = await listen<any[]>("packets-batch", (event) => {
        packetCountInSec += event.payload.length;
      });
    };
    setupListener();

    const interval = setInterval(() => {
      const now = Date.now();
      setTrafficHistory(prev => {
        const next = [...prev, { time: now, pkts: packetCountInSec, alerts: alertCountInSec }];
        packetCountInSec = 0;
        alertCountInSec = 0;
        // Keep up to 1 hour (3600 points) to prevent infinite memory growth
        if (next.length > 3600) {
          return next.slice(next.length - 3600);
        }
        return next;
      });

      // Flush buffered alerts to state periodically
      if (newAlertsBuffer.current.length > 0) {
        const newAlerts = newAlertsBuffer.current.slice();
        newAlertsBuffer.current = []; // Clear buffer immediately
        setAlerts(prev => {
          const combined = [...newAlerts.reverse(), ...prev];
          return combined.slice(0, 1000);
        });
        setStats(prev => ({
          total_alerts: prev.total_alerts + newAlerts.length,
          last_24h_alerts: prev.last_24h_alerts + newAlerts.length
        }));
      }
    }, 1000);

    return () => {
      if (unlistenFn) unlistenFn();
      if (unlistenPackets) unlistenPackets();
      clearInterval(interval);
    };
  }, []);

  const scatterSeriesData = useMemo(() => {
    const critical: [number, number, string, string, string][] = [];
    const high: [number, number, string, string, string][] = [];
    const medium: [number, number, string, string, string][] = [];
    const low: [number, number, string, string, string][] = [];

    alerts.forEach(a => {
      const timeMs = new Date(a.timestamp).getTime();
      const val: [number, number, string, string, string] = [
        timeMs,
        a.impact_score,
        a.info,
        a.protocol,
        a.port
      ];
      if (a.severity === "Critical") critical.push(val);
      else if (a.severity === "High") high.push(val);
      else if (a.severity === "Medium") medium.push(val);
      else if (a.severity === "Low") low.push(val);
    });

    return { critical, high, medium, low };
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

  // ⚡ Bolt Optimization: Memoize criticalCount calculation to prevent unnecessary O(n) array filter on every render.
  const criticalCount = useMemo(() => {
    return alerts.filter(a => a.severity === "Critical").length;
  }, [alerts]);

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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
              <select 
                value={timeRangeStr} 
                onChange={(e) => setTimeRangeStr(e.target.value)}
                className="bg-card border border-input rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer text-foreground"
              >
                <option value="1m">Last 1 Minute</option>
                <option value="5m">Last 5 Minutes</option>
                <option value="15m">Last 15 Minutes</option>
                <option value="60m">Last 1 Hour</option>
              </select>
            </div>
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
                Threat Scatter Matrix (Severity & Impact)
              </h3>
              <div className="flex-1 min-h-[250px]">
                {alerts.length > 0 ? (
                  <ReactECharts
                    key={resolvedTheme}
                    theme={resolvedTheme}
                    option={{
                      backgroundColor: 'transparent',
                      tooltip: {
                        trigger: 'item',
                        backgroundColor: colors.popover,
                        borderColor: colors.border,
                        textStyle: { color: colors.popoverText },
                        formatter: function (params: any) {
                          const data = params.data;
                          const time = new Date(data[0]).toLocaleString();
                          const severity = params.seriesName;
                          const severityColor = 
                            severity === 'Critical' ? colors.destructive :
                            severity === 'High' ? colors.chart5 :
                            severity === 'Medium' ? colors.chart4 : colors.chart2;
                          
                          return `
                            <div style="padding: 4px; font-family: sans-serif;">
                              <div style="font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid ${colors.border}; padding-bottom: 4px;">
                                ${data[2]}
                              </div>
                              <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 2px;">
                                <span style="color: ${colors.text};">Severity:</span>
                                <span style="font-weight: 600; color: ${severityColor};">${severity}</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 2px;">
                                <span style="color: ${colors.text};">Impact Score:</span>
                                <span style="font-weight: 600;">${data[1].toFixed(1)}/10</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 2px;">
                                <span style="color: ${colors.text};">Protocol:</span>
                                <span style="font-weight: 600;">${data[3]}</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 2px;">
                                <span style="color: ${colors.text};">Destination Port:</span>
                                <span style="font-weight: 600;">${data[4]}</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; gap: 15px;">
                                <span style="color: ${colors.text};">Time:</span>
                                <span style="font-weight: 600;">${time}</span>
                              </div>
                            </div>
                          `;
                        }
                      },
                      legend: {
                        top: 0,
                        textStyle: { color: colors.foreground },
                        data: ['Critical', 'High', 'Medium', 'Low'],
                        icon: 'circle'
                      },
                      grid: { left: 40, right: 15, bottom: 25, top: 40 },
                      xAxis: {
                        type: 'time',
                        axisLabel: { color: colors.text },
                        splitLine: {
                          show: true,
                          lineStyle: { color: colors.border, type: 'dashed' }
                        }
                      },
                      yAxis: {
                        type: 'value',
                        name: 'Impact',
                        nameTextStyle: { color: colors.text, padding: [0, 0, 0, 30] },
                        min: 0,
                        max: 10,
                        splitLine: {
                          show: true,
                          lineStyle: { color: colors.border }
                        },
                        axisLabel: { color: colors.text }
                      },
                      series: [
                        {
                          name: 'Critical',
                          type: 'scatter',
                          data: scatterSeriesData.critical,
                          symbolSize: (data: any) => data[1] * 2 + 8,
                          itemStyle: {
                            color: colors.destructive,
                            opacity: 0.85,
                            shadowBlur: 10,
                            shadowColor: 'rgba(239, 68, 68, 0.4)',
                            borderColor: resolvedTheme === 'dark' ? '#09090b' : '#ffffff',
                            borderWidth: 1.5
                          },
                          emphasis: {
                            focus: 'series',
                            itemStyle: {
                              opacity: 1,
                              shadowBlur: 15,
                              shadowColor: 'rgba(239, 68, 68, 0.6)',
                              borderWidth: 2
                            }
                          }
                        },
                        {
                          name: 'High',
                          type: 'scatter',
                          data: scatterSeriesData.high,
                          symbolSize: (data: any) => data[1] * 2 + 6,
                          itemStyle: {
                            color: colors.chart5,
                            opacity: 0.85,
                            shadowBlur: 8,
                            shadowColor: 'rgba(249, 115, 22, 0.3)',
                            borderColor: resolvedTheme === 'dark' ? '#09090b' : '#ffffff',
                            borderWidth: 1.5
                          },
                          emphasis: {
                            focus: 'series',
                            itemStyle: {
                              opacity: 1,
                              shadowBlur: 12,
                              shadowColor: 'rgba(249, 115, 22, 0.5)',
                              borderWidth: 2
                            }
                          }
                        },
                        {
                          name: 'Medium',
                          type: 'scatter',
                          data: scatterSeriesData.medium,
                          symbolSize: (data: any) => data[1] * 2 + 6,
                          itemStyle: {
                            color: colors.chart4,
                            opacity: 0.85,
                            shadowBlur: 8,
                            shadowColor: 'rgba(234, 179, 8, 0.3)',
                            borderColor: resolvedTheme === 'dark' ? '#09090b' : '#ffffff',
                            borderWidth: 1.5
                          },
                          emphasis: {
                            focus: 'series',
                            itemStyle: {
                              opacity: 1,
                              shadowBlur: 12,
                              shadowColor: 'rgba(234, 179, 8, 0.5)',
                              borderWidth: 2
                            }
                          }
                        },
                        {
                          name: 'Low',
                          type: 'scatter',
                          data: scatterSeriesData.low,
                          symbolSize: (data: any) => data[1] * 2 + 6,
                          itemStyle: {
                            color: colors.chart2,
                            opacity: 0.85,
                            shadowBlur: 8,
                            shadowColor: 'rgba(34, 197, 94, 0.3)',
                            borderColor: resolvedTheme === 'dark' ? '#09090b' : '#ffffff',
                            borderWidth: 1.5
                          },
                          emphasis: {
                            focus: 'series',
                            itemStyle: {
                              opacity: 1,
                              shadowBlur: 12,
                              shadowColor: 'rgba(34, 197, 94, 0.5)',
                              borderWidth: 2
                            }
                          }
                        }
                      ]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No alert data
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
                  <ReactECharts
                    key={resolvedTheme}
                    theme={resolvedTheme}
                    option={{
                      backgroundColor: 'transparent',
                      tooltip: { 
                        trigger: 'item',
                        backgroundColor: colors.popover,
                        borderColor: colors.border,
                        textStyle: { color: colors.popoverText }
                      },
                      legend: { bottom: 0, textStyle: { color: colors.foreground }, icon: 'circle' },
                      series: [
                        {
                          type: 'pie',
                          radius: ['50%', '80%'],
                          avoidLabelOverlap: false,
                          label: { show: false, position: 'center' },
                          itemStyle: { borderColor: resolvedTheme === 'dark' ? '#09090b' : '#ffffff', borderWidth: 2 },
                          data: severityData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color.startsWith('var') ? (d.color.includes('destructive') ? colors.destructive : d.color.includes('chart-5') ? colors.chart5 : d.color.includes('chart-4') ? colors.chart4 : colors.chart2) : d.color } }))
                        }
                      ]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
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
                  <ReactECharts
                    key={resolvedTheme}
                    theme={resolvedTheme}
                    option={{
                      backgroundColor: 'transparent',
                      tooltip: { 
                        trigger: 'axis', 
                        axisPointer: { type: 'shadow' },
                        backgroundColor: colors.popover,
                        borderColor: colors.border,
                        textStyle: { color: colors.popoverText }
                      },
                      grid: { top: 10, right: 20, bottom: 20, left: 50 },
                      xAxis: { type: 'value', show: false, splitLine: { show: false } },
                      yAxis: { type: 'category', data: protocolData.map(d => d.name).reverse(), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: colors.text } },
                      series: [
                        {
                          type: 'bar',
                          data: protocolData.map(d => d.value).reverse(),
                          itemStyle: { color: colors.primary, borderRadius: [0, 4, 4, 0] }
                        }
                      ]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No protocol data
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2 p-5 rounded-xl border bg-card shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Activity className="size-5 text-chart-2" />
                Live Traffic vs. Threats Volume ({timeRangeStr === '1m' ? 'Last 60s' : timeRangeStr === '5m' ? 'Last 5m' : timeRangeStr === '15m' ? 'Last 15m' : timeRangeStr === '60m' ? 'Last 1h' : 'Last 24h'})
              </h3>
              <div className="flex-1 min-h-[200px]">
                <ReactECharts
                  key={resolvedTheme}
                  theme={resolvedTheme}
                  option={{
                    backgroundColor: 'transparent',
                    animation: false,
                    tooltip: { 
                      trigger: 'axis',
                      backgroundColor: colors.popover,
                      borderColor: colors.border,
                      textStyle: { color: colors.popoverText }
                    },
                    grid: { left: 40, right: 10, bottom: 20, top: 10 },
                    xAxis: { 
                      type: 'time', 
                      min: Date.now() - timeRangeMs, 
                      max: Date.now(),
                      axisLabel: { color: colors.text }
                    },
                    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: colors.border } }, axisLabel: { color: colors.text } },
                    series: [
                      {
                        name: 'Packets/sec',
                        type: 'line',
                        smooth: isSmooth ? 0.4 : false,
                        symbol: 'none',
                        sampling: 'lttb',
                        ...(isFilled ? {
                          areaStyle: {
                            color: colors.chart2,
                            opacity: 0.3
                          }
                        } : {}),
                        itemStyle: { color: colors.chart2 },
                        lineStyle: { width: 2 },
                        data: trafficHistory.map(d => [d.time, d.pkts])
                      },
                      {
                        name: 'Threats/sec',
                        type: 'line',
                        smooth: isSmooth ? 0.4 : false,
                        symbol: 'none',
                        sampling: 'lttb',
                        ...(isFilled ? {
                          areaStyle: {
                            color: colors.destructive,
                            opacity: 0.3
                          }
                        } : {}),
                        itemStyle: { color: colors.destructive },
                        lineStyle: { width: 2 },
                        data: trafficHistory.map(d => [d.time, d.alerts])
                      }
                    ]
                  }}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
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
