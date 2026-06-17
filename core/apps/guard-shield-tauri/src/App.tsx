import { Routes, Route } from "react-router-dom";
import Dashboard from "./components/views/Dashboard";
import NetworkingSettings from "./components/views/NetworkingSettings";
import Profile from "./components/views/Profile";
import CreateRule from "./components/views/CreateRule";
import ContactUs from "./components/views/ContactUs";
import GeneralSettings from "./components/views/GeneralSettings";
import SuspiciousTraffic from "./components/views/SuspiciousTraffic";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/suspicious-traffic" element={<SuspiciousTraffic />} />
      <Route path="/settings/networking" element={<NetworkingSettings />} />
      <Route path="/settings/general" element={<GeneralSettings />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/create-rule" element={<CreateRule />} />
      <Route path="/contact" element={<ContactUs />} />
    </Routes>
  );
}

export default App;
