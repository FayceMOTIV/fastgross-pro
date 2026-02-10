"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className = "" }: PhoneMockupProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Phone frame */}
      <div className="relative mx-auto w-[260px] h-[540px] bg-gray-900 rounded-[2.5rem] border-[6px] border-gray-800 shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90px] h-[24px] bg-black rounded-full z-10" />

        {/* Power button */}
        <div className="absolute -right-[9px] top-[110px] w-[3px] h-[50px] bg-gray-700 rounded-r-lg" />

        {/* Volume buttons */}
        <div className="absolute -left-[9px] top-[90px] w-[3px] h-[25px] bg-gray-700 rounded-l-lg" />
        <div className="absolute -left-[9px] top-[125px] w-[3px] h-[40px] bg-gray-700 rounded-l-lg" />

        {/* Screen */}
        <div className="relative w-full h-full overflow-hidden rounded-[2rem] bg-white">
          {children}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[80px] h-[3px] bg-gray-600 rounded-full" />
      </div>
    </div>
  );
}
