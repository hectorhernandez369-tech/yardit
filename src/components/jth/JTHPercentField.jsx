import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JTHPercentField({ label, value, onChange, help }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">%</span>
      </div>
      {help ? <p className="text-xs text-slate-500">{help}</p> : null}
    </div>
  );
}