import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "../../components/ui/menubar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useState, useEffect } from "react";
import { useTheme } from "../ThemeProvider";
import { useNavigate } from "react-router-dom";
import { applyFontSize } from "./Header";
import { openNetworkingSettingsWindow, openWhoisLookupWindow, openContactSupportWindow } from "../../utils/windows";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";

const Infobar = () => {
  const navigate = useNavigate();
  const [idsMode, setIdsMode] = useState("detection");
  const [quickBlockOpen, setQuickBlockOpen] = useState(false);
  const [ipToBlock, setIpToBlock] = useState("");
  const [dnsLookupOpen, setDnsLookupOpen] = useState(false);
  const [dnsQuery, setDnsQuery] = useState("");
  const [dnsResults, setDnsResults] = useState<string[]>([]);
  const [dnsError, setDnsError] = useState("");
  const [dnsLoading, setDnsLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  const [fontSize, setFontSize] = useState<string>(() => {
    return localStorage.getItem("guard_shield_font_size") || "medium";
  });

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem("guard_shield_font_size", size);
    applyFontSize(size);
  };

  const handleBlockIp = async () => {
    if (!ipToBlock.trim()) return;
    try {
      await invoke("block_ip", { ip: ipToBlock.trim(), reason: "Quick Blocked via Infobar" });
      toast.success(`Successfully blocked IP: ${ipToBlock}`);
      setIpToBlock("");
      setQuickBlockOpen(false);
    } catch (e) {
      toast.error(`Failed to block IP: ${ipToBlock}`, { description: String(e) });
    }
  };

  const toggleFullscreen = async () => {
    try {
      const win = getCurrentWindow();
      const isFullscreen = await win.isFullscreen();
      await win.setFullscreen(!isFullscreen);
    } catch (e) {
      console.error("Failed to toggle fullscreen", e);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDnsLookup = async () => {
    if (!dnsQuery) return;
    setDnsLoading(true);
    setDnsError("");
    setDnsResults([]);
    try {
      const results = await invoke<string[]>("perform_dns_lookup", { query: dnsQuery });
      setDnsResults(results);
    } catch (e) {
      setDnsError(e as string);
    } finally {
      setDnsLoading(false);
    }
  };


  const handleExportData = async (format: "csv" | "json") => {
    try {
      const alerts = await invoke<any>("get_alerts");
      if (!Array.isArray(alerts) || alerts.length === 0) {
        toast.info("No data available to export");
        return;
      }

      let content = "";
      let defaultFilename = `guard_shield_alerts_${new Date().toISOString().slice(0, 10)}`;

      if (format === "json") {
        content = JSON.stringify(alerts, null, 2);
        defaultFilename += ".json";
      } else {
        const headers = Object.keys(alerts[0]).join(",");
        const rows = alerts.map(a => Object.values(a).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
        content = headers + "\n" + rows.join("\n");
        defaultFilename += ".csv";
      }

      const filePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: format === "json" ? "JSON Files" : "CSV Files",
          extensions: [format]
        }]
      });

      if (!filePath) {
        // User cancelled the dialog
        return;
      }

      await writeTextFile(filePath, content);
      toast.success(`Exported ${alerts.length} records to ${filePath}`);
    } catch (e) {
      toast.error("Export failed", { description: String(e) });
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      const filePath = await save({
        defaultPath: `guard_shield_snapshot_${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: "Database Snapshot", extensions: ["db"] }]
      });
      if (filePath) {
        await invoke("save_snapshot", { destination: filePath });
        toast.success(`Snapshot saved successfully to ${filePath}`);
      }
    } catch (e) {
      toast.error("Failed to save snapshot", { description: String(e) });
    }
  };

  const handleRestoreSnapshot = async () => {
    try {
      const filePath = await open({
        filters: [{ name: "Database Snapshot", extensions: ["db"] }],
        multiple: false,
        directory: false
      });
      if (filePath && !Array.isArray(filePath)) {
        await invoke("restore_snapshot", { source: filePath });
        toast.success("Snapshot restored successfully. App is restarting...");
      }
    } catch (e) {
      toast.error("Failed to restore snapshot", { description: String(e) });
    }
  };

  return (
    <div className="w-full border-b py-2 text-sm">
      <Menubar className="border-none">
        {/* ── File ── */}
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Export Data</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onSelect={() => handleExportData('csv')}>
                  Export as CSV <MenubarShortcut>Ctrl+Shift+E</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onSelect={() => handleExportData('json')}>Export as JSON</MenubarItem>
                <MenubarItem onSelect={() => toast.info('PDF export coming soon')}>Export as PDF Report</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem onSelect={handleRestoreSnapshot}>
              Restore Snapshot... <MenubarShortcut>Ctrl+I</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={handleSaveSnapshot}>
              Save Snapshot... <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => window.print()}>
              Print Report... <MenubarShortcut>Ctrl+P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Monitoring ── */}
        <MenubarMenu>
          <MenubarTrigger>Monitoring</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => window.dispatchEvent(new Event("ui-start-capture"))}>
              Start Capture <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onSelect={() => window.dispatchEvent(new Event("ui-stop-capture"))}>
              Stop Capture <MenubarShortcut>Ctrl+Shift+X</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => toast.info('Pause Alerts coming soon')}>Pause All Alerts</MenubarItem>
            <MenubarItem onSelect={() => toast.info('Clear Alert History coming soon')}>Clear Alert History</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Network ── */}
        <MenubarMenu>
          <MenubarTrigger>Network</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={openNetworkingSettingsWindow}>
              Networking Settings <MenubarShortcut>Ctrl+N</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => navigate('/inbound-rules')}>Inbound Rules</MenubarItem>
            <MenubarItem onSelect={() => navigate('/outbound-rules')}>Outbound Rules</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => navigate('/blocked-ips')}>Blocked IPs</MenubarItem>
            <MenubarItem onSelect={() => navigate('/whitelisted-ips')}>Whitelisted IPs</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Security ── */}
        <MenubarMenu>
          <MenubarTrigger>Security</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => navigate('/threat-feed')}>
              Threat Feed <MenubarShortcut>Ctrl+T</MenubarShortcut>
            </MenubarItem>
            
            <MenubarSub>
              <MenubarSubTrigger>IDS Mode</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup value={idsMode} onValueChange={(val) => {
                  setIdsMode(val);
                  if (val === "detection") {
                    invoke("toggle_auto_block", { enabled: false }).catch(console.error);
                  } else if (val === "prevention") {
                    invoke("toggle_auto_block", { enabled: true }).catch(console.error);
                  }
                }}>
                  <MenubarRadioItem value="detection">Detection Only</MenubarRadioItem>
                  <MenubarRadioItem value="prevention">Prevention (Active Block)</MenubarRadioItem>
                  <MenubarRadioItem value="hybrid" disabled>Hybrid</MenubarRadioItem>
                  <MenubarRadioItem value="learning" disabled>Learning Mode</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem onSelect={() => setQuickBlockOpen(true)}>
              Quick Block IP... <MenubarShortcut>Ctrl+Shift+B</MenubarShortcut>
            </MenubarItem>
            
          </MenubarContent>
        </MenubarMenu>

        {/* ── Tools ── */}
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => navigate('/audit-logs')}>
              Audit Logs <MenubarShortcut>Ctrl+L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => navigate('/event-timeline')}>Event Timeline</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setDnsLookupOpen(true)}>DNS Lookup</MenubarItem>
            <MenubarItem onSelect={openWhoisLookupWindow}>Whois Lookup</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={openContactSupportWindow}>Contact Support</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── View ── */}
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => window.dispatchEvent(new Event('toggle-sidebar'))}>
              Toggle Sidebar <MenubarShortcut>Ctrl+B</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Theme</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup value={theme} onValueChange={(val) => setTheme(val as "light" | "dark" | "system")}>
                  <MenubarRadioItem value="light">Light</MenubarRadioItem>
                  <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
                  <MenubarRadioItem value="system">System Default</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger>Font Size</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup value={fontSize} onValueChange={handleFontSizeChange}>
                  <MenubarRadioItem value="small">Small</MenubarRadioItem>
                  <MenubarRadioItem value="medium">Default</MenubarRadioItem>
                  <MenubarRadioItem value="large">Large</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem onSelect={() => { localStorage.clear(); window.location.reload(); }}>Reset Layout</MenubarItem>
            <MenubarItem onSelect={toggleFullscreen}>
              Fullscreen <MenubarShortcut>F11</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <Dialog open={quickBlockOpen} onOpenChange={setQuickBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Block IP</DialogTitle>
            <DialogDescription>
              Enter an IP address to immediately add it to the active firewall blocklist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input 
              placeholder="e.g. 192.168.1.100" 
              value={ipToBlock} 
              onChange={(e) => setIpToBlock(e.target.value)} 
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickBlockOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockIp} disabled={!ipToBlock.trim()}>
              Block IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dnsLookupOpen} onOpenChange={setDnsLookupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DNS Lookup</DialogTitle>
            <DialogDescription>
              Enter a domain name to resolve its IP addresses, or an IP address to resolve its hostname.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="e.g. google.com or 8.8.8.8" 
                value={dnsQuery} 
                onChange={(e) => setDnsQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleDnsLookup()}
                autoFocus
              />
              <Button onClick={handleDnsLookup} disabled={dnsLoading || !dnsQuery.trim()}>
                {dnsLoading ? "Looking up..." : "Lookup"}
              </Button>
            </div>
            {dnsError && <p className="text-sm text-destructive">{dnsError}</p>}
            {dnsResults.length > 0 && (
              <div className="bg-muted p-3 rounded-md text-sm break-all font-mono">
                {dnsResults.map((r, i) => <div key={i}>{r}</div>)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Infobar;
