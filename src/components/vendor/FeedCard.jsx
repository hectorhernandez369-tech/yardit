import React from "react";
import { Button } from "@/components/ui/button";
import { Heart, Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function FeedCard({ update, businessName, logoUrl, onLike, currentUserEmail }) {
  const liked = update?.liked_by?.includes(currentUserEmail);

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
          {logoUrl ? <img src={logoUrl} alt={businessName} className="h-full w-full object-cover" /> : <Store className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{businessName || "Vendor"}</p>
          <p className="text-xs text-muted-foreground">{update?.created_date ? formatDistanceToNow(new Date(update.created_date), { addSuffix: true }) : "Just now"}</p>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{update?.text}</p>
          <Button variant="ghost" size="sm" onClick={() => onLike(update)} className="mt-2 px-0 hover:bg-transparent">
            <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} /> {update?.likes || 0}
          </Button>
        </div>
      </div>
    </article>
  );
}