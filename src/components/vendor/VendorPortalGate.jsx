import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useVendorAccess } from "@/lib/VendorContext";

export default function VendorPortalGate({ onUnlock }) {
  const { hasVendorAccess, isLoading, error } = useVendorAccess();

  useEffect(() => {
    if (hasVendorAccess) onUnlock?.();
  }, [hasVendorAccess, onUnlock]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-[#2C4F4E]">
        <Loader2 className="h-5 w-5 animate-spin" /> Checking vendor access...
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center font-semibold text-amber-700">Unable to verify vendor access</div>;
  }

  if (!hasVendorAccess) {
    return <div className="p-6 text-center font-semibold text-slate-700">No vendor access found.</div>;
  }

  return null;
}