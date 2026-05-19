import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Home, User, Settings, Shield, MoreVertical, LogOut, HelpCircle, MapPin, Download, Store } from "lucide-react";
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
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useAppMode } from "./components/shared/DemoMode";
import { syncAdminInvite } from "./components/admin/adminInviteSync";
import { useAuth } from "@/lib/AuthContext";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "./components/guest/GuestAuthModal";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import { isIosDevice, isStandaloneInstalled, canUseBrowserInstallPrompt, shouldShowInstallButton } from "@/lib/installPrompt";

const relId = (v) => (v && typeof v === "object" ? v.id : v);

function LayoutContent({ children, user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { huntStops, isHuntActive } = useHunt();
  
  const { isDemoMode: demoActive } = useAppMode();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [hasAdminProfile, setHasAdminProfile] = useState(false);
  const [hasVendorAccount, setHasVendorAccount] = useState(false);
  const [adminActivatedBanner, setAdminActivatedBanner] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogMode, setInstallDialogMode] = useState("ios");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const { isGuest, isAuthenticated, logout, navigateToLogin } = useAuth() || {};

  useEffect(() => {
    if (!isGuest && !isAuthenticated) {
      setShowWelcomePopup(false);
      return;
    }

    const hasSeenGuide = localStorage.getItem("yardit_has_seen_startup_guide");
    if (!hasSeenGuide && location.pathname !== createPageUrl("StartupGuide")) {
      setShowWelcomePopup(true);
    }
  }, [location.pathname, isGuest, isAuthenticated]);

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

      if (user?.id) {
      // Master admins always get vendor dashboard access (auto-provisioned)
      const masterRoles = new Set(["master", "super_master"]);
      if (masterRoles.has(user.role)) {
        setHasVendorAccount(true);
      } else {
        getUserVendorAccounts(user).then((accounts) => {
          setHasVendorAccount(accounts.length > 0);
        }).catch(() => setHasVendorAccount(false));
      }
      } else {
      setHasVendorAccount(false);
      }
  }, [user]);

  useEffect(() => {
    const updateInstallState = () => {
      setCanInstallApp(shouldShowInstallButton());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleInstalled = () => {
      setDeferredInstallPrompt(null);
      setCanInstallApp(false);
      setShowInstallDialog(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    updateInstallState();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [deferredInstallPrompt]);

  const handleInstallClick = async () => {
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setInstallDialogMode("ios");
      setShowInstallDialog(true);
      return;
    }

    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      return;
    }

    setInstallDialogMode("fallback");
    setShowInstallDialog(true);
  };

  const handleLogout = async () => {
    await logout?.(createPageUrl("Home"));
  };

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



              {!isAuthenticated && (
                <Button
                  size="sm"
                  onClick={navigateToLogin}
                  className="gap-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold"
                >
                  <User className="w-4 h-4" />
                  <span>Log In / Sign Up</span>
                </Button>
              )}
              
              <>
                {user && <NotificationBell />}


                {user && (
                  <>
                    <Button
                    size="sm"
                    onClick={() => guardAction(() => navigate(createPageUrl("CreateListing")), { returnTo: `${window.location.origin}${createPageUrl("CreateListing")}` })}
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
                    <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="z-[1200] w-48 rounded-xl shadow-xl border border-gray-200 bg-white/95 backdrop-blur-md p-1.5">
                      {user ? (
                        <>
                          <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase">Account</div>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl("MyListings"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                            <MapIcon className="w-3.5 h-3.5 text-[#5DADA5]" /> My Listings
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                            <User className="w-3.5 h-3.5 text-[#5DADA5]" /> My Profile
                          </DropdownMenuItem>

                          {hasVendorAccount && (
                            <DropdownMenuItem onClick={() => navigate("/VendorDashboard")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                              <Store className="w-3.5 h-3.5 text-[#5DADA5]" /> Vendor Tools
                            </DropdownMenuItem>
                          )}

                          <div className="h-px bg-gray-100 my-0.5"></div>

                          <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase">System</div>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl("AdminLite"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                            <Shield className="w-3.5 h-3.5 text-[#F4A849]" /> Admin Login
                          </DropdownMenuItem>

                          <div className="h-px bg-gray-100 my-0.5"></div>

                          <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase">Preferences</div>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                            <Settings className="w-3.5 h-3.5 text-gray-500" /> Settings
                          </DropdownMenuItem>

                          <div className="h-px bg-gray-100 my-0.5"></div>

                          <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 transition mt-1">
                            <LogOut className="w-3.5 h-3.5" /> Logout
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => navigate("/AccountOptions")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                            <User className="w-3.5 h-3.5 text-[#5DADA5]" /> Log In / Sign Up
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </>
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
      
      <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} returnTo={`${window.location.origin}${createPageUrl("CreateListing")}`} />

      <AdminLoginModal
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={() => {
          setShowAdminLogin(false);
          navigate(createPageUrl("AdminLite"));
        }}
      />

      <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} mode={installDialogMode} />

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

        // Startup page redirect — only if user still has vendor access
        const startupPage = localStorage.getItem("yardit_startup_page");
        const isRoot = window.location.pathname === "/" || window.location.pathname === createPageUrl("Home");
        if (startupPage === "vendor" && isRoot) {
          const vendorAccounts = await getUserVendorAccounts(currentUser).catch(() => []);
          if (vendorAccounts.length > 0) {
            window.location.replace("/VendorDashboard");
          } else {
            // User lost vendor access — clear the stale preference
            localStorage.removeItem("yardit_startup_page");
          }
        }

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