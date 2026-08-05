import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, HelpCircle, Home, LogOut, Map as MapIcon, MoreVertical, Plus, Settings, Shield, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";
import { YARDIT_EVENTS_LOGO_URL } from "@/lib/experience";

export default function YarditEventsMobileBottomNav({ isAuthenticated, isLeague, hasAdminProfile, navigateToLogin, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardPath = isLeague ? "/LeagueTeamDashboard" : "/VendorDashboard";
  const isMapActive = location.pathname === "/";

  if (!isAuthenticated) {
    return (
      <nav className="yardit-mobile-bottom-nav yardit-events-mobile-bottom-nav yardit-mobile-bottom-nav-guest" aria-label="Yardit Events mobile navigation">
        <button onClick={() => navigate("/")} className="yardit-mobile-nav-item">
          <Home className="w-5 h-5" />
          <span>Map</span>
        </button>
        <button onClick={navigateToLogin} className="yardit-mobile-nav-item yardit-mobile-nav-primary">
          <User className="w-5 h-5" />
          <span>Log In</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="yardit-mobile-bottom-nav yardit-events-mobile-bottom-nav" aria-label="Yardit Events mobile navigation">
      <div className="yardit-mobile-nav-logo" aria-hidden="true">
        <img src={YARDIT_EVENTS_LOGO_URL} alt="" />
      </div>

      <div className="yardit-mobile-nav-item yardit-mobile-nav-bell">
        <NotificationBell />
        <span>Alerts</span>
      </div>

      <button onClick={() => navigate("/VendorEventDashboard")} className="yardit-mobile-nav-item yardit-mobile-nav-primary">
        <Plus className="w-5 h-5" />
        <span>Event</span>
      </button>

      <button onClick={() => navigate("/")} className={`yardit-mobile-nav-item yardit-mobile-nav-map ${isMapActive ? "is-active" : ""}`}>
        <Home className="w-5 h-5" />
        <span>Map</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="yardit-mobile-nav-item yardit-mobile-nav-menu">
            <MoreVertical className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={12} className="z-[3001] w-52 rounded-xl border border-[#F4A849]/30 bg-slate-950/95 p-1.5 text-white shadow-xl backdrop-blur-md">
          <div className="px-2 py-0.5 text-[10px] uppercase text-[#F4A849]">Yardit Events</div>
          <DropdownMenuItem onClick={() => navigate(dashboardPath)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
            <CalendarDays className="w-3.5 h-3.5 text-[#F4A849]" /> Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
            <MapIcon className="w-3.5 h-3.5 text-cyan-300" /> Shared Map
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/Profile")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
            <User className="w-3.5 h-3.5 text-cyan-300" /> My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/Settings")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
            <Settings className="w-3.5 h-3.5 text-cyan-300" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/StartupGuide")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-300" /> Help
          </DropdownMenuItem>
          {hasAdminProfile && (
            <DropdownMenuItem onClick={() => navigate("/AdminLite")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
              <Shield className="w-3.5 h-3.5 text-[#F4A849]" /> Admin Login
            </DropdownMenuItem>
          )}
          <div className="h-px bg-white/10 my-0.5" />
          <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-300 hover:bg-red-500/10 transition mt-1">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}