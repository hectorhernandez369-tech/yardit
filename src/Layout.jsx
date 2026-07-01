import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Home, User, Settings, Shield, MoreVertical, LogOut, HelpCircle, MapPin, Download, Store, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import NotificationBell from "./components/notifications/NotificationBell";
import AdminLoginModal, { getAdminSession, clearAdminSession } from "./components/admin/AdminLoginModal";
import { Button } from "@/components/ui/button";

import { HuntProvider, useHunt, HUNT_ENABLED } from "./components/hunt/HuntContext";
import { Map as MapIcon, Crosshair } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useAppMode } from "./components/shared/DemoMode";
import { syncAdminInvite } from "./components/admin/adminInviteSync";
import { useAuth } from "@/lib/AuthContext";
import { normalizeUser } from "@/lib/normalizeUser";
import { hasVerifiedPrimaryAddress as hasVerifiedPrimaryAddressTrust } from "@/lib/trustActions";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "./components/guest/GuestAuthModal";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import AccountSetupModal from "./components/profile/AccountSetupModal";
import VerifiedAddressRequiredModal from "./components/profile/VerifiedAddressRequiredModal";
import FloatingLaunchChecklist from "./components/checklist/FloatingLaunchChecklist";
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
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogMode, setInstallDialogMode] = useState("ios");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [showLaunchChecklist, setShowLaunchChecklist] = useState(false);
  const [showAddressRequiredModal, setShowAddressRequiredModal] = useState(false);
  const { isGuest, isAuthenticated, logout, navigateToLogin } = useAuth() || {};

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
      const appInstalled = localStorage.getItem("yardit_app_installed") === "true";
      setCanInstallApp(!appInstalled && shouldShowInstallButton());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setCanInstallApp(true);
    };

    const handleInstalled = () => {
      localStorage.setItem("yardit_app_installed", "true");
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
      const choiceResult = await deferredInstallPrompt.prompt();
      if (choiceResult?.outcome === "accepted") {
        localStorage.setItem("yardit_app_installed", "true");
        setDeferredInstallPrompt(null);
        setCanInstallApp(false);
      }
      return;
    }

    setInstallDialogMode("fallback");
    setShowInstallDialog(true);
  };

  const handleLogout = async () => {
    await logout?.("/ComingSoon");
  };

  const hasVerifiedPrimaryAddress = hasVerifiedPrimaryAddressTrust(user);
  const canViewLaunchChecklist = user?.email === "hectorhernandez369@gmail.com";

  const handlePostSaleClick = () => {
    guardAction(() => {
      navigate(createPageUrl("CreateListing"));
    }, { returnTo: `${window.location.origin}${createPageUrl("CreateListing")}` });
  };

  return (
    <div className="yardit-app-shell min-h-screen flex flex-col bg-[#F3E6CF] overflow-x-hidden max-w-[100vw]">
      <Toaster richColors position="top-center" />
      <header className="yardit-bottom-nav fixed bottom-0 left-0 right-0 z-[3000] border-t border-gray-200 bg-white/95 shadow-[0_-10px_28px_rgba(44,79,78,0.18)] backdrop-blur-xl sm:sticky sm:top-0 sm:bottom-auto sm:border-t-0 sm:border-b-2 sm:border-[#2C4F4E] sm:bg-[#5DADA5] sm:shadow-md sm:backdrop-blur-none sm:pb-0">
        <div className="max-w-7xl mx-auto px-3 pb-2 pt-2 sm:px-4 sm:py-2">
          <div className="yardit-nav-row flex items-center justify-center sm:justify-between">
            <div className="yardit-nav-logo hidden sm:flex items-center gap-3">
              <Link
                to={createPageUrl("Home")}
                className="flex flex-col items-center justify-center group select-none touch-none"
              >
                <img 
                  src="https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png" 
                  alt="Yardit Events Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
              </Link>
              {demoActive && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Demo
                </span>
              )}
            </div>

            <nav className="yardit-nav-items grid w-full grid-cols-5 items-center gap-1 sm:flex sm:w-auto sm:grid-cols-none sm:justify-start sm:gap-2 sm:flex-wrap">
              {/* My Hunt link moved to My Listings */}

              {canViewLaunchChecklist && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLaunchChecklist(true)}
                  className="hidden sm:inline-flex gap-2 text-white hover:bg-white/10"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">Checklist</span>
                </Button>
              )}

              {canInstallApp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInstallClick}
                  className="hidden sm:inline-flex gap-2 rounded-full border border-white/60 bg-white/15 px-3 text-white shadow-sm hover:bg-white/25"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Install App</span>
                </Button>
              )}

              <Link to={createPageUrl("Home")} className="col-start-1 justify-self-center sm:col-auto">
                <Button
                  variant={location.pathname === createPageUrl("Home") || location.pathname === "/" ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-12 min-w-[3.75rem] flex-col gap-0.5 rounded-2xl px-2 text-[10px] font-semibold sm:h-8 sm:min-w-0 sm:flex-row sm:gap-2 sm:rounded-md sm:px-3 sm:text-xs ${location.pathname === createPageUrl("Home") || location.pathname === "/" ? "bg-[#5DADA5]/15 text-[#2C4F4E] hover:bg-[#5DADA5]/20 sm:bg-white/20 sm:text-white sm:hover:bg-white/30" : "text-[#2C4F4E] hover:bg-[#5DADA5]/10 sm:text-white sm:hover:bg-white/10"}`}
                >
                  <Home className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span>Map</span>
                </Button>
              </Link>

              {!isAuthenticated && (
                <Button
                  size="sm"
                  onClick={navigateToLogin}
                  className="h-12 rounded-2xl bg-[#F4A849] px-4 text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold sm:h-8 sm:rounded-md"
                >
                  <User className="w-4 h-4" />
                  <span>Log In / Sign Up</span>
                </Button>
              )}
              
              <>
                {user && (
                  <div className="yardit-nav-alerts col-start-2 flex min-w-[3.75rem] flex-col items-center justify-center justify-self-center text-[10px] font-semibold text-[#2C4F4E] sm:col-auto sm:block sm:min-w-0 sm:text-white">
                    <NotificationBell />
                    <span className="yardit-nav-alerts-label -mt-1 block sm:hidden">Alerts</span>
                  </div>
                )}


                {user && (
                  <>
                    <Button
                    size="sm"
                    onClick={handlePostSaleClick}
                    className="yardit-nav-post-button col-start-3 h-14 min-w-[4rem] -translate-y-2 justify-self-center flex-col gap-0.5 rounded-2xl bg-[#F4A849] px-3 text-[10px] font-bold text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-[0_8px_20px_rgba(244,168,73,0.35)] sm:col-auto sm:h-8 sm:min-w-0 sm:translate-y-0 sm:flex-row sm:gap-2 sm:rounded-md sm:px-3 sm:text-xs sm:shadow-md"
                  >
                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span>Post</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="col-start-5 justify-self-center sm:col-auto">
                      <Button variant="ghost" size="sm" className="h-12 min-w-[3.75rem] flex-col gap-0.5 rounded-2xl px-2 text-[10px] font-semibold text-[#2C4F4E] hover:bg-[#5DADA5]/10 sm:h-8 sm:min-w-0 sm:flex-row sm:gap-2 sm:rounded-md sm:px-3 sm:text-xs sm:text-white sm:hover:bg-white/10">
                        <MoreVertical className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="yardit-nav-menu-label sm:hidden">Menu</span>
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

                          {hasAdminProfile && (
                            <>
                              <div className="h-px bg-gray-100 my-0.5"></div>

                              <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase">System</div>
                              <DropdownMenuItem onClick={() => navigate(createPageUrl("AdminLite"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                                <Shield className="w-3.5 h-3.5 text-[#F4A849]" /> Admin Login
                              </DropdownMenuItem>
                            </>
                          )}

                          <div className="h-px bg-gray-100 my-0.5"></div>

                          <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase">Preferences</div>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl("StartupGuide"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
                            <HelpCircle className="w-3.5 h-3.5 text-[#5DADA5]" /> Help
                          </DropdownMenuItem>
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

      <main className="yardit-main-with-bottom-nav flex-1 w-full min-w-0 flex flex-col pb-20 sm:pb-0">
        {children}
      </main>
      
      <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} returnTo={`${window.location.origin}${createPageUrl("CreateListing")}`} />
      <AccountSetupModal user={user} setUser={setUser} />
      <VerifiedAddressRequiredModal
        open={showAddressRequiredModal}
        onOpenChange={setShowAddressRequiredModal}
        onAddNow={() => {
          setShowAddressRequiredModal(false);
          navigate(createPageUrl("Profile"));
        }}
      />

      <AdminLoginModal
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={() => {
          setShowAdminLogin(false);
          navigate(createPageUrl("AdminLite"));
        }}
      />

      <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} mode={installDialogMode} />
      {canViewLaunchChecklist && (
        <FloatingLaunchChecklist open={showLaunchChecklist} onClose={() => setShowLaunchChecklist(false)} />
      )}

      <footer className="hidden sm:block bg-[#5DADA5] border-t-2 border-[#2C4F4E] py-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0ba1ba06_file_00000000fce071fd9ff100a6a9cf19951.png" 
              alt="Pirate Flag" 
              className="h-[30px] w-auto object-contain"
            />
            <p className="text-center text-xs text-white font-medium">
              Yardit - Seekers find the best residential yard sales
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-[11px] font-semibold text-white/90">
            <Link to="/privacy" className="hover:text-white hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white hover:underline">Terms of Service</Link>
            <Link to="/community-guidelines" className="hover:text-white hover:underline">Community Guidelines</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleUserUpdated = (event) => {
      setUser(normalizeUser(event.detail));
    };

    window.addEventListener("yardit:user-updated", handleUserUpdated);

    const fetchUser = async () => {
      try {
        const currentUser = normalizeUser(await base44.auth.me());
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

    return () => window.removeEventListener("yardit:user-updated", handleUserUpdated);
  }, []);

  return (
    <HuntProvider>
       <LayoutContent user={user} setUser={setUser}>
         {children}
       </LayoutContent>
    </HuntProvider>
  );
}