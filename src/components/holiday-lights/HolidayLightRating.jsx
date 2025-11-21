import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isHolidayLightsSeason, getCurrentSeasonYear } from "./SeasonalCheck";

export default function HolidayLightRating({ locationId, displayActive }) {
  const [user, setUser] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const queryClient = useQueryClient();
  const seasonYear = getCurrentSeasonYear();
  const inSeason = isHolidayLightsSeason();

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
    queryKey: ["lightRating", locationId, user?.email, seasonYear],
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
    mutationFn: async (ratingValue) => {
      if (existingRating) {
        await base44.entities.LightRating.update(existingRating.id, {
          rating_value: ratingValue,
        });
      } else {
        await base44.entities.LightRating.create({
          listing_id: locationId,
          user_email: user.email,
          rating_value: ratingValue,
          season_year: seasonYear,
        });
      }

      // Update location's aggregate ratings
      const allRatings = await base44.entities.LightRating.filter({
        listing_id: locationId,
        season_year: seasonYear,
      });
      
      const avgRating = allRatings.reduce((sum, r) => sum + r.rating_value, 0) / allRatings.length;
      const holidayScore = allRatings.reduce((sum, r) => sum + r.rating_value, 0);
      
      await base44.entities.Location.update(locationId, {
        average_rating: avgRating,
        ratings_count: allRatings.length,
        holiday_score: holidayScore,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lightRating"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(existingRating ? "Rating updated!" : "Rating submitted!");
      setSelectedRating(0);
    },
  });

  if (!user) return null;

  if (!inSeason || !displayActive) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
        Ratings are only available during the holiday season (Nov 1 - Jan 2) when the display is active.
      </div>
    );
  }

  if (existingRating) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-800 mb-2">
          Your rating: <span className="font-bold">{existingRating.rating_value}/10</span>
        </p>
        <p className="text-xs text-green-700">
          You can update your rating by selecting a new score below:
        </p>
        <div className="flex gap-1 mt-3">
          {[5, 6, 7, 8, 9, 10].map((rating) => (
            <button
              key={rating}
              onClick={() => {
                setSelectedRating(rating);
                submitRatingMutation.mutate(rating);
              }}
              onMouseEnter={() => setHoverRating(rating)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={submitRatingMutation.isPending}
              className="flex-1 py-2 px-1 text-sm font-semibold rounded transition-all disabled:opacity-50"
              style={{
                backgroundColor: (hoverRating || existingRating.rating_value) >= rating ? '#fbbf24' : '#f3f4f6',
                color: (hoverRating || existingRating.rating_value) >= rating ? 'white' : '#6b7280',
              }}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium mb-2">Rate this display (5-10):</p>
        <p className="text-xs text-gray-600 mb-3">
          Only rate displays you enjoyed! We only accept positive ratings (5-10).
        </p>
        <div className="flex gap-1">
          {[5, 6, 7, 8, 9, 10].map((rating) => (
            <button
              key={rating}
              onClick={() => setSelectedRating(rating)}
              onMouseEnter={() => setHoverRating(rating)}
              onMouseLeave={() => setHoverRating(0)}
              className="flex-1 py-3 px-1 text-lg font-bold rounded transition-all"
              style={{
                backgroundColor: (hoverRating || selectedRating) >= rating ? '#fbbf24' : '#f3f4f6',
                color: (hoverRating || selectedRating) >= rating ? 'white' : '#6b7280',
              }}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => submitRatingMutation.mutate(selectedRating)}
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