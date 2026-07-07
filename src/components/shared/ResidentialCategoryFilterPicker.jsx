import React, { useState } from "react";
import { Check } from "lucide-react";
import { RESIDENTIAL_CATEGORY_GROUPS } from "@/lib/residentialCategories";

export default function ResidentialCategoryFilterPicker({ selectedCategories = [], onChange }) {
  const [expandedLabel, setExpandedLabel] = useState(null);
  const expandedGroup = RESIDENTIAL_CATEGORY_GROUPS.find((group) => group.label === expandedLabel);

  const replaceGroupSelection = (group, nextChildren) => {
    const remaining = selectedCategories.filter((cat) => !group.children.includes(cat));
    onChange([...remaining, ...nextChildren]);
  };

  const handleParentClick = (group) => {
    const allSelected = group.children.every((cat) => selectedCategories.includes(cat));
    setExpandedLabel(group.label);
    replaceGroupSelection(group, allSelected ? [] : group.children);
  };

  const handleChildClick = (group, child) => {
    const groupSelected = selectedCategories.filter((cat) => group.children.includes(cat));
    replaceGroupSelection(group, groupSelected.length === 1 && groupSelected[0] === child ? [] : [child]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RESIDENTIAL_CATEGORY_GROUPS.map((group) => {
          const selectedCount = group.children.filter((cat) => selectedCategories.includes(cat)).length;
          const active = selectedCount === group.children.length;
          const partial = selectedCount > 0 && !active;
          return (
            <button type="button" key={group.label} onClick={() => handleParentClick(group)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active ? "bg-slate-900 text-white border-slate-900 shadow-sm" : partial ? "bg-[#e6f3f4] text-[#006168] border-[#b3d9db]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
              {(active || partial) && "✓ "}{group.label}
            </button>
          );
        })}
      </div>

      {expandedGroup && (
        <div className="rounded-2xl border border-[#b3d9db] bg-[#e6f3f4]/50 p-3 shadow-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#006168]">{expandedGroup.label}</p>
          <div className="flex flex-wrap gap-2">
            {expandedGroup.children.map((child) => {
              const active = selectedCategories.includes(child);
              return (
                <button type="button" key={child} onClick={() => handleChildClick(expandedGroup, child)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${active ? "border-[#006168] bg-[#006168] text-white" : "border-white bg-white text-slate-600 hover:border-[#b3d9db]"}`}>
                  {active && <Check className="h-3 w-3" />}{child}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}