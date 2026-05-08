import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Share2, Store, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { formatVendorEventType, getVendorEventStatus } from "@/lib/vendorEvents";
import { toast } from "sonner";
import { safeBack } from "@/utils";
import PublicEventUpdates from "@/components/vendor/events/PublicEventUpdates";
import PublicVendorCard from "@/components/vendor/events/PublicVendorCard";

export default function VendorEventDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  const invite = params.get("invite");
  const [message, setMessage] = useState("");
  const [spaceOption, setSpaceOption] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorAccount, setVendorAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const { data: events = [], isLoading } = useQuery({ queryKey: ["publicVendorEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: attendees = [] } = useQuery({ queryKey: ["publicEventAttendees", eventId], queryFn: () => base44.entities.EventVendorAttendee.filter({ event_id: eventId }, "-created_date"), enabled: !!eventId, initialData: [] });
  const { data: spots = [] } = useQuery({ queryKey: ["publicEventSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: vendorInvites = [] } = useQuery({ queryKey: ["publicEventVendorInvites", eventId], queryFn: () => base44.entities.EventVendorInvite.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: requests = [] } = useQuery({ queryKey: ["publicEventVendorRequests", eventId], queryFn: () => base44.entities.EventVendorRequest.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: vendorAccounts = [] } = useQuery({ queryKey: ["publicEventVendorAccounts"], queryFn: () => base44.entities.VendorAccount.list(), initialData: [] });
  const { data: updates = [] } = useQuery({ queryKey: ["publicEventUpdates", eventId], queryFn: () => base44.entities.EventUpdate.filter({ event_id: eventId, is_deleted: false }, "-created_at"), enabled: !!eventId, initialData: [] });
  const { data: likes = [] } = useQuery({ queryKey: ["publicEventUpdateLikes", eventId], queryFn: () => base44.entities.EventUpdateLike.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) {
        setAuthChecked(true);
        return;
      }
      const user = await base44.auth.me();
      setCurrentUser(user);
      const accounts = await base44.entities.VendorAccount.filter({ owner_user_id: user.id });
      setVendorAccount(accounts.find((item) => item.is_active !== false) || accounts[0] || null);
      setAuthChecked(true);
    });
  }, []);

  const vendorById = useMemo(() => Object.fromEntries(vendorAccounts.map((account) => [account.id, account])), [vendorAccounts]);
  const spotsLeft = event?.max_vendors ? Math.max(Number(event.max_vendors) - attendees.length, 0) : null;
  const isFull = spotsLeft === 0;
  const attendeeVendorIds = attendees.map((attendee) => attendee.vendor_business_id);
  const inviteRecord = vendorAccount ? vendorInvites.find((item) => item.vendor_business_id === vendorAccount.id) : null;
  const requestRecord = vendorAccount ? requests.find((item) => item.vendor_business_id === vendorAccount.id) : null;
  const alreadyAttending = vendorAccount ? attendeeVendorIds.includes(vendorAccount.id) : false;
  const blockedStatuses = ["invited", "accepted", "pending_setup", "pending_payment", "approved", "declined"];
  const hasExistingVendorStatus = alreadyAttending || !!requestRecord || (inviteRecord && blockedStatuses.includes(inviteRecord.status));
  const canRequest = authChecked && !!vendorAccount && event?.open_to_vendors && !isFull && !hasExistingVendorStatus;
  const organizerAccount = vendorById[event?.organizer_business_id];
  const isFlyerPdf = event?.flyer_url?.toLowerCase?.().includes(".pdf");
  const heroImage = !isFlyerPdf && event?.flyer_url ? event.flyer_url : event?.photos?.[0] || event?.logo || organizerAccount?.featured_photo_url || organizerAccount?.business_logo;

  const refreshPublicData = () => {
    queryClient.invalidateQueries({ queryKey: ["publicEventAttendees", eventId] });
    queryClient.invalidateQueries({ queryKey: ["publicEventVendorRequests", eventId] });
    queryClient.invalidateQueries({ queryKey: ["publicEventVendorInvites", eventId] });
    queryClient.invalidateQueries({ queryKey: ["publicEventUpdateLikes", eventId] });
  };

  const requestToJoin = async () => {
    if (!currentUser) {
      toast.error("Log in as a vendor to request to join this event.");
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    if (!vendorAccount) {
      toast.error("A vendor account is required to join vendor events.");
      return;
    }
    if (!canRequest) return;

    const autoApprove = !!invite;
    const status = autoApprove ? "approved" : "pending";
    const request = await base44.entities.EventVendorRequest.create({
      event_id: event.id,
      vendor_user_id: currentUser.id,
      vendor_business_id: vendorAccount.id,
      business_name: vendorAccount.business_name,
      logo: vendorAccount.business_logo,
      request_message: message,
      requested_space_option: spaceOption,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (autoApprove) {
      await base44.entities.EventVendorAttendee.create({ event_id: event.id, vendor_user_id: currentUser.id, vendor_business_id: vendorAccount.id, business_name: vendorAccount.business_name, logo: vendorAccount.business_logo, description: vendorAccount.description, approved_request_id: request.id, created_at: new Date().toISOString() });
    }
    toast.success(autoApprove ? "You joined this event" : event.vendor_payment_type === "no_online_payment" ? "Request sent for organizer approval" : "Request sent for reservation review");
    refreshPublicData();
  };

  const toggleLike = async (update, liked) => {
    if (!currentUser) return;
    const existingLike = likes.find((like) => like.update_id === update.id && like.user_id === currentUser.id);
    if (liked && existingLike) {
      await base44.entities.EventUpdateLike.delete(existingLike.id);
    } else if (!existingLike) {
      await base44.entities.EventUpdateLike.create({ update_id: update.id, event_id: event.id, user_id: currentUser.id, created_at: new Date().toISOString() });
    }
    queryClient.invalidateQueries({ queryKey: ["publicEventUpdateLikes", eventId] });
  };

  const shareEvent = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: event.title, text: event.description, url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Event link copied");
    }
  };

  if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event) return <div className="p-6 text-center">Event not found.</div>;

  return (
    <div className="bg-[#F3E6CF] min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Button variant="ghost" onClick={() => safeBack(navigate, "/VendorDashboard?tab=events")} className="gap-2 text-[#2C4F4E]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <section className="rounded-3xl overflow-hidden bg-white border border-[#2C4F4E]/10 shadow-sm">
          <div className="relative h-64 sm:h-96 bg-[#E7D7B8]">
            {heroImage ? <img src={heroImage} alt={event.title} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[#2C4F4E] font-black text-2xl">Yardit Vendor Event</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <Button onClick={shareEvent} className="absolute right-4 top-4 bg-white/90 text-[#2C4F4E] hover:bg-white"><Share2 className="h-4 w-4" /> Share</Button>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white space-y-3">
              <div className="flex flex-wrap gap-2"><Badge className="bg-[#5DADA5] text-white">{getVendorEventStatus(event)}</Badge><Badge className="bg-white text-[#2C4F4E]">{event.category || "Vendor Event"}</Badge><Badge className="bg-[#F4A849] text-[#2C4F4E]">{formatVendorEventType(event.event_type)}</Badge></div>
              <h1 className="text-3xl sm:text-5xl font-black leading-tight">{event.title}</h1>
              {isFlyerPdf && <a href={event.flyer_url} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#2C4F4E] shadow">View Event Flyer</a>}
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <main className="space-y-5">
            <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4">
              <h2 className="text-2xl font-black text-[#2C4F4E]">Event Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#FBFAF7] p-4 flex gap-3"><CalendarDays className="h-5 w-5 text-[#F4A849]" /><div><p className="font-bold text-[#2C4F4E]">Date & Time</p><p className="text-sm text-slate-700">{format(new Date(event.startDateTime), "PPp")}<br />to {format(new Date(event.endDateTime), "PPp")}</p></div></div>
                <div className="rounded-2xl bg-[#FBFAF7] p-4 flex gap-3"><MapPin className="h-5 w-5 text-[#F4A849]" /><div><p className="font-bold text-[#2C4F4E]">Location</p><p className="text-sm text-slate-700">{event.display_address || "Location details coming soon"}</p></div></div>
              </div>
              <div><h3 className="font-black text-[#2C4F4E] mb-2">Description</h3><p className="text-slate-700 whitespace-pre-wrap">{event.description}</p></div>
            </CardContent></Card>

            {event.latitude && event.longitude && <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-3"><h2 className="text-2xl font-black text-[#2C4F4E]">Map / Location</h2><div className="rounded-2xl bg-[#FBFAF7] border border-[#2C4F4E]/10 p-5 text-sm text-slate-700"><MapPin className="h-5 w-5 text-[#F4A849] inline mr-2" />{event.display_address}<p className="mt-2 text-xs text-slate-500">Coordinates: {Number(event.latitude).toFixed(4)}, {Number(event.longitude).toFixed(4)}</p></div></CardContent></Card>}

            <PublicEventUpdates updates={updates} likes={likes} currentUser={currentUser} organizerName={event.organizer_business_name} onToggleLike={toggleLike} onLoginPrompt={() => { toast.error("Please log in to like updates."); base44.auth.redirectToLogin(window.location.href); }} />

            {attendees.length > 0 && <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4"><h2 className="text-2xl font-black text-[#2C4F4E]">Attending Vendors</h2><div className="grid gap-3 sm:grid-cols-2">{attendees.map((vendor) => <PublicVendorCard key={vendor.id} vendor={vendor} account={vendorById[vendor.vendor_business_id]} />)}</div></CardContent></Card>}

            {spots.length > 0 && <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4"><h2 className="text-2xl font-black text-[#2C4F4E]">Event Spots</h2><div className="grid gap-3 sm:grid-cols-2">{spots.map((spot) => <div key={spot.id} className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3">{spot.photo && <img src={spot.photo} alt={spot.title} className="mb-2 h-32 w-full rounded-xl object-cover" />}<p className="font-black text-[#2C4F4E]">{spot.title}</p><p className="text-sm text-slate-600">{spot.description}</p>{spot.mini_schedule && <p className="text-xs text-slate-500 mt-2">{spot.mini_schedule}</p>}</div>)}</div></CardContent></Card>}
          </main>

          <aside className="space-y-5">
            <Card className="rounded-3xl bg-white sticky top-24"><CardContent className="p-5 space-y-4">
              <div className="flex gap-3"><UserCircle className="h-10 w-10 text-[#5DADA5]" /><div><p className="text-sm text-slate-500">Hosted by</p><p className="font-black text-[#2C4F4E]">{event.organizer_business_name}</p></div></div>
              {event.open_to_vendors ? <Badge className="bg-emerald-600 text-white">Open to Vendors</Badge> : <Badge variant="outline">Vendor signup closed</Badge>}
              {spotsLeft !== null && <p className="text-sm font-bold text-[#2C4F4E]">{isFull ? "This event is full" : `${spotsLeft} vendor spots left`}</p>}
              {!currentUser && <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">Log in as a vendor to request to join this event.</p>}
              {currentUser && !vendorAccount && <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">Vendor account required to request to join.</p>}
              {hasExistingVendorStatus && <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">Your vendor already has a status for this event.</p>}
              {event.open_to_vendors && canRequest && (
                <div className="space-y-3">
                  {event.vendor_space_options?.length > 0 && <Select value={spaceOption} onValueChange={setSpaceOption}><SelectTrigger><SelectValue placeholder="Select space" /></SelectTrigger><SelectContent>{event.vendor_space_options.map((option) => <SelectItem key={option.label} value={option.label}>{option.label}{option.width && option.depth ? ` — ${option.width} x ${option.depth}` : ""} — ${option.price}</SelectItem>)}</SelectContent></Select>}
                  <Textarea placeholder="Message to organizer" value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
              )}
              {vendorAccount && event.open_to_vendors && !hasExistingVendorStatus && !isFull && (
                <Button onClick={requestToJoin} className="w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><Store className="h-4 w-4" /> Request to Join Event</Button>
              )}
            </CardContent></Card>
          </aside>
        </div>
      </div>
    </div>
  );
}