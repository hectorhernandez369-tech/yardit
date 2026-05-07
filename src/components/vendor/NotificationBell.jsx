import React from "react";
import { Bell } from "lucide-react";

export default function NotificationBell({ updates = [], activePinCheckIn }) {
  const count = (updates?.length || 0) + (activePinCheckIn ? 1 : 0);

  return (
    <div className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
      <Bell className="w-[18px] h-[18px] text-white" />
      {count > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#F4A849] text-[10px] font-bold text-[#2C4F4E] flex items-center justify-center">{Math.min(count, 9)}</span>}
    </div>
  );
}