import { useEffect, useState } from "react";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { invoke } from "@tauri-apps/api/core";
import { Trash2, ShieldBan, ShieldCheck, Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useLocation } from "react-router-dom";

interface IpData {
  id: number;
  ip: string;
  reason: string;
  timestamp: string;
}

const IpManagement = () => {
  const location = useLocation();
  const [blockedIps, setBlockedIps] = useState<IpData[]>([]);
  const [whitelistedIps, setWhitelistedIps] = useState<IpData[]>([]);
  const [newBlockedIp, setNewBlockedIp] = useState("");
  const [newWhitelistedIp, setNewWhitelistedIp] = useState("");

  const defaultTab = location.pathname.includes("whitelisted") ? "whitelisted" : "blocked";

  const fetchIps = async () => {
    try {
      const blocked: IpData[] = await invoke("get_blocked_ips");
      setBlockedIps(blocked);
      const whitelisted: IpData[] = await invoke("get_whitelisted_ips");
      setWhitelistedIps(whitelisted);
    } catch (e) {
      console.error("Failed to fetch IPs", e);
    }
  };

  useEffect(() => {
    fetchIps();
    const interval = setInterval(fetchIps, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblock = async (ip: string) => {
    try {
      await invoke("unblock_ip", { ip });
      toast.success(`Unblocked IP: ${ip}`);
      fetchIps();
    } catch (e) {
      toast.error(`Failed to unblock IP: ${ip}`, { description: String(e) });
    }
  };

  const handleRemoveWhitelist = async (ip: string) => {
    try {
      await invoke("remove_whitelisted_ip", { ip });
      toast.success(`Removed IP from whitelist: ${ip}`);
      fetchIps();
    } catch (e) {
      toast.error(`Failed to remove IP from whitelist: ${ip}`, { description: String(e) });
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedIp.trim()) return;
    try {
      await invoke("block_ip", { ip: newBlockedIp.trim(), reason: "Manual Block via UI" });
      toast.success(`Successfully blocked IP: ${newBlockedIp.trim()}`);
      setNewBlockedIp("");
      fetchIps();
    } catch (e) {
      toast.error(`Failed to block IP: ${newBlockedIp}`, { description: String(e) });
    }
  };

  const handleManualWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhitelistedIp.trim()) return;
    try {
      await invoke("whitelist_ip", { ip: newWhitelistedIp.trim(), reason: "Manual Whitelist via UI" });
      toast.success(`Successfully whitelisted IP: ${newWhitelistedIp.trim()}`);
      setNewWhitelistedIp("");
      fetchIps();
    } catch (e) {
      toast.error(`Failed to whitelist IP: ${newWhitelistedIp}`, { description: String(e) });
    }
  };

  const handleTestBlock = async (ip: string) => {
    try {
      const result: string = await invoke("test_connection", { ip });
      toast.info(`Test Result for ${ip}`, { description: result });
    } catch (e) {
      toast.error("Test execution failed", { description: String(e) });
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">IP Management</h1>
                <p className="text-sm text-muted-foreground">Manage Blocked and Whitelisted IP addresses globally.</p>
              </div>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="blocked" className="flex items-center gap-2">
                  <ShieldBan className="size-4" /> Blocked IPs
                  <Badge variant={blockedIps.length > 0 ? "destructive" : "secondary"} className="ml-2 h-5 min-w-[20px] px-1 text-[10px]">
                    {blockedIps.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="whitelisted" className="flex items-center gap-2">
                  <ShieldCheck className="size-4" /> Whitelisted IPs
                  <Badge variant={whitelistedIps.length > 0 ? "default" : "secondary"} className="ml-2 h-5 min-w-[20px] px-1 text-[10px]">
                    {whitelistedIps.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* BLOCKED IPS TAB */}
              <TabsContent value="blocked" className="mt-0">
                <div className="flex justify-end mb-4">
                  <form onSubmit={handleManualBlock} className="flex items-center gap-2">
                    <Input 
                      type="text" 
                      placeholder="Enter IP (e.g., 1.1.1.1)" 
                      value={newBlockedIp}
                      onChange={(e) => setNewBlockedIp(e.target.value)}
                      className="w-48 h-8"
                    />
                    <Button type="submit" size="sm" variant="secondary" disabled={!newBlockedIp.trim()}>
                      <ShieldBan className="h-4 w-4 mr-2" /> Block IP
                    </Button>
                  </form>
                </div>
                <div className="border rounded-md">
                  {blockedIps.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                      <ShieldCheck className="h-12 w-12 text-emerald-500/50 mb-4" />
                      <p className="font-medium text-lg text-foreground">No Blocked IPs</p>
                      <p>All traffic is currently flowing according to default firewall rules.</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">IP Address</th>
                          <th className="px-4 py-3 font-medium">Timestamp</th>
                          <th className="px-4 py-3 font-medium">Reason</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockedIps.map((b) => (
                          <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium text-destructive flex items-center gap-2">
                              <ShieldBan className="h-4 w-4" /> {b.ip}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(b.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {b.reason}
                            </td>
                            <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                              {import.meta.env.DEV && (
                                <Button variant="secondary" size="sm" onClick={() => handleTestBlock(b.ip)}>
                                  <Activity className="h-4 w-4 mr-2" /> Test
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleUnblock(b.ip)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Unblock
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>

              {/* WHITELISTED IPS TAB */}
              <TabsContent value="whitelisted" className="mt-0">
                <div className="flex justify-end mb-4">
                  <form onSubmit={handleManualWhitelist} className="flex items-center gap-2">
                    <Input 
                      type="text" 
                      placeholder="Enter IP (e.g., 8.8.8.8)" 
                      value={newWhitelistedIp}
                      onChange={(e) => setNewWhitelistedIp(e.target.value)}
                      className="w-48 h-8"
                    />
                    <Button type="submit" size="sm" variant="secondary" disabled={!newWhitelistedIp.trim()}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Whitelist IP
                    </Button>
                  </form>
                </div>
                <div className="border rounded-md">
                  {whitelistedIps.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                      <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="font-medium text-lg text-foreground">No Whitelisted IPs</p>
                      <p>Add trusted IPs here to ensure they are never blocked by the IPS engine.</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">IP Address</th>
                          <th className="px-4 py-3 font-medium">Timestamp</th>
                          <th className="px-4 py-3 font-medium">Reason</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {whitelistedIps.map((b) => (
                          <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium text-emerald-500 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" /> {b.ip}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(b.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {b.reason}
                            </td>
                            <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                              {import.meta.env.DEV && (
                                <Button variant="secondary" size="sm" onClick={() => handleTestBlock(b.ip)}>
                                  <Activity className="h-4 w-4 mr-2" /> Test
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleRemoveWhitelist(b.ip)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IpManagement;
