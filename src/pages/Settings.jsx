import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { clearAdminSession } from "../components/admin/AdminLoginModal";
import UserInfoSection from "@/components/profile/UserInfoSection";
import ProfileCoinsSummary from "../components/profile/ProfileCoinsSummary";
import { useAuth } from "@/lib/AuthContext";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import { isIosDevice, isStandaloneInstalled, canUseBrowserInstallPrompt, shouldShowInstallButton } from "@/lib/installPrompt";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);

  const { data: coinStats } = useQuery({
    queryKey: ["jthUserCoinStats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const records = await base44.entities.JTHUserCoinStats.filter({ user_id: user.id });
      return records?.[0] || null;
    },
    enabled: !!user?.id,
    initialData: null,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    fetchUser();
  }, []);


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
      setShowInstallDialog(true);
      return;
    }

    if (!deferredInstallPrompt) return;

    await deferredInstallPrompt.prompt();
    setDeferredInstallPrompt(null);
    setCanInstallApp(false);
  };

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        <ProfileCoinsSummary stats={coinStats} />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Personal identity, phone number, and verified address are now managed in My Profile.</p>
            <Button onClick={() => navigate(createPageUrl("Profile"))} className="mt-4 bg-amber-600 hover:bg-amber-700">
              Open My Profile
            </Button>
          </CardContent>
        </Card>

        {canInstallApp && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Install Yardit</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleInstallClick}
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                Install Yardit
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate(createPageUrl("StartupGuide"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              View Startup Guide
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("FAQ"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              FAQ Section
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("ContactSupport"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              Contact Support
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("MySupportTickets"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              My Support Tickets
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>My Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate(createPageUrl("Notifications") + "?tab=history")}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              Notification History
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              Logout
            </Button>
          </CardContent>
        </Card>

        <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} />
      </div>
    </div>
  );
}