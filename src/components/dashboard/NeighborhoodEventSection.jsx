import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Megaphone, Check, X } from "lucide-react";

export default function NeighborhoodEventSection({ user }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [selectedListingId, setSelectedListingId] = useState("");

  const { data: listings } = useQuery({
    queryKey: ["userListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }),
    enabled: !!user?.id,
    initialData: [],
  });

  const activeListings = listings.filter(l => l.status === "active");

  const { data: events } = useQuery({
    queryKey: ["neighborhoodEvents", user?.id],
    queryFn: () => base44.entities.NeighborhoodEvent.filter({ eo_user_id: user.id }),
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: joinRequests } = useQuery({
    queryKey: ["joinRequests"],
    queryFn: () => base44.entities.JoinRequest.filter({ status: "pending" }),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const listing = listings.find(l => l.id === selectedListingId);
      if (!listing) throw new Error("Select a listing");
      
      const res = await base44.functions.invoke("neighborhoodEvents", {
        action: "create",
        title: newEventTitle,
        center_lat: listing.lat,
        center_lng: listing.lng,
        start_at: listing.startDateTime,
        end_at: listing.endDateTime,
        eo_listing_id: listing.id
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Event created!");
      queryClient.invalidateQueries({ queryKey: ["neighborhoodEvents"] });
      setShowCreate(false);
    },
    onError: (e) => toast.error(e.message)
  });

  const advertiseMutation = useMutation({
    mutationFn: async (eventId) => {
      const res = await base44.functions.invoke("neighborhoodEvents", {
        action: "startAdvertising",
        event_id: eventId
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Advertising started!");
      queryClient.invalidateQueries({ queryKey: ["neighborhoodEvents"] });
    },
    onError: (e) => toast.error(e.message)
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ requestId, approved }) => {
      const res = await base44.functions.invoke("neighborhoodEvents", {
        action: "resolveJoin",
        request_id: requestId,
        approved
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Request resolved!");
      queryClient.invalidateQueries({ queryKey: ["neighborhoodEvents"] });
      queryClient.invalidateQueries({ queryKey: ["joinRequests"] });
    },
    onError: (e) => toast.error(e.message)
  });

  const pendingForMyEvents = joinRequests.filter(req => events.some(ev => ev.id === req.event_id));

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Neighborhood Events</h2>
        {!showCreate && activeListings.length > 0 && (
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
            Host Event
          </Button>
        )}
      </div>

      {showCreate && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-emerald-900">Create Neighborhood Event</h3>
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-1">Event Title</label>
              <input
                className="w-full p-2 border border-emerald-300 rounded"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                placeholder="E.g., Elm Street Big Sale"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-1">Base Listing (Your address)</label>
              <select
                className="w-full p-2 border border-emerald-300 rounded"
                value={selectedListingId}
                onChange={e => setSelectedListingId(e.target.value)}
              >
                <option value="">Select your listing...</option>
                {activeListings.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
              <p className="text-xs text-emerald-700 mt-1">This will anchor the 500ft zone.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newEventTitle || !selectedListingId} className="bg-emerald-600 hover:bg-emerald-700">
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingForMyEvents.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5" /> Pending Join Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingForMyEvents.map(req => {
              const event = events.find(ev => ev.id === req.event_id);
              return (
                <div key={req.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-slate-800">Someone wants to join {event?.title}</p>
                    <p className="text-xs text-slate-500">Event has {event?.confirmed_count} participants</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resolveMutation.mutate({ requestId: req.id, approved: true })} className="bg-green-600 hover:bg-green-700 px-2 h-8">
                      <Check className="w-4 h-4 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ requestId: req.id, approved: false })} className="text-red-600 border-red-200 hover:bg-red-50 px-2 h-8">
                      <X className="w-4 h-4 mr-1" /> Deny
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(ev => {
          const isActivated = ev.status === "activated";
          const isDowngraded = ev.status === "downgraded";
          
          return (
            <Card key={ev.id} className={isDowngraded ? "opacity-75" : ""}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{ev.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                      <Users className="w-4 h-4" /> {ev.confirmed_count} / 25 Confirmed
                    </div>
                  </div>
                  <Badge className={isActivated ? "bg-emerald-600" : isDowngraded ? "bg-red-600" : "bg-amber-500"}>
                    {ev.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                
                {isActivated && !ev.advertising_started_at && (
                  <Button 
                    onClick={() => advertiseMutation.mutate(ev.id)}
                    disabled={advertiseMutation.isPending}
                    className="w-full mt-2 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                    <Megaphone className="w-4 h-4" /> {advertiseMutation.isPending ? "Starting..." : "Start Advertising"}
                  </Button>
                )}
                {ev.advertising_started_at && (
                  <p className="text-xs text-purple-600 font-medium mt-2 flex items-center gap-1">
                    <Megaphone className="w-3 h-3" /> Advertising Active
                  </p>
                )}
                {ev.status === "pending_activation" && (
                  <p className="text-xs text-amber-600 mt-2">Needs {5 - ev.confirmed_count} more participants to activate ($49 capture).</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}