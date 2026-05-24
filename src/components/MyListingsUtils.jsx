// Utility hook for fetching and filtering My Listings
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useMyListingsQuery(user) {
  return useQuery({
    queryKey: ["myListings", user?.id],
    queryFn: async () => {
      const owned = await base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date");
      const coHosted = await base44.entities.Listing.filter({ co_host_user_id: user.id }, "-created_date");
      const merged = [...owned, ...coHosted.filter((listing) => listing.co_host_status === "accepted")];
      const seen = new Set();
      return merged.filter((listing) => {
        if (seen.has(listing.id)) return false;
        seen.add(listing.id);
        // Hide unclaimed admin-created assisted listings — claimed listings appear to their owner
        if (
          (listing.created_by_admin === true || listing.assisted_listing === true) &&
          listing.owner_type === "guest_assisted" &&
          listing.ownerUserId !== user.id
        ) {
          return false;
        }
        return true;
      });
    },
    enabled: !!user,
    initialData: [],
  });
}