import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { validateResidentialPromoCode } from "@/lib/residentialPromoValidation";

export default function PromoCodeInput({ user, listing, selectedTier, listingPrice, onPromoApplied, initialCode = "" }) {
  const [code, setCode] = useState(initialCode || "");
  const [status, setStatus] = useState(null); // null | "loading" | "valid" | "invalid"
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const autoAppliedRef = useRef(false);

  const handleApply = async (displayAppliedMessage = false, overrideCode = "") => {
    const activeCode = overrideCode || code;
    if (!activeCode.trim()) return;
    setStatus("loading");
    setResult(null);

    const listingLocation = {
      state: listing?.state,
      county: listing?.county,
      city: listing?.city,
      town: listing?.town,
      zip: listing?.zip,
    };

    const res = await validateResidentialPromoCode({
      code: activeCode,
      user,
      listingLocation,
      selectedTier,
      listingPrice,
      listingLat: listing?.lat,
      listingLng: listing?.lng,
      selectedRangeStartDate: listing?.selectedRangeStartDate,
      startDateTime: listing?.startDateTime,
    });

    if (res.valid) {
      setStatus("valid");
      setMessage(displayAppliedMessage ? "Promo applied." : res.reason);
      setResult(res);
      onPromoApplied?.(res);
    } else {
      setStatus("invalid");
      setMessage(res.reason);
      setResult(null);
      onPromoApplied?.(null);
    }
  };

  useEffect(() => {
    if (!initialCode || autoAppliedRef.current || status === "valid") return;
    const normalizedInitialCode = initialCode.toUpperCase();
    setCode(normalizedInitialCode);
    autoAppliedRef.current = true;
    window.setTimeout(() => handleApply(true, normalizedInitialCode), 0);
  }, [initialCode, selectedTier, listingPrice]);

  const handleClear = () => {
    setCode("");
    setStatus(null);
    setMessage("");
    setResult(null);
    onPromoApplied?.(null);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-[#5DADA5]" />
        <h3 className="text-sm font-bold text-[#2C4F4E]">Promo Code</h3>
      </div>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); if (status) { setStatus(null); setMessage(""); setResult(null); onPromoApplied?.(null); } }}
          placeholder="Enter promo code"
          className="font-mono uppercase"
          disabled={status === "loading" || status === "valid"}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
        />
        {status === "valid" ? (
          <Button variant="outline" onClick={handleClear} className="shrink-0 border-slate-300 text-slate-500">
            Remove
          </Button>
        ) : (
          <Button
            onClick={() => handleApply()}
            disabled={!code.trim() || status === "loading"}
            className="shrink-0 bg-[#5DADA5] hover:bg-[#4A9B93] text-white border-2 border-[#2C4F4E]"
          >
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
          </Button>
        )}
      </div>

      {status === "valid" && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
          <p className="font-semibold">{message}</p>
        </div>
      )}

      {status === "invalid" && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}