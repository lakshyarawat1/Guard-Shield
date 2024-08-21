import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  Code2,
  DatabaseBackupIcon,
  File,
  LineChart,
  NetworkIcon,
  Radar,
  SearchIcon,
  Settings,
  Share,
} from "lucide-react";

type Props = {};

const Sidebar = (props: Props) => {
  return (
    <div className="w-[15%] border-r h-full py-4 px-3 max-h-screen overflow-hidden min-h-[41rem]">
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="Threat Monitoring">
          <AccordionTrigger>Threat Monitoring</AccordionTrigger>
          <AccordionContent className="">
            <div className="bar-options">
              <Radar />
              <span>IDS / IPS</span>
            </div>
            <div className="bar-options">
              <SearchIcon />
              <span>Suspicious Traffic</span>
            </div>
            <div className="bar-options">
              <LineChart />
              <span>Filtering and Analysis</span>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="Policy Management">
          <AccordionTrigger>Policy Management</AccordionTrigger>
          <AccordionContent>
            <div className="bar-options">
              <Code2 />
              <span>Malware Prevention</span>
            </div>
            <div className="bar-options">
              <ArrowLeftCircle />
              <span>Inbound Rules</span>
            </div>
            <div className="bar-options">
              <ArrowRightCircle />
              <span>Outbound Rules</span>
            </div>
          </AccordionContent>
        </AccordionItem>{" "}
        <AccordionItem value="Export data">
          <AccordionTrigger>Export data</AccordionTrigger>
          <AccordionContent>
            <div className="bar-options">
              <DatabaseBackupIcon />
              <span>Export as CSV</span>
            </div>
            <div className="bar-options">
              <File />
              <span>Export in a file</span>
            </div>
            <div className="bar-options">
              <Share />
              <span>Share </span>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="Settings">
          <AccordionTrigger>Settings</AccordionTrigger>
          <AccordionContent>
            <div className="bar-options">
              <Settings />
              <span>General Settings</span>
            </div>
            <div className="bar-options">
              <NetworkIcon />
              <span>Networking Settings</span>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default Sidebar;
