import React, { useState } from "react";
import { Coins, Gem, CircleDollarSign, Star, Trophy, Sparkles, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ICONS = [
  { key: "coins", label: "Coins", Icon: Coins },
  { key: "gem", label: "Gem", Icon: Gem },
  { key: "circle_dollar_sign", label: "Dollar Coin", Icon: CircleDollarSign },
  { key: "star", label: "Star Coin", Icon: Star },
  { key: "trophy", label: "Trophy Coin", Icon: Trophy },
  { key: "sparkles", label: "Sparkles Coin", Icon: Sparkles },
];

export function JTHCoinIconPreview({ iconKey, imageUrl, label }) {
  const selected = ICONS.find((item) => item.key === iconKey);
  const Icon = selected?.Icon || Coins;
  return (
    <div className="rounded-xl border bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-[26px] h-[26px] flex items-center justify-center rounded-md bg-white shadow-sm border overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="w-[26px] h-[26px] object-cover" />
          ) : (
            <Icon className="w-5 h-5 text-amber-500" />
          )}
        </div>
        <p className="text-sm text-slate-700">{imageUrl ? "Custom uploaded coin icon" : selected?.label || "Built-in coin icon"}</p>
      </div>
      <p className="text-xs text-slate-500">Preview uses the same base size as the Premium map icon.</p>
    </div>
  );
}

export default function JTHCoinIconPicker({ title, helperText, iconKey, imageUrl, onIconChange, onImageChange, onClear }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      onImageChange(result.file_url);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-4 rounded-xl border p-4 bg-slate-50">
      <div>
        <Label>{title}</Label>
        {helperText ? <p className="text-xs text-slate-500 mt-1">{helperText}</p> : null}
      </div>

      <JTHCoinIconPreview iconKey={iconKey} imageUrl={imageUrl} label={title} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ICONS.map(({ key, label, Icon }) => {
          const selected = iconKey === key && !imageUrl;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onIconChange(key)}
              className={`rounded-xl border p-3 flex items-center gap-2 text-left ${selected ? "border-amber-400 bg-white shadow-sm" : "border-slate-200 bg-white"}`}
            >
              <div className="w-[26px] h-[26px] rounded-md border bg-slate-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm text-slate-700">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex">
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
          <span className="inline-flex items-center gap-2 rounded-md bg-[#5DADA5] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#4A9B93]">
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload Custom Icon"}
          </span>
        </label>
        {onClear ? (
          <Button type="button" variant="outline" onClick={onClear} className="gap-2">
            <X className="w-4 h-4" /> Clear Override
          </Button>
        ) : null}
      </div>
    </div>
  );
}