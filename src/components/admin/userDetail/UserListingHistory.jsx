import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UserListingHistory({ user }) {
  const navigate = useNavigate();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["userListings", user.id],
    queryFn: async () => {
      const all = await base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date");
      return all;
    },
    initialData: [],
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  if (listings.length === 0) return <p className="text-sm text-gray-500 py-4 text-center">No listings found.</p>;

  const now = new Date();

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Listing History ({listings.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2 px-2">Title</th>
              <th className="py-2 px-2">Tier</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Start</th>
              <th className="py-2 px-2">End</th>
              <th className="py-2 px-2">Created</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => {
              const expired = l.endDateTime && new Date(l.endDateTime) < now;
              return (
                <tr key={l.id} className="border-b hover:bg-gray-50/50">
                  <td className="py-2 px-2 max-w-[180px] truncate">{l.title || "Untitled"}</td>
                  <td className="py-2 px-2"><Badge variant="outline" className="capitalize text-xs">{l.tier}</Badge></td>
                  <td className="py-2 px-2">
                    <Badge className={expired ? "bg-gray-400" : l.status === "active" ? "bg-green-600" : "bg-yellow-600"}>
                      {expired ? "Expired" : (l.status || "active")}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-xs">{l.startDateTime ? format(new Date(l.startDateTime), "MMM d, yyyy") : "—"}</td>
                  <td className="py-2 px-2 text-xs">{l.endDateTime ? format(new Date(l.endDateTime), "MMM d, yyyy") : "—"}</td>
                  <td className="py-2 px-2 text-xs">{l.created_date ? format(new Date(l.created_date), "MMM d, yyyy") : "—"}</td>
                  <td className="py-2 px-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${l.id}`)}
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}