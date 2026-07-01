import React, { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { declinedPromptKey, enablePushPromptSubscription, shouldShowPushPrompt } from "@/lib/pushPromptActions";

const errorText = (status) => {
  if (status === "needs_install") return "Install Yardit to your Home Screen first, then open the installed app to enable push notifications.";
  if (status === "blocked") return "Notifications are blocked in your browser or device settings.";
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

  useEffect(() => {
    let active = true;
    shouldShowPushPrompt(user).then((show) => active && setOpen(show)).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  const handleDecline = () => {
    localStorage.setItem(declinedPromptKey(user.id), "true");
    setOpen(false);
  };

  const handleSubscribe = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await enablePushPromptSubscription(user);
      if (result.status === "enabled" && result.subscriptionId) setOpen(false);
      else setError(errorText(result.status));
    } catch (err) {
      setError("Push notifications could not be enabled right now. Please try again or decline for now.");
    }
    setBusy(false);
  };

  if (!user?.id) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen && setOpen(true)}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-[#2C4F4E] bg-[#F3E6CF] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#2C4F4E]"><Bell className="h-5 w-5 text-[#F4A849]" /> Stay in the loop</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-slate-700">Subscribe to Yardit push notifications for listing updates, account alerts, and important app notices.</p>
        {error && <p className="rounded-2xl bg-white/70 p-3 text-sm font-semibold text-[#2C4F4E]">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleDecline} disabled={busy} className="border-[#2C4F4E]/30">No thanks</Button>
          <Button onClick={handleSubscribe} disabled={busy} className="bg-[#F4A849] font-black text-[#2C4F4E] hover:bg-[#E39635]">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Subscribe</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}