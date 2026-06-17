import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { clearAdminSession } from "../components/admin/AdminLoginModal";
import { useAuth } from "@/lib/AuthContext";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import { isIosDevice, isStandaloneInstalled, canUseBrowserInstallPrompt, shouldShowInstallButton } from "@/lib/installPrompt";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";

const STARTUP_PAGE_KEY = "yardit_startup_page";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [hasVendorAccount, setHasVendorAccount] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogMode, setInstallDialogMode] = useState("ios");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [startupPage, setStartupPage] = useState(() => localStorage.getItem(STARTUP_PAGE_KEY) || "map");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const accounts = await getUserVendorAccounts(currentUser);
        setHasVendorAccount(accounts.length > 0);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    fetchUser();
  }, []);

  const handleStartupPageChange = (value) => {
    setStartupPage(value);
    localStorage.setItem(STARTUP_PAGE_KEY, value);
  };


  const handleLogout = () => {
    clearAdminSession();
    logout(createPageUrl("Home"));
  };

  useEffect(() => {
    const updateInstallState = () => {
      setCanInstallApp(shouldShowInstallButton());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setCanInstallApp(true);
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
    if (isIosDevice()) {
      setInstallDialogMode("ios");
      setShowInstallDialog(true);
      return;
    }

    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      setDeferredInstallPrompt(null);
      setCanInstallApp(false);
      return;
    }

    setInstallDialogMode("fallback");
    setShowInstallDialog(true);
  };

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#5DADA5] text-white px-4 py-3 rounded-t-lg mb-0">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <div className="bg-[#F3E6CF] px-4 py-4">

        {canInstallApp && (
          <Card className="mb-4 rounded-lg border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Install Yardit</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleInstallClick}
                variant="outline"
                className="w-full justify-start text-left font-normal text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                Install Yardit
              </Button>
            </CardContent>
          </Card>
        )}

        {hasVendorAccount && (
          <Card className="mb-4 rounded-lg border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Startup Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600 mb-3">Choose which page opens when you launch Yardit.</p>
              <Button
                onClick={() => handleStartupPageChange("map")}
                variant={startupPage === "map" ? "default" : "outline"}
                className={`w-full justify-start font-normal text-slate-700 ${startupPage === "map" ? "bg-[#5DADA5] hover:bg-[#4A9B93] text-white" : "border-slate-300 hover:bg-slate-50"}`}
              >
                {startupPage === "map" ? "✓ " : ""}Open to Map
              </Button>
              <Button
                onClick={() => handleStartupPageChange("vendor")}
                variant={startupPage === "vendor" ? "default" : "outline"}
                className={`w-full justify-start font-normal text-slate-700 ${startupPage === "vendor" ? "bg-[#5DADA5] hover:bg-[#4A9B93] text-white" : "border-slate-300 hover:bg-slate-50"}`}
              >
                {startupPage === "vendor" ? "✓ " : ""}Open to Vendor Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4 rounded-lg border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => navigate(createPageUrl("StartupGuide"))}
              variant="outline"
              className="w-full justify-start text-left font-normal text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              View Startup Guide
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("FAQ"))}
              variant="outline"
              className="w-full justify-start text-left font-normal text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              FAQ Section
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("ContactSupport"))}
              variant="outline"
              className="w-full justify-start text-left font-normal text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              Contact Support
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("MySupportTickets"))}
              variant="outline"
              className="w-full justify-start text-left font-normal text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              My Support Tickets
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-4 rounded-lg border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate(createPageUrl("Notifications") + "?tab=history")}
              variant="outline"
              className="w-full justify-start text-left font-normal text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              Notification History
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              Logout
            </Button>
          </CardContent>
        </Card>
        </div>

        <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} mode={installDialogMode} />
      </div>
    </div>
  );
}