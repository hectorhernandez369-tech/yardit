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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AddressFields from "../shared/AddressFields";

export default function EditLocationModal({ location, open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (location) {
      setFormData({
        title: location.title || "",
        display_title: location.display_title || "",
        description: location.description || "",
        street_address: location.street_address || "",
        city: location.city || "",
        state: location.state || "",
        zip_code: location.zip_code || "",
        date: location.date || "",
        viewing_start_time: location.viewing_start_time || "",
        viewing_end_time: location.viewing_end_time || "",
        contact_info: location.contact_info || "",
      });
    }
  }, [location]);

  const updateLocationMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.update(location.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLocations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated successfully!");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to update location.");
      console.error(error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Build full address if address fields changed
    let updateData = { ...formData };
    if (formData.street_address && formData.city && formData.state && formData.zip_code) {
      updateData.address = `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
    }
    
    updateLocationMutation.mutate(updateData);
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {location.type === "holiday_lights" ? (
            <div className="space-y-2">
              <Label htmlFor="display_title">Display Title</Label>
              <Input
                id="display_title"
                value={formData.display_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, display_title: e.target.value }))
                }
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
          )}

          <AddressFields formData={formData} setFormData={setFormData} required={false} />

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
            />
          </div>

          {location.type === "holiday_lights" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="viewing_start_time">Viewing Start Time</Label>
                <Input
                  id="viewing_start_time"
                  type="time"
                  value={formData.viewing_start_time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, viewing_start_time: e.target.value }))
                  }
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
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="date">Event Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact_info">Contact Info (Optional)</Label>
            <Input
              id="contact_info"
              value={formData.contact_info}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, contact_info: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateLocationMutation.isPending}>
              {updateLocationMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}