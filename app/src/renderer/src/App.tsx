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
import { Info } from "lucide-react";
import { protocolNames } from "./constants/constants";
import { Badge } from "../../components/ui/badge";

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
    };

    // Iterate through each field regex and apply it to extract values
    for (let field in fieldRegex) {
      const match = cleanStr.match(fieldRegex[field]);
      if (match) {
        fields[field] = match[1]; // Store the matched value
      }
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
        console.log(data, typeof data);
        const extractedFields = extractFields(data);
        const newPackets: PacketType = {
          frame_len: "",
          frame_time: "",
          ip_src: "",
          ip_dst: "",
          tcp_srcport: "",
          tcp_dstport: "",
          ip_proto: "",
          ...replaceDotsInKeys(extractedFields),
        };
        console.log(newPackets);
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
    console.log(socket);
    return () => {
      socket.disconnect();
    };
  }, []);

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
              <Table>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                        <TableCell>{packet.frame_time}</TableCell>
                        <TableCell>{packet.tcp_srcport}</TableCell>
                        <TableCell>{packet.tcp_dstport}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;
