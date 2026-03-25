import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Home, User, Settings, Shield, MoreVertical, LogOut, HelpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import NotificationBell from "./components/notifications/NotificationBell";
import AdminLoginModal, { getAdminSession, clearAdminSession } from "./components/admin/AdminLoginModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { HuntProvider, useHunt, HUNT_ENABLED } from "./components/hunt/HuntContext";
import { Map as MapIcon, Crosshair } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useAppMode } from "./components/shared/DemoMode";
import { syncAdminInvite } from "./components/admin/adminInviteSync";
import { useAuth } from "@/lib/AuthContext";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "./components/guest/GuestAuthModal";

const relId = (v) => (v && typeof v === "object" ? v.id : v);

function LayoutContent({ children, user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { huntStops, isHuntActive } = useHunt();
  
  const { isDemoMode: demoActive } = useAppMode();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [hasAdminProfile, setHasAdminProfile] = useState(false);
  const [adminActivatedBanner, setAdminActivatedBanner] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const { isGuest, enterGuestMode } = useAuth() || {};

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("yardit_has_seen_startup_guide");
    if (!hasSeenGuide && location.pathname !== createPageUrl("StartupGuide")) {
      setShowWelcomePopup(true);
    }
  }, [location.pathname]);

  const handleSkipGuide = () => {
    localStorage.setItem("yardit_has_seen_startup_guide", "true");
    setShowWelcomePopup(false);
  };

  const handleLearnMore = () => {
    setShowWelcomePopup(false);
    navigate(createPageUrl("StartupGuide"));
  };

  const { guardAction, showModal, setShowModal, isGuest: guestHookIsGuest } = useGuestGuard();

  useEffect(() => {
      if (user?.isAdmin) {
          setHasAdminProfile(true);
      } else {
          setHasAdminProfile(false);
      }
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3E6CF] overflow-x-hidden max-w-[100vw]">
      <Toaster richColors position="top-center" />
      <header className="bg-[#5DADA5] border-b-2 border-[#2C4F4E] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={createPageUrl("Home")}
                className="flex flex-col items-center justify-center group select-none touch-none"
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/aa5288319_file_00000000c1b871f5aeb839b78344a9a4.png" 
                  alt="Yardit Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
                />
                <span className="text-[10px] sm:text-xs font-bold text-[#F4A849] tracking-widest font-[cursive] leading-none mt-0.5 [-webkit-text-stroke:0.5px_white]">YARDIT</span>
              </Link>
              {demoActive && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Demo
                </span>
              )}
            </div>

            <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
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
              
              {(user || isGuest) && (
                <>
                  {!isGuest && <NotificationBell />}
                  
                  <Button
                    size="sm"
                    onClick={() => guardAction(() => navigate(createPageUrl("CreateListing")))}
                    className="gap-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Post Sale</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#E7D7B8] border-2 border-[#2C4F4E] z-[99999] relative">
                      {!isGuest && (
                        <>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl("MyListings"))} className="cursor-pointer text-[#2C4F4E] focus:bg-[#DCC9A5] font-medium">
                            <User className="w-4 h-4 mr-2" />
                            My Listings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))} className="cursor-pointer text-[#2C4F4E] focus:bg-[#DCC9A5] font-medium">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {hasAdminProfile && !isGuest && (
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
                      <DropdownMenuItem onClick={() => navigate(createPageUrl("FAQ"))} className="cursor-pointer text-[#2C4F4E] focus:bg-[#DCC9A5] font-medium">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        FAQ
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => isGuest ? base44.auth.redirectToLogin(window.location.href) : base44.auth.logout()} className="cursor-pointer text-[#2C4F4E] focus:bg-white font-medium">
                        {isGuest ? (
                           <>
                             <User className="w-4 h-4 mr-2" />
                             Log In / Sign Up
                           </>
                        ) : (
                           <>
                             <LogOut className="w-4 h-4 mr-2 text-red-600" />
                             <span className="text-red-600">Logout</span>
                           </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

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
      
      <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} />

      <AdminLoginModal
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={() => {
          setShowAdminLogin(false);
          navigate(createPageUrl("AdminLite"));
        }}
      />

      <Dialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <DialogContent className="sm:max-w-md bg-[#F3E6CF] border-2 border-[#2C4F4E]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#2C4F4E] text-center">Welcome to Yardit</DialogTitle>
            <DialogDescription className="text-center text-slate-700 mt-4 text-base">
              Yardit helps you discover yard sales, neighborhood events, and hidden treasures happening around you.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button 
              onClick={handleLearnMore}
              className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] shadow-sm font-semibold"
            >
              Learn How Yardit Works
            </Button>
            <Button 
              onClick={handleSkipGuide}
              variant="outline"
              className="w-full border-2 border-[#2C4F4E]/30 text-[#2C4F4E] hover:bg-[#E7D7B8]"
            >
              I Already Know How To Use Yardit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        setUser(currentUser);

        syncAdminInvite(currentUser).then(({ accepted, adminProfile }) => {
          const profileUserId = relId(adminProfile?.user_id);
          const adminIsActive = !!adminProfile && adminProfile.is_active === true && profileUserId === currentUser.id;
          
          if (adminIsActive) {
            setUser(prev => prev ? { ...prev, isAdmin: true, role: adminProfile.role_label } : null);
          } else {
            setUser(prev => prev ? { ...prev, isAdmin: false } : null);
          }
        }).catch(() => {
          setUser(prev => prev ? { ...prev, isAdmin: false } : null);
        });

        base44.functions.invoke("syncNeighborhoodCoHostInvite", {}).catch(() => {});

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