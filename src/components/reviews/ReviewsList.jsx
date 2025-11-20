import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, User } from "lucide-react";
import { format } from "date-fns";

export default function ReviewsList({ locationId }) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", locationId],
    queryFn: () => base44.entities.Review.filter({ location_id: locationId }, "-created_date"),
    initialData: [],
  });

  if (isLoading) return <div className="text-sm text-gray-500">Loading reviews...</div>;
  if (reviews.length === 0) return <div className="text-sm text-gray-500">No reviews yet</div>;

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {reviews.map((review) => (
        <div key={review.id} className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900">
                {review.user_email?.split("@")[0]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          {review.comment && <p className="text-gray-700 mb-1">{review.comment}</p>}
          <p className="text-xs text-gray-500">
            {format(new Date(review.created_date), "MMM d, yyyy")}
          </p>
        </div>
      ))}
    </div>
  );
}