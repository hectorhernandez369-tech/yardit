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
  const { data = { count: 0, liked: false } } = useQuery({
    queryKey,
    queryFn: async () => (await base44.functions.invoke("halloweenLikes", { action: "get", halloween_listing_id: listingId })).data,
    enabled: !!listingId,
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
  const toggle = (event) => {
    event.stopPropagation();
    guardAction(() => mutation.mutate(!data.liked), { modal: { title: "Log In to Like This Halloween Spot", description: "Create a free Yardit account or log in to like this Halloween location." } });
  };
  return <>
    <Button type="button" variant="outline" size="sm" aria-label={data.liked ? "Unlike Halloween spot" : "Like Halloween spot"} aria-pressed={data.liked} disabled={mutation.isPending} onClick={toggle} className={`gap-1 ${data.liked ? "text-red-500" : "text-slate-300"} ${className}`}>
      <Heart className={`h-3.5 w-3.5 ${data.liked ? "fill-current" : ""}`} /><span>{data.count}</span>
    </Button>
    <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />
  </>;
}