import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isHolidaySeason, getCurrentSeasonYear } from "./SeasonCheck";

export default function LightRatingForm({ locationId, displayActive }) {
  const [user, setUser] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const queryClient = useQueryClient();
  const seasonYear = getCurrentSeasonYear();

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

  const { data: existingRating } = useQuery({
    queryKey: ["userLightRating", locationId, user?.email, seasonYear],
    queryFn: async () => {
      const ratings = await base44.entities.LightRating.filter({
        listing_id: locationId,
        user_email: user.email,
        season_year: seasonYear,
      });
      return ratings[0] || null;
    },
    enabled: !!user?.email,
  });

  const submitRatingMutation = useMutation({
    mutationFn: (data) => base44.entities.LightRating.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lightRatings"] });
      queryClient.invalidateQueries({ queryKey: ["userLightRating"] });
      toast.success("Rating submitted!");
      setSelectedRating(0);
    },
  });

  if (!user) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        Please log in to rate this display
      </div>
    );
  }

  if (!isHolidaySeason()) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
        Ratings are only available November 1st–January 2nd
      </div>
    );
  }

  if (!displayActive) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
        This display must be active to receive ratings
      </div>
    );
  }

  if (existingRating) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
        <p className="text-green-800 font-medium">You rated this display</p>
        <div className="flex gap-1 mt-2">
          {[5, 6, 7, 8, 9, 10].map((val) => (
            <Star
              key={val}
              className={`w-5 h-5 ${
                val <= existingRating.rating_value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (selectedRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    submitRatingMutation.mutate({
      listing_id: locationId,
      user_email: user.email,
      rating_value: selectedRating,
      season_year: seasonYear,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Rate this display (5-10):</p>
      <div className="flex gap-2 flex-wrap">
        {[5, 6, 7, 8, 9, 10].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => setSelectedRating(rating)}
            onMouseEnter={() => setHoverRating(rating)}
            onMouseLeave={() => setHoverRating(0)}
            className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
              rating <= (hoverRating || selectedRating)
                ? "bg-yellow-400 text-white scale-110"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {rating}
          </button>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitRatingMutation.isPending || selectedRating === 0}
        className="w-full"
        size="sm"
      >
        {submitRatingMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Rating"
        )}
      </Button>
    </div>
  );
}