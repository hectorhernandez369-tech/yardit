import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";

export default function VendorPinShareButton({ pin, account, checkIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const share = async (event) => {
    event.stopPropagation();
    setError("");
    if (!isLiveVendorCheckIn(checkIn) || pin.is_active === false || account.is_active === false) {
      setError("This vendor is no longer checked in at this location.");
      return;
    }
    const url = new URL("/", window.location.origin);
    url.searchParams.set("vendorPin", pin.id);
    const businessName = account.business_name || account.vendor_display_name || "This vendor";
    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: businessName, text: `Hey! ${businessName} is currently here 📍\nFind them on Yardit: ${url.href}` });
      } else {
        await navigator.clipboard.writeText(url.href);
        toast.success("Vendor location link copied.");
      }
    } catch (failure) {
      if (failure?.name !== "AbortError") setError("Unable to share the vendor link. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (checkIn.status !== "live") return null;
  return <>
    <Button size="sm" variant="outline" className="h-7 w-full gap-1.5 px-2 text-[11px]" onClick={share} disabled={busy}>
      <Share2 className="h-3 w-3" />{busy ? "Sharing…" : "Share"}
    </Button>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </>;
}