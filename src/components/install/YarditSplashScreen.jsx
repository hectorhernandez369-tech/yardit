import React from "react";

const YARDIT_LOGO_URL = "https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png";

export default function YarditSplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-[#F4C542]">
      <div className="flex w-full max-w-xs flex-col items-center px-6">
        <img
          src={YARDIT_LOGO_URL}
          alt="Yardit"
          className="mb-8 w-56 max-w-full object-contain"
        />
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[#F4C542]" />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide">Loading YARDIT...</p>
      </div>
    </div>
  );
}