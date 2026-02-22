import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function UserSendMessage({ user }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: subject.trim(),
      body: body.trim(),
    });
    toast.success(`Email sent to ${user.email}`);
    setSubject("");
    setBody("");
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Send Message to User</h3>
      <p className="text-xs text-gray-500">This will send an email to <strong>{user.email}</strong></p>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject..."
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Message</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[120px]"
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !body.trim()}
        className="gap-1"
        size="sm"
      >
        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        Send Email
      </Button>
    </div>
  );
}