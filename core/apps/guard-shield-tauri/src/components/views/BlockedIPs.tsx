import { useEffect, useState } from "react";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { invoke } from "@tauri-apps/api/core";
import { Trash2, ShieldBan, ShieldCheck, Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const BlockedIPs = () => {
  const [blockedIps, setBlockedIps] = useState<string[]>([]);

  const fetchBlockedIps = async () => {
    try {
      const ips: string[] = await invoke("get_blocked_ips");
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
      alert(`Unblocked IP: ${ip}`);
      fetchBlockedIps();
    } catch (e) {
      alert(`Failed to unblock IP: ${ip}\n${String(e)}`);
    }
  };

  const handleTestBlock = async (ip: string) => {
    try {
      const result: string = await invoke("test_connection", { ip });
      alert(`Test Result for ${ip}:\n\n${result}`);
    } catch (e) {
      alert(`Test execution failed:\n${String(e)}`);
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
                {import.meta.env.DEV && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    await invoke("block_ip", { ip: "1.1.1.1" });
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
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIps.map((ip) => (
                      <tr key={ip} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium text-destructive flex items-center gap-2">
                          <ShieldBan className="h-4 w-4" /> {ip}
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                          {import.meta.env.DEV && (
                            <Button variant="secondary" size="sm" onClick={() => handleTestBlock(ip)}>
                              <Activity className="h-4 w-4 mr-2" /> Test Block
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleUnblock(ip)}>
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
