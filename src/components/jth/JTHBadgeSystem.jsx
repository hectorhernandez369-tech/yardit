import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function JTHBadgeSystem({ badges, setBadges }) {
  const updateBadge = (index, patch) => setBadges((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge / Rank System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {badges.map((badge, index) => (
          <div key={badge.published_group_id || badge.rank_name || index} className="rounded-xl border p-4 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{badge.rank_name}</p>
                <p className="text-xs text-slate-500">Lifetime coins unlock this rank permanently. Rolling 60-day coins maintain it.</p>
              </div>
              <Switch checked={badge.active} onCheckedChange={(checked) => updateBadge(index, { active: checked })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2 xl:col-span-2">
                <Label>Rank name</Label>
                <Input value={badge.rank_name} onChange={(e) => updateBadge(index, { rank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={badge.sort_order} onChange={(e) => updateBadge(index, { sort_order: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Lifetime coin requirement</Label>
                <Input type="number" value={badge.lifetime_unlock_total} onChange={(e) => updateBadge(index, { lifetime_unlock_total: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>60-day maintenance</Label>
                <Input type="number" value={badge.maintenance_60_day_total} onChange={(e) => updateBadge(index, { maintenance_60_day_total: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Badge asset reference</Label>
                <Input value={badge.badge_asset || ""} onChange={(e) => updateBadge(index, { badge_asset: e.target.value })} placeholder="Image URL or asset name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={badge.description || ""} onChange={(e) => updateBadge(index, { description: e.target.value })} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}