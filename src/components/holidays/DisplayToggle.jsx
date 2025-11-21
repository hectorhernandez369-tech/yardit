import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isHolidaySeason } from "./SeasonCheck";

export default function DisplayToggle({ location, isOwner }) {
  const queryClient = useQueryClient();
  const inSeason = isHolidaySeason();

  const toggleMutation = useMutation({
    mutationFn: (active) => 
      base44.entities.Location.update(location.id, { display_active: active }),
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["userLocations"] });
      toast.success(active ? "Display is now ON!" : "Display turned OFF");
    },
  });

  if (!isOwner) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className={`w-6 h-6 ${location.display_active ? 'text-yellow-500' : 'text-gray-400'}`} />
          <div>
            <p className="font-semibold text-gray-900">
              Lights {location.display_active ? "ON" : "OFF"}
            </p>
            <p className="text-xs text-gray-600">
              {inSeason 
                ? "Controls glow effect on map" 
                : "Can only be toggled Nov 1 - Jan 2"}
            </p>
          </div>
        </div>
        
        <Switch
          checked={location.display_active}
          onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          disabled={!inSeason || toggleMutation.isPending}
        />
      </div>
      
      {!inSeason && (
        <p className="text-xs text-orange-600 mt-2">
          ⚠️ Toggle is only functional between November 1st and January 2nd.
        </p>
      )}
      
      <p className="text-xs text-blue-700 mt-2">
        ℹ️ Your display pin is always visible during the season. Toggle controls the glow effect.
      </p>
    </div>
  );
}