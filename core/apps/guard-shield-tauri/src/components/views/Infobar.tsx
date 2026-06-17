import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "../../components/ui/menubar";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

function openNetworkingSettings() {
  new WebviewWindow('networking-settings', {
    url: '/#/settings/networking',
    title: 'Networking Settings',
    width: 900,
    height: 700,
  });
}

const Infobar = () => {
  return (
    <div className="w-full border-b py-2 text-sm">
      <Menubar className="border-none">
        {/* ── File ── */}
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Export Data</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>
                  Export as CSV <MenubarShortcut>Ctrl+Shift+E</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>Export as JSON</MenubarItem>
                <MenubarItem>Export as PDF Report</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem>
              Import Rules... <MenubarShortcut>Ctrl+I</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Save Snapshot <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Print Report... <MenubarShortcut>Ctrl+P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Monitoring ── */}
        <MenubarMenu>
          <MenubarTrigger>Monitoring</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => window.dispatchEvent(new Event("ui-start-capture"))}>
              Start Capture <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onSelect={() => window.dispatchEvent(new Event("ui-stop-capture"))}>
              Stop Capture <MenubarShortcut>Ctrl+Shift+X</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Pause All Alerts</MenubarItem>
            <MenubarItem>Clear Alert History</MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Auto-Refresh</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>5 seconds</MenubarItem>
                <MenubarItem>10 seconds</MenubarItem>
                <MenubarItem>30 seconds</MenubarItem>
                <MenubarItem>1 minute</MenubarItem>
                <MenubarItem>Off</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Network ── */}
        <MenubarMenu>
          <MenubarTrigger>Network</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={openNetworkingSettings}>
              Networking Settings <MenubarShortcut>Ctrl+N</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Inbound Rules</MenubarItem>
            <MenubarItem>Outbound Rules</MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Ports</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Well-Known Ports (0–1023)</MenubarItem>
                <MenubarItem>Registered Ports (1024–49151)</MenubarItem>
                <MenubarItem>Custom Port Ranges...</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Blocked IPs</MenubarItem>
            <MenubarItem>Whitelisted IPs</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Security ── */}
        <MenubarMenu>
          <MenubarTrigger>Security</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Threat Feed <MenubarShortcut>Ctrl+T</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Protocol Inspector <MenubarShortcut>Ctrl+R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>IDS Mode</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Detection Only</MenubarItem>
                <MenubarItem>Prevention (Active Block)</MenubarItem>
                <MenubarItem>Hybrid</MenubarItem>
                <MenubarItem>Learning Mode</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              Quick Block IP... <MenubarShortcut>Ctrl+B</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Scan Network Now <MenubarShortcut>Ctrl+Shift+N</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Tools ── */}
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Audit Logs <MenubarShortcut>Ctrl+L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Event Timeline</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Packet Decoder</MenubarItem>
            <MenubarItem>DNS Lookup</MenubarItem>
            <MenubarItem>Whois Lookup</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Contact Support</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── View ── */}
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Toggle Sidebar <MenubarShortcut>Ctrl+\</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Theme</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Light</MenubarItem>
                <MenubarItem>Dark</MenubarItem>
                <MenubarItem>System Default</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger>Font Size</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Small</MenubarItem>
                <MenubarItem>Default</MenubarItem>
                <MenubarItem>Large</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Reset Layout</MenubarItem>
            <MenubarItem>
              Fullscreen <MenubarShortcut>F11</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};

export default Infobar;
