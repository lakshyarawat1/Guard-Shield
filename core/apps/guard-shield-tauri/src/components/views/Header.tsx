
import { Activity, Bell, ChevronDown, Monitor, Shield, ShieldAlert } from "lucide-react";
import { Separator } from "../../components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

async function openProfileWindow() {
  try {
    const win = new WebviewWindow('profile', {
      url: '/#/profile',
      title: 'My Profile',
      width: 800,
      height: 700,
    });
    // Wait for the window to be created, this will throw if there's an IPC permission error
    await win.once('tauri://created', function () {
      console.log('Window created successfully');
    });
    win.once('tauri://error', function (e) {
      // SECURITY: Log detailed error to console but show generic message to avoid leaking internals
      console.error('Tauri Error:', e);
      alert('Failed to open window due to an internal error.');
    });
  } catch (e: any) {
    // SECURITY: Log detailed error to console but show generic message to avoid leaking internals
    console.error("Error opening window:", e);
    alert("Failed to open window.");
  }
}

async function openCreateRuleWindow() {
  try {
    const win = new WebviewWindow('create-rule', {
      url: '/#/create-rule',
      title: 'Create Custom Rule',
      width: 900,
      height: 700,
    });
    await win.once('tauri://created', function () {
      console.log('Window created successfully');
    });
    win.once('tauri://error', function (e) {
      // SECURITY: Log detailed error to console but show generic message to avoid leaking internals
      console.error('Tauri Error:', e);
      alert('Failed to open window due to an internal error.');
    });
  } catch (e: any) {
    // SECURITY: Log detailed error to console but show generic message to avoid leaking internals
    console.error("Error opening window:", e);
    alert("Failed to open window.");
  }
}

export const openGeneralSettingsWindow = async () => {
  try {
    const win = new WebviewWindow('general-settings', {
      url: '/#/settings/general',
      title: 'General Settings',
      width: 900,
      height: 700,
    });
    await win.once('tauri://created', function () {
      console.log('Window created successfully');
    });
    win.once('tauri://error', function (e) {
      // SECURITY: Log detailed error to console but show generic message to avoid leaking internals
      console.error('Tauri Error:', e);
      alert('Failed to open window due to an internal error.');
    });
  } catch (e: any) {
    // SECURITY: Log detailed error to console but show generic message to avoid leaking internals
    console.error("Error opening window:", e);
    alert("Failed to open window.");
  }
};

export function Header() {
  const [isCapturing, setIsCapturing] = useState<boolean>(() => {
    const saved = localStorage.getItem("guard_shield_is_capturing");
    return saved ? saved === "true" : true;
  });
  
  const [threatCount, setThreatCount] = useState<number>(0);
  const [packetRate, setPacketRate] = useState<number>(0);

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
      } catch (e) {
        console.error("Global capture start failed:", e);
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
                Default <ChevronDown className="size-4" />{" "}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[20rem]">
              <DropdownMenuItem onSelect={openCreateRuleWindow} className="justify-center text-primary font-medium cursor-pointer">
                + Create Custom Rule...
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem className="justify-center text-muted-foreground" disabled>
                No Custom Rules Found
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex items-center gap-3 mr-4">
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
