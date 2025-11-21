import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RelistModal({ location, open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: "",
    viewing_start_time: "",
    viewing_end_time: "",
  });

  useEffect(() => {
    if (location) {
      setFormData({
        date: "",
        viewing_start_time: location.viewing_start_time || "17:00",
        viewing_end_time: location.viewing_end_time || "22:00",
      });
    }
  }, [location]);

  const relistMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate new expiration
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      const nextFriday = new Date(now);
      nextFriday.setDate(now.getDate() + daysUntilFriday);
      nextFriday.setHours(0, 1, 0, 0);
      const sunday = new Date(nextFriday);
      sunday.setDate(nextFriday.getDate() + 2);
      sunday.setHours(23, 59, 0, 0);

      const expiresAt = location.tier === "neighborhood_event" 
        ? new Date(sunday.getTime() + 7 * 24 * 60 * 60 * 1000)
        : sunday;

      // Create new listing based on old one
      return base44.entities.Location.create({
        ...location,
        id: undefined, // Remove ID to create new
        created_date: undefined,
        updated_date: undefined,
        ...data,
        expires_at: expiresAt.toISOString(),
        active: true,
        feed_impressions: 0,
        listing_views: 0,
        map_pin_clicks: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLocations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location relisted successfully!");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to relist location.");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (location.type === "holiday_lights") {
      if (!formData.viewing_start_time || !formData.viewing_end_time) {
        toast.error("Please set viewing times.");
        return;
      }
    } else {
      if (!formData.date) {
        toast.error("Please set event date.");
        return;
      }
    }
    
    relistMutation.mutate(formData);
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Relist Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Create a new active listing based on this location. The original listing will remain inactive.
          </p>

          {location.type === "holiday_lights" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="viewing_start_time">Viewing Start Time</Label>
                <Input
                  id="viewing_start_time"
                  type="time"
                  value={formData.viewing_start_time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, viewing_start_time: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="viewing_end_time">Viewing End Time</Label>
                <Input
                  id="viewing_end_time"
                  type="time"
                  value={formData.viewing_end_time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, viewing_end_time: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="date">New Event Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={relistMutation.isPending}>
              {relistMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Relist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}