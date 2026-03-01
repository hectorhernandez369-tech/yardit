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

  // (plain english) query to get pending join requests if the user is the owner of a neighborhood sale
  const { data: joinRequests } = useQuery({
    queryKey: ["joinRequests", listingId],
    queryFn: async () => {
      const reqs = await base44.entities.JoinRequest.filter({ saleListingId: listingId, status: "pending" });
      const enriched = await Promise.all(reqs.map(async (r) => {
        const l = await base44.entities.Listing.filter({ id: r.listingId });
        return { ...r, listingDetails: l[0] };
      }));
      return enriched;
    },
    enabled: !!listing && listing.listingType === "neighborhood_sale" && !!user && user.id === listing.ownerUserId,
  });

  // (plain english) query to get parent neighborhood sale info if the listing was approved to join one
  const { data: parentSale } = useQuery({
    queryKey: ["parentSale", listing?.neighborhood_sale_id],
    queryFn: async () => {
      if (!listing?.neighborhood_sale_id) return null;
      const sales = await base44.entities.Listing.filter({ id: listing.neighborhood_sale_id });
      return sales[0];
    },
    enabled: !!listing && listing.neighborhood_join_status === "approved" && !!listing.neighborhood_sale_id,
  });

  const respondToJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, requesterListingId, action, requesterUserId, eventTitle }) => {
      if (action === "approve") {
        await base44.entities.JoinRequest.update(requestId, { status: "approved" });
        await base44.entities.Listing.update(requesterListingId, {
          neighborhood_join_status: "approved",
          payment_intent_status: "voided",
          neighborhood_sale_id: listingId
        });
        await base44.entities.Notification.create({
          userId: requesterUserId,
          title: "Join Request Approved",
          message: `Approved — you joined ${eventTitle}`,
          type: "join_request_approved",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId }
        });
      } else {
        await base44.entities.JoinRequest.update(requestId, { status: "denied" });
        await base44.entities.Listing.update(requesterListingId, {
          neighborhood_join_status: "denied"
        });
        await base44.entities.Notification.create({
          userId: requesterUserId,
          title: "Join Request Denied",
          message: `Denied — your listing stays active under your selected tier`,
          type: "join_request_denied",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joinRequests"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Response sent");
    }
  });

  if (isLoading || !listing) {
    return <div className="p-8 text-center">Loading...</div>;
  }

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

                {/* (plain english) section to show pending requests for EO */}
                {user && user.id === listing.ownerUserId && joinRequests?.length > 0 && (
                  <div className="mt-4 border-t border-emerald-200 pt-4">
                    <h4 className="font-semibold text-emerald-900 mb-3">Pending Join Requests ({joinRequests.length})</h4>
                    <div className="space-y-3">
                      {joinRequests.map(req => (
                        <div key={req.id} className="bg-white p-3 rounded border border-emerald-100 shadow-sm">
                          <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                          <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.addressText || "No address"}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{req.listingDetails?.description}</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => respondToJoinRequestMutation.mutate({
                                requestId: req.id,
                                requesterListingId: req.listingId,
                                action: "approve",
                                requesterUserId: req.requesterUserId,
                                eventTitle: listing.title
                              })}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => respondToJoinRequestMutation.mutate({
                                requestId: req.id,
                                requesterListingId: req.listingId,
                                action: "deny",
                                requesterUserId: req.requesterUserId,
                                eventTitle: listing.title
                              })}
                            >
                              Deny
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* (plain english) info box for the requester about their join status */}
            {(listing.neighborhood_join_status === "pending" || listing.neighborhood_join_status === "requested") && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900">Neighborhood Sale: Pending approval</h3>
              </div>
            )}
            {listing.neighborhood_join_status === "approved" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-1">Neighborhood Sale: Approved</h3>
                {parentSale && (
                  <div className="text-sm text-green-800 mt-2">
                    <p><strong>Event:</strong> {parentSale.title}</p>
                    {parentSale.startDateTime && parentSale.endDateTime && (
                      <p><strong>Dates:</strong> {format(new Date(parentSale.startDateTime), "PPp")} - {format(new Date(parentSale.endDateTime), "PPp")}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {listing.neighborhood_join_status === "denied" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900">Neighborhood Sale: Denied</h3>
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