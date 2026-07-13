import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Shield, HardDrive, Cpu, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { useTheme } from "../ThemeProvider";
import { Paintbrush } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export default function GeneralSettings() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("guard_shield_font_size") || "medium");
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem("guard_shield_compact_mode") === "true");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("guard_shield_sidebar_collapsed") === "true");
  const [smoothCharts, setSmoothCharts] = useState(() => localStorage.getItem("guard_shield_chart_smooth") !== "false");
  const [filledCharts, setFilledCharts] = useState(() => localStorage.getItem("guard_shield_chart_filled") !== "false");
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("guard_shield_reduce_motion") === "true");
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("guard_shield_settings_tab") || "core");

  const [isClearing, setIsClearing] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    realTimeProtection: "true",
    heuristicsEngine: "true",
    runOnStartup: "true",
    hardwareAcceleration: "false",
    sendTelemetry: "false",
    notificationsCriticalOnly: "true",
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
      toast.success("Settings saved successfully.");
    } catch (e) {
      console.error("Failed to save settings", e);
      toast.error("Failed to save settings.");
    }
  };

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true"
    }));
  };

  const handleClearDb = async () => {
    if (!window.confirm("Are you sure you want to clear all local logs? This will delete all packets and alerts, and shrink the database file size.")) {
      return;
    }
    try {
      setIsClearing(true);
      await invoke("clear_database");
      toast.success("Local logs successfully cleared.");
    } catch (e) {
      console.error("Failed to clear local logs", e);
      toast.error("Failed to clear local logs.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto w-full">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Settings className="size-8 text-primary" />
              General Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage system-wide preferences, telemetry, and background behaviors.
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave}>
            <Save className="size-4 mr-2" />
            Apply Changes
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); sessionStorage.setItem("guard_shield_settings_tab", val); }} className="flex flex-col md:flex-row w-full gap-8 h-full">
          <TabsList className="flex flex-col w-full md:w-64 justify-start border-r border-b-0 rounded-none bg-transparent p-0 pr-4 gap-2 min-h-[calc(100vh-12rem)] items-start">
            <TabsTrigger value="core" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none data-[state=active]:border-r-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-left flex-none h-auto">Core Settings</TabsTrigger>
            <TabsTrigger value="preferences" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none data-[state=active]:border-r-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-left flex-none h-auto">Preferences (UI)</TabsTrigger>
          </TabsList>

          <div className="flex-1 w-full min-w-0">
            <TabsContent value="core" className="space-y-8 outline-none mt-0">
          {/* Section 1 */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="size-5 text-primary" />
              <h3 className="font-semibold text-lg">Protection Behavior</h3>
            </div>
            <Separator className="mb-4" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Real-Time Protection</p>
                  <p className="text-sm text-muted-foreground">Actively scan incoming packets and block known threats automatically.</p>
                </div>
                <Switch 
                  checked={settings.realTimeProtection === "true"} 
                  onCheckedChange={() => toggleSetting("realTimeProtection")} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Heuristics Engine</p>
                  <p className="text-sm text-muted-foreground">Use AI to detect unusual behavior anomalies that aren't in the signature database.</p>
                </div>
                <Switch 
                  checked={settings.heuristicsEngine === "true"} 
                  onCheckedChange={() => toggleSetting("heuristicsEngine")} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Critical / High Alerts Only</p>
                  <p className="text-sm text-muted-foreground">Only show notifications for Critical or High severity threats. Mutes Low/Medium alerts.</p>
                </div>
                <Switch 
                  checked={settings.notificationsCriticalOnly === "true"} 
                  onCheckedChange={() => toggleSetting("notificationsCriticalOnly")} 
                />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="size-5 text-primary" />
              <h3 className="font-semibold text-lg">Performance</h3>
            </div>
            <Separator className="mb-4" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Run on Startup</p>
                  <p className="text-sm text-muted-foreground">Launch Guard Shield in the background when your system starts.</p>
                </div>
                <Switch 
                  checked={settings.runOnStartup === "true"} 
                  onCheckedChange={() => toggleSetting("runOnStartup")} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Hardware Acceleration</p>
                  <p className="text-sm text-muted-foreground">Offload packet inspection to available GPU compute for lower CPU overhead.</p>
                </div>
                <Switch 
                  checked={settings.hardwareAcceleration === "true"} 
                  onCheckedChange={() => toggleSetting("hardwareAcceleration")} 
                />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="size-5 text-primary" />
              <h3 className="font-semibold text-lg">Data & Telemetry</h3>
            </div>
            <Separator className="mb-4" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Send Anonymous Usage Data</p>
                  <p className="text-sm text-muted-foreground">Help us improve by sending non-identifiable crash reports and metrics.</p>
                </div>
                <Switch 
                  checked={settings.sendTelemetry === "true"} 
                  onCheckedChange={() => toggleSetting("sendTelemetry")} 
                />
              </div>
              
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                  onClick={handleClearDb}
                  disabled={isClearing}
                >
                  {isClearing ? "Clearing..." : "Clear All Local Logs"}
                </Button>
              </div>
            </div>
          </div>
          
          </TabsContent>

          <TabsContent value="preferences" className="space-y-8 outline-none mt-0">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Paintbrush className="size-5 text-primary" />
                <h3 className="font-semibold text-lg">UI Customization</h3>
              </div>
              <Separator className="mb-4" />
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">Select the application's visual theme.</p>
                  </div>
                  <Select
                    value={theme}
                    onValueChange={async (val) => {
                      setTheme(val as any);
                      await invoke("broadcast_ui_settings");
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System Default</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Accent Color</p>
                    <p className="text-sm text-muted-foreground">Select the primary accent color.</p>
                  </div>
                  <Select
                    value={accentColor}
                    onValueChange={async (val) => {
                      setAccentColor(val as any);
                      await invoke("broadcast_ui_settings");
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Accent Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Slate</SelectItem>
                      <SelectItem value="cyber-green">Cyber Green</SelectItem>
                      <SelectItem value="crimson-red">Crimson Red</SelectItem>
                      <SelectItem value="neon-purple">Neon Purple</SelectItem>
                      <SelectItem value="amber">Amber Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Font Size</p>
                    <p className="text-sm text-muted-foreground">Adjust the text scaling across the entire application.</p>
                  </div>
                  <Select
                    value={fontSize}
                    onValueChange={async (val) => {
                      setFontSize(val);
                      localStorage.setItem("guard_shield_font_size", val);
                      await invoke("broadcast_ui_settings");
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Font Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Compact Mode</p>
                    <p className="text-sm text-muted-foreground">Use a denser layout for data tables and logs.</p>
                  </div>
                  <Switch 
                    checked={compactMode} 
                    onCheckedChange={async (checked) => {
                      setCompactMode(checked);
                      localStorage.setItem("guard_shield_compact_mode", checked ? "true" : "false");
                      await invoke("broadcast_ui_settings");
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sidebar Collapse Mode</p>
                    <p className="text-sm text-muted-foreground">Collapse the main navigation sidebar to save screen space.</p>
                  </div>
                  <Switch 
                    checked={sidebarCollapsed} 
                    onCheckedChange={async (checked) => {
                      setSidebarCollapsed(checked);
                      localStorage.setItem("guard_shield_sidebar_collapsed", checked ? "true" : "false");
                      await invoke("broadcast_ui_settings");
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Smooth Charts</p>
                    <p className="text-sm text-muted-foreground">Use bezier curves instead of sharp linear lines for analytics.</p>
                  </div>
                  <Switch 
                    checked={smoothCharts} 
                    onCheckedChange={async (checked) => {
                      setSmoothCharts(checked);
                      localStorage.setItem("guard_shield_chart_smooth", checked ? "true" : "false");
                      await invoke("broadcast_ui_settings");
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Filled Charts</p>
                    <p className="text-sm text-muted-foreground">Fill the area under the analytics charts.</p>
                  </div>
                  <Switch 
                    checked={filledCharts} 
                    onCheckedChange={async (checked) => {
                      setFilledCharts(checked);
                      localStorage.setItem("guard_shield_chart_filled", checked ? "true" : "false");
                      await invoke("broadcast_ui_settings");
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Reduce Motion</p>
                    <p className="text-sm text-muted-foreground">Disable UI micro-animations and transitions for maximum performance.</p>
                  </div>
                  <Switch 
                    checked={reduceMotion} 
                    onCheckedChange={async (checked) => {
                      setReduceMotion(checked);
                      localStorage.setItem("guard_shield_reduce_motion", checked ? "true" : "false");
                      await invoke("broadcast_ui_settings");
                    }} 
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
