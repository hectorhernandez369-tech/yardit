import React, { useEffect, useState } from "react";
import { Bell, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { afterSetupPromptKey, declinedPromptKey, enablePushPromptSubscription, evaluatePushPromptEligibility, lastPushErrorKey, logPushPromptDecision } from "@/lib/pushPromptActions";
import { createWebPushSetupUrl, isPlayStoreWebWrapper, openPreparedWebPushSetup } from "@/lib/webPushHandoff";

const sessionPromptKey = (userId) => `yardit_push_prompt_session_${userId}`;
const openingCountKey = (userId) => `yardit_push_prompt_opening_count_${userId}`;

const errorText = (status) => {
  if (status === "needs_install") return "Install Yardit to your Home Screen first, then open the installed app to enable push notifications.";
  if (status === "blocked") return "Notifications were previously blocked. Open this browser’s site settings, allow notifications for Yardit, then return and try again.";
  if (status === "unsupported") return "Push notifications are not supported by this browser or device.";
  if (status === "onesignal_not_ready") return "The push service is still loading. Please wait a moment and try again.";
  if (status === "service_worker_not_ready") return "Preparing notifications, please try again in a moment.";
  if (status === "registration_timeout") return "Notifications were allowed, but device registration did not finish. Refresh Yardit and try again.";
  return "Push permission was not completed. You can try again or decline for now.";
};

export default function PushSubscribePrompt({ user }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preparedSetupUrl, setPreparedSetupUrl] = useState("");
  const [preparingHandoff, setPreparingHandoff] = useState(false);
  const playWrapper = isPlayStoreWebWrapper();

  useEffect(() => {
    if (!user?.id) return undefined;
    if (sessionStorage.getItem("yardit_halloween_fast_onboarding") === "true") {
      setOpen(false);
      return undefined;
    }
    let active = true;
    let timers = [];

    const requestPrompt = async (source, attempt = 0) => {
      const decision = await evaluatePushPromptEligibility(user);
      logPushPromptDecision(user, source, { ...decision, attempt });
      if (!active) return;
      if (decision.show) {
        sessionStorage.removeItem(afterSetupPromptKey(user.id));
        setOpen(true);
        return;
      }
      if (decision.retryable && attempt < 3) {
        timers.push(setTimeout(() => requestPrompt(source, attempt + 1), 1500 * (attempt + 1)));
      } else {
        sessionStorage.removeItem(afterSetupPromptKey(user.id));
      }
    };

    if (sessionStorage.getItem(afterSetupPromptKey(user.id)) === "true") {
      requestPrompt("account_setup_complete");
    } else if (sessionStorage.getItem(sessionPromptKey(user.id)) !== "true") {
      sessionStorage.setItem(sessionPromptKey(user.id), "true");
      const previousCount = Number.parseInt(localStorage.getItem(openingCountKey(user.id)) || "0", 10);
      const openingCount = Number.isFinite(previousCount) ? previousCount + 1 : 1;
      localStorage.setItem(openingCountKey(user.id), String(openingCount));
      if (openingCount % 2 === 1) timers.push(setTimeout(() => requestPrompt("every_other_opening"), 1200));
      else logPushPromptDecision(user, "every_other_opening_skipped", { openingCount });
    }

    const handleAccountSetupComplete = (event) => {
      if ((event.detail?.user?.id || user.id) === user.id) requestPrompt("account_setup_complete");
    };

    window.addEventListener("yardit:account-setup-complete", handleAccountSetupComplete);
    return () => {
      active = false;
      timers.forEach(clearTimeout);
      window.removeEventListener("yardit:account-setup-complete", handleAccountSetupComplete);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!open || !playWrapper || !user?.id) {
      setPreparedSetupUrl("");
      setPreparingHandoff(false);
      return undefined;
    }

    let cancelled = false;
    setPreparingHandoff(true);
    setError("");
    createWebPushSetupUrl()
      .then((url) => {
        if (!cancelled) setPreparedSetupUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("Notification setup could not be prepared. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setPreparingHandoff(false);
      });

    return () => { cancelled = true; };
  }, [open, playWrapper, user?.id]);

  const handleDecline = () => {
    localStorage.setItem(declinedPromptKey(user.id), "true");
    setOpen(false);
  };

  const handleSubscribe = async () => {
    setError("");

    if (playWrapper) {
      if (!preparedSetupUrl) {
        setError("Notification setup is still preparing. Please try again in a moment.");
        return;
      }
      const opened = openPreparedWebPushSetup(preparedSetupUrl);
      if (opened) {
        setOpen(false);
      } else {
        setError("Yardit could not open the browser notification setup. Please try again.");
      }
      return;
    }

    setBusy(true);
    try {
      const result = await enablePushPromptSubscription(user);
      if (result.status === "enabled" && result.subscriptionId) setOpen(false);
      else if (result.status === "web_handoff") setOpen(false);
      else setError(errorText(result.status));
    } catch (err) {
      localStorage.setItem(lastPushErrorKey(user.id), err?.message || "subscription_failed");
      setError("Push notifications could not be enabled right now. Please try again or decline for now.");
    }
    setBusy(false);
  };

  if (!user?.id) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-[#2C4F4E] bg-[#F3E6CF] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#2C4F4E]"><Bell className="h-5 w-5 text-[#F4A849]" /> Enable Yardit alerts?</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-slate-700">
          {playWrapper
            ? "Yardit will open the web notification setup in your browser so you can allow alerts there. After you finish, return to Yardit."
            : "Get timely listing updates, account alerts, and important Yardit notices on this device."}
        </p>
        {error && <p className="rounded-2xl bg-white/70 p-3 text-sm font-semibold text-[#2C4F4E]">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleDecline} disabled={busy} className="border-[#2C4F4E]/30">No thanks</Button>
          <Button onClick={handleSubscribe} disabled={busy || (playWrapper && preparingHandoff)} className="bg-[#F4A849] font-black text-[#2C4F4E] hover:bg-[#E39635]">
            {(busy || (playWrapper && preparingHandoff)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {playWrapper && !busy && !preparingHandoff && <ExternalLink className="mr-2 h-4 w-4" />}
            {playWrapper && preparingHandoff ? "Preparing…" : "Enable Notifications"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}