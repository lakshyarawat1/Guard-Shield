import * as React from "react";
import "./index.css";
import { Header } from "./components/Header";
import Infobar from "./components/Infobar";
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
import Sidebar from "./components/Sidebar";
import Monitoring from "./components/Monitoring";
import io from "socket.io-client";
import { PacketType } from "./types/dataTypes";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { protocolNames } from "./constants/constants";
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
      console.log(dateObj)

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
                    {packets.map((packet) => {
                      return (
                        <TableRow
                          key={packet.ip_src}
                          className="text-muted-foreground"
                        >
                          <TableCell>
                            <Badge>{protocolNames[packet.ip_proto]}</Badge>
                          </TableCell>
                          <TableCell>{packet.ip_src}</TableCell>
                          <TableCell>{packet.ip_dst}</TableCell>
                          <TableCell>
                            {packet.frame_time.date} {packet.frame_time.time}
                          </TableCell>
                          <TableCell className="flex gap-2 items-center justify-center">
                            {packet.tcp_srcport}
                          </TableCell>
                          <TableCell>{packet.tcp_dstport}</TableCell>
                          <TableCell className="w-[14rem]">{packet._ws_col_info}</TableCell>
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
