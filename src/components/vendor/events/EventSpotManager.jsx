import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calculateMiles } from "@/lib/vendorEvents";
import { toast } from "sonner";

export default function EventSpotManager({ event, spots, onRefresh }) {
  const [form, setForm] = useState({ title: "", description: "", mini_schedule: "", photo: "", latitude: "", longitude: "" });

  const addSpot = async () => {
    const miles = calculateMiles(event.latitude, event.longitude, Number(form.latitude), Number(form.longitude));
    const radiusMiles = Number(event.radius_feet || 0) / 5280;
    if (event.event_type === "multi_spot" && miles !== null && radiusMiles > 0 && miles > radiusMiles) {
      toast.error("Spot must be inside the selected event radius.");
      return;
    }
    await base44.entities.EventSpot.create({
      ...form,
      event_id: event.id,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      display_order: spots.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setForm({ title: "", description: "", mini_schedule: "", photo: "", latitude: "", longitude: "" });
    toast.success("Spot added");
    onRefresh();
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-lg font-black text-[#2C4F4E]">Multi-spot tools</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Spot name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Photo URL optional" value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} />
          <Input type="number" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          <Input type="number" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        </div>
        <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Textarea placeholder="Optional mini schedule" value={form.mini_schedule} onChange={(e) => setForm({ ...form, mini_schedule: e.target.value })} />
        <Button onClick={addSpot} className="bg-[#5DADA5] hover:bg-[#4A9B93]">Add Spot</Button>
        <div className="grid gap-2 sm:grid-cols-2">
          {spots.map((spot) => <div key={spot.id} className="rounded-xl border p-3"><p className="font-bold">{spot.title}</p><p className="text-sm text-slate-600">{spot.description}</p></div>)}
        </div>
      </CardContent>
    </Card>
  );
}