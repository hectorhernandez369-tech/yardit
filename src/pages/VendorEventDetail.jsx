import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Share2, Store, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { formatVendorEventType, getVendorEventStatus, isPublishedVendorEvent } from "@/lib/vendorEvents";
import { toast } from "sonner";
import { safeBack } from "@/utils";
import PublicEventUpdates from "@/components/vendor/events/PublicEventUpdates";
import PublicVendorCard from "@/components/vendor/events/PublicVendorCard";
import PublicVendorEventMap from "@/components/vendor/events/PublicVendorEventMap";
import UnifiedPublicEventSchedule from "@/components/vendor/events/schedule/UnifiedPublicEventSchedule";
import { getPublicContactInfo } from "@/lib/publicContactPrivacy";
import { canAccessVendorSignup } from "@/lib/vendorLaunchGate";

export default function VendorEventDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  const organizerPreview = params.get("organizerPreview") === "1";
  const leagueReturnState = location.state?.returnPage === "LeagueTeamDashboard" && location.state?.returnTab === "events";
  const [message, setMessage] = useState("");
  const [spaceOption, setSpaceOption] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [eligibleVendorAccounts, setEligibleVendorAccounts] = useState([]);
  const [vendorAccountId, setVendorAccountId] = useState("");
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const { data: vendorGateSettings = [] } = useQuery({
    queryKey: ["vendorLaunchGateSettings"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicAppSettings", {});
      return response?.data?.settings || [];
    },
    staleTime: 30000,
  });
  const canOpenVendorSignup = canAccessVendorSignup({ user: currentUser, settings: vendorGateSettings, vendorAccounts: eligibleVendorAccounts });

  const { data: events = [], isLoading } = useQuery({ queryKey: ["publicVendorEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: attendees = [] } = useQuery({ queryKey: ["publicEventAttendees", eventId], queryFn: () => base44.entities.EventVendorAttendee.filter({ event_id: eventId }, "-created_date"), enabled: !!eventId, initialData: [] });
  const { data: spots = [] } = useQuery({ queryKey: ["publicEventSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: vendorInvites = [] } = useQuery({ queryKey: ["publicEventVendorInvites", eventId], queryFn: () => base44.entities.EventVendorInvite.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: requests = [] } = useQuery({ queryKey: ["publicEventVendorRequests", eventId], queryFn: () => base44.entities.EventVendorRequest.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: vendorAccounts = [] } = useQuery({ queryKey: ["publicEventVendorAccounts", eventId, attendees.map((attendee) => attendee.vendor_business_id).filter(Boolean).join(",")], queryFn: async () => {
    const response = await base44.functions.invoke("getPublicVendorAccounts", { eventId, accountIds: attendees.map((attendee) => attendee.vendor_business_id).filter(Boolean) });
    return response?.data?.accounts || [];
  }, enabled: !!eventId, initialData: [] });
  const { data: updates = [] } = useQuery({ queryKey: ["publicEventUpdates", eventId], queryFn: () => base44.entities.EventUpdate.filter({ event_id: eventId, is_deleted: false }, "-created_at"), enabled: !!eventId, initialData: [] });
  const { data: likes = [] } = useQuery({ queryKey: ["publicEventUpdateLikes", eventId], queryFn: () => base44.entities.EventUpdateLike.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: scheduleEntries = [] } = useQuery({ queryKey: ["publicEventScheduleEntries", eventId], queryFn: () => base44.entities.EventScheduleEntry.filter({ event_id: eventId }, "sort_order"), enabled: !!eventId, initialData: [] });
  const { data: leagueEventLinks = [] } = useQuery({ queryKey: ["publicLeagueEventGames", eventId], queryFn: async () => (await base44.entities.LeagueEventGame.filter({ event_id: eventId }, "display_order")).filter((link) => link?.is_visible !== false), enabled: !!eventId, initialData: [] });
  const { data: leagueGames = [] } = useQuery({ queryKey: ["publicLeagueGamesForEvent", event?.organizer_business_id], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: event.organizer_business_id }, "sort_order"), enabled: !!event?.organizer_business_id && leagueEventLinks.length > 0, initialData: [] });
  const { data: previewMemberships = [], isLoading: isLoadingPreviewMemberships } = useQuery({
    queryKey: ["publicEventLeaguePreviewMemberships", event?.organizer_business_id, currentUser?.id, currentUser?.email],
    queryFn: async () => {
      const [byUser, byEmail] = await Promise.all([
        currentUser?.id ? base44.entities.LeagueMembership.filter({ league_account_id: event.organizer_business_id, member_user_id: currentUser.id, status: "active" }).catch(() => []) : Promise.resolve([]),
        currentUser?.email ? base44.entities.LeagueMembership.filter({ league_account_id: event.organizer_business_id, invited_email: currentUser.email, status: "active" }).catch(() => []) : Promise.resolve([]),
      ]);
      return [...byUser, ...byEmail].filter((item, index, list) => item?.id && list.findIndex((other) => other.id === item.id) === index);
    },
    enabled: organizerPreview && !!event?.organizer_business_id && (!!currentUser?.id || !!currentUser?.email),
    initialData: [],
  });

  const vendorAccount = eligibleVendorAccounts.find((account) => account.id === vendorAccountId) || null;

  useEffect(() => {
    let cancelled = false;

    const loadCurrentVendor = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();

        if (!authenticated) {
          if (!cancelled) setAuthChecked(true);
          return;
        }

        const user = await base44.auth.me();
        if (cancelled) return;

        setCurrentUser(user);

        const [ownedById, ownedByEmail] = await Promise.all([
          base44.entities.VendorAccount.filter({ owner_user_id: user.id }),
          user.email ? base44.entities.VendorAccount.filter({ owner_email: user.email }) : Promise.resolve([]),
        ]);

        const mergedAccounts = [...ownedById, ...ownedByEmail].filter((account, index, array) => account?.id && account.is_active !== false && array.findIndex((item) => item.id === account.id) === index);
        const userKey = user.id || user.email || "anonymous";
        const defaultKey = `yardit_default_vendor_account_id:${userKey}`;
        const savedDefaultId = localStorage.getItem(defaultKey);
        const defaultAccount = mergedAccounts.find((account) => account.id === savedDefaultId) || mergedAccounts[0] || null;

        setEligibleVendorAccounts(mergedAccounts);
        setVendorAccountId(defaultAccount?.id || "");
      } catch (error) {
        console.error("Could not load vendor accounts:", error);
        toast.error("Your vendor accounts could not be loaded.");
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    loadCurrentVendor();

    return () => {
      cancelled = true;
    };
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
  const publicContact = getPublicContactInfo({ account: organizerAccount, event });
  const isFlyerPdf = event?.flyer_url?.toLowerCase?.().includes(".pdf");
  const heroImage = !isFlyerPdf && event?.flyer_url ? event.flyer_url : event?.photos?.[0] || event?.logo || organizerAccount?.featured_photo_url || organizerAccount?.business_logo;
  const eventIsPublic = event ? isPublishedVendorEvent(event, new Date()) : false;
  const ownsOrganizerAccount = !!event?.organizer_business_id && eligibleVendorAccounts.some((account) => account.id === event.organizer_business_id);
  const managesOrganizerAccount = previewMemberships.some((membership) => (membership.permissions || []).includes("manage_events"));
  const canPreviewOrganizerEvent = organizerPreview && !!currentUser && (ownsOrganizerAccount || managesOrganizerAccount);
  const canViewEvent = !!event && (eventIsPublic || canPreviewOrganizerEvent);

  const handleBack = () => {
    if (leagueReturnState) {
      navigate(
        `/LeagueTeamDashboard?tab=events&eventId=${encodeURIComponent(location.state?.selectedEventId || "")}`, 
        {
          replace: true,
          state: {
            restoreEvent: true,
            selectedEventId: location.state?.selectedEventId,
            eventSubtab: location.state?.eventSubtab,
          },
        }
      );
      return;
    }

    safeBack(navigate, "/VendorDashboard?tab=events");
  };

  const refreshPublicData = () => {
    queryClient.invalidateQueries({ queryKey: ["publicEventAttendees", eventId] });
    queryClient.invalidateQueries({ queryKey: ["publicEventVendorRequests", eventId] });
    queryClient.invalidateQueries({ queryKey: ["publicEventVendorInvites", eventId] });
    queryClient.invalidateQueries({ queryKey: ["publicEventUpdateLikes", eventId] });
  };

  const selectPublicField = (spot) => {
    if (!spot) return;
    setSelectedSpot(spot);
    window.requestAnimationFrame(() => {
      document.getElementById("public-event-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const requestToJoin = async () => {
    if (!currentUser) {
      toast.error("Log in as a vendor to request to join this event.");
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!vendorAccount) {
      toast.error("Select the vendor account that is requesting to join.");
      return;
    }

    if (!event?.open_to_vendors) {
      toast.error("This event is not currently accepting vendor requests.");
      return;
    }

    if (isFull) {
      toast.error("This event has reached its vendor capacity.");
      return;
    }

    if (hasExistingVendorStatus) {
      toast.error("This vendor already has a status for this event.");
      return;
    }

    if (event.vendor_space_options?.length > 0 && !spaceOption) {
      toast.error("Select a vendor space before submitting.");
      return;
    }

    try {
      const response = await base44.functions.invoke("submitVendorEventJoinRequest", {
        eventId: event.id,
        vendorAccountId: vendorAccount.id,
        requestMessage: message.trim(),
        requestedSpaceOption: spaceOption,
      });

      if (response?.data?.error || response?.error) throw new Error(response?.data?.error || response?.error);

      toast.success("Request sent for organizer approval.");
      setMessage("");
      setSpaceOption("");
      refreshPublicData();
    } catch (error) {
      console.error("Vendor event join failed:", error);
      toast.error(error?.message || "The request could not be submitted.");
    }
  };

  const toggleLike = async (update, liked) => {
    if (!currentUser) return;
    const existingLike = likes.find((like) => like.update_id === update.id && like.user_id === currentUser.id);
    if (liked && existingLike) await base44.entities.EventUpdateLike.delete(existingLike.id);
    else if (!existingLike) await base44.entities.EventUpdateLike.create({ update_id: update.id, event_id: event.id, user_id: currentUser.id, created_at: new Date().toISOString() });
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

  if (isLoading || (event && !eventIsPublic && organizerPreview && (!authChecked || isLoadingPreviewMemberships))) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event || !canViewEvent) return <div className="p-6 text-center">Event not found.</div>;

  return (
    <div className="bg-[#F3E6CF] min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Button variant="ghost" onClick={handleBack} className="gap-2 text-[#2C4F4E]"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <section className="rounded-3xl overflow-hidden bg-white border border-[#2C4F4E]/10 shadow-sm">
          <div className="relative h-64 sm:h-96 bg-[#E7D7B8]">
            {heroImage ? <img src={heroImage} alt={event.title} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[#2C4F4E] font-black text-2xl">Yardit Vendor Event</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <Button onClick={shareEvent} className="absolute right-4 top-4 bg-white/90 text-[#2C4F4E] hover:bg-white"><Share2 className="h-4 w-4" /> Share</Button>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white space-y-3"><div className="flex flex-wrap gap-2"><Badge className="bg-[#5DADA5] text-white">{getVendorEventStatus(event)}</Badge><Badge className="bg-white text-[#2C4F4E]">{event.category || "Vendor Event"}</Badge><Badge className="bg-[#F4A849] text-[#2C4F4E]">{formatVendorEventType(event.event_type)}</Badge></div><h1 className="text-3xl sm:text-5xl font-black leading-tight">{event.title}</h1>{isFlyerPdf && <a href={event.flyer_url} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#2C4F4E] shadow">View Event Flyer</a>}</div>
          </div>
        </section>

        {event.flyer_url && <section className="rounded-3xl bg-white border border-[#2C4F4E]/10 shadow-sm p-5 sm:p-6 space-y-3"><h2 className="text-2xl font-black text-[#2C4F4E]">Event Flyer</h2>{isFlyerPdf ? <a href={event.flyer_url} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[#F4A849] px-4 py-2 text-sm font-bold text-[#2C4F4E] shadow hover:bg-[#E39635]">Open Flyer PDF</a> : <img src={event.flyer_url} alt={`${event.title} flyer`} className="max-h-[720px] w-full rounded-2xl border border-[#2C4F4E]/10 object-contain bg-[#FBFAF7]" />}</section>}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <main className="space-y-5">
            <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4"><h2 className="text-2xl font-black text-[#2C4F4E]">Event Details</h2><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#FBFAF7] p-4 flex gap-3"><CalendarDays className="h-5 w-5 text-[#F4A849]" /><div><p className="font-bold text-[#2C4F4E]">Date & Time</p><p className="text-sm text-slate-700">{format(new Date(event.startDateTime), "PPp")}<br />to {format(new Date(event.endDateTime), "PPp")}</p></div></div><div className="rounded-2xl bg-[#FBFAF7] p-4 flex gap-3"><MapPin className="h-5 w-5 text-[#F4A849]" /><div><p className="font-bold text-[#2C4F4E]">Location</p><p className="text-sm text-slate-700">{event.display_address || "Location details coming soon"}</p></div></div></div><div><h3 className="font-black text-[#2C4F4E] mb-2">Description</h3><p className="text-slate-700 whitespace-pre-wrap">{event.description}</p></div></CardContent></Card>

            {event.latitude && event.longitude && <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-3"><h2 className="text-2xl font-black text-[#2C4F4E]">Map / Location</h2><PublicVendorEventMap event={event} spots={spots} scheduleEntries={scheduleEntries} selectedSpotId={selectedSpot?.id || ""} onSelectSpot={selectPublicField} /></CardContent></Card>}

            <UnifiedPublicEventSchedule scheduleEntries={scheduleEntries} leagueEventLinks={leagueEventLinks} leagueGames={leagueGames} selectedSpotId={selectedSpot?.id || ""} selectedFieldName={selectedSpot?.title || ""} onClearField={() => setSelectedSpot(null)} />

            <PublicEventUpdates updates={updates} likes={likes} currentUser={currentUser} organizerName={event.organizer_business_name} onToggleLike={toggleLike} onLoginPrompt={() => { toast.error("Please log in to like updates."); base44.auth.redirectToLogin(window.location.href); }} />

            {attendees.length > 0 && <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4"><h2 className="text-2xl font-black text-[#2C4F4E]">Attending Vendors</h2><div className="grid gap-3 sm:grid-cols-2">{attendees.map((vendor) => <PublicVendorCard key={vendor.id} vendor={vendor} account={vendorById[vendor.vendor_business_id]} />)}</div></CardContent></Card>}

            {spots.length > 0 && <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4"><h2 className="text-2xl font-black text-[#2C4F4E]">Event Spots</h2><div className="grid gap-3 sm:grid-cols-2">{spots.map((spot) => <button type="button" key={spot.id} onClick={() => selectPublicField(spot)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedSpot?.id === spot.id ? "border-[#F4A849] bg-[#FFF6E8] shadow-sm" : "border-[#2C4F4E]/10 bg-[#FBFAF7] hover:border-[#5DADA5]"}`}>{spot.photo && <img src={spot.photo} alt={spot.title} className="mb-2 h-32 w-full rounded-xl object-cover" />}<p className="font-black text-[#2C4F4E]">{spot.title}</p><p className="text-sm text-slate-600">{spot.description}</p>{spot.mini_schedule && <p className="text-xs text-slate-500 mt-2">{spot.mini_schedule}</p>}</button>)}</div></CardContent></Card>}
          </main>

          <aside className="space-y-5">
            <Card className="rounded-3xl bg-white sticky top-24"><CardContent className="p-5 space-y-4">
              <div className="flex gap-3"><UserCircle className="h-10 w-10 text-[#5DADA5]" /><div><p className="text-sm text-slate-500">Hosted by</p><p className="font-black text-[#2C4F4E]">{event.organizer_business_name}</p></div></div>
              {publicContact.visible && (publicContact.phone || publicContact.email || publicContact.website) && <section className="rounded-2xl bg-[#FBFAF7] p-3 space-y-2"><h2 className="font-black text-[#2C4F4E]">Contact Organizer</h2>{publicContact.phone && <a href={`tel:${publicContact.phone}`} className="block text-sm font-semibold text-[#2C4F4E]">{publicContact.phone}</a>}{publicContact.email && <a href={`mailto:${publicContact.email}`} className="block text-sm font-semibold text-[#2C4F4E]">{publicContact.email}</a>}{publicContact.website && <a href={publicContact.website} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-[#2C4F4E] underline">Visit Website</a>}</section>}
              {event.open_to_vendors ? <Badge className="bg-emerald-600 text-white">Open to Vendors</Badge> : <Badge variant="outline">Vendor signup closed</Badge>}
              {spotsLeft !== null && <p className="text-sm font-bold text-[#2C4F4E]">{isFull ? "This event is full" : `${spotsLeft} vendor spots left`}</p>}
              {!currentUser && <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">Log in as a vendor to request to join this event.</p>}
              {currentUser && eligibleVendorAccounts.length === 0 && <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">{canOpenVendorSignup ? "Vendor account required to request to join." : "Vendor Accounts are not open for public signup yet."}</p>}
              {hasExistingVendorStatus && <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">Your vendor already has a status for this event.</p>}
              {eligibleVendorAccounts.length > 1 && <div className="space-y-2"><label className="text-sm font-bold text-[#2C4F4E]">Requesting as</label><Select value={vendorAccountId} onValueChange={setVendorAccountId}><SelectTrigger><SelectValue placeholder="Select vendor business" /></SelectTrigger><SelectContent>{eligibleVendorAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.business_name}</SelectItem>)}</SelectContent></Select></div>}
              {event.open_to_vendors && canRequest && <div className="space-y-3">{event.vendor_space_options?.length > 0 && <Select value={spaceOption} onValueChange={setSpaceOption}><SelectTrigger><SelectValue placeholder="Select space" /></SelectTrigger><SelectContent>{event.vendor_space_options.map((option) => <SelectItem key={option.label} value={option.label}>{option.label}{option.width && option.depth ? ` — ${option.width} x ${option.depth}` : ""} — {option.price}</SelectItem>)}</SelectContent></Select>}<Textarea placeholder="Message to organizer" value={message} onChange={(e) => setMessage(e.target.value)} /></div>}
              {vendorAccount && event.open_to_vendors && !hasExistingVendorStatus && !isFull && <Button onClick={requestToJoin} className="w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><Store className="h-4 w-4" /> Request to Join Event</Button>}
            </CardContent></Card>
          </aside>
        </div>
      </div>
    </div>
  );
}