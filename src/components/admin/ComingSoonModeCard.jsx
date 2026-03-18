import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { COMING_SOON_SETTING_KEY, isComingSoonModeEnabled } from "@/lib/comingSoonMode";

export default function ComingSoonModeCard() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSetting.list(),
    initialData: [],
  });

  const currentSetting = settings.find((setting) => setting.key === COMING_SOON_SETTING_KEY);
  const enabled = isComingSoonModeEnabled(settings);

  const toggleMutation = useMutation({
    mutationFn: async (nextValue) => {
      const value = nextValue ? "true" : "false";

      if (currentSetting) {
        await base44.entities.AppSetting.update(currentSetting.id, { value });
        return;
      }

      await base44.entities.AppSetting.create({
        key: COMING_SOON_SETTING_KEY,
        value,
      });
    },
    onSuccess: (_, nextValue) => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success(`Coming Soon Mode ${nextValue ? "enabled" : "disabled"}`);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-[#2C4F4E]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading coming soon setting...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#2C4F4E]/20">
      <CardHeader>
        <CardTitle className="text-[#2C4F4E]">Coming Soon Mode</CardTitle>
        <CardDescription>
          When enabled, public users will see the Coming Soon page instead of the normal Yardit app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#2C4F4E]/15 bg-[#F3E6CF]/60 p-4">
          <div>
            <p className="font-semibold text-[#2C4F4E]">Global app visibility</p>
            <p className="text-sm text-slate-600">Admins automatically keep access to the live Yardit app.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={!enabled ? "font-semibold text-[#2C4F4E]" : "text-slate-500"}>Off</span>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
            />
            <span className={enabled ? "font-semibold text-[#5DADA5]" : "text-slate-500"}>On</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}