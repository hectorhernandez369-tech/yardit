import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Users, MapPin, ArrowRight } from "lucide-react";
import { getVendorTierConfig } from "@/lib/vendorTiers";

const ADD_ONS = {
  users: {
    title: "Additional Users",
    description: "Allow more team members to manage your vendor account.",
    price: 5,
    unitLabel: "user",
    includedLabel: "Included",
    icon: Users,
  },
  pins: {
    title: "Additional Pins",
    description: "Add more active truck or location pins.",
    price: 10,
    unitLabel: "pin",
    includedLabel: "Included",
    icon: MapPin,
  },
};

function AddOnRow({ config, included, quantity, onDecrease, onIncrease }) {
  const Icon = config.icon;
  return (
    <div className="rounded-2xl border border-[#2C4F4E]/15 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5DADA5]/10 text-[#2C4F4E]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2C4F4E]">{config.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
        </div>
        <p className="text-sm font-bold text-[#2C4F4E] shrink-0">${config.price}<span className="text-xs font-normal text-slate-500">/mo each</span></p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-xs text-slate-500">{config.includedLabel}: <strong className="text-slate-700">{included}</strong></p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={onDecrease} disabled={quantity <= 0}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-bold text-[#2C4F4E]">{quantity}</span>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={onIncrease}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 text-right">
          Total: <strong className="text-slate-700">{included + quantity}</strong>
        </p>
      </div>
    </div>
  );
}

export default function UpgradeAddOnsStep({ targetTierKey, onBack, onContinue }) {
  const tier = getVendorTierConfig(targetTierKey);
  const basePrice = Number(String(tier?.price || "0").replace(/[^0-9.]/g, "")) || 0;

  const [extraUsers, setExtraUsers] = useState(0);
  const [extraPins, setExtraPins] = useState(0);

  const totals = useMemo(() => {
    const usersCost = extraUsers * ADD_ONS.users.price;
    const pinsCost = extraPins * ADD_ONS.pins.price;
    return { usersCost, pinsCost, total: basePrice + usersCost + pinsCost };
  }, [basePrice, extraUsers, extraPins]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#5DADA5] to-[#2C4F4E] p-5 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Customize Your Plan</p>
        <h2 className="text-xl font-bold">{tier?.label} — Add-Ons</h2>
        <p className="text-sm text-white/75 mt-1">
          Optionally add extra users or pins before checkout. You can always adjust these later.
        </p>
      </div>

      {/* Add-on cards */}
      <div className="space-y-3">
        <AddOnRow
          config={ADD_ONS.users}
          included={tier.includedUsers}
          quantity={extraUsers}
          onDecrease={() => setExtraUsers((v) => Math.max(0, v - 1))}
          onIncrease={() => setExtraUsers((v) => v + 1)}
        />
        <AddOnRow
          config={ADD_ONS.pins}
          included={tier.includedPins}
          quantity={extraPins}
          onDecrease={() => setExtraPins((v) => Math.max(0, v - 1))}
          onIncrease={() => setExtraPins((v) => v + 1)}
        />
      </div>

      {/* Monthly total */}
      <Card className="rounded-2xl border-[#F4A849]/50 bg-[#FFF7E8] shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-slate-700 space-y-0.5">
              <p className="font-semibold text-[#2C4F4E]">Estimated Monthly Total</p>
              <p className="text-xs text-slate-500">{tier.label}: ${basePrice.toFixed(2)} + Users: ${totals.usersCost.toFixed(2)} + Pins: ${totals.pinsCost.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#2C4F4E]">${totals.total.toFixed(2)}</p>
              <p className="text-xs text-slate-500">/month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-2 sm:grid-cols-2 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="border-[#2C4F4E] text-[#2C4F4E]">
          Back to Plans
        </Button>
        <Button
          type="button"
          onClick={() => onContinue({ extraUsers, extraPins })}
          className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold gap-2"
        >
          Continue to Payment Summary
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}