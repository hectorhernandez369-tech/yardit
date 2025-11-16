import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function TrackButton({ locationId }) {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: trackedListings } = useQuery({
    queryKey: ["trackedListings", user?.email],
    queryFn: () => base44.entities.TrackedListing.filter({ user_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const isTracked = trackedListings.some((t) => t.location_id === locationId);

  const trackMutation = useMutation({
    mutationFn: () => base44.entities.TrackedListing.create({
      user_email: user.email,
      location_id: locationId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedListings"] });
      toast.success("Now tracking this listing!");
    },
    onError: () => {
      toast.error("Failed to track listing");
    },
  });

  const untrackMutation = useMutation({
    mutationFn: () => {
      const tracked = trackedListings.find((t) => t.location_id === locationId);
      if (tracked) {
        return base44.entities.TrackedListing.delete(tracked.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedListings"] });
      toast.success("Stopped tracking this listing");
    },
  });

  if (!user) return null;

  return (
    <Button
      size="sm"
      variant={isTracked ? "default" : "outline"}
      onClick={() => isTracked ? untrackMutation.mutate() : trackMutation.mutate()}
      disabled={trackMutation.isPending || untrackMutation.isPending}
      className="gap-2"
    >
      {isTracked ? (
        <>
          <Eye className="w-4 h-4" />
          Tracking
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4" />
          Track
        </>
      )}
    </Button>
  );
}