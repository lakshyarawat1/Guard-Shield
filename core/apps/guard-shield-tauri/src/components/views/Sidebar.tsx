
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { openCreateRuleWindow, openGeneralSettingsWindow, openNetworkingSettingsWindow } from "./Header";

const Sidebar = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem("guard_shield_show_sidebar") !== "false";
  });

  useEffect(() => {
    const handleSync = () => {
      setIsVisible(localStorage.getItem("guard_shield_show_sidebar") !== "false");
    };
    window.addEventListener("toggle-sidebar", handleSync);
    return () => window.removeEventListener("toggle-sidebar", handleSync);
  }, []);

  if (!isVisible) return null;

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
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => navigate('/event-timeline')}
            >
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
              onClick={openCreateRuleWindow}
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
              <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors px-2 py-1.5 rounded-sm" onClick={() => navigate('/blocked-ips')}>
                <Ban className="size-4 shrink-0" />
                <span className="truncate">Blocked IPs</span>
              </div>
            <div className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors px-2 py-1.5 rounded-sm" onClick={() => navigate('/whitelisted-ips')}>
              <ShieldCheck className="size-4 shrink-0" />
              <span className="truncate">Whitelisted IPs</span>
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
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => navigate('/audit-logs')}
            >
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
              onClick={openGeneralSettingsWindow}
            >
              <Settings className="size-4" />
              <span>General Settings</span>
            </div>
            <div 
              className="bar-options hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={openNetworkingSettingsWindow}
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
