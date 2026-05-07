import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VendorUpdatesPanel({ account, updates, onRefresh }) {
  const [text, setText] = useState("");

  const addUpdate = async () => {
    if (!text.trim()) return;
    await base44.entities.VendorUpdate.create({ vendor_account_id: account.id, text: text.trim(), likes: 0, liked_by: [] });
    setText("");
    toast.success("Update posted");
    onRefresh();
  };

  const deleteUpdate = async (update) => {
    await base44.entities.VendorUpdate.delete(update.id);
    toast.success("Update deleted");
    onRefresh();
  };

  return (
    <Card className="border-[#2C4F4E]/15">
      <CardHeader>
        <CardTitle className="text-[#2C4F4E]">Business Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea placeholder="Share a short update with customers..." value={text} onChange={(e) => setText(e.target.value)} className="min-h-24" />
        <Button onClick={addUpdate} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Post Update</Button>
        <div className="space-y-3">
          {updates.length === 0 ? (
            <p className="rounded-2xl bg-[#F3E6CF]/70 p-5 text-sm text-slate-600">No updates yet. Post news, specials, or where customers can find you next.</p>
          ) : updates.map((update) => (
            <div key={update.id} className="rounded-2xl border bg-white p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-700">{update.text}</p>
                <p className="mt-2 text-xs text-slate-500">{update.created_date ? format(new Date(update.created_date), "MMM d, yyyy") : "New update"} · {update.likes || 0} likes</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteUpdate(update)} className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}