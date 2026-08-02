import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const ADMIN_ROLES = new Set(["admin", "master", "supervisor", "super_master"]);

function isAdminAccount(user, adminProfiles = []) {
  if (!user) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  return (adminProfiles || []).some((profile) => profile?.is_active === true);
}

export function getAppMode(settings) {
  const appModeSetting = (settings || []).find((setting) => setting.key === "app_mode");
  return appModeSetting?.value === "demo" ? "demo" : "live";
}

export function isDemoMode(settings) {
  if (Array.isArray(settings)) {
    return getAppMode(settings) === "demo";
  }
  return window.__yarditAppMode === "demo";
}

export function useAppMode() {
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSetting.list(),
    initialData: [],
  });

  const { data: currentUser = null, isLoading: isLoadingUser } = useQuery({
    queryKey: ["appModeCurrentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
    initialData: null,
  });

  const { data: adminProfiles = [], isLoading: isLoadingAdminProfile } = useQuery({
    queryKey: ["appModeAdminProfile", currentUser?.id, currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const byUserId = await base44.entities.AdminProfile.filter({ user_id: currentUser.id }).catch(() => []);
      if (byUserId.length > 0) return byUserId;
      return await base44.entities.AdminProfile.filter({ email: String(currentUser.email || "").toLowerCase() }).catch(() => []);
    },
    enabled: !!currentUser,
    initialData: [],
  });

  const appMode = getAppMode(settings);
  const isAdmin = isAdminAccount(currentUser, adminProfiles);
  const demoEnabled = appMode === "demo" && isAdmin;

  useEffect(() => {
    window.__yarditAppMode = demoEnabled ? "demo" : "live";
  }, [demoEnabled]);

  return { appMode, isDemoMode: demoEnabled, isGlobalDemoMode: appMode === "demo", isAdminDemoMode: demoEnabled, isLoading: isLoading || isLoadingUser || isLoadingAdminProfile, settings };
}

export default function DemoModeToggle() {
  return null;
}