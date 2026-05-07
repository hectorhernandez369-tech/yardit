import React, { useMemo, useState } from "react";
import { Minus, Plus, Users, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVendorTierConfig } from "@/lib/vendorTiers";

const ADD_ONS = {
  users: {
    title: "Additional Users",
    description: "Allow more employees or team members to manage your business account.",
    price: 5,
    unitLabel: "additional user",
    includedLabel: "Included users",
    purchasedLabel: "Extra Purchased",
    totalLabel: "Total Allowed",
    icon: Users,
  },
  pins: {
    title: "Additional Pins",
    description: "Add more active business locations or trucks.",
    price: 10,
    unitLabel: "additional pin",
    includedLabel: "Included pins",
    purchasedLabel: "Purchased pins",
    totalLabel: "Total Allowed",
    icon: MapPin,
  },
};

function AddOnCard({ config, included, quantity, onDecrease, onIncrease }) {
  const Icon = config.icon;
  const total = included + quantity;

  return (
    <Card className="rounded-2xl border-[#2C4F4E]/15 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5DADA5]/10 text-[#2C4F4E]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base text-[#2C4F4E]">{config.title}</CardTitle>
            <p className="mt-1 text-sm text-slate-600">{config.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2 sm:p-5 sm:pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F3E6CF]/60 p-3">
          <div>
            <p className="text-sm font-semibold text-[#2C4F4E]">${config.price}/month</p>
            <p className="text-xs text-slate-600">per {config.unitLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={onDecrease} disabled={quantity <= 0}>
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex h-9 min-w-12 items-center justify-center rounded-full border bg-white px-4 text-sm font-bold text-[#2C4F4E]">
              {quantity}
            </div>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={onIncrease}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <p className="text-slate-500">{config.includedLabel}</p>
            <p className="mt-1 font-bold text-[#2C4F4E]">{included}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <p className="text-slate-500">{config.purchasedLabel}</p>
            <p className="mt-1 font-bold text-[#2C4F4E]">{quantity}</p>
          </div>
          <div className="rounded-xl border border-[#F4A849]/40 bg-[#FFF7E8] p-2">
            <p className="text-slate-500">{config.totalLabel}</p>
            <p className="mt-1 font-bold text-[#2C4F4E]">{total}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorAddOnsSection({ account }) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const basePrice = Number((tier.price || "$0").replace(/[^0-9.]/g, "")) || 0;
  const [extraUsers, setExtraUsers] = useState(Number(account?.extra_users_count || 0));
  const [extraPins, setExtraPins] = useState(Number(account?.extra_pins_count || 0));

  const totals = useMemo(() => {
    const usersCost = extraUsers * ADD_ONS.users.price;
    const pinsCost = extraPins * ADD_ONS.pins.price;
    return {
      usersCost,
      pinsCost,
      estimatedTotal: basePrice + usersCost + pinsCost,
    };
  }, [basePrice, extraUsers, extraPins]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#5DADA5]">Add-Ons</p>
          <h3 className="text-xl font-bold text-[#2C4F4E]">Scale your vendor account</h3>
          <p className="text-sm text-slate-600">Adjust add-ons for future billing setup. No subscription changes are made yet.</p>
        </div>
        <Badge variant="outline" className="rounded-full border-[#2C4F4E]/20 bg-white px-3 py-1 text-[#2C4F4E]">Foundation only</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AddOnCard
          config={ADD_ONS.users}
          included={tier.includedUsers}
          quantity={extraUsers}
          onDecrease={() => setExtraUsers((count) => Math.max(0, count - 1))}
          onIncrease={() => setExtraUsers((count) => count + 1)}
        />
        <AddOnCard
          config={ADD_ONS.pins}
          included={tier.includedPins}
          quantity={extraPins}
          onDecrease={() => setExtraPins((count) => Math.max(0, count - 1))}
          onIncrease={() => setExtraPins((count) => count + 1)}
        />
      </div>

      <Card className="rounded-2xl border-[#F4A849]/50 bg-[#FFF7E8] shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-bold text-[#2C4F4E]">Estimated Monthly Total</p>
              <p>{tier.label} Tier: ${basePrice.toFixed(2)}</p>
              <p>+ Users: ${totals.usersCost.toFixed(2)}</p>
              <p>+ Pins: ${totals.pinsCost.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm md:min-w-48">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated Total</p>
              <p className="mt-1 text-2xl font-bold text-[#2C4F4E]">${totals.estimatedTotal.toFixed(2)}</p>
              <p className="text-sm text-slate-600">/month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}