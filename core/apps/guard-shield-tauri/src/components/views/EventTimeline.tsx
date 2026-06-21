import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "../ui/scroll-area";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { RefreshCcw, Activity, ShieldAlert, CheckCircle2, AlertTriangle, Info, CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";

interface AuditLog {
  id: number;
  timestamp: string;
  log_type: string;
  severity: string;
  action: string;
  details: string;
}

export default function EventTimeline() {
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const LIMIT = 30;

  // Filters
  const [category, setCategory] = useState<string>("All Events");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const fetchEvents = async (currentOffset: number, reset: boolean = false) => {
    setIsLoading(true);
    try {
      const payload = { 
        logType: "SYSTEM_EVENT", 
        limit: LIMIT,
        offset: currentOffset,
        startDate: dateRange.from ? dateRange.from.toISOString() : null,
        endDate: dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString() : null,
        category: category === "All Events" ? null : category
      };

      const data = await invoke<AuditLog[]>("get_audit_logs", payload);
      
      if (data.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (reset) {
        setEvents(data);
      } else {
        setEvents(prev => [...prev, ...data]);
      }
    } catch (e) {
      console.error("Failed to fetch event timeline:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setOffset(0);
    fetchEvents(0, true);
  }, [category, dateRange]);

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    fetchEvents(nextOffset, false);
  };

  const handleRefresh = () => {
    setOffset(0);
    fetchEvents(0, true);
  };

  const getIconForEvent = (severity: string, action: string) => {
    if (action.includes("Started")) return <Activity className="size-4 text-emerald-500" />;
    if (action.includes("Stopped")) return <CheckCircle2 className="size-4 text-muted-foreground" />;
    if (severity === "CRITICAL") return <ShieldAlert className="size-4 text-destructive" />;
    if (severity === "WARNING") return <AlertTriangle className="size-4 text-chart-5" />;
    return <Info className="size-4 text-primary" />;
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="m-1 flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between p-4 pb-2 border-b shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Event Timeline</h1>
              <p className="text-sm text-muted-foreground">Chronological history of engine states and system events.</p>
            </div>
            <div className="flex items-center gap-3">
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[260px] justify-start text-left font-normal bg-background">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => {
                      if (range) {
                         setDateRange({ from: range.from, to: range.to || range.from });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Events">All Events</SelectItem>
                  <SelectItem value="Engine Actions">Engine Actions</SelectItem>
                  <SelectItem value="Intrusion Alerts">Intrusion Alerts</SelectItem>
                </SelectContent>
              </Select>

              <button onClick={handleRefresh} className="p-2 border rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors bg-background" title="Refresh">
                <RefreshCcw className="size-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            <ScrollArea className="h-full pr-4 pb-20">
              <div className={`space-y-8 max-w-3xl mx-auto py-8 pb-32 relative ${!isExpanded && events.length > 5 ? 'max-h-[500px] overflow-hidden' : ''}`}>
                {events.length > 0 ? (
                  events.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Timeline Line */}
                      {index !== events.length - 1 && (
                        <div className="absolute left-[11px] top-8 bottom-[-32px] w-[2px] bg-border" />
                      )}
                      
                      {/* Icon */}
                      <div className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm ${
                        event.severity === 'CRITICAL' ? 'border-destructive/50' :
                        event.severity === 'WARNING' ? 'border-chart-5/50' :
                        'border-border'
                      }`}>
                        {getIconForEvent(event.severity, event.action)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex flex-col gap-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{event.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {event.details && (
                          <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-3 rounded-md border text-balance">
                            {event.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Activity className="size-8 mx-auto mb-4 opacity-20" />
                    <p>No system events recorded in this range.</p>
                  </div>
                )}
                
                {/* Initial fixed-height fade and expand button */}
                {!isExpanded && events.length > 5 && (
                  <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-background/0 flex items-end justify-center pb-4 z-10 pointer-events-auto">
                    <Button 
                      onClick={() => setIsExpanded(true)} 
                      variant="outline" 
                      className="shadow-md bg-background"
                    >
                      Load More
                    </Button>
                  </div>
                )}

                {/* Actual pagination load more button for expanded state */}
                {isExpanded && hasMore && events.length > 0 && (
                  <div className="relative flex justify-center pt-8 pb-8 w-full mt-4">
                    <Button 
                      onClick={handleLoadMore} 
                      disabled={isLoading}
                      variant="outline" 
                      className="relative z-10 shadow-md bg-background"
                    >
                      {isLoading ? "Loading..." : "Load 30 More"}
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
