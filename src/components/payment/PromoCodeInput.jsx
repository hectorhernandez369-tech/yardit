import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2, Tag } from "lucide-react";

/**
 * PromoCodeInput — self-contained promo code field for the residential checkout.
 * Props:
 *   userId, listingLocation ({ state, county, city, town, zip }), selectedTier, listingPriceCents
 *   onPromoApplied(promoResult | null)  — called whenever promo state changes
 */
export default function PromoCodeInput({ userId, listingLocation, selectedTier, listingPriceCents, onPromoApplied }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { valid, reason, discountPercent, discountAmount, finalAmount, discountBucket, promoCode }

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("validateResidentialPromoCode", {
        code: code.trim().toUpperCase(),
        user_id: userId || "",
        listing_location: listingLocation || {},
        selected_tier: selectedTier || "",
        listing_price_cents: listingPriceCents || 0,
      });
      const data = res?.data || {};
      setResult(data);
      if (data.valid) {
        onPromoApplied?.(data);
      } else {
        onPromoApplied?.(null);
      }
    } catch (err) {
      const errResult = { valid: false, reason: err?.response?.data?.reason || err?.message || "Unable to validate promo code." };
      setResult(errResult);
      onPromoApplied?.(null);
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    setCode("");
    setResult(null);
    onPromoApplied?.(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-[#006168] shrink-0" />
        <span className="text-sm font-medium text-slate-700">Promo Code</span>
      </div>

      {result?.valid ? (
        // Applied state
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-green-800 font-mono">{result.promoCode?.code || code}</div>
            <div className="text-xs text-green-700">{result.discountPercent}% off applied</div>
          </div>
          <Button size="sm" variant="ghost" onClick={remove} className="text-green-600 hover:text-red-500 hover:bg-transparent p-1">
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        // Input state
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }}
            onKeyDown={e => e.key === "Enter" && apply()}
            placeholder="Enter promo code"
            className="font-mono uppercase"
            disabled={loading}
          />
          <Button
            onClick={apply}
            disabled={loading || !code.trim()}
            className="shrink-0 bg-[#006168] hover:bg-[#004d52] text-white px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
      )}

      {result && !result.valid && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {result.reason}
        </div>
      )}
    </div>
  );
}