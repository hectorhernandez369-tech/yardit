import React from "react";
import { cn } from "@/lib/utils";

export default function CharacterCounter({ value = "", limit }) {
  const count = String(value || "").length;
  const isWarning = limit && count >= limit * 0.9;
  const isOver = limit && count > limit;

  if (!limit) return null;

  return (
    <p className={cn(
      "text-xs font-medium text-right",
      isOver ? "text-red-600" : isWarning ? "text-amber-600" : "text-slate-500"
    )}>
      {count} / {limit}
    </p>
  );
}