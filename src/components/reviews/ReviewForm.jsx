import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReviewForm({ locationId }) {
  const [user, setUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
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

  const { data: existingReview } = useQuery({
    queryKey: ["userReview", locationId, user?.email],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({
        location_id: locationId,
        user_email: user.email,
      });
      return reviews[0] || null;
    },
    enabled: !!user?.email,
  });

  const submitReviewMutation = useMutation({
    mutationFn: (data) => base44.entities.Review.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["userReview"] });
      toast.success("Review submitted!");
      setRating(0);
      setComment("");
    },
  });

  if (!user) return null;
  if (existingReview) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        You've already reviewed this location
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    submitReviewMutation.mutate({
      location_id: locationId,
      user_email: user.email,
      rating,
      comment,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="text-sm font-medium mb-2">Rate this location:</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <Textarea
        placeholder="Share your experience (optional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="text-sm"
      />

      <Button
        type="submit"
        disabled={submitReviewMutation.isPending || rating === 0}
        className="w-full"
        size="sm"
      >
        {submitReviewMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Review"
        )}
      </Button>
    </form>
  );
}