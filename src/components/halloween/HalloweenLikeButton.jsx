import React from "react";
import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { toast } from "sonner";

export default function HalloweenLikeButton({ listingId, className = "" }) {
  const queryClient = useQueryClient();
  const queryKey = ["halloweenLikes", listingId];
  const { guardAction, showModal, setShowModal, modalProps } = useGuestGuard();
  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await base44.functions.invoke("halloweenLikes", { action: "get", halloween_listing_id: listingId })).data,
    enabled: !!listingId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
  const mutation = useMutation({
    mutationFn: async (liked) => (await base44.functions.invoke("halloweenLikes", { action: "toggle", halloween_listing_id: listingId, liked })).data,
    onMutate: async (liked) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey) || data;
      queryClient.setQueryData(queryKey, { liked, count: Math.max(0, previous.count + (liked ? 1 : -1)) });
      return { previous };
    },
    onError: (error, _liked, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      toast.error(error?.message || "Could not update like");
    },
    onSuccess: (result) => queryClient.setQueryData(queryKey, result),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  const isKnown = !!data;
  const isLiked = data?.liked === true;
  const toggle = (event) => {
    event.stopPropagation();
    if (!isKnown) return;
    guardAction(() => mutation.mutate(!isLiked), { modal: { title: "Log In to Like This Halloween Spot", description: "Create a free Yardit account or log in to like this Halloween location." } });
  };
  return <>
    <Button type="button" variant="outline" size="sm" aria-label={!isKnown ? "Loading Halloween likes" : isLiked ? "Unlike Halloween spot" : "Like Halloween spot"} aria-pressed={isKnown ? isLiked : undefined} disabled={!isKnown || mutation.isPending} onClick={toggle} className={`gap-1 ${className}`}>
      <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-red-500 stroke-red-500 text-red-500" : "fill-none stroke-slate-300 text-slate-300"}`} />
      {isKnown ? <span className={isLiked ? "text-red-500" : "text-slate-300"}>{data.count}</span> : <span className="min-w-2 animate-pulse text-slate-400">—</span>}
    </Button>
    <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />
  </>;
}