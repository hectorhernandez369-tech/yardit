import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Heart, Trash2 } from "lucide-react";
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

  const toggleLike = async (update) => {
    const currentUser = await base44.auth.me();
    const userEmail = currentUser?.email;
    if (!userEmail) return;

    const likedBy = update.liked_by || [];
    const hasLiked = likedBy.includes(userEmail);
    const nextLikedBy = hasLiked ? likedBy.filter((email) => email !== userEmail) : [...likedBy, userEmail];

    await base44.entities.VendorUpdate.update(update.id, {
      liked_by: nextLikedBy,
      likes: nextLikedBy.length,
    });
    onRefresh();
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg text-[#2C4F4E]">Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
        <Textarea placeholder="Share a short update with customers..." value={text} onChange={(e) => setText(e.target.value)} className="min-h-16 sm:min-h-24" />
        <Button onClick={addUpdate} className="w-full sm:w-auto bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Post Update</Button>
        <div className="space-y-3">
          {updates.length === 0 ? (
            <p className="rounded-xl sm:rounded-2xl bg-[#F3E6CF]/70 p-3 sm:p-5 text-xs sm:text-sm text-slate-600">No updates yet. Post news, specials, or where customers can find you next.</p>
          ) : updates.map((update) => (
            <div key={update.id} className="rounded-xl border bg-white p-3 flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-700 break-words">{update.text}</p>
                <p className="mt-1 text-[11px] text-slate-500">{update.created_date ? format(new Date(update.created_date), "MMM d") : "New update"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggleLike(update)} className="h-7 rounded-full px-2 text-[11px] text-rose-600 hover:bg-rose-50">
                  <Heart className="h-3.5 w-3.5" /> {update.likes || 0}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteUpdate(update)} className="h-7 w-7 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}