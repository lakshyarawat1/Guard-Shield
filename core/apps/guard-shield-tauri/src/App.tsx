import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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

function App() {
  useEffect(() => {
    const savedSize = localStorage.getItem("guard_shield_font_size") || "medium";
    applyFontSize(savedSize);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<AnalyticsDashboard />} />
      <Route path="/live-traffic" element={<LiveTraffic />} />
      <Route path="/suspicious-traffic" element={<SuspiciousTraffic />} />
      <Route path="/settings/networking" element={<NetworkingSettings />} />
      <Route path="/settings/general" element={<GeneralSettings />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/create-rule" element={<CreateRule />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/whois" element={<WhoisLookup />} />
      <Route path="/system-health" element={<SystemHealth />} />
      <Route path="/blocked-ips" element={<IpManagement />} />
      <Route path="/whitelisted-ips" element={<IpManagement />} />
      <Route path="/audit-logs" element={<AuditLogs />} />
      <Route path="/event-timeline" element={<EventTimeline />} />
      <Route path="/global-map" element={<GlobalMap />} />
      <Route path="/malware-prevention" element={<MalwarePrevention />} />
      <Route path="/threat-feed" element={<ThreatFeed />} />
      <Route path="/inbound-rules" element={<InboundRules />} />
      <Route path="/outbound-rules" element={<OutboundRules />} />
    </Routes>
  );
}

export default App;
