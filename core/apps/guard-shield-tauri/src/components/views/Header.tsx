
import { Activity, Bell, ChevronDown, Monitor, Shield, ShieldAlert, ShieldBan } from "lucide-react";
import { Separator } from "../../components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
} from "../../components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";


async function openOrFocusWindow(
  label: string,
  url: string,
  title: string,
  width: number,
  height: number
) {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const win = new WebviewWindow(label, {
      url,
      title,
      width,
      height,
    });
    await win.once('tauri://created', function () {
      console.log(`Window ${label} created successfully`);
    });
    win.once('tauri://error', function (e) {
      console.error(`Tauri Error for ${label}:`, e);
      alert(`Failed to open window due to an internal error.`);
    });
  } catch (e: any) {
    console.error(`Error opening window ${label}:`, e);
    alert(`Failed to open window.`);
  }
}

export const openProfileWindow = async () => {
  await openOrFocusWindow('profile', '/#/profile', 'My Profile', 800, 700);
};

export const openCreateRuleWindow = async () => {
  await openOrFocusWindow('create-rule', '/#/create-rule', 'Create Custom Rule', 900, 700);
};

export const openGeneralSettingsWindow = async () => {
  await openOrFocusWindow('general-settings', '/#/settings/general', 'General Settings', 900, 700);
};

export const openContactSupportWindow = async () => {
  await openOrFocusWindow('contact-support', '/#/contact', 'Contact Support', 800, 650);
};

export const openWhoisLookupWindow = async () => {
  await openOrFocusWindow('whois-lookup', '/#/whois', 'Whois Lookup', 900, 700);
};

export const openNetworkingSettingsWindow = async () => {
  await openOrFocusWindow('networking-settings', '/#/settings/networking', 'Networking Settings', 900, 700);
};

export const applyFontSize = (size: string) => {
  const root = document.documentElement;
  if (size === "small") {
    root.style.fontSize = "14px";
  } else if (size === "large") {
    root.style.fontSize = "18px";
  } else {
    root.style.fontSize = "16px"; // default medium
  }
};

