import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Shield, HardDrive, Cpu, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export default function GeneralSettings() {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearDb = async () => {
    if (!window.confirm("Are you sure you want to clear all local logs? This will delete all packets and alerts, and shrink the database file size.")) {
      return;
    }
    try {
      setIsClearing(true);
      await invoke("clear_database");
      alert("Local logs successfully cleared.");
    } catch (e) {
      console.error("Failed to clear local logs", e);
      alert("Error: " + e);
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
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="size-4 mr-2" />
            Apply Changes
          </Button>
        </div>

        <div className="space-y-8">
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
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary cursor-pointer">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Heuristics Engine</p>
                  <p className="text-sm text-muted-foreground">Use AI to detect unusual behavior anomalies that aren't in the signature database.</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary cursor-pointer">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </div>
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
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary cursor-pointer">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Hardware Acceleration</p>
                  <p className="text-sm text-muted-foreground">Offload packet inspection to available GPU compute for lower CPU overhead.</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted cursor-pointer">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </div>
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
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted cursor-pointer">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </div>
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
          
        </div>
      </div>
    </div>
  );
}
