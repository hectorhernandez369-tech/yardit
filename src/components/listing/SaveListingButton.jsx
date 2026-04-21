import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useGuestGuard } from "@/hooks/useGuestGuard";

export default function SaveListingButton({ listing, variant = "outline", size = "sm", className = "", iconOnly = false }) {
  const queryClient = useQueryClient();
  const { guardAction } = useGuestGuard();
  
  const { data: user } = useQuery({
    queryKey: ["currentUserAuth"],
    queryFn: async () => {
      try { return await base44.auth.me(); } catch { return null; }
    }
  });

  const { data: savedListings = [] } = useQuery({
    queryKey: ["savedListings", user?.id],
    queryFn: () => base44.entities.SavedListing.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const savedRecord = savedListings.find(s => s.listing_id === listing?.id);
  const isSaved = !!savedRecord;

  const saveMutation = useMutation({
    mutationFn: () => 
      base44.entities.SavedListing.create({
        user_id: user.id,
        listing_id: listing.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
      toast.success("Listing saved");
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => base44.entities.SavedListing.delete(savedRecord.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
      toast.success("Listing removed from saved");
    },
  });

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    guardAction(() => {
      if (isSaved) {
        unsaveMutation.mutate();
      } else {
        saveMutation.mutate();
      }
    }, {
      modal: {
        title: "Create an Account to Save",
        description: "Guests cannot save listings.",
        detail: "Create a free account to save listings for later.",
      }
    });
  };

  if (!listing) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={`gap-1 ${className} ${isSaved ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : ""}`}
    >
      <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
      {!iconOnly && (isSaved ? "Saved" : "Save")}
    </Button>
  );
}