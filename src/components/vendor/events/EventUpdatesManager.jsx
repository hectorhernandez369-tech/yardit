import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CollapsiblePanel from "./CollapsiblePanel";
import { toast } from "sonner";

export default function EventUpdatesManager({ event, updates, onRefresh }) {
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);

  const createUpdate = async () => {
    if (!body.trim()) {
      toast.error("Add update text first.");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    await base44.entities.EventUpdate.create({
      event_id: event.id,
      organizer_user_id: event.organizer_user_id,
      body: body.trim(),
      photo: photo.trim(),
      created_at: now,
      updated_at: now,
      is_deleted: false,
    });
    setBody("");
    setPhoto("");
    setSaving(false);
    toast.success("Event update posted");
    onRefresh?.();
  };

  return (
    <CollapsiblePanel title="Event Updates" description="Post updates that appear on the public vendor event page." count={updates.length} defaultOpen>
      <div className="space-y-3">
        <Textarea placeholder="Share an update for attendees and vendors" value={body} onChange={(e) => setBody(e.target.value)} />
        <Input placeholder="Optional photo URL" value={photo} onChange={(e) => setPhoto(e.target.value)} />
        <Button disabled={saving} onClick={createUpdate} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Post Update</Button>
        <div className="space-y-2 pt-2">
          {updates.length ? updates.map((update) => (
            <div key={update.id} className="rounded-xl border p-3">
              <p className="text-sm text-slate-700">{update.body}</p>
              {update.photo && <img src={update.photo} alt="Event update" className="mt-2 h-28 w-full rounded-lg object-cover" />}
            </div>
          )) : <p className="text-sm text-slate-500">No updates posted yet.</p>}
        </div>
      </div>
    </CollapsiblePanel>
  );
}