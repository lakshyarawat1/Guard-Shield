import React from "react";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Separator } from "../ui/separator";

type Props = {};

const Infobar = (props: Props) => {
  return (
    <div className="w-full border-b py-2 text-sm">
      {" "}
      <Menubar className="border-none">
        <MenubarMenu>
          <MenubarTrigger>Home</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Export data</MenubarItem>
            <MenubarItem>Export as CSV</MenubarItem>
            <MenubarItem disabled>Import data</MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Email link</MenubarItem>
                <MenubarItem>Messages</MenubarItem>
                <MenubarItem>Notes</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Save</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <Separator orientation="vertical" />
        <MenubarMenu>
          <MenubarTrigger>Networking</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Inbound Rules <MenubarShortcut>⌘I</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Outbound Rules <MenubarShortcut>⇧⌘O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Ports</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Search the web</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Default</MenubarItem>
                <MenubarItem>Common ports </MenubarItem>
                <MenubarItem>Custom</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Security</MenubarTrigger>
          <MenubarContent>
            <MenubarItem inset>Blocked IPs</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Protocols <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Troubleshoot</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Logs <MenubarShortcut>⌘L</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Contact Us
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            Customize
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Font Size
            </MenubarItem>
            <MenubarItem>
              Add Member<MenubarShortcut>⌘+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              Sync Changes
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};

export default Infobar;
