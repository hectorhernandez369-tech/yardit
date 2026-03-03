import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Home, User, Settings, Shield, MoreVertical, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminNotificationBell from "./components/caseManagement/ui/AdminNotificationBell";
import AdminLoginModal, { getAdminSession, clearAdminSession } from "./components/admin/AdminLoginModal";
import { Button } from "@/components/ui/button";
import { HuntProvider, useHunt, HUNT_ENABLED } from "./components/hunt/HuntContext";
import { Map as MapIcon, Crosshair } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Toaster } from "sonner";
import { toast } from "sonner";
import DemoModeToggle, { isDemoMode } from "./components/shared/DemoMode";
import { syncAdminInvite } from "./components/admin/adminInviteSync";

const relId = (v) => (v && typeof v === "object" ? v.id : v);

function LayoutContent({ children, user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { huntStops, isHuntActive } = useHunt();
  
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [hasAdminProfile, setHasAdminProfile] = useState(false);
  const [adminActivatedBanner, setAdminActivatedBanner] = useState(false);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    const handler = () => setDemoActive(isDemoMode());
    window.addEventListener("demo-mode-change", handler);
    return () => window.removeEventListener("demo-mode-change", handler);
  }, []);

  useEffect(() => {
      if (user?.isAdmin) {
          setHasAdminProfile(true);
      } else {
          setHasAdminProfile(false);
      }
  }, [user]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onLogoPointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      didLongPress.current = true;
      console.log("DEMO LONG PRESS TRIGGERED");
      setShowDemoPanel(prev => !prev);
    }, 1000);
  }, []);

  const onLogoPointerEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const onLogoClick = useCallback((e) => {
    if (didLongPress.current) {
      e.preventDefault();
      didLongPress.current = false;
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3E6CF] overflow-x-hidden max-w-[100vw]">
      <Toaster richColors position="top-center" />
      <header className="bg-[#5DADA5] border-b-2 border-[#2C4F4E] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={createPageUrl("Home")}
                className="flex items-center group select-none touch-none"
                onPointerDown={onLogoPointerDown}
                onPointerUp={onLogoPointerEnd}
                onPointerCancel={onLogoPointerEnd}
                onPointerLeave={onLogoPointerEnd}
                onContextMenu={(e) => e.preventDefault()}
                onClick={onLogoClick}
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/aa5288319_file_00000000c1b871f5aeb839b78344a9a4.png" 
                  alt="Yardit Logo" 
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <span className="ml-2 text-xl font-bold text-[#F4A849] tracking-widest">YARDIT</span>
              </Link>
              {demoActive && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Demo
                </span>
              )}
            </div>

            <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => setShowDemoPanel(prev => !prev)}
                className="text-[10px] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1"
              >
                Demo
              </button>
              
              {/* My Hunt link moved to My Listings */}

              <Link to={createPageUrl("Home")}>
                <Button
                  variant={location.pathname === createPageUrl("Home") || location.pathname === "/" ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 ${location.pathname === createPageUrl("Home") || location.pathname === "/" ? "bg-white/20 text-white hover:bg-white/30" : "text-white hover:bg-white/10"}`}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </Link>
              
              {user && (
                <>
                  {hasAdminProfile && <AdminNotificationBell user={user} />}
                  
                  <Link to={createPageUrl("CreateListing")}>
                    <Button
                      size="sm"
                      className="gap-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Post Sale</span>
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#E7D7B8] border-2 border-[#2C4F4E] z-[99999] relative">
                      <DropdownMenuItem onClick={() => navigate(createPageUrl("MyListings"))} className="cursor-pointer text-[#2C4F4E] focus:bg-[#DCC9A5] font-medium">
                        <User className="w-4 h-4 mr-2" />
                        My Listings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))} className="cursor-pointer text-[#2C4F4E] focus:bg-[#DCC9A5] font-medium">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      {hasAdminProfile && (
                        <DropdownMenuItem
                          onClick={() => {
                            const session = getAdminSession();
                            if (session) {
                              navigate(createPageUrl("AdminLite"));
                            } else {
                              setShowAdminLogin(true);
                            }
                          }}
                          className="cursor-pointer text-[#2C4F4E] focus:bg-[#DCC9A5] font-medium"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => base44.auth.logout()} className="cursor-pointer text-red-600 focus:bg-red-100 font-medium">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {showDemoPanel && (
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 flex items-center justify-center gap-3">
          <DemoModeToggle />
          <button
            onClick={() => setShowDemoPanel(false)}
            className="text-xs text-purple-500 hover:text-purple-700 underline"
          >
            close
          </button>
        </div>
      )}

      {adminActivatedBanner && (
        <div className="bg-green-50 border-b border-green-300 px-4 py-3 flex items-center justify-center gap-3">
          <p className="text-sm text-green-800 font-medium">
            ✅ Admin activated. Click <strong>Admin</strong> and enter your Employee ID + PIN to access the portal.
          </p>
          <button
            onClick={() => setAdminActivatedBanner(false)}
            className="text-green-600 hover:text-green-800 text-lg font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      <main className="flex-1 w-full min-w-0 flex flex-col">
        {children}
      </main>

      <AdminLoginModal
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={() => {
          setShowAdminLogin(false);
          navigate(createPageUrl("AdminLite"));
        }}
      />

      <footer className="bg-[#5DADA5] border-t-2 border-[#2C4F4E] py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0ba1ba06_file_00000000fce071fd9ff100a6a9cf19951.png" 
            alt="Pirate Flag" 
            className="h-[30px] w-auto object-contain"
          />
          <p className="text-center text-xs text-white font-medium">
            Yardit - Seekers find the best residential yard sales
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        let adminIsActive = false;
        try {
          const { accepted, adminProfile } = await syncAdminInvite(currentUser);
          const profileUserId = relId(adminProfile?.user_id);

          adminIsActive = !!adminProfile && adminProfile.is_active === true && profileUserId === currentUser.id;

          if (adminIsActive) {
            currentUser.isAdmin = true;
            currentUser.role = adminProfile.role_label;
          } else {
            currentUser.isAdmin = false;
          }
        } catch {
          currentUser.isAdmin = false;
        }

        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  return (
    <HuntProvider>
       <LayoutContent user={user} setUser={setUser}>
         {children}
       </LayoutContent>
    </HuntProvider>
  );
}