import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MapPin, Calendar, Tag, Home, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import NeighborhoodSalePreviewMap from "@/components/neighborhood/NeighborhoodSalePreviewMap";
import { getStateAbbreviation } from "@/lib/listingLocation";
import {
  calculateNeighborhoodSalePrice,
  NEIGHBORHOOD_BASE_PRICE,
  NEIGHBORHOOD_MIN_HOMES,
  NEIGHBORHOOD_PRICE_PER_HOME,
} from "@/lib/neighborhoodSalePricing";
import { normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";

// Helper used internally
const formatAddress = (item) => {
  const base = [
    item.display_address || item.address_text || item.addressText || "Address unavailable",
    item.city,
    getStateAbbreviation(item.state),
  ]
    .filter(Boolean)
    .join(", ");
  return item.zip ? `${base} ${item.zip}` : base;
};

export default function NeighborhoodSalePanel({
  listing,
  user,
  salePricing,
  neighborhoodEventState,
  isNeighborhoodSaleLive,
  approvedRequests,
  visibleParticipatingHomes,
  pendingRequests,
  removedRequests,
  approvedHomesCount,
  availableSpots,
  canManageNeighborhoodSale,
  parentSale,
  listingId,
  inviteText,
  onRespondToJoinRequest,
  onReport,
  paidAmount = 0,
}) {
  // Use the canonical roster if provided, otherwise fall back to approvedRequests
  const rosterHomes = visibleParticipatingHomes ?? approvedRequests;
  const rosterCount = rosterHomes.length;
  const navigate = useNavigate();
  const eventAddress = formatAddress(listing);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteText).then(() => {
      toast.success("Invite copied");
    });
  };

  return (
    <>
      {/* Neighborhood Sale details block */}
      {listing.listingType === "neighborhood_sale" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-emerald-900 mb-2">Neighborhood Sale</h3>
              <p className="text-sm text-emerald-800">
                {rosterCount} homes participating • Span: {listing.spanFeet} ft
              </p>
              {listing.co_host_user_id && (
                <p className="text-sm text-emerald-800 mt-1">
                  Co-host status:{" "}
                  <span className="font-medium capitalize">{listing.co_host_status || "pending"}</span>
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              onClick={handleCopyInvite}
            >
              <Copy className="w-4 h-4" />
              Copy Invite
            </Button>
          </div>

          <div className="bg-white/70 border border-emerald-200 rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Main Event Address</p>
            <p className="text-sm text-emerald-950 font-medium">{eventAddress}</p>
            <NeighborhoodSalePreviewMap lat={listing.event_center_lat} lng={listing.event_center_lng} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                Homes Joined: {rosterCount} / 25
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                {availableSpots === 0 ? "Neighborhood Sale is full" : `Available Spots: ${availableSpots} left`}
              </div>
            </div>
          </div>

          {canManageNeighborhoodSale && salePricing && (
            <div className="bg-white/70 border border-emerald-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Neighborhood Sale Payment</p>
                  <p className="text-sm text-emerald-950 font-medium">
                    {salePricing.totalApprovedHomes} homes •{" "}
                    {salePricing.homesNeeded > 0
                      ? `${salePricing.homesNeeded} more needed to activate`
                      : "Activated / ready"}
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 border-none capitalize">
                  {String(neighborhoodEventState || "pending_activation").replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border border-emerald-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Paid</p>
                  <p className="font-semibold text-emerald-950">${Number(paidAmount || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-md border border-emerald-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Total Current Cost</p>
                  <p className="font-semibold text-emerald-950">
                    ${Number(NEIGHBORHOOD_BASE_PRICE + NEIGHBORHOOD_PRICE_PER_HOME * salePricing.totalApprovedHomes).toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    ${NEIGHBORHOOD_BASE_PRICE.toFixed(2)} flat + ${NEIGHBORHOOD_PRICE_PER_HOME.toFixed(2)} × {salePricing.totalApprovedHomes} homes
                  </p>
                </div>
                <div className="rounded-md border border-emerald-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Additional Due</p>
                  <p className="font-semibold text-emerald-950">
                    ${Number(Math.max(0, (NEIGHBORHOOD_BASE_PRICE + NEIGHBORHOOD_PRICE_PER_HOME * salePricing.totalApprovedHomes) - (paidAmount || 0))).toFixed(2)}
                  </p>
                </div>
              </div>
              {salePricing.totalApprovedHomes < NEIGHBORHOOD_MIN_HOMES ? (
                <p className="text-sm text-emerald-800">
                  If the sale is still under {NEIGHBORHOOD_MIN_HOMES} approved homes at the 24-hour lock point, Yardit will switch the organizer to the $7.99 Premium fallback and remove the Neighborhood container.
                </p>
              ) : neighborhoodEventState === "activated_locked" ||
                neighborhoodEventState === "coming_soon" ||
                neighborhoodEventState === "active" ? (
                <p className="text-sm text-emerald-800">
                  This sale is locked after the organizer charge and can no longer add or remove participants through the normal flow.
                </p>
              ) : (
                <p className="text-sm text-emerald-800">
                  <strong>Committed:</strong> Your sale has reached {NEIGHBORHOOD_MIN_HOMES} homes. Cancelling now will trigger an immediate charge. Otherwise, your card on file will be charged exactly 24 hours before start time.
                </p>
              )}
            </div>
          )}

          <div className="bg-white/70 border border-emerald-200 rounded-lg p-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Participating in Sale</p>
              <p className="text-sm text-emerald-950 font-medium">
                {rosterCount} homes currently live in this sale
              </p>
            </div>
            {isNeighborhoodSaleLive && rosterHomes.length > 0 ? (
              <div className="space-y-3">
                {rosterHomes.map((req, index) => (
                  <div key={req.id || index} className="text-sm text-emerald-900 border border-emerald-200 rounded-md bg-white p-3 space-y-2">
                    <div>
                      <p className="font-semibold text-emerald-950">{req.listingDetails?.title || "Participant"}</p>
                      <p className="text-emerald-800">{req.listingDetails ? formatAddress(req.listingDetails) : "Address unavailable"}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap pt-2 mt-2 border-t border-emerald-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => navigate(createPageUrl("ListingDetail") + "?id=" + req.listingId)}
                      >
                        View More Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => toast.info("Messaging feature coming soon.")}
                      >
                        Send Message
                      </Button>
                      {(canManageNeighborhoodSale || user?.isAdmin) && (
                        isNeighborhoodSaleLive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => onReport({
                              joinRequestId: req.id,
                              requesterListingId: req.listingId,
                              requesterUserId: req.requesterUserId,
                              saleListingId: listingId,
                              eventTitle: listing.title,
                            })}
                          >
                            Report
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to remove this participant from the sale?")) {
                                onRespondToJoinRequest({ requestId: req.id, requesterListingId: req.listingId, action: "remove", requesterUserId: req.requesterUserId, eventTitle: listing.title });
                              }
                            }}
                          >
                            Remove From Sale
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-800">
                {isNeighborhoodSaleLive
                  ? "No approved participant addresses available yet."
                  : "This sale is not public yet. Approved homes become visible after payment is completed."}
              </p>
            )}
          </div>

          {canManageNeighborhoodSale && pendingRequests.length > 0 && (
            <div className="mt-4 border-t border-emerald-200 pt-4">
              <h4 className="font-semibold text-emerald-900 mb-3">Pending Join Requests ({pendingRequests.length})</h4>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-white p-3 rounded border border-emerald-100 shadow-sm">
                    <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                    <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.display_address || req.listingDetails?.addressText || "No address"}</p>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{req.listingDetails?.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onRespondToJoinRequest({ requestId: req.id, requesterListingId: req.listingId, action: "approve", requesterUserId: req.requesterUserId, eventTitle: listing.title })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onRespondToJoinRequest({ requestId: req.id, requesterListingId: req.listingId, action: "deny", requesterUserId: req.requesterUserId, eventTitle: listing.title })}>
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canManageNeighborhoodSale && rosterHomes.length > 0 && (
            <div className="mt-4 border-t border-emerald-200 pt-4">
              <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <Home className="w-4 h-4" />
                Participating Homes ({rosterCount})
              </h4>
              <div className="space-y-3">
                {rosterHomes.map((req) => {
                  const ld = req.listingDetails || {};
                  const photo = ld.photoUrls?.[0];
                  const address = ld.display_address || ld.address_text || ld.addressText || "Address unavailable";
                  const city = [ld.city, getStateAbbreviation(ld.state)].filter(Boolean).join(", ");
                  const startDate = ld.startDateTime ? format(new Date(ld.startDateTime), "MMM d") : null;
                  const endDate = ld.endDateTime ? format(new Date(ld.endDateTime), "MMM d, yyyy") : null;
                  const categories = ld.categories?.length ? ld.categories : ld.category ? [ld.category] : [];

                  return (
                    <div key={req.id} className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                      {/* Photo banner */}
                      {photo ? (
                        <div className="h-28 w-full overflow-hidden">
                          <img src={photo} alt={ld.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-16 w-full bg-gradient-to-r from-emerald-50 to-emerald-100 flex items-center justify-center">
                          <Home className="w-6 h-6 text-emerald-300" />
                        </div>
                      )}

                      <div className="p-3 space-y-2">
                        {/* Title + badge */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800 leading-snug">{ld.title || "Participant Listing"}</p>
                          <Badge className={`${req.isOrganizer ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white border-none shrink-0 text-[10px]`}>
                            {req.isOrganizer ? "Organizer" : "Approved"}
                          </Badge>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-1.5 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                          <span>{address}{city ? `, ${city}` : ""}</span>
                        </div>

                        {/* Dates */}
                        {startDate && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            <span>{startDate}{endDate && endDate !== startDate ? ` – ${endDate}` : ""}</span>
                          </div>
                        )}

                        {/* Categories */}
                        {categories.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            {categories.slice(0, 4).map((cat) => (
                              <span key={cat} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">{cat}</span>
                            ))}
                          </div>
                        )}

                        {/* Description */}
                        {ld.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{ld.description}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5 text-xs"
                            onClick={() => navigate(createPageUrl("ListingDetail") + "?id=" + req.listingId)}
                          >
                            <ExternalLink className="w-3 h-3" /> View Listing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                            onClick={() => navigate(createPageUrl("CreateListing") + "?edit=1&listingId=" + req.listingId)}
                          >
                            Edit
                          </Button>
                          {!req.isOrganizer && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                              onClick={() => onRespondToJoinRequest({ requestId: req.id, requesterListingId: req.listingId, action: "remove", requesterUserId: req.requesterUserId, eventTitle: listing.title })}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {canManageNeighborhoodSale && removedRequests.length > 0 && (
            <div className="mt-4 border-t border-red-200 pt-4">
              <h4 className="font-semibold text-red-900 mb-3">Removed Homes ({removedRequests.length})</h4>
              <div className="space-y-3">
                {removedRequests.map((req) => (
                  <div key={req.id} className="bg-white p-3 rounded border border-red-100 shadow-sm opacity-75">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                      <Badge className="bg-red-600 text-white hover:bg-red-700 border-none">Removed</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.display_address || req.listingDetails?.addressText || "No address"}</p>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{req.listingDetails?.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Join status banners for participant listings */}
      {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900">Neighborhood Sale: Pending approval</h3>
        </div>
      )}
      {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-1">Neighborhood Sale: Approved</h3>
          {parentSale && (
            <div className="text-sm text-green-800 mt-2">
              <p><strong>Event:</strong> {parentSale.title}</p>
              {parentSale.startDateTime && parentSale.endDateTime && (
                <p><strong>Dates:</strong> {format(new Date(parentSale.startDateTime), "PPp")} -{" "}{format(new Date(parentSale.endDateTime), "PPp")}</p>
              )}
              <p className="mt-2">
                If this Neighborhood Sale is canceled or your participation is removed, you will need to create a normal listing to appear independently.
              </p>
            </div>
          )}
        </div>
      )}
      {listing.neighborhood_join_status === "denied" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900">Neighborhood Sale: Denied</h3>
        </div>
      )}
    </>
  );
}