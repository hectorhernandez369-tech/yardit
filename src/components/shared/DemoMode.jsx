import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

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

  const appMode = getAppMode(settings);
  const demoEnabled = appMode === "demo";

  useEffect(() => {
    window.__yarditAppMode = appMode;
  }, [appMode]);

  return { appMode, isDemoMode: demoEnabled, isLoading, settings };
}

export default function DemoModeToggle() {
  return null;
}