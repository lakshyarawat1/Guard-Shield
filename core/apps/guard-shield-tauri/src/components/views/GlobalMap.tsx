import { useEffect, useState, useRef } from 'react';
import ReactGlobe from 'react-globe.gl';
const Globe: any = (ReactGlobe as any).default || ReactGlobe;
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "../../components/ui/badge";
import { ShieldAlert, Crosshair, Map as MapIcon, Activity } from "lucide-react";

interface AlertData {
    id: number;
    timestamp: string;
    impact_score: number;
    severity: string;
    port: string;
    protocol: string;
    info: string;
    src_country: string;
    dst_country: string;
    src_ip: string;
    src_lat?: number;
    src_lon?: number;
    dst_lat?: number;
    dst_lon?: number;
}

interface ArcData {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    color: string;
    label: string;
    timestamp: number;
    severity: string;
    ip: string;
}

const GlobalMap = () => {
    const [arcs, setArcs] = useState<ArcData[]>([]);
    const [points, setPoints] = useState<any[]>([]);
    const [feedAlerts, setFeedAlerts] = useState<AlertData[]>([]);
    const globeEl = useRef<any>(null);

    // Setup basic rotating globe
    useEffect(() => {
        // react-globe.gl controls may not be immediately available
        const interval = setInterval(() => {
            if (globeEl.current && typeof globeEl.current.controls === 'function') {
                const controls = globeEl.current.controls();
                if (controls) {
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 1.0;
                    clearInterval(interval);
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Fetch historical alerts for the feed
        invoke<AlertData[]>("get_alerts", { limit: 50, severityFilter: null, startDate: null, endDate: null })
            .then(historical => {
                setFeedAlerts(historical.reverse());
                
                // Optional: populate initial arcs/points from the last 5 alerts so the map isn't completely empty
                const recent = historical.slice(-5);
                const initialArcs: ArcData[] = [];
                const initialPoints: any[] = [];
                const now = Date.now();
                
                recent.forEach((alert, i) => {
                    if (alert.src_lat && alert.src_lon) {
                        const targetLat = alert.dst_lat ?? 37.7749;
                        const targetLon = alert.dst_lon ?? -122.4194;
                        const color = alert.severity === "Critical" ? ["#ff0a0a", "#ff4545"] : 
                                      alert.severity === "High" ? ["#f97316", "#ff9d5c"] : 
                                      alert.severity === "Medium" ? ["#eab308", "#fcd34d"] : 
                                      ["#3b82f6", "#93c5fd"];
                                      
                        initialArcs.push({
                            startLat: alert.src_lat, startLng: alert.src_lon,
                            endLat: targetLat, endLng: targetLon,
                            color: color[0], label: `[${alert.severity}] ${alert.src_ip}`,
                            timestamp: now - (i * 1000), severity: alert.severity, ip: alert.src_ip
                        });
                        initialPoints.push({
                            lat: alert.src_lat, lng: alert.src_lon,
                            size: alert.severity === "Critical" ? 0.8 : 0.4, color: color[0], label: alert.src_ip
                        });
                    }
                });
                if (initialArcs.length > 0) {
                    setArcs(initialArcs);
                    setPoints(initialPoints);
                }
            })
            .catch(console.error);

        const unlistenPromise = listen<AlertData>("intrusion-alert", (event) => {
            const alert = event.payload;
            
            setFeedAlerts(prev => [...prev.slice(-49), alert]);
            
            if (alert.src_lat && alert.src_lon) {
                // Approximate Local IP coordinates if not resolved (default to San Francisco or user's rough geo)
                // For a more realistic war room, traffic often flows to the local server
                const targetLat = alert.dst_lat ?? 37.7749;
                const targetLon = alert.dst_lon ?? -122.4194;

                const color = alert.severity === "Critical" ? ["#ff0a0a", "#ff4545"] : 
                              alert.severity === "High" ? ["#f97316", "#ff9d5c"] : 
                              alert.severity === "Medium" ? ["#eab308", "#fcd34d"] : 
                              ["#3b82f6", "#93c5fd"];

                const newArc: ArcData = {
                    startLat: alert.src_lat,
                    startLng: alert.src_lon,
                    endLat: targetLat,
                    endLng: targetLon,
                    color: color[0],
                    label: `[${alert.severity}] ${alert.src_ip}`,
                    timestamp: Date.now(),
                    severity: alert.severity,
                    ip: alert.src_ip
                };

                const newPoint = {
                    lat: alert.src_lat,
                    lng: alert.src_lon,
                    size: alert.severity === "Critical" ? 0.8 : 0.4,
                    color: color[0],
                    label: alert.src_ip
                };

                setArcs(prev => [...prev.slice(-99), newArc]);
                setPoints(prev => [...prev.slice(-49), newPoint]);
            }
        });

        return () => {
            unlistenPromise.then((unlisten) => unlisten());
        };
    }, []);

    // Cleanup old arcs to simulate pulsing radar effect
    useEffect(() => {
        const interval = setInterval(() => {
            setArcs(prev => prev.filter(arc => Date.now() - arc.timestamp < 10000));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Responsive dimensions
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-col h-[calc(100vh-50px)]">
        <Infobar />
        <div className="flex h-full w-full overflow-hidden">
          <Sidebar />
                    <div className="flex-1 relative overflow-hidden bg-black" ref={containerRef}>
                        
                        {/* Overlay UI */}
                        <div className="absolute top-6 left-6 z-10 pointer-events-none">
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center shadow-black drop-shadow-md">
                                <Crosshair className="mr-3 h-8 w-8 text-emerald-500 animate-pulse" />
                                Global Threat Monitor
                            </h1>
                            <p className="text-sm text-gray-300 drop-shadow flex items-center mb-6">
                                <Activity className="h-4 w-4 mr-1 text-blue-400" />
                                Real-time geographic origin of intercepted packets
                            </p>
                            
                            <div className="space-y-3 pointer-events-auto">
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-lg w-64 shadow-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Streams</span>
                                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                                            {arcs.length} Flows
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Intercepted IPs</span>
                                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                            {points.length} Nodes
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Threats Feed (Bottom Right Overlay) */}
                        <div className="absolute bottom-6 right-6 z-10 w-80 pointer-events-auto">
                            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col h-64">
                                <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
                                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center">
                                        <ShieldAlert className="h-4 w-4 mr-2 text-destructive" />
                                        Latest Interceptions
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {feedAlerts.slice().reverse().slice(0, 10).map((alert, idx) => {
                                        const color = alert.severity === "Critical" ? "#ff0a0a" : 
                                                      alert.severity === "High" ? "#f97316" : 
                                                      alert.severity === "Medium" ? "#eab308" : 
                                                      "#3b82f6";
                                        return (
                                            <div key={idx} className="flex flex-col text-xs bg-white/5 p-2 rounded border border-white/5">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-mono text-gray-300">{alert.src_ip}</span>
                                                    <span className="text-[10px]" style={{ color }}>{alert.severity}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono">
                                                    {alert.src_lat ? `${alert.src_lat.toFixed(2)}, ${alert.src_lon?.toFixed(2)}` : 'Unknown Location'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {feedAlerts.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs text-center px-4">
                                            <MapIcon className="h-8 w-8 mb-2 opacity-50" />
                                            Awaiting network traffic telemetry...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Globe Canvas */}
                        <Globe
                            ref={globeEl}
                            width={dimensions.width}
                            height={dimensions.height}
                            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                            
                            arcsData={arcs}
                            arcStartLat={(d: any) => (d as ArcData).startLat}
                            arcStartLng={(d: any) => (d as ArcData).startLng}
                            arcEndLat={(d: any) => (d as ArcData).endLat}
                            arcEndLng={(d: any) => (d as ArcData).endLng}
                            arcColor={(d: any) => [((d as unknown) as ArcData).color, `${((d as unknown) as ArcData).color}88`]}
                            arcDashLength={0.4}
                            arcDashGap={0.2}
                            arcDashAnimateTime={1500}
                            arcAltitude={0.2}
                            
                            pointsData={points}
                            pointLat={(d: any) => (d as any).lat}
                            pointLng={(d: any) => (d as any).lng}
                            pointColor={(d: any) => (d as any).color}
                            pointAltitude={0.01}
                            pointRadius={(d: any) => (d as any).size}
                            pointsMerge={true}
                        />
                          </div>
        </div>
      </div>
    </div>
  );
};


export default GlobalMap;
