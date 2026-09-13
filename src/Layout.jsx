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
import { getUserVendorAccounts, isLeagueTeamAccount } from "@/lib/getUserVendorAccounts";
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
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import UserAccountMenuContent from "@/components/navigation/UserAccountMenuContent";
import AccountSetupModal from "./components/profile/AccountSetupModal";
import VerifiedAddressRequiredModal from "./components/profile/VerifiedAddressRequiredModal";
import FloatingLaunchChecklist from "./components/checklist/FloatingLaunchChecklist";
import PushSubscribePrompt from "./components/notifications/PushSubscribePrompt";
import YarditSplashScreen from "@/components/install/YarditSplashScreen";
import { isIosDevice, isStandaloneInstalled, canUseBrowserInstallPrompt, shouldShowInstallButton, syncInstallRecord } from "@/lib/installPrompt";

const relId = (v) => (v && typeof v === "object" ? v.id : v);
const STARTUP_CHECK_KEY = "yardit_startup_checked";

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
  const [startupPage, setStartupPage] = useState(() => localStorage.getItem("yardit_startup_page") === "vendor" ? "vendor" : "map");
  const { isGuest, isAuthenticated, logout, navigateToLogin } = useAuth() || {};

  const { guardAction, showModal, setShowModal, isGuest: guestHookIsGuest } = useGuestGuard();

  useEffect(() => {
      if (user?.isAdmin) {
          setHasAdminProfile(true);
      } else {
          setHasAdminProfile(false);
      }

      if (user?.id) {
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
    const handleStartupPageChanged = (event) => {
      setStartupPage(event.detail === "vendor" ? "vendor" : "map");
    };

    window.addEventListener("yardit:startup-page-changed", handleStartupPageChanged);
    return () => window.removeEventListener("yardit:startup-page-changed", handleStartupPageChanged);
  }, []);

  useEffect(() => {
    const updateInstallState = () => {
      const appInstalled = syncInstallRecord();
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
    window.addEventListener("focus", updateInstallState);
    document.addEventListener("visibilitychange", updateInstallState);
    updateInstallState();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("focus", updateInstallState);
      document.removeEventListener("visibilitychange", updateInstallState);
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
    await logout?.("/");
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
      <header className="yardit-top-nav sticky top-0 z-[3000] border-b-2 border-[#2C4F4E] bg-[#5DADA5] shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="yardit-nav-row flex items-center justify-between">
            <div className="yardit-nav-logo flex items-center gap-3">
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

            <nav className="yardit-nav-items flex items-center gap-2 flex-wrap">
              {canViewLaunchChecklist && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLaunchChecklist(true)}
                  className="yardit-nav-desktop-only gap-2 text-white hover:bg-white/10"
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
                  className="yardit-nav-desktop-only gap-2 rounded-full border border-white/60 bg-white/15 px-3 text-white shadow-sm hover:bg-white/25"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Install App</span>
                </Button>
              )}

              <Link to={createPageUrl("Home")} onClick={() => window.dispatchEvent(new CustomEvent("yardit:show-map-view"))} className="yardit-nav-map-link">
                <Button
                  variant={location.pathname === createPageUrl("Home") || location.pathname === "/" ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 ${location.pathname === createPageUrl("Home") || location.pathname === "/" ? "bg-white/20 text-white hover:bg-white/30" : "text-white hover:bg-white/10"}`}
                >
                  <Home className="w-4 h-4" />
                  <span>Map</span>
                </Button>
              </Link>

              {hasVendorAccount && startupPage === "vendor" && (
                <Button
                  variant={location.pathname === "/VendorDashboard" || location.pathname === "/LeagueTeamDashboard" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/VendorDashboard")}
                  className={`gap-2 ${location.pathname === "/VendorDashboard" || location.pathname === "/LeagueTeamDashboard" ? "bg-white/20 text-white hover:bg-white/30" : "text-white hover:bg-white/10"}`}
                >
                  <Store className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
              )}

              {!isAuthenticated && (
                <Button
                  size="sm"
                  onClick={() => navigate("/AccountOptions")}
                  className="gap-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold"
                >
                  <User className="w-4 h-4" />
                  <span>Log In / Sign Up</span>
                </Button>
              )}
              
              <>
                {user && (
                  <div className="yardit-nav-alerts block min-w-0 text-white">
                    <NotificationBell />
                    <span className="yardit-nav-alerts-label hidden">Alerts</span>
                  </div>
                )}

                {user && (
                  <>
                    <Button
                    size="sm"
                    onClick={handlePostSaleClick}
                    className="yardit-nav-post-button gap-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="yardit-nav-post-desktop-label">Post Sale</span>
                    <span className="yardit-nav-post-mobile-label hidden">Post</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="yardit-nav-menu-button text-white hover:bg-white/10 h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                        <span className="yardit-nav-menu-label hidden">Menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <UserAccountMenuContent
                      navigate={navigate}
                      onLogout={handleLogout}
                      hasVendorAccount={hasVendorAccount}
                      hasAdminProfile={hasAdminProfile}
                      dashboardPath="/VendorDashboard"
                    />
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

      <main className="yardit-main-with-bottom-nav flex-1 w-full min-w-0 flex flex-col">
        {children}
      </main>

      <MobileBottomNav
        user={user}
        isAuthenticated={isAuthenticated}
        hasVendorAccount={hasVendorAccount}
        hasAdminProfile={hasAdminProfile}
        showVendorHomeButton={hasVendorAccount && startupPage === "vendor"}
        navigateToLogin={() => navigate("/AccountOptions")}
        onPostSale={handlePostSaleClick}
        onLogout={handleLogout}
      />
      
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
      <PushSubscribePrompt user={user} />
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
  const [startupResolved, setStartupResolved] = useState(false);

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

        const startupPage = localStorage.getItem("yardit_startup_page");
        const isRoot = window.location.pathname === "/" || window.location.pathname === createPageUrl("Home");
        const startupAlreadyChecked = sessionStorage.getItem(STARTUP_CHECK_KEY) === "true";

        if (!startupAlreadyChecked) {
          sessionStorage.setItem(STARTUP_CHECK_KEY, "true");

          if (startupPage === "vendor" && isRoot) {
            const organizerAccounts = await getUserVendorAccounts(currentUser).catch(() => []);

            if (organizerAccounts.length > 0) {
              const userKey = currentUser?.id || currentUser?.email || "";
              const globalDefaultId = localStorage.getItem("yardit_default_organizer_account_id");
              const legacyLeagueDefaultId = userKey ? localStorage.getItem(`yardit_default_league_account_id:${userKey}`) : localStorage.getItem("yardit_default_league_account_id");
              const legacyVendorDefaultId = userKey ? localStorage.getItem(`yardit_default_vendor_account_id:${userKey}`) : localStorage.getItem("yardit_default_vendor_account_id");
              const preferredId = globalDefaultId || legacyLeagueDefaultId || legacyVendorDefaultId;
              const preferredAccount = organizerAccounts.find((account) => account.id === preferredId) || organizerAccounts[0];
              localStorage.setItem("yardit_default_organizer_account_id", preferredAccount.id);
              const route = isLeagueTeamAccount(preferredAccount) ? "/LeagueTeamDashboard" : "/VendorDashboard";
              window.location.replace(`${route}?account=${encodeURIComponent(preferredAccount.id)}`);
              return;
            }

            localStorage.removeItem("yardit_startup_page");
          }
        }

        setStartupResolved(true);
      } catch (error) {
        console.error("Error fetching user:", error);
        setStartupResolved(true);
      }
    };
    fetchUser();

    return () => window.removeEventListener("yardit:user-updated", handleUserUpdated);
  }, []);

  if (!startupResolved) {
    return <YarditSplashScreen />;
  }

  return (
    <HuntProvider>
       <LayoutContent user={user} setUser={setUser}>
         {children}
       </LayoutContent>
    </HuntProvider>
  );
}