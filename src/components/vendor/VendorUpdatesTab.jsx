import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import FeedComposer from "@/components/vendor/FeedComposer";
import FeedCard from "@/components/vendor/FeedCard";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VendorUpdatesTab({ account, updates = [], user, onRefresh }) {
  const [posting, setPosting] = useState(false);

  const postUpdate = async (text) => {
    if (text.length > 280) return toast.error("Updates must be 280 characters or less");
    setPosting(true);
    await base44.entities.VendorUpdate.create({ vendor_account_id: account.id, text, likes: 0, liked_by: [] });
    setPosting(false);
    toast.success("Update posted");
    onRefresh?.();
  };

  const likeUpdate = async (update) => {
    const email = user?.email;
    if (!email) return;
    const likedBy = update.liked_by || [];
    const liked = likedBy.includes(email);
    const nextLikedBy = liked ? likedBy.filter((item) => item !== email) : [...likedBy, email];
    await base44.entities.VendorUpdate.update(update.id, { liked_by: nextLikedBy, likes: nextLikedBy.length });
    onRefresh?.();
  };

  const deleteUpdate = async (update) => {
    await base44.entities.VendorUpdate.delete(update.id);
    toast.success("Update deleted");
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      <FeedComposer onSubmit={postUpdate} isSubmitting={posting} />
      <div className="space-y-3">
        {updates.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">No updates yet.</div>
        ) : updates.map((update) => (
          <div key={update.id} className="relative">
            <FeedCard update={update} businessName={account.business_name} logoUrl={account.business_logo} onLike={likeUpdate} currentUserEmail={user?.email} />
            <Button size="icon" variant="ghost" onClick={() => deleteUpdate(update)} className="absolute right-3 top-3 text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}