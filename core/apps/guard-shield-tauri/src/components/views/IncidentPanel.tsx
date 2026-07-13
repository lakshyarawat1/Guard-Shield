import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MessageSquare, User, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "../ui/input";
import { useUser } from "@clerk/react";
import { HexViewer } from "./HexViewer";

interface IncidentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alert: any | null;
}

export default function IncidentPanel({ isOpen, onClose, alert }: IncidentPanelProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<{user: string, text: string, time: string}[]>([]);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState("Open");

  if (!alert) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      { user: user?.firstName || "Analyst", text: newComment, time: new Date().toLocaleTimeString() }
    ]);
    setNewComment("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            {alert.severity === 'Critical' ? <AlertCircle className="text-destructive size-5" /> : <AlertCircle className="text-orange-500 size-5" />}
            Incident #{alert.id || Math.floor(Math.random() * 1000)}
          </SheetTitle>
          <SheetDescription>
            {alert.reason} from {alert.src_ip}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status Controls */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant={status === "Open" ? "default" : "outline"}
              onClick={() => setStatus("Open")}
            >
              Open
            </Button>
            <Button 
              size="sm" 
              variant={status === "Investigating" ? "secondary" : "outline"}
              onClick={() => setStatus("Investigating")}
            >
              Investigating
            </Button>
            <Button 
              size="sm" 
              variant={status === "Resolved" ? "default" : "outline"}
              className={status === "Resolved" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => setStatus("Resolved")}
            >
              <CheckCircle2 className="size-4 mr-1" /> Resolved
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/20">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source IP:</span>
              <span className="font-mono">{alert.src_ip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dest IP:</span>
              <span className="font-mono">{alert.dst_ip || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{alert.timestamp || new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Hex Payload Viewer */}
          {alert.payload && (
            <div className="space-y-2 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  Packet Payload <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted">RAW HEX</Badge>
                </span>
              </div>
              <div className="border border-border/50 rounded-md overflow-hidden bg-black/60 shadow-inner">
                <HexViewer payloadHex={alert.payload} />
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="size-4" /> Investigation Notes
            </h3>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes added yet.</p>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="flex gap-3 bg-muted/30 p-3 rounded-lg">
                    <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="size-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{c.user}</span>
                        <span className="text-xs text-muted-foreground">{c.time}</span>
                      </div>
                      <p className="text-sm">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                placeholder="Add a note..." 
              />
              <Button type="submit" size="sm">Post</Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
