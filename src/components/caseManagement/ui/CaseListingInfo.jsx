import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CaseListingInfo({ listing }) {
  if (!listing) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Listing Information</CardTitle></CardHeader>
        <CardContent><p className="text-gray-500">Listing data not available.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Listing Information</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Title:</span><span className="font-medium">{listing.title}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Listing #:</span><span className="font-mono">{listing.listingNumber || listing.id}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Type:</span><Badge variant="outline">{listing.listingType}</Badge></div>
        <div className="flex justify-between"><span className="text-gray-500">Status:</span><Badge className={listing.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{listing.status}</Badge></div>
        <div className="flex justify-between"><span className="text-gray-500">Tier:</span><span>{listing.tier}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Address:</span><span>{listing.addressText || "—"}, {listing.city} {listing.state} {listing.zip}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Owner:</span><span className="font-mono text-xs">{listing.ownerUserId}</span></div>
        {listing.description && <div><span className="text-gray-500">Description:</span><p className="mt-1 text-xs bg-gray-50 p-2 rounded">{listing.description}</p></div>}
        {listing.photoUrls?.length > 0 && (
          <div>
            <span className="text-gray-500">Photos:</span>
            <div className="flex gap-2 mt-1 flex-wrap">
              {listing.photoUrls.map((url, i) => (
                <img key={i} src={url} alt={`listing-${i}`} className="w-20 h-20 object-cover rounded border" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}