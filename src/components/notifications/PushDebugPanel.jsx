import React, { useEffect, useState } from "react";
import { Bug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOneSignalSubscriptionId, getRuntimePushConnection } from "@/lib/pushNotifications";
import { isNativeYarditApp, isPlayYarditWrapper } from "@/lib/nativePushNotifications";

const adminRoles = new Set(["admin", "master", "super_master", "developer"]);

function yesNo(value) {
  return value ? "Yes" : "No";
}

function getLastPushError() {
  try {
    return localStorage.getItem("yardit_last_push_error") || "None recorded";
  } catch (error) {
    return "Unavailable";
  }
}

export default function PushDebugPanel({ user, storedSubscriptionId }) {
  const [debugInfo, setDebugInfo] = useState(null);

  const isAllowed = !!user?.isAdmin || adminRoles.has(user?.role);

  const refreshDebugInfo = async () => {
    if (isNativeYarditApp()) {
      const runtime = await getRuntimePushConnection();
      setDebugInfo({
        native: true,
        platform: runtime.platform || "native",
        notificationPermission: runtime.permissionGranted ? "Granted" : runtime.browserStatus === "blocked" ? "Blocked" : "Not granted",
        oneSignalSubscriptionId: runtime.subscriptionId || storedSubscriptionId || "Not connected",
        pushToken: runtime.pushToken || "Not registered",
        optedIn: runtime.optedIn === true,
        connected: runtime.connected === true,
        lastPushError: runtime.error || window.__YARDIT_ONESIGNAL_INIT_ERROR__ || "",
      });
      return;
    }

    const serviceWorkerSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    let activeServiceWorkerUrl = "Not active";

    if (serviceWorkerSupported) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const activeRegistration = registrations.find((registration) => registration.active?.scriptURL);
      activeServiceWorkerUrl = activeRegistration?.active?.scriptURL || "Not active";
    }

    const oneSignalId = await getOneSignalSubscriptionId();

    setDebugInfo({
      native: false,
      wrapperDetected: isPlayYarditWrapper(),
      browserDevice: typeof navigator !== "undefined" ? navigator.userAgent : "Unavailable",
      secureContext: typeof window !== "undefined" && window.isSecureContext,
      serviceWorkerSupported,
      activeServiceWorkerUrl,
      oneSignalLoaded: typeof window !== "undefined" && !!(window.OneSignalDeferred || window.OneSignal),
      notificationPermission: typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "Unsupported",
      oneSignalSubscriptionId: oneSignalId || storedSubscriptionId || "Not connected",
      lastPushError: getLastPushError(),
    });
  };

  useEffect(() => {
    if (isAllowed) refreshDebugInfo();
  }, [isAllowed, storedSubscriptionId]);

  if (!isAllowed) return null;

  const rows = debugInfo?.native ? [
    ["Platform", debugInfo.platform],
    ["Android notification permission", debugInfo.notificationPermission],
    ["OneSignal subscription ID", debugInfo.oneSignalSubscriptionId],
    ["Push token", debugInfo.pushToken],
    ["Opted in", yesNo(debugInfo.optedIn)],
    ["Connected", yesNo(debugInfo.connected)],
    ...(debugInfo.lastPushError && debugInfo.lastPushError !== "None recorded" ? [["Native initialization error", debugInfo.lastPushError]] : []),
  ] : [
    ...(debugInfo?.wrapperDetected ? [["Runtime", "Android web wrapper — Capacitor bridge absent"]] : []),
    ["Browser/device", debugInfo?.browserDevice],
    ["Secure context", yesNo(debugInfo?.secureContext)],
    ["Service worker support", yesNo(debugInfo?.serviceWorkerSupported)],
    ["Active service worker URL", debugInfo?.activeServiceWorkerUrl],
    ["OneSignal loaded", yesNo(debugInfo?.oneSignalLoaded)],
    ["Notification permission", debugInfo?.notificationPermission],
    ["OneSignal subscription id", debugInfo?.oneSignalSubscriptionId],
    ["Last push error message", debugInfo?.lastPushError],
  ];

  return (
    <Card className="border border-amber-300 bg-amber-50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base text-amber-900">
            <Bug className="h-4 w-4" /> Temporary Push Debug
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshDebugInfo} className="h-8 gap-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 rounded-lg bg-white/80 p-2 text-xs sm:grid-cols-[180px_1fr]">
            <span className="font-semibold text-amber-950">{label}</span>
            <span className="break-words font-mono text-slate-700">{value || "Checking..."}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}