export function Header() {
  const [isCapturing, setIsCapturing] = useState<boolean>(() => {
    return localStorage.getItem("guard_shield_is_capturing") === "true";
  });
  
  const [customRules, setCustomRules] = useState<{id: number, name: string, is_active: boolean}[]>([]);
  const [droppedPackets, setDroppedPackets] = useState<number>(0);
  
  const [fontSize, setFontSize] = useState<string>(() => {
    return localStorage.getItem("guard_shield_font_size") || "medium";
  });

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem("guard_shield_font_size", size);
    applyFontSize(size);
  };
  
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    return localStorage.getItem("guard_shield_show_sidebar") !== "false";
  });

  useEffect(() => {
    const handleSync = () => {
      setShowSidebar(localStorage.getItem("guard_shield_show_sidebar") !== "false");
    };
    window.addEventListener("toggle-sidebar", handleSync);
    return () => window.removeEventListener("toggle-sidebar", handleSync);
  }, []);

  const handleToggleSidebar = () => {
    const current = localStorage.getItem("guard_shield_show_sidebar") !== "false";
    localStorage.setItem("guard_shield_show_sidebar", String(!current));
    window.dispatchEvent(new Event("toggle-sidebar"));
  };

  useEffect(() => {
    const fetchDroppedPackets = async () => {
      try {
        const count: number = await invoke("get_dropped_packets");
        setDroppedPackets(count);
      } catch (e: any) {
        toast.error(`Capture Error: ${e.toString()}`);
      }
    };
    
    // Fetch every second to keep the counter live
    const interval = setInterval(fetchDroppedPackets, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch rules periodically or on mount
    const fetchRules = async () => {
      try {
        const rules = await invoke<{id: number, name: string, is_active: boolean}[]>("fetch_custom_rules");
        setCustomRules(rules);
      } catch (e) { console.error("Failed to fetch custom rules in header", e); }
    };
    
    fetchRules();
    
    // Poll rules every 2 seconds to keep header in sync with CreateRule page
    const interval = setInterval(fetchRules, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const [threatCount, setThreatCount] = useState<number>(0);
  const [packetRate, setPacketRate] = useState<number>(0);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>(() => localStorage.getItem("guard_shield_interface") || "");

  useEffect(() => {
    invoke<string[]>("get_network_interfaces").then(ifaces => {
      setInterfaces(ifaces);
      if (ifaces.length > 0) {
        let savedIface = localStorage.getItem("guard_shield_interface");
        if (!savedIface || !ifaces.includes(savedIface)) {
          savedIface = ifaces.find((i) => !i.toLowerCase().includes("loopback")) || ifaces[0];
          localStorage.setItem("guard_shield_interface", savedIface);
        }
        setSelectedInterface(savedIface);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let unlistenAlert: () => void;
    let unlistenPackets: () => void;
    let packetCountInSec = 0;

    invoke("get_telemetry_stats").then((s: any) => setThreatCount(s.total_alerts)).catch(console.error);

    const setupTelemetry = async () => {
      unlistenAlert = await listen("intrusion-alert", () => {
        setThreatCount(prev => prev + 1);
      });
      unlistenPackets = await listen<any[]>("packets-batch", (event) => {
        packetCountInSec += event.payload.length;
      });
    };
    setupTelemetry();

    const interval = setInterval(() => {
      setPacketRate(packetCountInSec);
      packetCountInSec = 0;
    }, 1000);

    return () => {
      if (unlistenAlert) unlistenAlert();
      if (unlistenPackets) unlistenPackets();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const startBackendCapture = async () => {
      try {
        let iface = localStorage.getItem("guard_shield_interface");
        if (!iface) {
          const ifaces = await invoke<string[]>("get_network_interfaces");
          iface = ifaces.find((i) => !i.toLowerCase().includes("loopback")) || ifaces[0];
          if (iface) localStorage.setItem("guard_shield_interface", iface);
        }
        if (iface) {
          await invoke("start_packet_capture", { interfaceName: iface, bpfFilter: "" });
        }
      } catch (e: any) {
        toast.error(`Capture Error: ${e.toString()}`);
        setIsCapturing(false);
        localStorage.setItem("guard_shield_is_capturing", "false");
      }
    };

    const handleStart = () => {
      localStorage.setItem("guard_shield_is_capturing", "true");
      setIsCapturing(true);
      startBackendCapture();
    };
    
    const handleStop = () => {
      localStorage.setItem("guard_shield_is_capturing", "false");
      setIsCapturing(false);
      invoke("stop_packet_capture").catch(console.error);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleStart();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleStop();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const current = localStorage.getItem("guard_shield_show_sidebar") !== "false";
        localStorage.setItem("guard_shield_show_sidebar", String(!current));
        window.dispatchEvent(new Event("toggle-sidebar"));
      }
    };

    window.addEventListener("ui-start-capture", handleStart);
    window.addEventListener("ui-stop-capture", handleStop);
    window.addEventListener("keydown", handleKeyDown);

    // Initial boot capture check
    if (isCapturing) {
      startBackendCapture();
    } else {
      invoke("stop_packet_capture").catch(console.error);
    }
    
    return () => {
      window.removeEventListener("ui-start-capture", handleStart);
      window.removeEventListener("ui-stop-capture", handleStop);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCapturing]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background h-full ">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex h-full items-center">
          <a href="/home" className="mr-6 flex items-center space-x-2 cursor-pointer">
            <Shield className="size-5" />
            <span className="inline-block font-semibold tracking-tight">Guard Shield</span>
          </a>
          <Separator orientation="vertical" className="py-2 mx-2" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="flex items-center gap-2 px-4 cursor-pointer"
                variant="outline"
              >
                {customRules.filter(r => r.is_active).length > 0 
                  ? `${customRules.filter(r => r.is_active).length} Rules Active` 
                  : "No Rules Active"} <ChevronDown className="size-4" />{" "}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[20rem]">
              <DropdownMenuItem onSelect={openCreateRuleWindow} className="justify-center text-primary font-medium cursor-pointer">
                + Manage Custom Rules
              </DropdownMenuItem>
              <Separator className="my-1" />
              {customRules.length === 0 ? (
                <DropdownMenuItem className="justify-center text-muted-foreground" disabled>
                  No Custom Rules Found
                </DropdownMenuItem>
              ) : (
                customRules.map(rule => (
                  <DropdownMenuItem 
                    key={rule.id} 
                    className="flex items-center justify-between cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault(); // Don't close dropdown on toggle
                      invoke("toggle_custom_rule_state", { id: rule.id, isActive: !rule.is_active });
                    }}
                  >
                    <span className={rule.is_active ? "text-foreground" : "text-muted-foreground line-through"}>
                      {rule.name}
                    </span>
                    <Badge variant={rule.is_active ? "default" : "outline"} className="text-[10px]">
                      {rule.is_active ? "ON" : "OFF"}
                    </Badge>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="flex items-center gap-2 px-4 cursor-pointer"
                variant="outline"
              >
                View <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[12rem]">
              <DropdownMenuItem 
                onSelect={handleToggleSidebar} 
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${showSidebar ? "bg-emerald-500" : "bg-transparent"}`} />
                  <span>Sidebar</span>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  Ctrl+B
                </span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <span>Font Size</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={fontSize} onValueChange={handleFontSizeChange}>
                      <DropdownMenuRadioItem value="small" className="cursor-pointer">
                        Small
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="medium" className="cursor-pointer">
                        Medium
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="large" className="cursor-pointer">
                        Large
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="flex items-center gap-2 px-4 cursor-pointer"
                variant="outline"
              >
                Tools <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[12rem]">
              <DropdownMenuItem 
                onSelect={openWhoisLookupWindow} 
                className="cursor-pointer"
              >
                Whois & DNS Lookup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={openContactSupportWindow} 
                className="cursor-pointer font-medium"
              >
                Contact Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex items-center gap-3 mr-4">
            <div className="flex items-center gap-2">
              <Select value={selectedInterface} onValueChange={(val) => {
                setSelectedInterface(val);
                localStorage.setItem("guard_shield_interface", val);
                if (isCapturing) {
                  invoke("stop_packet_capture").then(() => {
                    invoke("start_packet_capture", { interfaceName: val, bpfFilter: "" }).catch((e: any) => toast.error(e.toString()));
                  });
                }
              }}>
                <SelectTrigger className="w-[180px] h-7 text-xs bg-muted/50 border-border/40 focus:ring-0">
                  <SelectValue placeholder="Select Interface" />
                </SelectTrigger>
                <SelectContent>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface} value={iface} className="text-xs">
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isCapturing ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              <span className={`text-xs font-medium ${isCapturing ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {isCapturing ? 'Capturing' : 'Stopped'}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="size-3" />
              <span>{packetRate} pkt/s</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="size-3" />
              <span>{threatCount} threats</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldBan className="size-3 text-destructive" />
              <span className="font-medium text-destructive">{droppedPackets} dropped</span>
            </div>
          </div>
          <nav className="flex gap-2 items-center">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="cursor-pointer relative">
                  <Bell className="size-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <span className="font-semibold">Notifications</span>
                  <Badge variant="secondary" className="text-xs">3 new</Badge>
                </div>
                <div className="flex flex-col max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-4 cursor-pointer border-b rounded-none focus:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-destructive" />
                      <span className="font-semibold text-sm">Threat Blocked</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Blocked an incoming connection on port 22 from 192.168.1.45</span>
                    <span className="text-xs text-muted-foreground opacity-50 mt-1">2 mins ago</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-4 cursor-pointer border-b rounded-none focus:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Monitor className="size-4 text-emerald-500" />
                      <span className="font-semibold text-sm">System Update</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Guard Shield rules successfully updated to latest signatures.</span>
                    <span className="text-xs text-muted-foreground opacity-50 mt-1">1 hour ago</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-4 cursor-pointer rounded-none focus:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      <span className="font-semibold text-sm">Scan Complete</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Weekly deep packet inspection scan completed with 0 issues.</span>
                    <span className="text-xs text-muted-foreground opacity-50 mt-1">Yesterday</span>
                  </DropdownMenuItem>
                </div>
                <div className="p-2 border-t text-center">
                  <Button variant="ghost" className="w-full text-xs h-8 cursor-pointer">Mark all as read</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex items-center gap-2 px-4 cursor-pointer"
                  variant="outline"
                >
                  Guest <ChevronDown className="size-4" />{" "}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={openProfileWindow} className="cursor-pointer">
                  My Profile
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem className="cursor-pointer">
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  Keyboard Shortcuts
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem className="cursor-pointer">
                  Check for Updates
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  About Guard Shield
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem className="cursor-pointer text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
