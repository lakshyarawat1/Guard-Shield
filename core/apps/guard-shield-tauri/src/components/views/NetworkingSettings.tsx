import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Network, Shield, Wifi, Globe, Server, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { toast } from "sonner";

export default function NetworkingSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    dnsPrimary: "1.1.1.1",
    dnsSecondary: "8.8.8.8",
    proxyUrl: "",
    firewallOverride: "false"
  });

  const loadSettings = async () => {
    try {
      const fetched: Record<string, string> = await invoke("fetch_settings");
      setSettings(prev => ({ ...prev, ...fetched }));
    } catch (e) { console.error("Failed to load settings", e); }
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSave = async () => {
    try {
      await invoke("save_settings", { settings });
      toast.success("Networking settings saved successfully.");
    } catch (e) {
      console.error("Failed to save settings", e);
      toast.error("Failed to save networking settings.");
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleFirewall = () => {
    setSettings(prev => ({ ...prev, firewallOverride: prev.firewallOverride === "true" ? "false" : "true" }));
  };
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Network className="size-8 text-primary" />
              Networking Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure system network interfaces, DNS, and traffic routing.
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave}>
            <Save className="size-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="interfaces" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="interfaces" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Wifi className="size-4 mr-2" />
              Interfaces
            </TabsTrigger>
            <TabsTrigger value="dns" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="size-4 mr-2" />
              DNS & Routing
            </TabsTrigger>
            <TabsTrigger value="proxy" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Server className="size-4 mr-2" />
              Proxy / VPN
            </TabsTrigger>
            <TabsTrigger value="firewall" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="size-4 mr-2" />
              Firewall Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interfaces" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Interface Card 1 */}
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:border-primary/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      eth0 <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Connected</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">Primary Ethernet Adapter</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">IPv4 Address</p>
                    <p className="font-mono">192.168.1.100</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">MAC Address</p>
                    <p className="font-mono text-muted-foreground">00:0c:29:3e:5b:6c</p>
                  </div>
                </div>
              </div>

              {/* Interface Card 2 */}
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:border-primary/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      wlan0 <Badge variant="outline" className="text-destructive border-destructive/50">Disconnected</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">Wireless Adapter</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm opacity-50">
                  <div>
                    <p className="text-muted-foreground mb-1">IPv4 Address</p>
                    <p className="font-mono">Not assigned</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">MAC Address</p>
                    <p className="font-mono text-muted-foreground">00:50:56:f2:4f:3d</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dns" className="space-y-6">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4">DNS Servers</h3>
              <div className="space-y-4 max-w-md">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Primary DNS</label>
                  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.dnsPrimary} onChange={e => handleSettingChange("dnsPrimary", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Secondary DNS</label>
                  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.dnsSecondary} onChange={e => handleSettingChange("dnsSecondary", e.target.value)} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="proxy">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 max-w-xl">
              <h3 className="font-semibold text-lg mb-4">Proxy Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">Route traffic through a custom proxy server (e.g. SOCKS5 or HTTP/S).</p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Proxy URL</label>
                <input type="text" placeholder="socks5://127.0.0.1:9050" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.proxyUrl} onChange={e => handleSettingChange("proxyUrl", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="firewall">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 max-w-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Shield className="size-5 text-destructive" /> Global Firewall Bypass</h3>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between mt-6">
                <div>
                  <p className="font-medium">Disable System Firewall Integration</p>
                  <p className="text-sm text-muted-foreground max-w-[300px]">Stop Guard Shield from interacting with Windows Defender Firewall automatically.</p>
                </div>
                <div 
                  className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${settings.firewallOverride === "true" ? 'bg-destructive' : 'bg-muted'}`}
                  onClick={toggleFirewall}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.firewallOverride === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
