import { Shield, Ban, AlertCircle, Plus, Trash2, Power, PowerOff, Save, X, Server, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface CustomRule {
  id?: number;
  name: string;
  description: string;
  action: string;
  src_ip: string | null;
  dst_ip: string | null;
  protocol: string;
  src_port: string | null;
  dst_port: string | null;
  is_active: boolean;
}

const ruleTemplates = [
  {
    id: "block-ssh",
    name: "Block External SSH",
    description: "Drops all incoming SSH connections on port 22 to prevent brute force attacks.",
    icon: <Ban className="size-5 text-destructive" />,
    type: "Industry Standard",
    badgeColor: "bg-destructive/10 text-destructive",
    ruleDef: { name: "Block External SSH", description: "Drops all incoming SSH connections on port 22 to prevent brute force attacks.", action: "Alert", protocol: "TCP", src_ip: null, dst_ip: null, src_port: null, dst_port: "22", is_active: true }
  },
  {
    id: "drop-icmp",
    name: "Drop ICMP (Ping)",
    description: "Drops all ICMP echo requests (ping) to hide from basic network scanners.",
    icon: <Globe className="size-5 text-orange-500" />,
    type: "Basic Rule",
    badgeColor: "bg-orange-500/10 text-orange-500",
    ruleDef: { name: "Drop ICMP (Ping)", description: "Drops all ICMP echo requests (ping) to hide from basic network scanners.", action: "Alert", protocol: "ICMP", src_ip: null, dst_ip: null, src_port: null, dst_port: null, is_active: true }
  },
  {
    id: "allow-web",
    name: "Allow Web Traffic",
    description: "Allows incoming TCP traffic on ports 80 (HTTP) and 443 (HTTPS).",
    icon: <Server className="size-5 text-emerald-500" />,
    type: "Industry Standard",
    badgeColor: "bg-emerald-500/10 text-emerald-500",
    ruleDef: { name: "Allow Web Traffic", description: "Allows incoming TCP traffic on ports 80 (HTTP) and 443 (HTTPS).", action: "Alert", protocol: "TCP", src_ip: null, dst_ip: null, src_port: null, dst_port: "443", is_active: true }
  },
  {
    id: "block-malware-ports",
    name: "Block Known Malware Ports",
    description: "Blocks a curated list of ports commonly used by trojans and ransomware.",
    icon: <Shield className="size-5 text-indigo-500" />,
    type: "Advanced Rule",
    badgeColor: "bg-indigo-500/10 text-indigo-500",
    ruleDef: { name: "Block Known Malware Ports", description: "Blocks a curated list of ports commonly used by trojans and ransomware.", action: "Alert", protocol: "TCP", src_ip: null, dst_ip: null, src_port: null, dst_port: "445", is_active: true }
  }
];

export default function CreateRule() {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  
  // Builder State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState("Any");
  const [action, setAction] = useState("Alert");
  const [srcIp, setSrcIp] = useState("");
  const [dstIp, setDstIp] = useState("");
  const [srcPort, setSrcPort] = useState("");
  const [dstPort, setDstPort] = useState("");

  const loadRules = async () => {
    try {
      const fetched = await invoke<CustomRule[]>("fetch_custom_rules");
      setRules(fetched);
    } catch(e) { console.error("Failed to load rules", e); }
  };

  useEffect(() => { loadRules(); }, []);

  const handleSaveRule = async () => {
    if (!name.trim()) return;
    try {
      await invoke("add_custom_rule", {
        rule: {
          name: name.trim(),
          description: description.trim(),
          action,
          protocol,
          src_ip: srcIp.trim() || null,
          dst_ip: dstIp.trim() || null,
          src_port: srcPort.trim() || null,
          dst_port: dstPort.trim() || null,
          is_active: true
        }
      });
      setIsBuilding(false);
      setName(""); setDescription(""); setSrcIp(""); setDstIp(""); setSrcPort(""); setDstPort("");
      loadRules();
    } catch(e) { console.error("Failed to save rule", e); }
  };

  const handleToggle = async (id: number, current: boolean) => {
    try {
      await invoke("toggle_custom_rule_state", { id, isActive: !current });
      loadRules();
    } catch(e) { console.error("Failed to toggle rule", e); }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoke("remove_custom_rule", { id });
      loadRules();
    } catch(e) { console.error("Failed to delete rule", e); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <AlertCircle className="size-8 text-primary" />
              Custom Rules Engine
            </h1>
            <p className="text-muted-foreground mt-2">
              Define deep packet inspection rules, manage threat signatures, and control network access.
            </p>
          </div>
          {!isBuilding && (
            <Button onClick={() => setIsBuilding(true)} className="gap-2">
              <Plus className="size-4" /> New Rule
            </Button>
          )}
        </div>

        {isBuilding && (
          <div className="mb-8 rounded-sm border bg-card text-card-foreground shadow-sm p-6 animate-in slide-in-from-top-4 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Rule Builder</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsBuilding(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <Separator className="mb-6" />
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-2 col-span-2 bg-muted/50 p-4 rounded-md border border-dashed mb-2">
                <Label>Load from Template (Optional)</Label>
                <Select onValueChange={(val) => {
                  if (val === "custom") {
                    setName(""); setDescription(""); setProtocol("Any"); setAction("Alert");
                    setSrcIp(""); setDstIp(""); setSrcPort(""); setDstPort("");
                    return;
                  }
                  const tmpl = ruleTemplates.find(t => t.id === val);
                  if (tmpl) {
                    setName(tmpl.ruleDef.name);
                    setDescription(tmpl.ruleDef.description);
                    setProtocol(tmpl.ruleDef.protocol);
                    setAction(tmpl.ruleDef.action);
                    setSrcIp(tmpl.ruleDef.src_ip || "");
                    setDstIp(tmpl.ruleDef.dst_ip || "");
                    setSrcPort(tmpl.ruleDef.src_port || "");
                    setDstPort(tmpl.ruleDef.dst_port || "");
                  }
                }}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select a template or build from scratch..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom (Start from scratch)</SelectItem>
                    {ruleTemplates.map(tmpl => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Rule Name</Label>
                <Input placeholder="e.g. Block External SSH" value={name} onChange={(e: any) => setName(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <textarea 
                  placeholder="What does this rule catch?" 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={description} 
                  onChange={(e: any) => setDescription(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alert">Alert Only</SelectItem>
                    <SelectItem value="Drop" disabled>Drop Packet (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any">Any</SelectItem>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="ICMP">ICMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source IP</Label>
                <Input placeholder="e.g. 192.168.1.1 (Leave empty for ANY)" value={srcIp} onChange={(e: any) => setSrcIp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Destination IP</Label>
                <Input placeholder="e.g. 10.0.0.5 (Leave empty for ANY)" value={dstIp} onChange={(e: any) => setDstIp(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Source Port</Label>
                <Input placeholder="e.g. 443 (Leave empty for ANY)" value={srcPort} onChange={(e: any) => setSrcPort(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Destination Port</Label>
                <Input placeholder="e.g. 22 (Leave empty for ANY)" value={dstPort} onChange={(e: any) => setDstPort(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBuilding(false)}>Cancel</Button>
              <Button onClick={handleSaveRule} disabled={!name} className="gap-2">
                <Save className="size-4" /> Save Rule
              </Button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-xl font-bold">Active Rules</h3>
        </div>

        <div className="grid gap-3 grid-cols-1">
          {rules.length === 0 && !isBuilding ? (
            <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground">
              No custom rules defined yet. Click "New Rule" to create one.
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className={`rounded-sm border shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all ${rule.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
                <div className="flex items-center gap-4 sm:w-[35%] shrink-0">
                  <div className={`p-2 rounded-md shrink-0 ${rule.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {rule.is_active ? <Shield className="size-5" /> : <Ban className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">{rule.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{rule.protocol}</Badge>
                      <Badge variant={rule.action === "Alert" ? "default" : "destructive"} className="text-[10px]">{rule.action}</Badge>
                    </div>
                  </div>
                </div>
                
                <Separator className="hidden sm:block h-10" orientation="vertical" />
                
                <div className="text-xs text-muted-foreground flex-1 space-y-1">
                  <p className="font-medium text-foreground">{rule.description || "No description provided."}</p>
                  <p>Src: {rule.src_ip || "ANY"} : {rule.src_port || "ANY"} &rarr; Dst: {rule.dst_ip || "ANY"} : {rule.dst_port || "ANY"}</p>
                </div>

                <div className="flex items-center justify-end w-full sm:w-auto mt-2 sm:mt-0 shrink-0 gap-2">
                  <Button variant="outline" size="sm" className="w-28" onClick={() => handleToggle(rule.id!, rule.is_active)}>
                    {rule.is_active ? <><PowerOff className="size-3 mr-2" /> Disable</> : <><Power className="size-3 mr-2" /> Enable</>}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(rule.id!)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
