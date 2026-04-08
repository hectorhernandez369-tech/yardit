import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JTHPreviewSummary({ settings, draftGlobals, overrides, promotions, badges, hasPendingChanges }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview / Publish Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4 bg-slate-50 space-y-2">
          <h3 className="font-semibold">Current published JTH state</h3>
          <p className="text-sm text-slate-600">Status: {settings?.published_master_toggle ? "On" : "Off"}</p>
          <p className="text-sm text-slate-600">Last published: {settings?.last_published_at ? new Date(settings.last_published_at).toLocaleString() : "Never"}</p>
          <p className="text-sm text-slate-600">Published defaults use cooldown {settings?.published_global_defaults?.coin_cooldown_days_default ?? "—"} day(s).</p>
        </div>
        <div className="rounded-xl border p-4 bg-slate-50 space-y-2">
          <h3 className="font-semibold">Current draft state</h3>
          <p className="text-sm text-slate-600">Draft changes pending: {hasPendingChanges ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-600">Draft cooldown: {draftGlobals.coin_cooldown_days_default} day(s)</p>
          <p className="text-sm text-slate-600">Draft grid size: {draftGlobals.grid_size_default} mile(s)</p>
        </div>
        <div className="rounded-xl border p-4 bg-slate-50 space-y-2">
          <h3 className="font-semibold">What changes when you publish</h3>
          <p className="text-sm text-slate-600">Overrides affected: {overrides.length}</p>
          <p className="text-sm text-slate-600">Active promotions: {promotions.filter((p) => p.active).length}</p>
          <p className="text-sm text-slate-600">Badge settings: {badges.filter((b) => b.active).length} active ranks</p>
        </div>
        <div className="rounded-xl border p-4 bg-slate-50 space-y-2">
          <h3 className="font-semibold">Affected locations</h3>
          <p className="text-sm text-slate-600">{overrides.length === 0 ? "Global defaults only" : overrides.map((item) => `${item.location_type}: ${item.location_value}`).join(", ")}</p>
        </div>
      </CardContent>
    </Card>
  );
}