import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { format } from "date-fns";

export default function PublicEventUpdates({ updates, likes, currentUser, organizerName, onToggleLike, onLoginPrompt }) {
  if (!updates.length) return null;

  return (
    <section className="rounded-3xl bg-white border border-[#2C4F4E]/10 shadow-sm p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-black text-[#2C4F4E]">Event Updates</h2>
        <p className="text-sm text-slate-600">Latest notes from the organizer.</p>
      </div>
      <div className="space-y-4">
        {updates.map((update) => {
          const updateLikes = likes.filter((like) => like.update_id === update.id);
          const liked = currentUser && updateLikes.some((like) => like.user_id === currentUser.id);
          return (
            <article key={update.id} className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[#2C4F4E]">{organizerName || "Event Organizer"}</p>
                  <p className="text-xs text-slate-500">{format(new Date(update.created_at || update.created_date), "PPp")}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => currentUser ? onToggleLike(update, liked) : onLoginPrompt()} className={liked ? "text-red-600" : ""}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {updateLikes.length}
                </Button>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{update.body}</p>
              {update.photo && <img src={update.photo} alt="Event update" className="max-h-80 w-full rounded-xl object-cover" />}
            </article>
          );
        })}
      </div>
    </section>
  );
}