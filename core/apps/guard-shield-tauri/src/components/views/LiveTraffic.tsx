import { Badge } from "../ui/badge";
import { TableCell, TableHead } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { ArrowUpDown, ArrowDown, ArrowUp, Network, ShieldBan } from "lucide-react";
import { Button } from "../ui/button";
import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import { protocolNames } from "../../constants/constants";
import { PacketType } from "../../types/dataTypes";
import React, { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { listen } from "@tauri-apps/api/event";
import { TableVirtuoso } from "react-virtuoso";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { HexViewer } from "./HexViewer";

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

export default function LiveTraffic() {
  const [packets, setPackets] = useState<PacketType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleBlockIp = async (ip: string) => {
    try {
      await invoke("block_ip", { ip, reason: "Manual Block from Live Traffic" });
      toast.success(`Successfully blocked IP: ${ip}`, {
        description: "Active IPS rules updated. Traffic from this IP will now be dropped."
      });
    } catch (error) {
      toast.error(`Failed to block IP: ${ip}`, {
        description: String(error)
      });
    }
  };
  const [filterProto, setFilterProto] = useState<string>("All");
  const [filterSrcIp, setFilterSrcIp] = useState<string>("");
  const [filterDstIp, setFilterDstIp] = useState<string>("");
  const [filterPort, setFilterPort] = useState<string>("");

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<PacketType | null>(null);

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
    };
    fetchInterfacesAndHistory();
  }, []);

  useEffect(() => {
    let unlisten: () => void;

    const setupCapture = async () => {
      try {
        setError(null);
        unlisten = await listen<PacketType[]>("packets-batch", (event) => {
          setPackets((prev) => {
            // Keep last 10000 packets for performance
            const newPackets = [...event.payload.reverse(), ...prev];
            return newPackets.slice(0, 10000);
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
  }, []);

  const filteredPackets = useMemo(() => {
    // Performance improvement: Memoize filtering to prevent O(n) operation on every render
    // especially important when packet array grows up to 10000 items
    return packets.filter((p) => {
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
  }, [packets, filterProto, filterSrcIp, filterDstIp, filterPort]);

  const sortedPackets = useMemo(() => {
    // Performance improvement: Memoize sorting to prevent O(n log n) operation on every render
    const sorted = [...filteredPackets];
    if (sortConfig !== null) {
      sorted.sort((a, b) => {
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
            valB = Number(b.udp_dstport?.[0] || b.udp_dstport?.[0] || 0);
            break;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredPackets, sortConfig]);

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
          </div>
          <div className="my-4">
            <div className="flex flex-col min-h-0">
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
              <div className="h-[28rem] rounded-md border bg-background overflow-hidden flex flex-col">
                <TableVirtuoso
                  data={sortedPackets}
                  className="flex-1 w-full"
                  components={{
                    Table: (props) => <table {...props} className="w-full caption-bottom text-sm" />,
                    TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref as any} className="bg-muted/40 sticky top-0 backdrop-blur-sm z-10 [&_tr]:border-b" />),
                    TableRow: (props) => <tr {...props} className="text-sm font-medium transition-colors hover:bg-muted/60 data-[state=selected]:bg-muted border-b" />,
                    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref as any} className="[&_tr:last-child]:border-0" />),
                    EmptyPlaceholder: () => (
                      <tbody>
                        {error ? (
                          <tr>
                            <td colSpan={7} className="h-[24rem] text-center">
                              <div className="flex flex-col items-center justify-center text-destructive space-y-2">
                                <span className="text-4xl">⚠️</span>
                                <p className="font-bold text-lg">Packet Capture Failed</p>
                                <p className="text-sm max-w-md">{error}</p>
                                <p className="text-xs text-muted-foreground mt-4">Make sure to run the application as Administrator.</p>
                              </div>
                            </td>
                          </tr>
                        ) : packets.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="h-[24rem] text-center">
                              <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                <span className="text-4xl animate-pulse">📡</span>
                                <p className="font-bold text-lg">Waiting for packets...</p>
                                <p className="text-sm">Listening on active network interface.</p>
                              </div>
                            </td>
                          </tr>
                        ) : filteredPackets.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="h-[24rem] text-center">
                              <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                <span className="text-4xl">🔍</span>
                                <p className="font-bold text-lg">No matches found</p>
                                <p className="text-sm">Try adjusting your filters.</p>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    )
                  }}
                  fixedHeaderContent={() => (
                    <tr>
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
                        className="w-[12%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => requestSort("Destination IP")}
                      >
                        <div className="flex items-center justify-center">Destination IP {renderSortIcon("Destination IP")}</div>
                      </TableHead>
                      <TableHead className="w-[10%] text-xs uppercase tracking-wider text-center">Geo</TableHead>
                      <TableHead 
                        className="w-[15%] text-xs uppercase tracking-wider cursor-pointer hover:bg-muted/60 transition-colors select-none"
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
                    </tr>
                  )}
                  itemContent={(_index, packet) => (
                    <>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="cursor-pointer">
                        <Badge className={getProtocolColor(packet.ip_proto?.[0])}>
                          {packet.ip_proto?.[0] ? protocolNames[Number(packet.ip_proto[0]) as keyof typeof protocolNames] || packet.ip_proto[0] : "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="cursor-pointer">{packet.ip_src?.[0] || ""}</TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="cursor-pointer">{packet.ip_dst?.[0] || ""}</TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="cursor-pointer text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-[16px] flex justify-center">
                            {packet.src_country?.[0] === "LOCAL" ? (
                              <div className="h-3 w-4 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500" title="Local Network">
                                <Network className="h-2.5 w-2.5" />
                              </div>
                            ) : packet.src_country?.[0] && packet.src_country[0] !== "Unknown" ? (
                              <img src={`https://flagcdn.com/16x12/${packet.src_country[0].toLowerCase()}.png`} title={packet.src_country[0]} className="h-3 w-4 rounded-sm opacity-80" />
                            ) : <div className="h-3 w-4 rounded-sm bg-muted border border-border flex items-center justify-center" title="Unknown"><span className="text-[8px] text-muted-foreground leading-none">?</span></div>}
                          </div>
                          
                          <span className="text-[10px] text-muted-foreground leading-none">▶</span>
                          
                          <div className="w-[16px] flex justify-center">
                            {packet.dst_country?.[0] === "LOCAL" ? (
                              <div className="h-3 w-4 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500" title="Local Network">
                                <Network className="h-2.5 w-2.5" />
                              </div>
                            ) : packet.dst_country?.[0] && packet.dst_country[0] !== "Unknown" ? (
                              <img src={`https://flagcdn.com/16x12/${packet.dst_country[0].toLowerCase()}.png`} title={packet.dst_country[0]} className="h-3 w-4 rounded-sm opacity-80" />
                            ) : <div className="h-3 w-4 rounded-sm bg-muted border border-border flex items-center justify-center" title="Unknown"><span className="text-[8px] text-muted-foreground leading-none">?</span></div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="cursor-pointer">
                        {packet.frame_time?.[0] || ""}
                      </TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="text-center cursor-pointer">
                        {packet.tcp_srcport?.[0] || packet.udp_srcport?.[0] || ""}
                      </TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="text-center cursor-pointer">
                        {packet.tcp_dstport?.[0] || packet.udp_dstport?.[0] || ""}
                      </TableCell>
                      <TableCell onClick={() => setSelectedPacket(packet)} className="w-56 truncate cursor-pointer">
                        {packet._ws_col_info?.[0] || ""}
                      </TableCell>
                    </>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={selectedPacket !== null} onOpenChange={(open) => !open && setSelectedPacket(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Deep Packet Inspection</DialogTitle>
          </DialogHeader>
          {selectedPacket && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Source</span>
                <span className="col-span-3 flex items-center justify-between">
                  <span>{selectedPacket.ip_src?.[0]}:{selectedPacket.tcp_srcport?.[0] || selectedPacket.udp_srcport?.[0] || "*"}</span>
                  {selectedPacket.ip_src?.[0] && selectedPacket.src_country?.[0] !== "LOCAL" && (
                    <Button variant="outline" size="sm" onClick={() => handleBlockIp(selectedPacket.ip_src![0])} className="h-7 text-xs text-destructive hover:text-destructive">
                      <ShieldBan className="w-3 h-3 mr-1" /> Block IP
                    </Button>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Destination</span>
                <span className="col-span-3 flex items-center justify-between">
                  <span>{selectedPacket.ip_dst?.[0]}:{selectedPacket.tcp_dstport?.[0] || selectedPacket.udp_dstport?.[0] || "*"}</span>
                  {selectedPacket.ip_dst?.[0] && selectedPacket.dst_country?.[0] !== "LOCAL" && (
                    <Button variant="outline" size="sm" onClick={() => handleBlockIp(selectedPacket.ip_dst![0])} className="h-7 text-xs text-destructive hover:text-destructive">
                      <ShieldBan className="w-3 h-3 mr-1" /> Block IP
                    </Button>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-muted-foreground">GeoIP Origin</span>
                <span className="col-span-3 flex items-center gap-2">
                  {selectedPacket.src_country?.[0] === "LOCAL" ? (
                    <div className="flex items-center gap-1.5 text-blue-500 font-medium">
                      <Network className="h-3.5 w-3.5" /> Local Network
                    </div>
                  ) : selectedPacket.src_country?.[0] ? (
                    <>
                      <img src={`https://flagcdn.com/16x12/${selectedPacket.src_country[0].toLowerCase()}.png`} className="h-3 w-4 rounded-sm border" />
                      {selectedPacket.src_country[0]}
                    </>
                  ) : "Unknown"}
                  
                  <span className="text-muted-foreground mx-1">→</span>
                  
                  {selectedPacket.dst_country?.[0] === "LOCAL" ? (
                    <div className="flex items-center gap-1.5 text-blue-500 font-medium">
                      <Network className="h-3.5 w-3.5" /> Local Network
                    </div>
                  ) : selectedPacket.dst_country?.[0] ? (
                    <>
                      <img src={`https://flagcdn.com/16x12/${selectedPacket.dst_country[0].toLowerCase()}.png`} className="h-3 w-4 rounded-sm border" />
                      {selectedPacket.dst_country[0]}
                    </>
                  ) : "Unknown"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Protocol</span>
                <span className="col-span-3">{selectedPacket.ip_proto?.[0] ? protocolNames[Number(selectedPacket.ip_proto[0]) as keyof typeof protocolNames] || selectedPacket.ip_proto[0] : "N/A"}</span>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <span className="font-semibold text-muted-foreground">Info</span>
                <span className="col-span-3 bg-muted p-2 rounded text-xs break-all">{selectedPacket._ws_col_info?.[0]}</span>
              </div>
              
              <div className="mt-2">
                <span className="font-semibold text-muted-foreground mb-2 block">Raw Payload Dump</span>
                {selectedPacket.payload?.[0] ? (
                  <HexViewer payloadHex={selectedPacket.payload[0]} />
                ) : (
                  <div className="text-xs text-muted-foreground italic border p-4 rounded bg-muted/20">
                    No payload data captured for this packet.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
