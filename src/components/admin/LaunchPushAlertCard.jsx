import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function LaunchPushAlertCard() {
  const [message, setMessage] = useState("Yardit is launching soon! Get ready to discover yard sales, local vendors, and neighborhood events near you.");

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("sendLaunchPushAlert", {
        title: "Yardit launch alert",
        message,
        url: window.location.origin + "/ComingSoon",
      });
      if (response.data?.error || response.data?.success === false) throw new Error(Array.isArray(response.data.error) ? response.data.error.join(", ") : response.data.error);
      return response.data;
    },
    onSuccess: (data) => toast.success(`Launch alert sent to ${data.recipients || 0} subscriber(s)`),
    onError: (error) => toast.error(error.message || "Failed to send launch alert"),
  });

  const handleSend = () => {
    if (!window.confirm("Send this launch push alert to all OneSignal subscribers?")) return;
    sendMutation.mutate();
  };

  return (
    <div className="rounded-xl border border-[#2C4F4E]/15 bg-[#F3E6CF]/60 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-full bg-[#5DADA5]/15 p-2 text-[#2C4F4E]"><Bell className="h-4 w-4" /></div>
        <div>
          <p className="font-semibold text-[#2C4F4E]">Launch push alert</p>
          <p className="text-sm text-slate-600">Send one launch notification to all OneSignal subscribers.</p>
        </div>
      </div>
      <Textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={180} className="bg-white/70" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{message.length}/180 characters</p>
        <Button onClick={handleSend} disabled={sendMutation.isPending || !message.trim()} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Launch Alert
        </Button>
      </div>
    </div>
  );
}