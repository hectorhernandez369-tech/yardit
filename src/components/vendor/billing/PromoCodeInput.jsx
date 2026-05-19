import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, X, Tag, Loader2 } from "lucide-react";

function discountDisplay(promo) {
  if (promo.discount_type === "percentage") return `${promo.discount_value}% off`;
  if (promo.discount_type === "fixed_amount") return `$${Number(promo.discount_value).toFixed(2)} off`;
  if (promo.discount_type === "free_trial") return `${promo.discount_value} days free`;
  return promo.description || "Custom discount";
}

export default function PromoCodeInput({ tier, onPromoApplied, onPromoRemoved, appliedPromo }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("validateVendorPromoCode", { code: trimmed, tier });
      if (res.data?.valid) {
        onPromoApplied(res.data.promo);
        setCode("");
      } else {
        setError(res.data?.error || "Invalid promo code.");
      }
    } catch {
      setError("Could not validate code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onPromoRemoved();
    setCode("");
    setError("");
  };

  // Applied state
  if (appliedPromo) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Promo Applied</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <div>
              <span className="font-mono font-bold text-green-800 text-sm">{appliedPromo.code}</span>
              <span className="text-xs text-green-700 ml-2">— {discountDisplay(appliedPromo)}</span>
              {appliedPromo.promo_name && (
                <p className="text-[11px] text-green-600 mt-0.5">{appliedPromo.promo_name}</p>
              )}
            </div>
          </div>
          <button onClick={handleRemove} className="p-1 rounded hover:bg-green-100 text-green-600 shrink-0" title="Remove promo">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Input state
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
        <Tag className="w-3 h-3" /> Promo Code
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter code"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleApply()}
          className="font-mono uppercase text-sm h-9"
          disabled={loading}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="h-9 shrink-0 border-[#5DADA5] text-[#2C4F4E] hover:bg-[#5DADA5]/10"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}