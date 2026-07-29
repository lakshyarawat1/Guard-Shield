import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { toast } from "sonner";

async function openOrFocusWindow(
  label: string,
  url: string,
  title: string,
  width: number,
  height: number
) {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const win = new WebviewWindow(label, {
      url,
      title,
      width,
      height,
    });
    await win.once('tauri://created', function () {
      console.log(`Window ${label} created successfully`);
    });
    win.once('tauri://error', function (e) {
      console.error(`Tauri Error for ${label}:`, e);
      toast.error(`Failed to open window due to an internal error.`);
    });
  } catch (e: any) {
    console.error(`Error opening window ${label}:`, e);
    toast.error(`Failed to open window.`);
  }
}

export const openProfileWindow = async () => {
  await openOrFocusWindow('profile', '/#/profile', 'My Profile', 800, 700);
};

export const openCreateRuleWindow = async () => {
  await openOrFocusWindow('create-rule', '/#/create-rule', 'Create Custom Rule', 900, 700);
};

export const openGeneralSettingsWindow = async () => {
  await openOrFocusWindow('general-settings', '/#/settings/general', 'General Settings', 900, 700);
};

export const openContactSupportWindow = async () => {
  await openOrFocusWindow('contact-support', '/#/contact', 'Contact Support', 800, 650);
};

export const openWhoisLookupWindow = async () => {
  await openOrFocusWindow('whois-lookup', '/#/whois', 'Whois Lookup', 900, 700);
};

export const openNetworkingSettingsWindow = async () => {
  await openOrFocusWindow('networking-settings', '/#/settings/networking', 'Networking Settings', 900, 700);
};

export const openTeamManagementWindow = async () => {
  await openOrFocusWindow('team-management', '/#/team-management', 'Team Management', 1000, 750);
};
