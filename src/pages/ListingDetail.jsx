import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportModal from "../components/listing/ReportModal";

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
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{listing.title}</CardTitle>
                <Badge className={tierColors[listing.tier]}>
                  {listing.tier === "neighborhood_tier" ? "Neighborhood Sale" : listing.tier.toUpperCase()}
                </Badge>
              </div>
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
          </CardHeader>

          <CardContent className="space-y-6">
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
              <div>
                <p>{listing.addressText}</p>
                <p>{listing.city}, {listing.zip}</p>
              </div>
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

            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full"
            >
              Back to Map
            </Button>
          </CardContent>
        </Card>
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