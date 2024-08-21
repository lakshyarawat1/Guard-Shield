import * as React from "react";
import './index.css'
import { Header } from "./components/Header";
import Infobar from "./components/Infobar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import Sidebar from "./components/Sidebar";
import Monitoring from "./components/Monitoring";

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
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");

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
            <TabsContent value="Packet Query">Packet Query</TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;
