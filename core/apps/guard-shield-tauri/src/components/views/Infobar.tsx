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
import { useState, useEffect } from "react";
import { useTheme } from "../ThemeProvider";
import { useNavigate } from "react-router-dom";
import { openNetworkingSettingsWindow, openWhoisLookupWindow, openContactSupportWindow } from "./Header";
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

  const handleBlockIp = () => {
    // Here we'd call the Tauri backend to block the IP
    console.log("Blocking IP:", ipToBlock);
    setIpToBlock("");
    setQuickBlockOpen(false);
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
                <MenubarItem>
                  Export as CSV <MenubarShortcut>Ctrl+Shift+E</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>Export as JSON</MenubarItem>
                <MenubarItem>Export as PDF Report</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem>
              Import Rules... <MenubarShortcut>Ctrl+I</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Save Snapshot <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
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
            <MenubarItem>Pause All Alerts</MenubarItem>
            <MenubarItem>Clear Alert History</MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Auto-Refresh</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>5 seconds</MenubarItem>
                <MenubarItem>10 seconds</MenubarItem>
                <MenubarItem>30 seconds</MenubarItem>
                <MenubarItem>1 minute</MenubarItem>
                <MenubarItem>Off</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
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
            <MenubarItem>Inbound Rules</MenubarItem>
            <MenubarItem>Outbound Rules</MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Ports</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Well-Known Ports (0–1023)</MenubarItem>
                <MenubarItem>Registered Ports (1024–49151)</MenubarItem>
                <MenubarItem>Custom Port Ranges...</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Blocked IPs</MenubarItem>
            <MenubarItem>Whitelisted IPs</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Security ── */}
        <MenubarMenu>
          <MenubarTrigger>Security</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Threat Feed <MenubarShortcut>Ctrl+T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Protocol Inspector <MenubarShortcut>Ctrl+R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
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
            <MenubarItem>
              Scan Network Now <MenubarShortcut>Ctrl+Shift+N</MenubarShortcut>
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
            <MenubarItem>Packet Decoder</MenubarItem>
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
            <MenubarItem>
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
                <MenubarItem>Small</MenubarItem>
                <MenubarItem>Default</MenubarItem>
                <MenubarItem>Large</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Reset Layout</MenubarItem>
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
