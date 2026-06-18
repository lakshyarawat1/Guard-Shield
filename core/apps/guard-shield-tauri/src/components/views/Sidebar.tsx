
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "../../components/ui/accordion";
  import {
    ArrowLeftCircle,
    ArrowRightCircle,
    Ban,
    Clock,
    Code2,
    FilePlus,
    Globe,
    HeartPulse,
    LineChart,
    NetworkIcon,
    Radar,
    ScrollText,
    SearchIcon,
    Settings,
    ShieldCheck,
  } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <div className="w-56 shrink-0 border-r h-full py-4 px-3 max-h-screen overflow-hidden min-h-164">
      <Accordion type="single" className="w-full" collapsible >
        <AccordionItem value="Threat Monitoring">
          <AccordionTrigger>Threat Monitoring</AccordionTrigger>
          <AccordionContent>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => navigate("/")}
            >
              <LineChart className="size-4" />
              <span>Analytics Dashboard</span>
            </div>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => navigate("/live-traffic")}
            >
              <Radar className="size-4" />
              <span>Live Traffic</span>
            </div>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => navigate("/suspicious-traffic")}
            >
              <SearchIcon className="size-4" />
              <span>Suspicious Traffic</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <LineChart className="size-4" />
              <span>Filtering & Analysis</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Clock className="size-4" />
              <span>Event Timeline</span>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="Policy Management">
          <AccordionTrigger>Policy Management</AccordionTrigger>
          <AccordionContent>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Code2 className="size-4" />
              <span>Malware Prevention</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <ArrowLeftCircle className="size-4" />
              <span>Inbound Rules</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <ArrowRightCircle className="size-4" />
              <span>Outbound Rules</span>
            </div>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => {
                new WebviewWindow('create-rule', {
                  url: '/#/create-rule',
                  title: 'Create Custom Rule',
                  width: 900,
                  height: 700,
                });
              }}
            >
              <FilePlus className="size-4" />
              <span>Custom Rules</span>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="Intelligence">
          <AccordionTrigger>Intelligence</AccordionTrigger>
          <AccordionContent>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Globe className="size-4" />
              <span>Threat Feed</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Ban className="size-4" />
              <span>Blocked IPs</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <ShieldCheck className="size-4" />
              <span>Whitelisted IPs</span>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="System">
          <AccordionTrigger>System</AccordionTrigger>
          <AccordionContent>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => navigate("/system-health")}
            >
              <HeartPulse className="size-4" />
              <span>System Health</span>
            </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <ScrollText className="size-4" />
              <span>Audit Logs</span>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="Settings">
          <AccordionTrigger>Settings</AccordionTrigger>
          <AccordionContent>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => {
                new WebviewWindow('general-settings', {
                  url: '/#/settings/general',
                  title: 'General Settings',
                  width: 900,
                  height: 700,
                });
              }}
            >
              <Settings className="size-4" />
              <span>General Settings</span>
            </div>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => {
                new WebviewWindow('networking-settings', {
                  url: '/#/settings/networking',
                  title: 'Networking Settings',
                  width: 900,
                  height: 700,
                });
              }}
            >
              <NetworkIcon className="size-4" />
              <span>Networking Settings</span>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default Sidebar;
