import * as React from "react";
import "./index.css";
import { Header } from "../src/components/Header";
import Infobar from "../src/components/Infobar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Sidebar from "../src/components/Sidebar";
import Monitoring from "../src/components/Monitoring";
import io from "socket.io-client";
import { PacketType } from "../src/types/dataTypes";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { protocolNames } from "../src/constants/constants";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (message: string) => void;
      };
    };
  }
}

function App(): JSX.Element {
  function extractFields(packetStr) {
    const fields = {};

    // Clean up string by removing \r\n and excess spaces
    let cleanStr = packetStr.replace(/[\r\n\s]+/g, " ").trim();

    // Define the list of possible fields we want to extract
    const fieldRegex = {
      "frame.time": /"frame\.time":\s*\[\s*"([^"]+)"\s*\]/,
      "frame.len": /"frame\.len":\s*\[\s*"([^"]+)"\s*\]/,
      "ip.src": /"ip\.src":\s*\[\s*"([^"]+)"\s*\]/,
      "ip.dst": /"ip\.dst":\s*\[\s*"([^"]+)"\s*\]/,
      "ip.proto": /"ip\.proto":\s*\[\s*"([^"]+)"\s*\]/,
      "ip.ttl": /"ip\.ttl":\s*\[\s*"([^"]+)"\s*\]/,
      "tcp.srcport": /"tcp\.srcport":\s*\[\s*"([^"]+)"\s*\]/,
      "tcp.dstport": /"tcp\.dstport":\s*\[\s*"([^"]+)"\s*\]/,
      "tcp.flags": /"tcp\.flags":\s*\[\s*"([^"]+)"\s*\]/,
      "udp.srcport": /"udp\.srcport":\s*\[\s*"([^"]+)"\s*\]/,
      "udp.dstport": /"udp\.dstport":\s*\[\s*"([^"]+)"\s*\]/,
      "_ws.col.info": /"_ws\.col\.info":\s*\[\s*"([^"]+)"\s*\]/,
      "eth.src": /"eth\.src":\s*\[\s*"([^"]+)"\s*\]/,
      "eth.dst": /"eth\.dst":\s*\[\s*"([^"]+)"\s*\]/,
    };

    // Function to format the date in dd/mm/yyyy format
    function formatDateTime(dateTimeStr) {
      const cleanedDateTimeStr = dateTimeStr
        .replace(/(India Standard Time|IST)/, "")
        .trim();
      const dateObj = new Date(cleanedDateTimeStr);
      console.log(dateObj);

      if (isNaN(dateObj.getTime())) {
        return { date: null, time: null }; // Return null if date is invalid
      }

      const day = ("0" + dateObj.getDate()).slice(-2);
      const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
      const year = dateObj.getFullYear();
      const time = dateObj.toTimeString().split(" ")[0]; // Get time part (HH:MM:SS)

      console.log(day, month, year, time);

      return {
        date: `${day}/${month}/${year}`,
        time: time,
      };
    }

    // Iterate through each field regex and apply it to extract values
    for (let field in fieldRegex) {
      const match = cleanStr.match(fieldRegex[field]);
      if (match) {
        if (field === "frame.time") {
          const formattedDateTime = formatDateTime(match[1]);
          fields["frame.time"] = formattedDateTime;
        } else {
          fields[field] = match[1]; // Store the matched value
        }
      } else {
        fields[field] = null; // Assign default value if field is not found
      }
    }

    // Additional checks for essential fields, log an error if not present (optional)
    if (!fields["ip.src"] || !fields["ip.dst"]) {
      console.error("Missing critical IP address information.");
    }
    return fields;
  }

  function replaceDotsInKeys(obj) {
    const newObj = {};

    // Loop through each key-value pair
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Replace the dots with underscores
        const newKey = key.replace(/\./g, "_");
        newObj[newKey] = obj[key];
      }
    }

    return newObj;
  }

  const tempPackets = [
    {
      frame_time: ["Jul 19, 2025 12:34:56.789"],
      frame_len: ["74"],
      ip_src: ["192.168.1.100"],
      ip_dst: ["192.168.1.1"],
      ip_proto: ["6"],
      ip_ttl: ["64"],
      tcp_srcport: ["443"],
      tcp_dstport: ["56243"],
      tcp_flags: ["0x018"],
      udp_srcport: ["123"],
      udp_dstport: ["321"],
      _ws_col_info: ["TCP segment of a reassembled PDU"],
      eth_src: ["00:0c:29:3e:5b:6c"],
      eth_dst: ["00:50:56:f2:4f:3d"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:00.120"],
      frame_len: ["98"],
      ip_src: ["10.0.0.2"],
      ip_dst: ["10.0.0.1"],
      ip_proto: ["17"],
      ip_ttl: ["128"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["53"],
      udp_dstport: ["51720"],
      _ws_col_info: ["Standard query response 0x0000 A example.com"],
      eth_src: ["00:11:22:33:44:55"],
      eth_dst: ["66:77:88:99:aa:bb"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:02.334"],
      frame_len: ["1500"],
      ip_src: ["172.16.0.3"],
      ip_dst: ["172.16.0.254"],
      ip_proto: ["6"],
      ip_ttl: ["255"],
      tcp_srcport: ["22"],
      tcp_dstport: ["51022"],
      tcp_flags: ["0x012"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["SSH Protocol: Server Identification String"],
      eth_src: ["de:ad:be:ef:00:01"],
      eth_dst: ["de:ad:be:ef:00:02"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:05.567"],
      frame_len: ["128"],
      ip_src: ["8.8.8.8"],
      ip_dst: ["192.168.0.10"],
      ip_proto: ["1"],
      ip_ttl: ["56"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["Echo (ping) reply"],
      eth_src: ["aa:bb:cc:dd:ee:ff"],
      eth_dst: ["11:22:33:44:55:66"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:10.901"],
      frame_len: ["64"],
      ip_src: ["192.168.43.1"],
      ip_dst: ["192.168.43.15"],
      ip_proto: ["6"],
      ip_ttl: ["60"],
      tcp_srcport: ["80"],
      tcp_dstport: ["54321"],
      tcp_flags: ["0x010"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["HTTP/1.1 200 OK"],
      eth_src: ["ab:cd:ef:12:34:56"],
      eth_dst: ["65:43:21:ef:cd:ab"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:15.123"],
      frame_len: ["60"],
      ip_src: ["192.168.0.105"],
      ip_dst: ["192.168.0.1"],
      ip_proto: ["6"],
      ip_ttl: ["64"],
      tcp_srcport: ["51515"],
      tcp_dstport: ["443"],
      tcp_flags: ["0x002"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["TCP SYN to HTTPS"],
      eth_src: ["aa:bb:cc:dd:ee:01"],
      eth_dst: ["aa:bb:cc:dd:ee:ff"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:17.201"],
      frame_len: ["128"],
      ip_src: ["10.1.0.20"],
      ip_dst: ["10.1.0.1"],
      ip_proto: ["17"],
      ip_ttl: ["128"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["67"],
      udp_dstport: ["68"],
      _ws_col_info: ["DHCP Discover"],
      eth_src: ["11:22:33:aa:bb:cc"],
      eth_dst: ["ff:ff:ff:ff:ff:ff"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:18.543"],
      frame_len: ["74"],
      ip_src: ["8.8.4.4"],
      ip_dst: ["192.168.1.150"],
      ip_proto: ["1"],
      ip_ttl: ["57"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["Echo (ping) request"],
      eth_src: ["00:0a:95:9d:68:16"],
      eth_dst: ["b8:27:eb:45:12:34"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:20.345"],
      frame_len: ["1514"],
      ip_src: ["172.17.0.2"],
      ip_dst: ["172.17.0.1"],
      ip_proto: ["6"],
      ip_ttl: ["64"],
      tcp_srcport: ["8080"],
      tcp_dstport: ["51000"],
      tcp_flags: ["0x018"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["HTTP response data"],
      eth_src: ["02:42:ac:11:00:02"],
      eth_dst: ["02:42:ac:11:00:01"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:21.987"],
      frame_len: ["90"],
      ip_src: ["192.168.2.200"],
      ip_dst: ["224.0.0.251"],
      ip_proto: ["17"],
      ip_ttl: ["255"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["5353"],
      udp_dstport: ["5353"],
      _ws_col_info: ["mDNS query"],
      eth_src: ["a4:5e:60:23:12:11"],
      eth_dst: ["01:00:5e:00:00:fb"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:23.412"],
      frame_len: ["68"],
      ip_src: ["10.10.10.10"],
      ip_dst: ["10.10.10.1"],
      ip_proto: ["6"],
      ip_ttl: ["62"],
      tcp_srcport: ["22"],
      tcp_dstport: ["65000"],
      tcp_flags: ["0x010"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["SSH ACK"],
      eth_src: ["00:16:3e:00:00:01"],
      eth_dst: ["00:16:3e:00:00:02"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:24.990"],
      frame_len: ["100"],
      ip_src: ["192.168.1.200"],
      ip_dst: ["239.255.255.250"],
      ip_proto: ["17"],
      ip_ttl: ["4"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["1900"],
      udp_dstport: ["1900"],
      _ws_col_info: ["SSDP discovery"],
      eth_src: ["f4:5c:89:12:34:56"],
      eth_dst: ["01:00:5e:7f:ff:fa"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:26.738"],
      frame_len: ["1300"],
      ip_src: ["192.0.2.10"],
      ip_dst: ["198.51.100.1"],
      ip_proto: ["6"],
      ip_ttl: ["50"],
      tcp_srcport: ["12345"],
      tcp_dstport: ["80"],
      tcp_flags: ["0x018"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["HTTP POST /login"],
      eth_src: ["3c:07:71:ff:ee:dd"],
      eth_dst: ["00:25:90:12:ab:cd"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:28.321"],
      frame_len: ["84"],
      ip_src: ["10.0.0.5"],
      ip_dst: ["10.0.0.255"],
      ip_proto: ["17"],
      ip_ttl: ["64"],
      tcp_srcport: ["0"],
      tcp_dstport: ["0"],
      tcp_flags: ["0x000"],
      udp_srcport: ["137"],
      udp_dstport: ["137"],
      _ws_col_info: ["NetBIOS Name Service"],
      eth_src: ["00:e0:4c:68:01:02"],
      eth_dst: ["ff:ff:ff:ff:ff:ff"],
    },
    {
      frame_time: ["Jul 19, 2025 12:35:30.001"],
      frame_len: ["110"],
      ip_src: ["203.0.113.10"],
      ip_dst: ["192.168.1.50"],
      ip_proto: ["6"],
      ip_ttl: ["45"],
      tcp_srcport: ["443"],
      tcp_dstport: ["60001"],
      tcp_flags: ["0x018"],
      udp_srcport: ["0"],
      udp_dstport: ["0"],
      _ws_col_info: ["TLS Application Data"],
      eth_src: ["00:1a:2b:3c:4d:5e"],
      eth_dst: ["01:23:45:67:89:ab"],
    },
  ];


  const [packets, setPackets] = React.useState<PacketType[]>([]);
  const packetsRef = React.useRef(packets);

  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");

  React.useEffect(() => {
    const socket = io("http://localhost:3000");

    packetsRef.current = packets;

    socket.on("data", function (data) {
      if (data) {
        const extractedFields = extractFields(data);
        console.log(extractedFields);

        const newPackets: PacketType = {
          frame_len: "",
          frame_time: {
            date: "",
            time: "",
          },
          ip_src: "",
          ip_dst: "",
          tcp_srcport: "",
          tcp_dstport: "",
          ip_proto: "",
          _ws_col_info: "",

          ...replaceDotsInKeys(extractedFields),
        };
        setPackets((prevPackets) => {
          // Only keep the last 100 packets to avoid performance issues
          if (prevPackets.length >= 100) {
            return [...prevPackets.slice(1), newPackets];
          }
          return [...prevPackets, newPackets];
        });
      } else {
        console.log("no data");
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  console.log(packets);

  return (
    <div className={` min-h-screen  flex-col bg-background`}>
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex">
        <Sidebar />
        <div className="m-[0.3rem] p-4 w-[85%]">
          <h1 className="text-xl font-black tracking-tighter">IDS / IPS</h1>
          <Tabs defaultValue="Monitoring" className="my-4">
            <TabsList>
              <TabsTrigger value="Monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="Packet Query">Packet Query</TabsTrigger>
            </TabsList>
            <TabsContent value="Monitoring">
              {" "}
              <Monitoring />
            </TabsContent>
            <TabsContent value="Packet Query">
              <ScrollArea className="h-[33rem]">
                <Table className="">
                  <TableHeader>
                    <TableRow className="">
                      <TableHead className="w-[8%] text-center">
                        Protocol
                      </TableHead>
                      <TableHead className="w-[12%] text-center">
                        Source IP
                      </TableHead>
                      <TableHead className="w-[13%] text-center">
                        Destination IP
                      </TableHead>
                      <TableHead className="w-[25%] text-center">
                        Timestamp
                      </TableHead>
                      <TableHead className="w-[12%] text-center">
                        TCP Source Port
                      </TableHead>

                      <TableHead className="w-[12%] text-center">
                        TCP Destination Port
                      </TableHead>
                      <TableHead className="w-[18%]">Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="">
                    {tempPackets.map((packet,idx) => {
                      return (
                        <TableRow
                          key={idx}
                          className="text-muted-foreground"
                        >
                          <TableCell>
                            <Badge>{protocolNames[packet.ip_proto[0]]}</Badge>
                          </TableCell>
                          <TableCell>{packet.ip_src}</TableCell>
                          <TableCell>{packet.ip_dst}</TableCell>
                          <TableCell>
                            {packet.frame_time}
                          </TableCell>
                          <TableCell className="flex gap-2 items-center justify-center">
                            {packet.tcp_srcport}
                          </TableCell>
                          <TableCell>{packet.tcp_dstport}</TableCell>
                          <TableCell className="w-[14rem] truncate">
                            {packet._ws_col_info}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

export default App;
