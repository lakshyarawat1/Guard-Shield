import { Header } from '@/components/custom/Header';
import Infobar from '@/components/custom/Infobar';
import Sidebar from '@/components/custom/Sidebar';
import React from 'react'

type Props = object

const page = (props: Props) => {
  return (
    <div className={` min-h-screen  flex-col bg-background`}>
      <div className="w-full flex flex-col items-center justify-center px-4 border-b">
        <Header />
      </div>
      <Infobar />
      <div className="flex">
        <Sidebar />
        <div className="m-[0.3rem] p-4 w-[85%]">
          <h1 className="text-2xl font-bold mb-4">Profile Page</h1>
        </div>
      </div>
    </div>
  );
}

export default page