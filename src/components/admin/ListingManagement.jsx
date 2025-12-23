import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

export default function ListingManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["allListings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
    initialData: [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }) => 
      base44.entities.Listing.update(id, { status, statusReason: reason }),
    onSuccess: () => {
      toast.success("Listing status updated");
      queryClient.invalidateQueries({ queryKey: ["allListings"] });
    },
  });

  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.zip.includes(searchQuery)
  );

  const statusColors = {
    active: "bg-green-600",
    hidden: "bg-gray-500",
    under_review: "bg-yellow-600",
    suspended: "bg-red-600",
    completed: "bg-blue-600",
    expired: "bg-gray-400"
  };

  return (
    <div className="mt-6">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title, city, or ZIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredListings.slice(0, 20).map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{listing.title}</h3>
                  <div className="flex gap-2 mb-2">
                    <Badge className={statusColors[listing.status]}>
                      {listing.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{listing.tier}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{listing.city}, {listing.zip}</p>
                  <p className="text-xs text-slate-500">ID: {listing.id}</p>
                </div>
                
                <div className="flex gap-2">
                  <Select
                    value={listing.status}
                    onValueChange={(value) => 
                      updateStatusMutation.mutate({ 
                        id: listing.id, 
                        status: value,
                        reason: `Admin changed status to ${value}`
                      })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}