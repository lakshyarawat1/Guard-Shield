import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { RefreshCcw, Trash2, Search } from "lucide-react";

interface AuditLog {
  id: number;
  timestamp: string;
  log_type: string;
  severity: string;
  action: string;
  details: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      const data = await invoke<AuditLog[]>("get_audit_logs", { logType: "USER_ACTION", limit: 100 });
      setLogs(data);
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    try {
      await invoke("clear_audit_logs");
      fetchLogs();
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  };

  // ⚡ Bolt Optimization: Memoize filtering to prevent O(n) string operations on every render
  const filteredLogs = React.useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return logs.filter(log =>
      log.action.toLowerCase().includes(lowerSearch) ||
      log.details.toLowerCase().includes(lowerSearch)
    );
  }, [logs, search]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="m-1 flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between p-4 pb-2 border-b shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">History of user actions and configuration changes.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search actions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary w-64"
            />
          </div>
          <button onClick={fetchLogs} className="p-2 border rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors" title="Refresh">
            <RefreshCcw className="size-4" />
          </button>
          <button onClick={handleClearLogs} className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-destructive hover:text-white text-destructive transition-colors text-sm font-medium">
            <Trash2 className="size-4" />
            Clear Logs
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-6 min-h-0">
        <div className="border rounded-md bg-card overflow-hidden flex flex-col h-full">
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[200px]">Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          log.severity === 'CRITICAL' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                          log.severity === 'WARNING' ? 'bg-chart-5/10 text-chart-5 border border-chart-5/20' :
                          log.severity === 'INFO' ? 'bg-primary/10 text-primary border border-primary/20' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {log.severity}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-md">{log.details}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
