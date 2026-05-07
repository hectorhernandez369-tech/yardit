import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function FeedComposer({ onSubmit, isSubmitting }) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share what you're selling, specials, or where customers can find you today..." className="min-h-24 rounded-xl" />
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting || !text.trim()} className="rounded-xl">Post Update</Button>
      </div>
    </div>
  );
}