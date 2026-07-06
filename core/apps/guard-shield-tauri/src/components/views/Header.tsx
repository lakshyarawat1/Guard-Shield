import { Activity, Bell, ChevronDown, Shield, ShieldAlert, ShieldBan, User } from "lucide-react";
import { Separator } from "../../components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useEffect, useState, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { useNativeRBAC } from "../auth/NativeRBACProvider";
import {
  openProfileWindow,
  openCreateRuleWindow,
} from "../../utils/windows";

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

// Global telemetry variables removed to favor component state and proper React lifecycle

export function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { organizations, activeOrganization, setActiveOrganization } = useNativeRBAC();

  const [isCapturing, setIsCapturing] = useState<boolean>(() => {
    return localStorage.getItem("guard_shield_is_capturing") === "true";
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [threatCount, setThreatCount] = useState<number>(0);
  const [droppedPackets, setDroppedPackets] = useState<number>(0);
  const notifCriticalOnlyRef = useRef<boolean>(true);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [customRules, setCustomRules] = useState<{id: number, name: string, is_active: boolean}[]>([]);

  useEffect(() => {
    invoke("fetch_settings").then((res: any) => {
      if (res.notificationsCriticalOnly === "false") {
        notifCriticalOnlyRef.current = false;
      }
    }).catch(console.error);
    
    const interval = setInterval(() => {
      const snoozeUntilStr = localStorage.getItem("guard_shield_snooze_until") || "0";
      const snoozeUntil = parseInt(snoozeUntilStr, 10);
      setIsSnoozed(Date.now() < snoozeUntil);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSnoozeToggle = () => {
    if (isSnoozed) {
      localStorage.setItem("guard_shield_snooze_until", "0");
      setIsSnoozed(false);
      toast.success("Notifications enabled");
    } else {
      const until = Date.now() + 3600000;
      localStorage.setItem("guard_shield_snooze_until", until.toString());
      setIsSnoozed(true);
      toast.dismiss(); // Clear any queued toasts instantly
      toast.info("Notifications snoozed for 1 hour");
    }
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

  // ⚡ Bolt Optimization: Memoize the count of active rules to prevent O(N) array filtering on every render cycle
  const activeRulesCount = useMemo(() => {
    return customRules.filter(r => r.is_active).length;
  }, [customRules]);

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
  
  const [packetRate, setPacketRate] = useState<number>(0);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>(() => localStorage.getItem("guard_shield_interface") || "");

  useEffect(() => {
    invoke("get_telemetry_stats").then((s: any) => {
      setThreatCount(s.total_alerts || 0);
    }).catch(console.error);

    let unlistenAlertPromise: Promise<() => void>;
    
    const setupAlerts = () => {
      unlistenAlertPromise = listen("intrusion-alert", (event: any) => {
        setThreatCount(prev => prev + 1);
        const alert = event.payload;
        setRecentAlerts(prev => [alert, ...prev].slice(0, 5));

        const snoozeUntilStr = localStorage.getItem("guard_shield_snooze_until") || "0";
        const snoozeUntil = parseInt(snoozeUntilStr, 10);
        if (Date.now() < snoozeUntil) return;

        if (notifCriticalOnlyRef.current && alert.severity !== "Critical" && alert.severity !== "High") return;

        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        toast.error(`[${timeStr}] Threat Blocked: ${alert.src_ip}`, {
          description: alert.reason,
          action: {
            label: "Snooze 1h",
            onClick: () => {
               const until = Date.now() + 3600000;
               localStorage.setItem("guard_shield_snooze_until", until.toString());
               toast.dismiss(); // Clear any queued toasts instantly
               toast.info("Notifications snoozed for 1 hour");
            }
          }
        });
      });
    };
    setupAlerts();

    let unlistenPacketsPromise: Promise<() => void>;
    let packetCountInSec = 0;

    const setupPackets = () => {
      unlistenPacketsPromise = listen<any[]>("packets-batch", (event) => {
        packetCountInSec += event.payload.length;
      });
    };
    setupPackets();

    const interval = setInterval(() => {
      setPacketRate(packetCountInSec);
      packetCountInSec = 0;
    }, 1000);

    return () => {
      if (unlistenAlertPromise) unlistenAlertPromise.then(f => f());
      if (unlistenPacketsPromise) unlistenPacketsPromise.then(f => f());
      clearInterval(interval);
    };
  }, []);

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
                {activeRulesCount > 0
                  ? `${activeRulesCount} Rules Active`
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
                      e.preventDefault();
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
            <div className="flex flex-col items-end justify-center">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Threats Blocked</span>
              <span className="text-sm font-bold text-destructive leading-none mt-0.5">{threatCount}</span>
            </div>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="flex flex-col items-start justify-center">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Packet Rate</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Activity className="size-3 text-emerald-500 animate-pulse" />
                <span className="text-sm font-bold leading-none">{packetRate} <span className="text-[10px] font-medium text-muted-foreground">p/s</span></span>
              </div>
            </div>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="flex flex-col items-start justify-center">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dropped</span>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldBan className="size-3 text-destructive" />
                <span className="text-sm font-bold text-destructive leading-none">{droppedPackets}</span>
              </div>
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
                  <Badge variant="secondary" className="text-xs">{recentAlerts.length} new</Badge>
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                  <span className="text-sm">Snooze (1 Hour)</span>
                  <div 
                    className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${isSnoozed ? 'bg-primary' : 'bg-muted'}`}
                    onClick={(e) => { e.preventDefault(); handleSnoozeToggle(); }}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isSnoozed ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>
                <div className="flex flex-col max-h-[300px] overflow-y-auto">
                  {recentAlerts.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">No recent alerts</div>
                  ) : (
                    recentAlerts.map((alert, idx) => (
                      <DropdownMenuItem key={idx} className="flex flex-col items-start gap-1 p-4 cursor-pointer border-b rounded-none focus:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className={`size-4 ${alert.severity === 'Critical' ? 'text-destructive' : (alert.severity === 'High' ? 'text-orange-500' : 'text-yellow-500')}`} />
                          <span className="font-semibold text-sm">Threat Blocked</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{alert.reason} from {alert.src_ip}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <div className="p-2 border-t text-center">
                  <Button variant="ghost" className="w-full text-xs h-8 cursor-pointer">Mark all as read</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Organization Switcher */}
            <div className="flex items-center">
              <Select 
                value={activeOrganization?.id || ""} 
                onValueChange={(val) => {
                  if (val === "new") {
                    navigate("/org-select");
                  } else {
                    setActiveOrganization(val);
                  }
                }}
              >
                <SelectTrigger className="w-[200px] h-9 border-input bg-background/50 hover:bg-accent hover:text-accent-foreground font-medium">
                  <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <SelectItem value="new" className="text-primary font-medium cursor-pointer">
                    + Create Organization
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex items-center gap-2 px-4 cursor-pointer"
                  variant="outline"
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt={user.fullName || "User"} className="size-5 rounded-full" />
                  ) : (
                    <User className="size-4" />
                  )}
                  {user?.firstName || "Guest"} <ChevronDown className="size-4" />{" "}
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
                <DropdownMenuItem className="cursor-pointer text-destructive" onSelect={() => signOut(() => navigate("/login"))}>
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
