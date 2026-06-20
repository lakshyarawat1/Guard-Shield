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

interface BlockedIpData {
  id: number;
  ip: string;
  reason: string;
  timestamp: string;
}

const BlockedIPs = () => {
  const [blockedIps, setBlockedIps] = useState<BlockedIpData[]>([]);
  const [newIp, setNewIp] = useState("");

  const fetchBlockedIps = async () => {
    try {
      const ips: BlockedIpData[] = await invoke("get_blocked_ips");
      setBlockedIps(ips);
    } catch (e) {
      console.error("Failed to fetch blocked IPs", e);
    }
  };

  useEffect(() => {
    fetchBlockedIps();
    const interval = setInterval(fetchBlockedIps, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblock = async (ip: string) => {
    try {
      await invoke("unblock_ip", { ip });
      toast.success(`Unblocked IP: ${ip}`);
      fetchBlockedIps();
    } catch (e) {
      toast.error(`Failed to unblock IP: ${ip}`, {
        description: String(e),
      });
    }
  };

  const handleTestBlock = async (ip: string) => {
    try {
      const result: string = await invoke("test_connection", { ip });
      toast.info(`Test Result for ${ip}`, {
        description: result,
      });
    } catch (e) {
      toast.error("Test execution failed", {
        description: String(e),
      });
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    try {
      await invoke("block_ip", { ip: newIp.trim(), reason: "Manual Block via UI" });
      toast.success(`Successfully blocked IP: ${newIp.trim()}`);
      setNewIp("");
      fetchBlockedIps();
    } catch (e) {
      toast.error(`Failed to block IP: ${newIp}`, {
        description: String(e),
      });
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
                <h1 className="text-2xl font-bold tracking-tight">Active IPS Rules (Blocked IPs)</h1>
                <p className="text-sm text-muted-foreground">Manage IP addresses actively dropped by the Intrusion Prevention System.</p>
              </div>
              <div className="flex items-center gap-2">
                <form onSubmit={handleManualBlock} className="flex items-center gap-2 mr-4">
                  <Input 
                    type="text" 
                    placeholder="Enter IP (e.g., 1.1.1.1)" 
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="w-48 h-8"
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={!newIp.trim()}>
                    <ShieldBan className="h-4 w-4 mr-2" /> Block IP
                  </Button>
                </form>
                {import.meta.env.DEV && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    await invoke("block_ip", { ip: "1.1.1.1", reason: "Dev Test" });
                    fetchBlockedIps();
                  }}>
                    <ShieldBan className="h-4 w-4 mr-2" /> Dev: Block 1.1.1.1
                  </Button>
                )}
                <Badge variant={blockedIps.length > 0 ? "destructive" : "secondary"}>
                  {blockedIps.length} Active Blocks
                </Badge>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedIPs;
