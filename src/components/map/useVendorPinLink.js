import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";
import { toast } from "sonner";

export default function useVendorPinLink(pinId) {
  const [, tick] = useState(0);
  const notice = useRef("");
  const query = useQuery({
    queryKey: ["publicVendorPinLink", pinId],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicMapData", { vendorPinId: pinId });
      return response.data;
    },
    enabled: !!pinId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 15000,
  });
  const result = query.isFetchedAfterMount && !query.isError ? query.data?.vendorPin : null;
  const target = result && isLiveVendorCheckIn(result.checkIn) ? result : null;
  useEffect(() => {
    if (!result) return;
    const remaining = new Date(result.checkIn.checkin_end_time).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => tick((value) => value + 1), Math.min(remaining + 1, 2147483647));
    return () => clearTimeout(timer);
  }, [result]);
  useEffect(() => {
    if (!pinId || !query.isFetchedAfterMount) return;
    if (target) { notice.current = ""; return; }
    const message = query.isError ? "Unable to load this vendor location. Please try again." : "This vendor is no longer checked in at this location.";
    const key = `${pinId}:${message}`;
    if (notice.current !== key) { toast(message); notice.current = key; }
  }, [pinId, target, query.isFetchedAfterMount, query.isError]);
  return { target, loading: !!pinId && !query.isFetchedAfterMount };
}