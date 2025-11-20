import React, { useState } from "react";
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
import { format } from "date-fns";

export default function EditLocationModal({ location, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: location.title || "",
    description: location.description || "",
    date: location.date ? format(new Date(location.date), "yyyy-MM-dd") : "",
    expires_at: location.expires_at ? format(new Date(location.expires_at), "yyyy-MM-dd") : "",
  });

  const updateMutation = useMutation({
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
    
    const updateData = {
      title: formData.title,
      description: formData.description,
      date: formData.date || null,
    };

    // Only update expires_at if it's a yard sale
    if (location.type === "yard_sale" && formData.expires_at) {
      updateData.expires_at = new Date(formData.expires_at).toISOString();
    }

    updateMutation.mutate(updateData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Location Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Multi-family Yard Sale"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your location..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">
              {location.type === "yard_sale" ? "Sale Date" : "Event Date"}
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {location.type === "yard_sale" && (
            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiration Date</Label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Your listing will be hidden after this date
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}