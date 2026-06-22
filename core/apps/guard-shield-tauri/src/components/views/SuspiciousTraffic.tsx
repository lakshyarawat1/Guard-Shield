import { Header } from "./Header";
import Infobar from "./Infobar";
import Sidebar from "./Sidebar";
import Monitoring from "./Monitoring";

export default function SuspiciousTraffic() {
  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-col h-[calc(100vh-50px)]">
        <Infobar />
        <div className="flex h-full w-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 relative overflow-hidden bg-muted/10 flex flex-col p-2">
            <Monitoring />
          </div>
        </div>
      </div>
    </div>
  );
}
