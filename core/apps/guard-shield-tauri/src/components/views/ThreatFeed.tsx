import { useState, useEffect, useMemo } from "react";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { ShieldAlert, Globe, Server, Activity, Ban, DownloadCloud, Search, CheckCircle2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "../../components/ui/switch";

interface ThreatIndicator {
  id: string;
  indicator: string;
  type: "IP" | "Domain" | "Hash";
  provider: string;
  category: string;
  confidence: "High" | "Medium" | "Low";
  dateAdded: string;
}

const ThreatFeed = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoBlockEnabled, setAutoBlockEnabled] = useState(true);
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const LIMIT = 100;

  // Initial Fetch
  useEffect(() => {
    invoke<ThreatIndicator[]>("get_threat_feeds")
      .then((data) => setIndicators(data))
      .catch((e) => console.error("Failed to load threat feeds:", e));
  }, []);

  // ⚡ Bolt Optimization: Memoize filtered indicators to prevent unnecessary O(n) filtering on every render
  const filteredIndicators = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return indicators.filter(
      (ioc) =>
        ioc.indicator.toLowerCase().includes(lowerSearch) ||
        ioc.provider.toLowerCase().includes(lowerSearch) ||
        ioc.category.toLowerCase().includes(lowerSearch)
    );
  }, [indicators, searchTerm]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    toast.info("Syncing with active Threat Feeds...");
    try {
      const data = await invoke<ThreatIndicator[]>("sync_threat_feeds");
      setIndicators(data);
      setLastSyncTime(new Date());
      toast.success(`Successfully synchronized ${data.length} indicators.`);
    } catch (e) {
      toast.error("Sync failed", { description: "An internal error occurred." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBlockIp = async (ip: string) => {
    try {
      await invoke("block_ip", { ip, reason: "Added from Threat Feed Intelligence" });
      toast.success(`Successfully blocked IP: ${ip}`);
    } catch (e) {
      toast.error(`Failed to block IP: ${ip}`, { description: "An internal error occurred." });
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "High":
        return <Badge className="bg-destructive text-white border-transparent hover:bg-destructive">High</Badge>;
      case "Medium":
        return <Badge className="bg-chart-4 text-white border-transparent hover:bg-chart-4">Medium</Badge>;
      case "Low":
        return <Badge className="bg-chart-2 text-white border-transparent hover:bg-chart-2">Low</Badge>;
      default:
        return <Badge variant="outline">{confidence}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "IP":
        return <Server className="h-4 w-4 mr-1 text-blue-500" />;
      case "Domain":
        return <Globe className="h-4 w-4 mr-1 text-indigo-500" />;
      case "Hash":
        return <Activity className="h-4 w-4 mr-1 text-emerald-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-col h-[calc(100vh-50px)]">
        <Infobar />
        <div className="flex h-full w-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Threat Intelligence</h1>
                <p className="text-sm text-muted-foreground mt-1">Aggregate and sync external Indicators of Compromise (IoCs).</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2 border px-4 py-2 rounded-lg bg-card">
                  <Switch 
                    id="auto-block" 
                    checked={autoBlockEnabled}
                    onCheckedChange={setAutoBlockEnabled}
                  />
                  <div className="flex flex-col">
                    <label htmlFor="auto-block" className="text-sm font-semibold cursor-pointer">
                      Auto-Block High Confidence
                    </label>
                    <span className="text-xs text-muted-foreground leading-none mt-1">Automatically enforce drop rules</span>
                  </div>
                </div>
                <Button onClick={handleManualSync} disabled={isSyncing} className="gap-2">
                  <DownloadCloud className={`h-4 w-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  {isSyncing ? "Syncing..." : "Sync Feeds Now"}
                </Button>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">Active Feeds</h3>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mt-2">4 Providers</div>
                <p className="text-xs text-emerald-500 flex items-center mt-2 font-medium">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> All feeds healthy
                </p>
                <div className="absolute right-0 bottom-0 opacity-5 w-24 h-24 transform translate-x-4 translate-y-4">
                  <Globe className="w-full h-full" />
                </div>
              </div>
              
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">Total Indicators</h3>
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mt-2">{indicators.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Active indicators in engine
                </p>
                <div className="absolute right-0 bottom-0 opacity-5 w-24 h-24 transform translate-x-4 translate-y-4">
                  <ShieldAlert className="w-full h-full" />
                </div>
              </div>
              
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">Last Sync</h3>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mt-2">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {lastSyncTime ? "Synced from live sources" : "Initial load from DB"}
                </p>
                <div className="absolute right-0 bottom-0 opacity-5 w-24 h-24 transform translate-x-4 translate-y-4">
                  <Activity className="w-full h-full" />
                </div>
              </div>
            </div>

            {/* Main Table Section */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Latest Indicators</h2>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search indicators..."
                  className="pl-8 bg-background border-muted"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className={`rounded-md border bg-card relative ${!isExpanded && filteredIndicators.length > 10 ? 'max-h-[500px] overflow-hidden' : ''}`}>
              <div className="overflow-x-auto pb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium border-b border-muted">Indicator</th>
                      <th className="px-4 py-3 font-medium border-b border-muted">Provider</th>
                      <th className="px-4 py-3 font-medium border-b border-muted">Category</th>
                      <th className="px-4 py-3 font-medium border-b border-muted">Confidence</th>
                      <th className="px-4 py-3 font-medium border-b border-muted">Date Added</th>
                      <th className="px-4 py-3 font-medium border-b border-muted text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndicators.slice(0, isExpanded ? page * LIMIT : 10).map((ioc) => (
                      <tr key={ioc.id} className="border-b border-muted last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center font-medium">
                            {getTypeIcon(ioc.type)}
                            {ioc.indicator}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {ioc.provider}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="text-xs font-normal bg-background">
                            {ioc.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {getConfidenceBadge(ioc.confidence)}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                          {new Date(ioc.dateAdded).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {ioc.type === "IP" ? (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-8 shadow-sm"
                              onClick={() => handleBlockIp(ioc.indicator)}
                            >
                              <Ban className="h-3 w-3 mr-1.5" /> Block
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8"
                              disabled
                            >
                              Unsupported
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredIndicators.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No threat indicators found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Fade out and Expand Button */}
              {!isExpanded && filteredIndicators.length > 10 && (
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-card to-card/0 flex items-end justify-center pb-6 z-10 pointer-events-auto">
                  <Button 
                    onClick={() => setIsExpanded(true)} 
                    variant="outline" 
                    className="shadow-md bg-background"
                  >
                    View All Indicators
                  </Button>
                </div>
              )}

              {/* Pagination Button when expanded */}
              {isExpanded && filteredIndicators.length > page * LIMIT && (
                <div className="relative flex justify-center py-6 border-t border-muted bg-card">
                  <Button 
                    onClick={() => setPage(p => p + 1)} 
                    variant="outline" 
                    className="shadow-md bg-background"
                  >
                    Load {LIMIT} More
                  </Button>
                </div>
              )}
            </div>

                </div>
        </div>
      </div>
    </div>
  );
};


export default ThreatFeed;
