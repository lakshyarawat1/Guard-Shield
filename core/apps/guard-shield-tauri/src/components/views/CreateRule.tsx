import { Shield, Server, Globe, Ban, AlertCircle, Plus, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

// Some standard basic & industry templates
const ruleTemplates = [
  {
    id: "block-ssh",
    name: "Block External SSH",
    description: "Drops all incoming SSH connections on port 22 to prevent brute force attacks.",
    icon: <Ban className="size-5 text-destructive" />,
    type: "Industry Standard",
    badgeColor: "bg-destructive/10 text-destructive",
  },
  {
    id: "drop-icmp",
    name: "Drop ICMP (Ping)",
    description: "Drops all ICMP echo requests (ping) to hide from basic network scanners.",
    icon: <Globe className="size-5 text-orange-500" />,
    type: "Basic Rule",
    badgeColor: "bg-orange-500/10 text-orange-500",
  },
  {
    id: "allow-web",
    name: "Allow Web Traffic",
    description: "Allows incoming TCP traffic on ports 80 (HTTP) and 443 (HTTPS).",
    icon: <Server className="size-5 text-emerald-500" />,
    type: "Industry Standard",
    badgeColor: "bg-emerald-500/10 text-emerald-500",
  },
  {
    id: "block-malware-ports",
    name: "Block Known Malware Ports",
    description: "Blocks a curated list of ports commonly used by trojans and ransomware.",
    icon: <Shield className="size-5 text-indigo-500" />,
    type: "Advanced Rule",
    badgeColor: "bg-indigo-500/10 text-indigo-500",
  }
];

export default function CreateRule() {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const handleAddClick = (id: string) => {
    setConfirmingId(id);
  };

  const handleConfirmAdd = (id: string) => {
    // In a real app, you would dispatch to backend/Tauri here
    setAddedIds((prev) => [...prev, id]);
    setConfirmingId(null);
  };

  const handleCancelConfirm = () => {
    setConfirmingId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <AlertCircle className="size-8 text-primary" />
              Create Custom Rule
            </h1>
            <p className="text-muted-foreground mt-2">
              Select from our industry-standard templates or create a custom rule to protect your network.
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-sm border border-dashed bg-card/50 text-card-foreground shadow-sm p-8 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Plus className="size-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Need a completely custom rule?</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Define specific IP ranges, protocols, ports, and deep packet inspection rules with our advanced rule builder.
          </p>
          <Button>
            Open Advanced Builder
          </Button>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold">Quick Templates</h3>
          <p className="text-sm text-muted-foreground">Select from our industry-standard templates to quickly apply rules.</p>
        </div>

        <div className="grid gap-4 grid-cols-1">
          {ruleTemplates.map((rule) => {
            const isConfirming = confirmingId === rule.id;
            const isAdded = addedIds.includes(rule.id);

            return (
              <div 
                key={rule.id} 
                className="rounded-sm border bg-card text-card-foreground shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative overflow-hidden transition-all hover:border-primary/50"
              >
                <div className="flex items-center gap-4 sm:w-[30%] shrink-0">
                  <div className="p-2 bg-muted rounded-md shrink-0">
                    {rule.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">{rule.name}</h3>
                    <Badge className={`mt-1 hover:bg-transparent ${rule.badgeColor}`} variant="outline">
                      {rule.type}
                    </Badge>
                  </div>
                </div>
                
                <Separator className="hidden sm:block h-10" orientation="vertical" />
                <Separator className="sm:hidden w-full" />
                
                <p className="text-sm text-muted-foreground flex-1">
                  {rule.description}
                </p>

                <div className="flex items-center justify-end w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                  {isAdded ? (
                    <Button variant="outline" className="w-full sm:w-40 border-emerald-500/50 text-emerald-500 hover:text-emerald-500/80 pointer-events-none" disabled>
                      <Check className="size-4 mr-2" />
                      Rule Added
                    </Button>
                  ) : isConfirming ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleCancelConfirm}>
                        Cancel
                      </Button>
                      <Button variant="default" className="flex-1 sm:flex-none" onClick={() => handleConfirmAdd(rule.id)}>
                        Confirm Add
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full sm:w-40 group hover:bg-primary hover:text-primary-foreground" onClick={() => handleAddClick(rule.id)}>
                      <Plus className="size-4 mr-2 group-hover:text-primary-foreground text-primary" />
                      Add Template
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
