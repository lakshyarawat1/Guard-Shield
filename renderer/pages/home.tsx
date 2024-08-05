import React from "react";
import Head from "next/head";
import { Header } from "@/components/global/Header";
import Infobar from "@/components/global/Infobar";

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
      </div>
    </React.Fragment>
  );
}
