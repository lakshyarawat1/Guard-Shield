import { Bell, ChevronDownIcon, Shield } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenu,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Separator } from "../../../components/ui/separator";
import React from "react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background h-full ">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex h-full items-center">
          <a href="/home" className="mr-6 flex items-center space-x-2">
            <Shield />
            <span className=" inline-block">Guard Shield</span>
          </a>
          <Separator orientation="vertical" className="py-2 mx-2" />
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                className="flex items-center gap-2 px-4"
                variant="outline"
              >
                Default <ChevronDownIcon className="w-4 h-4" />{" "}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="flex flex-col min-w-[20rem]">
              <DropdownMenuItem className="">
                <p className="text-center w-full">No Custom Rules...</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex gap-2 items-center">
            <Button variant="outline" size="icon">
              <Bell className="h-[1.2rem] w-[1.2rem]" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  className="flex items-center gap-2 px-4"
                  variant="outline"
                >
                  Guest <ChevronDownIcon className="w-4 h-4" />{" "}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex flex-col">
                <a
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  My Profile
                </a>
                <a
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  Configuration
                </a>
                <a
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  Settings
                </a>
                <a
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  Contact Us
                </a>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>Sign In</Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
