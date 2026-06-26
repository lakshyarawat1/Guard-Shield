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
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { openCreateRuleWindow, openGeneralSettingsWindow, openNetworkingSettingsWindow } from "../../utils/windows";
import { Button } from "../../components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Separator } from "../../components/ui/separator";

const Sidebar = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem("guard_shield_show_sidebar") !== "false";
  });
  
  const [isCollapsed] = useState(() => {
    return localStorage.getItem("guard_shield_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const handleSync = () => {
      setIsVisible(localStorage.getItem("guard_shield_show_sidebar") !== "false");
    };
    window.addEventListener("toggle-sidebar", handleSync);
    return () => window.removeEventListener("toggle-sidebar", handleSync);
  }, []);

  if (!isVisible) return null;

  // Performance improvement: Memoize navigation categories to prevent
  // recreating this static, nested array structure on every render of Sidebar
  const navCategories = useMemo(() => [
    {
      title: "Threat Monitoring",
      items: [
        { text: "Analytics Dashboard", icon: LineChart, onClick: () => navigate("/") },
        { text: "Live Traffic", icon: Radar, onClick: () => navigate("/live-traffic") },
        { text: "Suspicious Traffic", icon: SearchIcon, iconClass: "text-destructive", onClick: () => navigate("/suspicious-traffic") },
        { text: "Global Threat Map", icon: LineChart, iconClass: "text-primary", onClick: () => navigate("/global-map") },
        { text: "Event Timeline", icon: Clock, onClick: () => navigate("/event-timeline") },
      ]
    },
    {
      title: "Policy Management",
      items: [
        { text: "Malware Prevention", icon: Code2, onClick: () => navigate("/malware-prevention") },
        { text: "Inbound Rules", icon: ArrowLeftCircle, onClick: () => navigate("/inbound-rules") },
        { text: "Outbound Rules", icon: ArrowRightCircle, onClick: () => navigate("/outbound-rules") },
        { text: "Custom Rules", icon: FilePlus, onClick: openCreateRuleWindow },
      ]
    },
    {
      title: "Intelligence",
      items: [
        { text: "Threat Feed", icon: Globe, onClick: () => navigate("/threat-feed") },
        { text: "Blocked IPs", icon: Ban, iconClass: "text-destructive", onClick: () => navigate("/blocked-ips") },
        { text: "Whitelisted IPs", icon: ShieldCheck, iconClass: "text-green-500", onClick: () => navigate("/whitelisted-ips") },
      ]
    },
    {
      title: "System & Settings",
      items: [
        { text: "System Health", icon: HeartPulse, onClick: () => navigate("/system-health") },
        { text: "Audit Logs", icon: ScrollText, onClick: () => navigate("/audit-logs") },
        { text: "Networking Settings", icon: NetworkIcon, onClick: openNetworkingSettingsWindow },
        { text: "General Settings", icon: Settings, onClick: openGeneralSettingsWindow },
      ]
    }
  ], [navigate]);

  return (
    <div className={cn("shrink-0 border-r h-full py-4 max-h-screen overflow-hidden min-h-164 transition-all duration-300", isCollapsed ? "w-16 px-2 overflow-y-auto custom-scrollbar" : "w-56 px-3")}>
      {isCollapsed ? (
        <TooltipProvider>
          <div className="flex flex-col items-center gap-4 mt-2">
            {navCategories.map((cat, i) => (
              <div key={i} className="flex flex-col items-center gap-1 w-full">
                {cat.items.map((item, j) => (
                  <SidebarItem key={j} {...item} isCollapsed={isCollapsed} />
                ))}
                {i < navCategories.length - 1 && <Separator className="w-8 my-2 opacity-50" />}
              </div>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <Accordion type="single" className="w-full" collapsible defaultValue="Threat Monitoring">
          {navCategories.map((cat, i) => (
            <AccordionItem key={i} value={cat.title}>
              <AccordionTrigger>{cat.title}</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-1">
                {cat.items.map((item, j) => (
                  <SidebarItem key={j} {...item} isCollapsed={isCollapsed} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

// Performance improvement: Extract SidebarItem to prevent React from seeing a
// new component type on every Sidebar render. If defined inside Sidebar, React
// would fully unmount and remount every list item in the DOM tree on every render.
// Wrap in React.memo to skip rendering if props haven't changed.
const SidebarItem = React.memo(({ icon: Icon, text, onClick, iconClass, isCollapsed }: any) => {
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onClick}>
            <Icon className={cn("size-5", iconClass)} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold">{text}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 h-auto py-2.5 px-3 font-normal"
      onClick={onClick}
    >
      <Icon className={cn("size-4 shrink-0", iconClass)} />
      <span className="truncate">{text}</span>
    </Button>
  );
});

export default React.memo(Sidebar);
