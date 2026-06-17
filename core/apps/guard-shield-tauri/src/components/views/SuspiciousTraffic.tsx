import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AlertCircle, ShieldAlert, Activity, Search, Ban, XCircle, Download, MoreHorizontal, ShieldBan, ShieldCheck, Eye, Trash2 } from "lucide-react";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { useState } from "react";

// Mock data for suspicious events
const mockSuspiciousEvents = [
  {
    id: "EV-091",
    severity: "High",
    type: "Port Scan",
    source: "192.168.1.105",
    target: "10.0.0.50",
    time: "2 mins ago",
    details: "Detected sequential TCP SYN scanning across 150 ports.",
  },
  {
    id: "EV-092",
    severity: "Critical",
    type: "Malware Signature",
    source: "45.33.12.99",
    target: "192.168.1.10",
    time: "15 mins ago",
    details: "Payload matches known ransomware command & control traffic.",
  },
  {
    id: "EV-093",
    severity: "Medium",
    type: "DDoS Attempt",
    source: "Multiple IPs",
    target: "192.168.1.1",
    time: "1 hour ago",
    details: "Sudden spike in UDP traffic on port 53 (DNS Amplification).",
  },
  {
    id: "EV-094",
    severity: "Low",
    type: "Unauthorized Login",
    source: "172.16.0.4",
    target: "192.168.1.20",
    time: "3 hours ago",
    details: "Failed SSH login attempts exceeded threshold (5 attempts).",
  }
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Critical": return "bg-red-500 hover:bg-red-600 text-white";
    case "High": return "bg-orange-500 hover:bg-orange-600 text-white";
    case "Medium": return "bg-amber-500 hover:bg-amber-600 text-white";
    case "Low": return "bg-blue-500 hover:bg-blue-600 text-white";
    default: return "bg-slate-500 text-white";
  }
};

export default function SuspiciousTraffic() {
  const [events] = useState(mockSuspiciousEvents);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events.filter((ev) => {
    if (severityFilter !== "All" && ev.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!ev.id.toLowerCase().includes(q) && 
          !ev.type.toLowerCase().includes(q) && 
          !ev.source.toLowerCase().includes(q) && 
          !ev.target.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="m-1 p-6 flex-1 min-w-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <ShieldAlert className="size-8 text-destructive" />
                Suspicious Traffic
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitor and analyze potentially malicious network activities and flagged anomalies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <AlertCircle className="size-8 text-destructive mb-2" />
              <h3 className="text-4xl font-black text-destructive">12</h3>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Critical Threats</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <Activity className="size-8 text-orange-500 mb-2" />
              <h3 className="text-4xl font-black text-orange-500">48</h3>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Anomalies Detected</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <ShieldAlert className="size-8 text-primary mb-2" />
              <h3 className="text-4xl font-black text-primary">89%</h3>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Auto-Mitigation Rate</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity:</span>
              {["All", "Critical", "High", "Medium", "Low"].map((level) => (
                <button
                  key={level}
                  onClick={() => setSeverityFilter(level)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    severityFilter === level
                      ? level === "Critical" ? "bg-red-500 text-white"
                        : level === "High" ? "bg-orange-500 text-white"
                        : level === "Medium" ? "bg-amber-500 text-white"
                        : level === "Low" ? "bg-blue-500 text-white"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by IP, type, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-[250px] text-sm bg-background"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex justify-between items-center">
              <h2 className="text-lg font-bold">Recent Alerts</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer">
                  <Ban className="size-3" />
                  Block All Sources
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
                  <XCircle className="size-3" />
                  Dismiss Selected
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
                  <Download className="size-3" />
                  Export Filtered
                </button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead className="w-[120px]">Severity</TableHead>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead className="w-[150px]">Source</TableHead>
                    <TableHead className="w-[150px]">Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[120px]">Time</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((ev) => (
                    <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/60 transition-colors">
                      <TableCell className="font-mono text-xs">{ev.id}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(ev.severity)}>{ev.severity}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{ev.type}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.source}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.target}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{ev.details}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ev.time}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-accent rounded-full transition-colors cursor-pointer">
                              <MoreHorizontal className="size-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="size-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <ShieldBan className="size-4 mr-2 text-destructive" />
                              Block Source IP
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <ShieldCheck className="size-4 mr-2 text-emerald-500" />
                              Whitelist IP
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive">
                              <Trash2 className="size-4 mr-2" />
                              Dismiss Alert
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
