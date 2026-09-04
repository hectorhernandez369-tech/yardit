import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { enableOneSignalPush, getOneSignalSubscriptionId } from "@/lib/pushNotifications";
import PushSetupCard from "@/components/notifications/PushSetupCard";

export default function PushSetup() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [status, setStatus] = useState("validating");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    base44.functions.invoke("pushSetupHandoff", { action: "validate", token })
      .then((response) => setStatus(response?.data?.valid ? (Notification.permission === "denied" ? "blocked" : "ready") : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  const enableNotifications = async () => {
    if (Notification.permission === "denied") { setStatus("blocked"); return; }
    setBusy(true);
    const result = await enableOneSignalPush();
    const subscriptionId = result.subscriptionId || await getOneSignalSubscriptionId();
    if (result.status !== "enabled" || !subscriptionId) {
      setStatus(result.status === "blocked" ? "blocked" : "error");
      setBusy(false);
      return;
    }
    try {
      const response = await base44.functions.invoke("pushSetupHandoff", { action: "complete", token, subscriptionId, userAgent: navigator.userAgent });
      setStatus(response?.data?.success ? "enabled" : "invalid");
    } catch {
      setStatus("invalid");
    }
    setBusy(false);
  };

  return <main className="min-h-dvh bg-[#F3E6CF] px-4 py-10 flex items-center justify-center">
    <PushSetupCard status={status} busy={busy} onEnable={enableNotifications} />
  </main>;
}