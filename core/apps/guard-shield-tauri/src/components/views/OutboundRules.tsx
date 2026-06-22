import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowRightCircle, Trash2, Plus, Power, PowerOff } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { openCreateRuleWindow } from "../../utils/windows";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";

interface CustomRule {
  id?: number;
  name: string;
  description: string;
  action: string;
  src_ip: string | null;
  dst_ip: string | null;
  protocol: string;
  src_port: string | null;
  dst_port: string | null;
  direction: string;
  is_active: boolean;
}

export default function OutboundRules() {
  const [rules, setRules] = useState<CustomRule[]>([]);

  const loadRules = async () => {
    try {
      const fetched = await invoke<CustomRule[]>("fetch_custom_rules");
      setRules(fetched.filter(r => r.direction === "Outbound" || r.direction === "Both"));
    } catch(e) {
      console.error("Failed to load rules", e);
    }
  };

  useEffect(() => {
    loadRules();
    // Poll for updates in case rule is created from other window
    const interval = setInterval(loadRules, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteRule = async (id: number) => {
    try {
      await invoke("delete_custom_rule", { id });
      setRules(rules.filter(r => r.id !== id));
      toast.success("Rule deleted");
    } catch(e) {
      toast.error("Failed to delete rule");
    }
  };

  const handleToggleRule = async (id: number, active: boolean) => {
    try {
      await invoke("toggle_custom_rule", { id, active });
      loadRules();
      toast.success(active ? "Rule enabled" : "Rule disabled");
    } catch(e) {
      toast.error("Failed to toggle rule state");
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-col h-[calc(100vh-50px)]">
        <Infobar />
        <div className="flex h-full w-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 relative overflow-hidden bg-muted/10 flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ArrowRightCircle className="size-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Outbound Rules</h1>
              </div>
              <Button onClick={openCreateRuleWindow} className="gap-2">
                <Plus className="size-4" /> Create Rule
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pr-4">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <ArrowRightCircle className="size-12 mb-4 opacity-20" />
              <p>No outbound rules configured.</p>
              <p className="text-sm">Click 'Create Rule' to add one.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div 
                key={rule.id} 
                className={`flex flex-col p-4 rounded-lg border shadow-sm transition-colors ${
                  !rule.is_active ? 'opacity-60 bg-muted/30' : 'bg-card'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                    {!rule.is_active && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                    <Badge variant={rule.action === "Drop" ? "destructive" : "secondary"}>
                      {rule.action}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={rule.is_active ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" : ""}
                      onClick={() => handleToggleRule(rule.id!, !rule.is_active)}
                      title={rule.is_active ? "Disable Rule" : "Enable Rule"}
                    >
                      {rule.is_active ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteRule(rule.id!)}
                      title="Delete Rule"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {rule.description || "No description provided."}
                </p>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="bg-background">
                    Protocol: <span className="font-mono ml-1">{rule.protocol}</span>
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Direction: <span className="font-mono ml-1 text-primary">{rule.direction}</span>
                  </Badge>
                  {rule.src_ip && (
                    <Badge variant="outline" className="bg-background">
                      Source IP: <span className="font-mono ml-1">{rule.src_ip}</span>
                    </Badge>
                  )}
                  {rule.src_port && (
                    <Badge variant="outline" className="bg-background">
                      Source Port: <span className="font-mono ml-1">{rule.src_port}</span>
                    </Badge>
                  )}
                  {rule.dst_ip && (
                    <Badge variant="outline" className="bg-background">
                      Dest IP: <span className="font-mono ml-1">{rule.dst_ip}</span>
                    </Badge>
                  )}
                  {rule.dst_port && (
                    <Badge variant="outline" className="bg-background">
                      Dest Port: <span className="font-mono ml-1">{rule.dst_port}</span>
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
