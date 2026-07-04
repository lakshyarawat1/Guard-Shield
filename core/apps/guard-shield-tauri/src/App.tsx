import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import AnalyticsDashboard from "./components/views/AnalyticsDashboard";
import LiveTraffic from "./components/views/LiveTraffic";
import NetworkingSettings from "./components/views/NetworkingSettings";
import Profile from "./components/views/Profile";
import CreateRule from "./components/views/CreateRule";
import ContactUs from "./components/views/ContactUs";
import GeneralSettings from "./components/views/GeneralSettings";
import SuspiciousTraffic from "./components/views/SuspiciousTraffic";
import SystemHealth from "./components/views/SystemHealth";
import IpManagement from "./components/views/IpManagement";
import AuditLogs from "./components/views/AuditLogs";
import EventTimeline from "./components/views/EventTimeline";
import WhoisLookup from "./components/views/WhoisLookup";
import GlobalMap from "./components/views/GlobalMap";
import MalwarePrevention from "./components/views/MalwarePrevention";
import ThreatFeed from "./components/views/ThreatFeed";
import InboundRules from "./components/views/InboundRules";
import OutboundRules from "./components/views/OutboundRules";
import { applyFontSize } from "./components/views/Header";
import LoginPage from "./components/auth/LoginPage";
import SignUpPage from "./components/auth/SignUpPage";
import { AuthGuard } from "./components/auth/AuthGuard";
import OrgSelectPage from "./components/auth/OrgSelectPage";
import TeamManagement from "./components/views/TeamManagement";
import AccessControlPage from "./components/views/AccessControlPage";
import { Permission } from "./types/permissions";

function App() {
  useEffect(() => {
    const savedSize = localStorage.getItem("guard_shield_font_size") || "medium";
    applyFontSize(savedSize);

    let unlistenFn: (() => void) | undefined;
    const setupListener = async () => {
      unlistenFn = await listen("ui-settings-changed", () => {
        window.location.reload();
      });
    };
    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  return (
    <Routes>
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/signup/*" element={<SignUpPage />} />
      <Route path="/org-select/*" element={<OrgSelectPage />} />
      
      <Route path="/" element={<AuthGuard requiredPermission={Permission.DASHBOARD_VIEW}><AnalyticsDashboard /></AuthGuard>} />
      <Route path="/live-traffic" element={<AuthGuard requiredPermission={Permission.LIVE_TRAFFIC_VIEW}><LiveTraffic /></AuthGuard>} />
      <Route path="/suspicious-traffic" element={<AuthGuard requiredPermission={Permission.SUSPICIOUS_VIEW}><SuspiciousTraffic /></AuthGuard>} />
      <Route path="/settings/networking" element={<AuthGuard requiredPermission={Permission.SETTINGS_VIEW}><NetworkingSettings /></AuthGuard>} />
      <Route path="/settings/general" element={<AuthGuard requiredPermission={Permission.SETTINGS_VIEW}><GeneralSettings /></AuthGuard>} />
      <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
      <Route path="/create-rule" element={<AuthGuard requiredPermission={Permission.RULES_CREATE}><CreateRule /></AuthGuard>} />
      <Route path="/contact" element={<AuthGuard><ContactUs /></AuthGuard>} />
      <Route path="/whois" element={<AuthGuard><WhoisLookup /></AuthGuard>} />
      <Route path="/system-health" element={<AuthGuard requiredPermission={Permission.SYSTEM_HEALTH_VIEW}><SystemHealth /></AuthGuard>} />
      <Route path="/blocked-ips" element={<AuthGuard requiredPermission={Permission.RULES_VIEW}><IpManagement /></AuthGuard>} />
      <Route path="/whitelisted-ips" element={<AuthGuard requiredPermission={Permission.RULES_VIEW}><IpManagement /></AuthGuard>} />
      <Route path="/audit-logs" element={<AuthGuard requiredPermission={Permission.AUDIT_LOGS_VIEW}><AuditLogs /></AuthGuard>} />
      <Route path="/event-timeline" element={<AuthGuard requiredPermission={Permission.EVENT_TIMELINE_VIEW}><EventTimeline /></AuthGuard>} />
      <Route path="/global-map" element={<AuthGuard requiredPermission={Permission.GLOBAL_MAP_VIEW}><GlobalMap /></AuthGuard>} />
      <Route path="/malware-prevention" element={<AuthGuard requiredPermission={Permission.RULES_VIEW}><MalwarePrevention /></AuthGuard>} />
      <Route path="/threat-feed" element={<AuthGuard requiredPermission={Permission.THREAT_FEED_VIEW}><ThreatFeed /></AuthGuard>} />
      <Route path="/inbound-rules" element={<AuthGuard requiredPermission={Permission.RULES_VIEW}><InboundRules /></AuthGuard>} />
      <Route path="/outbound-rules" element={<AuthGuard requiredPermission={Permission.RULES_VIEW}><OutboundRules /></AuthGuard>} />
      <Route path="/team-management" element={<AuthGuard requiredPermission={Permission.USERS_VIEW}><TeamManagement /></AuthGuard>} />
      <Route path="/access-control" element={<AuthGuard requiredPermission={Permission.ROLES_ASSIGN}><AccessControlPage /></AuthGuard>} />
    </Routes>
  );
}

export default App;
