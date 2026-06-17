import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Monitoring from "./Monitoring";
import Sidebar from "./Sidebar";
import { protocolNames } from "../../constants/constants";
import { PacketType } from "../../types/dataTypes";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const getProtocolColor = (proto: string | undefined) => {
  if (!proto) return "bg-gray-500";
  const num = Number(proto);
  switch (num) {
    case 6: return "bg-blue-500 hover:bg-blue-600 text-white"; // TCP
    case 17: return "bg-emerald-500 hover:bg-emerald-600 text-white"; // UDP
    case 1: return "bg-orange-500 hover:bg-orange-600 text-white"; // ICMP
    default: return "bg-slate-500 hover:bg-slate-600 text-white"; // Others
  }
};

export default function Dashboard() {
  const [packets, setPackets] = useState<PacketType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState<boolean>(true);

  const [filterProto, setFilterProto] = useState<string>("All");
  const [filterSrcIp, setFilterSrcIp] = useState<string>("");
  const [filterDstIp, setFilterDstIp] = useState<string>("");
  const [filterPort, setFilterPort] = useState<string>("");

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    const fetchInterfacesAndHistory = async () => {
      try {
        const hist: PacketType[] = await invoke("get_historical_packets");
        setPackets(hist);
      } catch (e) {
        console.error("Failed to fetch historical packets", e);
      }

      try {
        const ifaces = await invoke<string[]>("get_network_interfaces");
        setInterfaces(ifaces);
        if (ifaces.length > 0) {
          const defaultIface = ifaces.find((i) => !i.toLowerCase().includes("loopback")) || ifaces[0];
          setSelectedInterface(defaultIface);
        }
      } catch (e) {
        console.error("Failed to fetch interfaces", e);
      }
    };
    fetchInterfacesAndHistory();
  }, []);

  useEffect(() => {
    const handleStart = () => setIsCapturing(true);
    const handleStop = () => setIsCapturing(false);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsCapturing(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setIsCapturing(false);
      }
    };

    window.addEventListener("ui-start-capture", handleStart);
    window.addEventListener("ui-stop-capture", handleStop);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("ui-start-capture", handleStart);
      window.removeEventListener("ui-stop-capture", handleStop);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!selectedInterface) return;
    let unlisten: () => void;

    if (!isCapturing) {
      invoke("stop_packet_capture").catch(console.error);
      return;
    }

    const setupCapture = async () => {
      try {
        setError(null);
        // We do NOT clear setPackets([]) here because we want to keep the historical packets from the DB!
        console.log("Starting capture on:", selectedInterface);
        await invoke("start_packet_capture", {
          interfaceName: selectedInterface,
          bpfFilter: "", // Can be modified by user later
        });

        unlisten = await listen<PacketType>("packet-captured", (event) => {
          setPackets((prev) => {
            // Keep last 100 packets for performance
            const newPackets = [event.payload, ...prev];
            return newPackets.slice(0, 100);
          });
        });
      } catch (e) {
        console.error("Failed to setup packet capture:", e);
        setError(String(e));
      }
    };

    setupCapture();

    return () => {
      if (unlisten) unlisten();
    };
  }, [selectedInterface, isCapturing]);

  const filteredPackets = packets.filter((p) => {
    if (filterProto !== "All") {
      const pNum = p.ip_proto?.[0];
      const pName = pNum ? protocolNames[Number(pNum) as keyof typeof protocolNames] || pNum : "N/A";
      if (pName !== filterProto) return false;
    }
    if (filterSrcIp && p.ip_src?.[0] && !p.ip_src[0].includes(filterSrcIp)) return false;
    if (filterDstIp && p.ip_dst?.[0] && !p.ip_dst[0].includes(filterDstIp)) return false;
    if (filterPort) {
      const srcP = p.tcp_srcport?.[0] || p.udp_srcport?.[0] || "";
      const dstP = p.tcp_dstport?.[0] || p.udp_dstport?.[0] || "";
      if (!srcP.includes(filterPort) && !dstP.includes(filterPort)) return false;
    }
    return true;
  });

  const sortedPackets = [...filteredPackets];
  if (sortConfig !== null) {
    sortedPackets.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      
      switch (sortConfig.key) {
        case "Protocol":
          valA = a.ip_proto?.[0] ? protocolNames[Number(a.ip_proto[0]) as keyof typeof protocolNames] || a.ip_proto[0] : "";
          valB = b.ip_proto?.[0] ? protocolNames[Number(b.ip_proto[0]) as keyof typeof protocolNames] || b.ip_proto[0] : "";
          break;
        case "Source IP":
          valA = a.ip_src?.[0] || "";
          valB = b.ip_src?.[0] || "";
          break;
        case "Destination IP":
          valA = a.ip_dst?.[0] || "";
          valB = b.ip_dst?.[0] || "";
          break;
        case "Timestamp":
          valA = a.frame_time?.[0] ? new Date(a.frame_time[0]).getTime() : 0;
          valB = b.frame_time?.[0] ? new Date(b.frame_time[0]).getTime() : 0;
          break;
        case "TCP Source Port":
          valA = Number(a.tcp_srcport?.[0] || a.udp_srcport?.[0] || 0);
          valB = Number(b.tcp_srcport?.[0] || b.udp_srcport?.[0] || 0);
          break;
        case "TCP Destination Port":
          valA = Number(a.tcp_dstport?.[0] || a.udp_dstport?.[0] || 0);
          valB = Number(b.tcp_dstport?.[0] || b.udp_dstport?.[0] || 0);
          break;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="m-1 p-4 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tighter">IDS / IPS</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Interface:</span>
              <Select value={selectedInterface} onValueChange={(val) => setSelectedInterface(val)}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Select Interface" />
                </SelectTrigger>
                <SelectContent>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface} value={iface}>
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Tabs defaultValue="Monitoring" className="my-4">
            <TabsList>
              <TabsTrigger value="Monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="Packet Query">Packet Query</TabsTrigger>
            </TabsList>
            <TabsContent value="Monitoring">
              <Monitoring />
            </TabsContent>
            <TabsContent value="Packet Query" className="flex flex-col min-h-0">
              <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-secondary/20 rounded-xl border">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-muted-foreground">Protocol:</span>
                  <Select value={filterProto} onValueChange={setFilterProto}>
                    <SelectTrigger className="w-[120px] bg-background">
                      <SelectValue placeholder="Protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="UDP">UDP</SelectItem>
                      <SelectItem value="ICMP">ICMP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-muted-foreground">Source IP:</span>
                  <Input 
                    placeholder="e.g. 192.168.1.1" 
                    className="w-[150px] bg-background" 
                    value={filterSrcIp} 
                    onChange={(e) => setFilterSrcIp(e.target.value)} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-muted-foreground">Dest IP:</span>
                  <Input 
                    placeholder="e.g. 10.0.0.1" 
                    className="w-[150px] bg-background" 
                    value={filterDstIp} 
                    onChange={(e) => setFilterDstIp(e.target.value)} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-muted-foreground">Port:</span>
                  <Input 
                    placeholder="e.g. 443" 
                    className="w-[100px] bg-background" 
                    value={filterPort} 
                    onChange={(e) => setFilterPort(e.target.value)} 
                  />
                </div>
              </div>
              <ScrollArea className="h-[28rem] rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-sm z-10">
                    <TableRow>
                      <TableHead 
                        className="w-[8%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("Protocol")}
                      >
                        <div className="flex items-center justify-center">Protocol {renderSortIcon("Protocol")}</div>
                      </TableHead>
                      <TableHead 
                        className="w-[12%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("Source IP")}
                      >
                        <div className="flex items-center justify-center">Source IP {renderSortIcon("Source IP")}</div>
                      </TableHead>
                      <TableHead 
                        className="w-[13%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("Destination IP")}
                      >
                        <div className="flex items-center justify-center">Destination IP {renderSortIcon("Destination IP")}</div>
                      </TableHead>
                      <TableHead 
                        className="w-[20%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("Timestamp")}
                      >
                        <div className="flex items-center justify-center">Timestamp {renderSortIcon("Timestamp")}</div>
                      </TableHead>
                      <TableHead 
                        className="w-[12%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("TCP Source Port")}
                      >
                        <div className="flex items-center justify-center">Source Port {renderSortIcon("TCP Source Port")}</div>
                      </TableHead>
                      <TableHead 
                        className="w-[12%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("TCP Destination Port")}
                      >
                        <div className="flex items-center justify-center">Dest Port {renderSortIcon("TCP Destination Port")}</div>
                      </TableHead>
                      <TableHead className="w-[23%] text-xs uppercase tracking-wider">Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {error ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-[24rem] text-center">
                          <div className="flex flex-col items-center justify-center text-destructive space-y-2">
                            <span className="text-4xl">⚠️</span>
                            <p className="font-bold text-lg">Packet Capture Failed</p>
                            <p className="text-sm max-w-md">{error}</p>
                            <p className="text-xs text-muted-foreground mt-4">Make sure to run the application as Administrator.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : packets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-[24rem] text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                            <span className="text-4xl animate-pulse">📡</span>
                            <p className="font-bold text-lg">Waiting for packets...</p>
                            <p className="text-sm">Listening on active network interface.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPackets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-[24rem] text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                            <span className="text-4xl">🔍</span>
                            <p className="font-bold text-lg">No matches found</p>
                            <p className="text-sm">Try adjusting your filters.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedPackets.map((packet, idx) => {
                      return (
                        <TableRow
                          key={idx}
                          className="text-sm font-medium transition-colors hover:bg-muted/60 data-[state=selected]:bg-muted"
                        >
                          <TableCell>
                            <Badge className={getProtocolColor(packet.ip_proto?.[0])}>
                              {packet.ip_proto?.[0] ? protocolNames[Number(packet.ip_proto[0]) as keyof typeof protocolNames] || packet.ip_proto[0] : "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>{packet.ip_src?.[0] || ""}</TableCell>
                          <TableCell>{packet.ip_dst?.[0] || ""}</TableCell>
                          <TableCell>
                            {packet.frame_time?.[0] || ""}
                          </TableCell>
                          <TableCell className="text-center">
                            {packet.tcp_srcport?.[0] || packet.udp_srcport?.[0] || ""}
                          </TableCell>
                          <TableCell className="text-center">
                            {packet.tcp_dstport?.[0] || packet.udp_dstport?.[0] || ""}
                          </TableCell>
                          <TableCell className="w-56 truncate">
                            {packet._ws_col_info?.[0] || ""}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
