import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function SocialShareMessageDialog({ appName, message, url, onClose, onShare }) {
  const [text, setText] = useState(message);
  const [status, setStatus] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setStatus("Message and link copied. Paste them into your post.");
    } catch {
      setStatus("Copy isn't available here. Select the message below and copy it manually.");
    }
  };
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share on {appName}</DialogTitle>
        <DialogDescription>{appName === "Facebook" ? "Facebook doesn't allow prefilled post text. Copy this message, open Facebook, and paste it into your post." : `Edit and copy your message, then paste it into ${appName}. Some apps ignore text sent through the share sheet.`}</DialogDescription>
      </DialogHeader>
      <label className="space-y-2 text-sm font-medium">Share message
        <Textarea value={text} onChange={(event) => { setText(event.target.value); setStatus(""); }} rows={5} />
      </label>
      <input aria-label="Share link" readOnly value={url} onFocus={(event) => event.target.select()} className="w-full rounded-md border bg-background p-2 text-sm" />
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy}>Copy message and link</Button>
        {appName === "Facebook" ? <Button asChild variant="outline"><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Open Facebook</a></Button> : navigator.share && <Button variant="outline" onClick={() => onShare(text)}>Share via apps</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}