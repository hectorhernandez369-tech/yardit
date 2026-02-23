import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useHunt } from "./HuntContext";
import { calculateTotalDistance } from "./huntUtils";

export default function HuntUIOverlay() {
  const huntContext = useHunt();
  if (!huntContext) return null;
  const { huntStops, huntMode } = huntContext;

  if (!huntMode || !huntStops || huntStops.length === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-auto">
      <Card className="bg-emerald-600 text-white border-2 border-emerald-800 shadow-xl">
        <CardContent className="p-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Stops</p>
            <p className="text-xl font-bold leading-none">{huntStops.length}</p>
          </div>
          <div className="h-8 w-px bg-emerald-500/50" />
          <div className="text-center">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Est. Dist</p>
            <p className="text-xl font-bold leading-none">
              {calculateTotalDistance(huntStops).toFixed(1)} <span className="text-sm font-normal">mi</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}