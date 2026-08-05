import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Map, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";
import YarditEventsMobileBottomNav from "@/components/events/YarditEventsMobileBottomNav";
import UserAccountMenuContent from "@/components/navigation/UserAccountMenuContent";
import { useAuth } from "@/lib/AuthContext";
import { YARDIT_EVENTS_LOGO_URL } from "@/lib/experience";
import { syncAdminInvite } from "@/components/admin/adminInviteSync";

const relId = (v) => (v && typeof v === "object" ? v.id : v);

export default function YarditEventsShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const [hasAdminProfile, setHasAdminProfile] = useState(false);
  const isLeague = location.pathname === "/LeagueTeamDashboard";
  const dashboardPath = isLeague ? "/LeagueTeamDashboard" : "/VendorDashboard";

  const protectedDashboard = ["/VendorDashboard", "/LeagueTeamDashboard", "/VendorEventDashboard", "/VendorEventFlags", "/VendorEventSchedule"].includes(location.pathname);

  useEffect(() => {
    if (!user?.id) {
      setHasAdminProfile(false);
      return;
    }

    if (user?.isAdmin) {
      setHasAdminProfile(true);
      return;
    }

    syncAdminInvite(user).then(({ adminProfile }) => {
      const profileUserId = relId(adminProfile?.user_id);
      setHasAdminProfile(!!adminProfile && adminProfile.is_active === true && profileUserId === user.id);
    }).catch(() => setHasAdminProfile(false));
  }, [user]);

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
                <UserAccountMenuContent
                  navigate={navigate}
                  onLogout={() => logout?.("/")}
                  hasVendorAccount={isAuthenticated}
                  hasAdminProfile={hasAdminProfile}
                  dashboardPath={dashboardPath}
                />
              </DropdownMenu>
            )}
          </nav>
        </div>
      </header>
      <main className="yardit-events-main-with-bottom-nav min-h-[calc(100vh-66px)] bg-slate-50">{content}</main>
      <YarditEventsMobileBottomNav
        isAuthenticated={isAuthenticated}
        isLeague={isLeague}
        hasAdminProfile={hasAdminProfile}
        navigateToLogin={() => navigateToLogin?.(window.location.href)}
        onLogout={() => logout?.("/")}
      />
    </div>
  );
}