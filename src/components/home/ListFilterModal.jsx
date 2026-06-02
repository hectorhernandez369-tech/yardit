import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Users, Calendar, Check } from "lucide-react";

const CATEGORIES = [
  "Household Items", "Furniture", "Clothing & Accessories",
  "Electronics", "Tools & Hardware", "Toys & Games",
  "Baby & Kids", "Outdoor & Garden", "Sports Equipment",
  "Collectibles", "Antiques & Vintage", "Vehicles & Auto Parts",
  "Free Items", "Food / Baked Goods", "Books & Media", "Miscellaneous"
];

const COLLECTIBLE_SUBTYPES = [
  "Trading Cards", "Comics", "Coins", "Stamps", "Toys", "Vinyl Records",
  "Sports Memorabilia", "Vintage Electronics", "Jewelry", "Art", "Figurines", "Other"
];

const TYPE_OPTIONS = [
  { value: "yard_sale", label: "Yard Sales", icon: ShoppingBag, color: "bg-amber-500" },
  { value: "neighborhood_sale", label: "Neighborhood Sales", icon: Users, color: "bg-emerald-500" },
  { value: "event", label: "Events", icon: Calendar, color: "bg-[#006168]" },
];

const TIER_OPTIONS = [
  { value: "premium", label: "Premium", color: "bg-amber-500" },
  { value: "featured", label: "Featured", color: "bg-purple-500" },
  { value: "free", label: "Free", color: "bg-slate-400" },
];

const DATE_OPTIONS = [
  { value: "all", label: "Any Date" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This Weekend" },
  { value: "upcoming", label: "Upcoming" },
];

const DISTANCE_OPTIONS = [
  { value: null, label: "Any Distance" },
  { value: 1, label: "1 mile" },
  { value: 3, label: "3 miles" },
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
];

export const DEFAULT_LIST_FILTERS = {
  tiers: ["premium", "featured"],
  types: [],
  categories: [],
  dateFilter: "all",
  maxDistance: null,
};

function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{children}</p>;
}

function ToggleChip({ active, onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150 ${
        active
          ? "border-slate-800 bg-slate-800 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {active && <Check className="w-3 h-3 shrink-0" />}
      {color && !active && <span className={`w-2 h-2 rounded-full ${color} inline-block shrink-0`} />}
      {children}
    </button>
  );
}

export default function ListFilterModal({ open, onOpenChange, filters, onFiltersChange, hasLocation }) {
  const f = filters || DEFAULT_LIST_FILTERS;

  function toggleTier(tier) {
    if (tier === "all") {
      onFiltersChange({ ...f, tiers: ["all"] });
      return;
    }
    const current = f.tiers.filter(t => t !== "all");
    const next = current.includes(tier) ? current.filter(t => t !== tier) : [...current, tier];
    onFiltersChange({ ...f, tiers: next.length === 0 ? ["all"] : next });
  }

  function toggleType(type) {
    const next = f.types.includes(type) ? f.types.filter(t => t !== type) : [...f.types, type];
    onFiltersChange({ ...f, types: next });
  }

  function toggleCategory(cat) {
    const next = f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat];
    onFiltersChange({ ...f, categories: next });
  }

  const isShowAll = f.tiers.includes("all") || f.tiers.length === 0;
  const showCollectiblesSubtype = f.categories.includes("Collectibles");

  const hasActiveFilters =
    !isShowAll ||
    f.types.length > 0 ||
    f.categories.length > 0 ||
    f.dateFilter !== "all" ||
    f.maxDistance != null;

  function resetAll() {
    onFiltersChange(DEFAULT_LIST_FILTERS);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900">List Filters</DialogTitle>
            {hasActiveFilters && (
              <p className="text-xs text-[#006168] mt-0.5 font-medium">Filters active</p>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetAll}
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50"
            >
              Reset all
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-5 max-h-[55vh] overflow-y-auto">

          {/* Visibility / Tier */}
          <div>
            <SectionLabel>Visibility</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleChip active={isShowAll} onClick={() => onFiltersChange({ ...f, tiers: ["all"] })}>
                View All
              </ToggleChip>
              {TIER_OPTIONS.map(({ value, label, color }) => (
                <ToggleChip
                  key={value}
                  active={!isShowAll && f.tiers.includes(value)}
                  onClick={() => toggleTier(value)}
                  color={color}
                >
                  {label}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Listing Type */}
          <div>
            <SectionLabel>Listing Type</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                <ToggleChip
                  key={value}
                  active={f.types.includes(value)}
                  onClick={() => toggleType(value)}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {label}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Date */}
          <div>
            <SectionLabel>Date</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map(({ value, label }) => (
                <ToggleChip
                  key={value}
                  active={f.dateFilter === value}
                  onClick={() => onFiltersChange({ ...f, dateFilter: value })}
                >
                  {label}
                </ToggleChip>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={/^\d{4}-\d{2}-\d{2}$/.test(f.dateFilter) ? f.dateFilter : ""}
                onChange={e => onFiltersChange({ ...f, dateFilter: e.target.value || "all" })}
                className="flex-1 h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-slate-400"
              />
              {/^\d{4}-\d{2}-\d{2}$/.test(f.dateFilter) && (
                <button
                  onClick={() => onFiltersChange({ ...f, dateFilter: "all" })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >✕</button>
              )}
            </div>
          </div>

          {/* Distance (only shown if location available) */}
          {hasLocation && (
            <>
              <div className="border-t border-slate-100" />
              <div>
                <SectionLabel>Distance</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_OPTIONS.map(({ value, label }) => (
                    <ToggleChip
                      key={String(value)}
                      active={f.maxDistance === value}
                      onClick={() => onFiltersChange({ ...f, maxDistance: value })}
                    >
                      {label}
                    </ToggleChip>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Custom miles..."
                    value={
                      f.maxDistance != null && !DISTANCE_OPTIONS.some(o => o.value === f.maxDistance)
                        ? f.maxDistance
                        : ""
                    }
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      onFiltersChange({ ...f, maxDistance: isNaN(v) || v <= 0 ? null : v });
                    }}
                    className="flex-1 h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-slate-400"
                  />
                  <span className="text-xs text-slate-400 shrink-0">mi</span>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-slate-100" />

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Categories</SectionLabel>
              {f.categories.length > 0 && (
                <button
                  onClick={() => onFiltersChange({ ...f, categories: [] })}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear ({f.categories.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <ToggleChip
                  key={cat}
                  active={f.categories.includes(cat)}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </ToggleChip>
              ))}
            </div>

            {/* Collectibles subtype */}
            {showCollectiblesSubtype && (
              <div className="mt-3 ml-1">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Collectible Type</p>
                <div className="flex flex-wrap gap-2">
                  {COLLECTIBLE_SUBTYPES.map(sub => (
                    <ToggleChip
                      key={sub}
                      active={f.categories.includes(sub)}
                      onClick={() => toggleCategory(sub)}
                    >
                      {sub}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Show Results
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}