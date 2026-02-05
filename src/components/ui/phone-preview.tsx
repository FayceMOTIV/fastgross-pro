"use client";

import { useState } from "react";
import { X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhonePreviewProps {
  className?: string;
}

export function PhonePreviewButton({ className }: PhonePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-full shadow-2xl shadow-violet-500/30 hover:scale-105 transition-all",
          className
        )}
      >
        <Smartphone className="h-5 w-5" />
        <span className="hidden sm:inline">Vue Mobile</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* iPhone Frame */}
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iPhone Outer Frame */}
            <div className="relative bg-slate-900 rounded-[3rem] p-3 shadow-2xl">
              {/* Dynamic Island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-10" />

              {/* Screen Bezel */}
              <div className="relative bg-black rounded-[2.5rem] overflow-hidden">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/50 to-transparent z-10 flex items-center justify-between px-8 pt-2">
                  <span className="text-white text-xs font-medium">9:41</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9V6.52c1.54-.5 3.18-.77 4.9-.77s3.36.27 4.9.77v2.31c0 .4.23.74.56.9.98.49 1.87 1.12 2.66 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/>
                    </svg>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
                    </svg>
                  </div>
                </div>

                {/* iPhone Screen with iframe */}
                <iframe
                  src={typeof window !== 'undefined' ? window.location.href : '/'}
                  className="w-[375px] h-[812px] bg-white"
                  style={{
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                  }}
                />
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Label */}
            <div className="text-center mt-4">
              <p className="text-white/80 text-sm">iPhone 14 Pro - 375 x 812px</p>
              <p className="text-white/50 text-xs mt-1">Cliquez en dehors pour fermer</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
