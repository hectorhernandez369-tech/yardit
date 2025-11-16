import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff } from "lucide-react";
import { toast } from "sonner";

export default function LocationActions({ location }) {
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

  const { data: trackedLocations } = useQuery({
    queryKey: ["trackedLocations", user?.email],
    queryFn: () => base44.entities.TrackedLocation.filter({ user_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const isTracked = trackedLocations.some(t => t.location_id === location.id);

  const trackMutation = useMutation({
    mutationFn: () => 
      base44.entities.TrackedLocation.create({
        user_email: user.email,
        location_id: location.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedLocations"] });
      toast.success("Location tracked! You'll be notified when it's expiring.");
    },
  });

  const untrackMutation = useMutation({
    mutationFn: () => {
      const tracked = trackedLocations.find(t => t.location_id === location.id);
      return base44.entities.TrackedLocation.delete(tracked.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedLocations"] });
      toast.success("Location untracked.");
    },
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => isTracked ? untrackMutation.mutate() : trackMutation.mutate()}
      className="gap-2"
    >
      {isTracked ? (
        <>
          <HeartOff className="w-4 h-4 text-red-500" />
          Untrack
        </>
      ) : (
        <>
          <Heart className="w-4 h-4" />
          Track
        </>
      )}
    </Button>
  );
}