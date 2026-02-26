import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, AlertTriangle, Map } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportModal from "../components/ReportModal";

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listingId, setListingId] = useState(null);
  const [user, setUser] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setListingId(params.get("id"));
    
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log("Not logged in");
      }
    };
    fetchUser();
  }, []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId,
  });

  const { data: neighborhoodEvents } = useQuery({
    queryKey: ["neighborhoodEvents"],
    queryFn: () => base44.entities.NeighborhoodEvent.filter({}),
    initialData: [],
  });
  
  const askToJoinMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await base44.functions.invoke("neighborhoodEvents", {
        action: "askToJoin",
        event_id: eventId,
        listing_id: listing.id
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Request sent successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send request");
    }
  });

  if (isLoading || !listing) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  
  // Calculate if within 500ft of any active/pending_activation event
  const R = 6371e3;
  const feetPerMeter = 3.28084;
  const nearbyEvents = neighborhoodEvents.filter(ev => {
    if (ev.status === "expired" || ev.status === "downgraded") return false;
    if (!listing.lat || !listing.lng) return false;
    const p1 = ev.center_lat * Math.PI/180;
    const p2 = listing.lat * Math.PI/180;
    const dp = (listing.lat - ev.center_lat) * Math.PI/180;
    const dl = (listing.lng - ev.center_lng) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return d * feetPerMeter <= 500;
  });

  const tierColors = {
    free: "bg-slate-500",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    neighborhood_tier: "bg-emerald-600"
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Sticky title + address header */}
        <div className="sticky top-[73px] z-40 bg-white border-b border-slate-200 shadow-sm px-3 sm:px-4 md:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 break-words">{listing.title}</h1>
              <div className="flex items-center gap-1.5 text-slate-600 text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="break-words">
                  {listing.addressText || "Address unavailable"}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}{listing.zip ? ` ${listing.zip}` : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Badge className={tierColors[listing.tier]}>
                {listing.tier === "neighborhood_tier" ? "Neighborhood Sale" : listing.tier.toUpperCase()}
              </Badge>
              {user && user.id !== listing.ownerUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReport(true)}
                  className="gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8">
        <Card>
          <CardContent className="space-y-6 pt-6">
            {listing.photoUrls && listing.photoUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listing.photoUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-slate-700">{listing.description}</p>
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="w-5 h-5 mt-0.5" />
              <span>
                {listing.addressText || "Address unavailable"}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}{listing.zip ? ` ${listing.zip}` : ""}
              </span>
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <Calendar className="w-5 h-5 mt-0.5" />
              <div>
                <p>Start: {format(new Date(listing.startDateTime), "PPp")}</p>
                <p>End: {format(new Date(listing.endDateTime), "PPp")}</p>
              </div>
            </div>

            {listing.listingType === "neighborhood_sale" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-900 mb-2">Neighborhood Sale</h3>
                <p className="text-sm text-emerald-800">
                  {listing.homeCount} homes participating • Span: {listing.spanFeet} ft
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)}
                disabled={!listing.lat || !listing.lng}
                className="flex-1 gap-2"
                style={{ backgroundColor: '#0F766E' }}
              >
                <Map className="w-4 h-4" />
                Show on Map
              </Button>
              
              {nearbyEvents.length > 0 && user?.id === listing.ownerUserId && (
                <Button
                  onClick={() => askToJoinMutation.mutate(nearbyEvents[0].id)}
                  disabled={askToJoinMutation.isPending}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {askToJoinMutation.isPending ? "Requesting..." : "Ask to Join Event"}
                </Button>
              )}

              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {showReport && (
        <ReportModal
          listingId={listingId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}