import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, HelpCircle, LogOut, Map, MoreVertical, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";
import YarditEventsMobileBottomNav from "@/components/events/YarditEventsMobileBottomNav";
import { useAuth } from "@/lib/AuthContext";
import { YARDIT_EVENTS_LOGO_URL } from "@/lib/experience";

export default function YarditEventsShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const isLeague = location.pathname === "/LeagueTeamDashboard";
  const dashboardPath = isLeague ? "/LeagueTeamDashboard" : "/VendorDashboard";

  const protectedDashboard = ["/VendorDashboard", "/LeagueTeamDashboard", "/VendorEventDashboard", "/VendorEventFlags", "/VendorEventSchedule"].includes(location.pathname);
  const content = !isAuthenticated && protectedDashboard ? (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <img src={YARDIT_EVENTS_LOGO_URL} alt="Yardit Events" className="mx-auto mb-4 h-16 w-auto object-contain" />
        <h1 className="text-2xl font-black text-[#2C4F4E]">Yardit Events is for organizers</h1>
        <p className="mt-2 text-sm text-slate-600">Log in with an organizer account to manage vendors, events, leagues, or teams.</p>
        <Button onClick={() => navigateToLogin?.(window.location.href)} className="mt-5 w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Log In</Button>
      </div>
    </div>
  ) : children;

  return (
    <div className="yardit-events-shell min-h-screen bg-slate-950 text-slate-900">
      <header className="yardit-events-top-nav sticky top-0 z-[3000] border-b border-[#F4A849]/40 bg-slate-950/95 text-white shadow-xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to={dashboardPath} className="flex items-center gap-3">
            <img src={YARDIT_EVENTS_LOGO_URL} alt="Yardit Events" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F4A849]">Yardit Events</p>
              <p className="hidden text-xs text-white/60 sm:block">Organizers · Vendors · Leagues · Teams</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-white hover:bg-white/10"><Map className="h-4 w-4" /><span className="hidden sm:inline">Map</span></Button>
            {isAuthenticated && <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)} className="gap-2 text-white hover:bg-white/10"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></Button>}
            {isAuthenticated ? <div className="text-white"><NotificationBell /></div> : <Button size="sm" onClick={() => navigateToLogin?.()} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Log In</Button>}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open vendor menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="z-[3001] w-52 rounded-xl border border-[#F4A849]/30 bg-slate-950/95 p-1.5 text-white shadow-xl backdrop-blur-md">
                  <div className="px-2 py-0.5 text-[10px] uppercase text-[#F4A849]">Yardit Events</div>
                  <DropdownMenuItem onClick={() => navigate(dashboardPath)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
                    <CalendarDays className="w-3.5 h-3.5 text-[#F4A849]" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10 transition">
                    <Map className="w-3.5 h-3.5 text-cyan-300" /> Shared Map
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
                  <div className="h-px bg-white/10 my-0.5" />
                  <DropdownMenuItem onClick={() => logout?.("/")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-300 hover:bg-red-500/10 transition mt-1">
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </header>
      <main className="yardit-events-main-with-bottom-nav min-h-[calc(100vh-66px)] bg-slate-50">{content}</main>
      <YarditEventsMobileBottomNav
        isAuthenticated={isAuthenticated}
        isLeague={isLeague}
        navigateToLogin={() => navigateToLogin?.(window.location.href)}
        onLogout={() => logout?.("/")}
      />
    </div>
  );
}