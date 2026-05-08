import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatVendorEventType, getVendorEventStatus } from "@/lib/vendorEvents";
import { toast } from "sonner";

export default function VendorEventDetail() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  const invite = params.get("invite");
  const [message, setMessage] = useState("");
  const [spaceOption, setSpaceOption] = useState("");

  const { data: events = [], isLoading } = useQuery({ queryKey: ["publicVendorEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: attendees = [] } = useQuery({ queryKey: ["publicEventAttendees", eventId], queryFn: () => base44.entities.EventVendorAttendee.filter({ event_id: eventId }, "-created_date"), enabled: !!eventId, initialData: [] });
  const { data: spots = [] } = useQuery({ queryKey: ["publicEventSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: vendorInvites = [] } = useQuery({ queryKey: ["publicEventVendorInvites", eventId], queryFn: () => base44.entities.EventVendorInvite.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });

  const requestToJoin = async () => {
    if (isFull) {
      toast.error("This event is full.");
      return;
    }
    const user = await base44.auth.me();
    const accounts = await base44.entities.VendorAccount.filter({ owner_user_id: user.id });
    const account = accounts.find((item) => item.is_active !== false) || accounts[0];
    if (!account) {
      toast.error("A vendor account is required to join vendor events.");
      return;
    }
    const autoApprove = !!invite;
    const existingInvite = vendorInvites.find((item) => item.vendor_business_id === account.id && item.status !== "declined");
    if (existingInvite) {
      await base44.entities.EventVendorInvite.update(existingInvite.id, { status: account.vendor_setup_status === "complete" ? "pending_payment" : "pending_setup", updated_at: new Date().toISOString() });
    }
    const request = await base44.entities.EventVendorRequest.create({
      event_id: event.id,
      vendor_user_id: user.id,
      vendor_business_id: account.id,
      business_name: account.business_name,
      logo: account.business_logo,
      request_message: message,
      requested_space_option: spaceOption,
      status: autoApprove ? "approved" : "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (autoApprove) {
      await base44.entities.EventVendorAttendee.create({ event_id: event.id, vendor_user_id: user.id, vendor_business_id: account.id, business_name: account.business_name, logo: account.business_logo, description: account.description, approved_request_id: request.id, created_at: new Date().toISOString() });
    }
    toast.success(autoApprove ? "You joined this event" : "Request sent");
    queryClient.invalidateQueries({ queryKey: ["publicEventAttendees", eventId] });
  };

  if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event) return <div className="p-6 text-center">Event not found.</div>;

  const spotsLeft = event.max_vendors ? Math.max(Number(event.max_vendors) - attendees.length, 0) : null;
  const isFull = spotsLeft === 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <Card className="rounded-3xl overflow-hidden">
        {event.photos?.[0] && <img src={event.photos[0]} alt={event.title} className="h-64 w-full object-cover" />}
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2"><Badge className="bg-[#5DADA5] text-white">{getVendorEventStatus(event)}</Badge><Badge variant="outline">{formatVendorEventType(event.event_type)}</Badge>{event.open_to_vendors && <Badge className="bg-emerald-600 text-white">Open to vendors</Badge>}</div>
          <h1 className="text-4xl font-black text-[#2C4F4E]">{event.title}</h1>
          <p className="text-slate-700">{event.description}</p>
          <div className="grid gap-2 text-sm sm:grid-cols-2"><p><strong>Schedule:</strong> {format(new Date(event.startDateTime), "PPp")} - {format(new Date(event.endDateTime), "PPp")}</p><p><strong>Location:</strong> {event.display_address}</p><p><strong>Organizer:</strong> {event.organizer_business_name}</p><p><strong>Category:</strong> {event.category || "Vendor Event"}</p></div>
        </CardContent>
      </Card>

      {event.open_to_vendors && (
        <Card className="rounded-2xl"><CardContent className="p-5 space-y-3"><h2 className="text-xl font-black text-[#2C4F4E]">Request to Join</h2><p className="text-sm text-slate-600">{event.vendor_invitation_description || "This event is accepting vendor requests."}</p>{spotsLeft !== null && <p className="text-sm font-bold text-emerald-700">{isFull ? "Event is full" : `${spotsLeft} vendor spots left`}</p>}{event.vendor_space_options?.length > 0 && <Select value={spaceOption} onValueChange={setSpaceOption}><SelectTrigger><SelectValue placeholder="Select space" /></SelectTrigger><SelectContent>{event.vendor_space_options.map((option) => <SelectItem key={option.label} value={option.label}>{option.label}{option.width && option.depth ? ` — ${option.width} x ${option.depth}` : ""} — ${option.price}</SelectItem>)}</SelectContent></Select>}<Textarea placeholder="Message to organizer" value={message} onChange={(e) => setMessage(e.target.value)} /><Button disabled={isFull} onClick={requestToJoin} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Request to Join</Button></CardContent></Card>
      )}

      {attendees.length > 0 && <Card className="rounded-2xl"><CardContent className="p-5 space-y-3"><h2 className="text-xl font-black text-[#2C4F4E]">Attending Vendors</h2><div className="grid gap-3 sm:grid-cols-2">{attendees.map((vendor) => <div key={vendor.id} className="flex items-center gap-3 rounded-xl border p-3">{vendor.logo && <img src={vendor.logo} alt={vendor.business_name} className="h-12 w-12 rounded-full object-cover" />}<div><p className="font-bold">{vendor.business_name}</p><p className="text-sm text-slate-600">{vendor.description}</p></div></div>)}</div></CardContent></Card>}

      {spots.length > 0 && <Card className="rounded-2xl"><CardContent className="p-5 space-y-3"><h2 className="text-xl font-black text-[#2C4F4E]">Event Spots</h2><div className="grid gap-3 sm:grid-cols-2">{spots.map((spot) => <div key={spot.id} className="rounded-xl border p-3">{spot.photo && <img src={spot.photo} alt={spot.title} className="mb-2 h-28 w-full rounded-lg object-cover" />}<p className="font-bold">{spot.title}</p><p className="text-sm text-slate-600">{spot.description}</p>{spot.mini_schedule && <p className="text-xs text-slate-500 mt-2">{spot.mini_schedule}</p>}</div>)}</div></CardContent></Card>}
    </div>
  );
}