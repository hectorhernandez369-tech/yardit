import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MapPin, ShoppingBag, Users, Calendar } from "lucide-react";

const CATEGORIES = [
  "Household Items", "Furniture", "Clothing & Accessories",
  "Electronics", "Tools & Hardware", "Toys & Games",
  "Baby & Kids", "Outdoor & Garden", "Sports Equipment",
  "Collectibles", "Antiques & Vintage", "Vehicles & Auto Parts",
  "Free Items", "Food / Baked Goods", "Books & Media", "Miscellaneous"
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Listings", icon: MapPin, color: "bg-slate-600" },
  { value: "yard_sale", label: "Yard Sales", icon: ShoppingBag, color: "bg-amber-500" },
  { value: "neighborhood_sale", label: "Neighborhood", icon: Users, color: "bg-emerald-500" },
  { value: "event", label: "Events", icon: Calendar, color: "bg-[#006168]" },
];

export default function MapFilterModal({ open, onOpenChange, filter, onFilterChange, selectedCategories, onCategoriesChange, stats }) {
  const hasActiveFilters = filter !== "all" || selectedCategories.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900">Search Filters</DialogTitle>
            {hasActiveFilters && (
              <p className="text-xs text-[#006168] mt-0.5 font-medium">
                {[
                  filter !== "all" ? "1 type" : "",
                  selectedCategories.length > 0 ? `${selectedCategories.length} categor${selectedCategories.length === 1 ? "y" : "ies"}` : ""
                ].filter(Boolean).join(" · ")} active
              </p>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { onFilterChange("all"); onCategoriesChange([]); }}
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50"
            >
              Reset all
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Listing Type */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listing Type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(({ value: v, label, icon: Icon, color }) => {
                const isActive = filter === v;
                const count = v === "all" ? stats.total : v === "yard_sale" ? stats.yard_sale : v === "neighborhood_sale" ? stats.neighborhood_sale : stats.event;
                return (
                  <button
                    key={v}
                    onClick={() => onFilterChange(v)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all duration-150 ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-md"
                        : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? color : "bg-slate-200"}`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-none truncate ${isActive ? "text-white" : "text-slate-700"}`}>{label}</p>
                      <p className={`text-[10px] mt-0.5 ${isActive ? "text-slate-300" : "text-slate-400"}`}>{count} listing{count !== 1 ? "s" : ""}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categories</p>
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => onCategoriesChange([])}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear ({selectedCategories.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      if (isSelected) {
                        onCategoriesChange(selectedCategories.filter(c => c !== cat));
                      } else {
                        onCategoriesChange([...selectedCategories, cat]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && "✓ "}{cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60">
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