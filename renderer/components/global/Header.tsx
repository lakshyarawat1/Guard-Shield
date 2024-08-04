import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import { Bell, ChevronDownIcon, Shield } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex h-full items-center">
          <Link href="/home" className="mr-6 flex items-center space-x-2">
            <Shield />
            <span className="font-bold inline-block">Guard Shield</span>
          </Link>
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
            <ModeToggle />
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
                <Link
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  My Profile
                </Link>
                <Link
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  Configuration
                </Link>
                <Link
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  Settings
                </Link>
                <Link
                  href="/profile"
                  className="px-12 py-2 hover:bg-slate-800 rounded-lg text-center"
                >
                  Contact Us
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>Sign In</Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
