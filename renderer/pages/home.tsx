"use client";

import React from "react";
import Head from "next/head";
import { Header } from "@/components/global/Header";
import Infobar from "@/components/global/Infobar";
import Sidebar from "@/components/global/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Monitoring from "@/components/global/Monitoring";

export default function HomePage() {
  return (
    <React.Fragment>
      <Head>
        <title>Guard Shield</title>
      </Head>

      <div className={`relative flex min-h-screen flex-col bg-background`}>
        <div className="w-full flex flex-col items-center justify-center px-4 border-b">
          <Header />
        </div>
        <Infobar />
        <div className="flex">
          <Sidebar />
          <div className="m-[0.3rem] p-4 w-[85%]">
            <h1 className="text-xl font-black tracking-tighter">IDS / IPS</h1>
            <Tabs defaultValue="Monitoring" className="my-4">
              <TabsList>
                <TabsTrigger value="Monitoring">Monitoring</TabsTrigger>
                <TabsTrigger value="Packet Query">Packet Query</TabsTrigger>
              </TabsList>
              <TabsContent value="Monitoring">
                {" "}
                <Monitoring />
              </TabsContent>
              <TabsContent value="Packet Query">Packet Query</TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
