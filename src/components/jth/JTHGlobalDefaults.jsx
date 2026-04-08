import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function NumberField({ label, value, onChange, help }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {help ? <p className="text-xs text-slate-500">{help}</p> : null}
    </div>
  );
}

export default function JTHGlobalDefaults({ draftToggle, values, setValues, mixError }) {
  const update = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const updateBand = (key, value) => setValues((prev) => ({ ...prev, probability_bands: { ...prev.probability_bands, [key]: value } }));
  const updateMix = (key, value) => setValues((prev) => ({ ...prev, coin_value_mix: { ...prev.coin_value_mix, [key]: value } }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Defaults</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>JTH Enabled</Label>
            <div className="h-10 px-3 rounded-md border bg-slate-50 flex items-center text-sm">{draftToggle ? "On" : "Off"}</div>
          </div>
          <NumberField label="Coin cooldown days default" value={values.coin_cooldown_days_default} onChange={(v) => update("coin_cooldown_days_default", v)} />
          <NumberField label="Grid size default (miles)" value={values.grid_size_default} onChange={(v) => update("grid_size_default", v)} help="Defaults to 5 miles and can be adjusted later." />
          <div className="space-y-2">
            <Label>Lost flow enabled</Label>
            <div className="h-10 px-3 rounded-md border flex items-center justify-between">
              <span className="text-sm text-slate-600">Allow lost flow</span>
              <Switch checked={values.lost_flow_enabled} onCheckedChange={(checked) => update("lost_flow_enabled", checked)} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Default probability bands by active listing count</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <NumberField label="1–5 listings" value={values.probability_bands.band_1_5} onChange={(v) => updateBand("band_1_5", v)} />
            <NumberField label="6–25 listings" value={values.probability_bands.band_6_25} onChange={(v) => updateBand("band_6_25", v)} />
            <NumberField label="26–150 listings" value={values.probability_bands.band_26_150} onChange={(v) => updateBand("band_26_150", v)} />
            <NumberField label="150+ listings" value={values.probability_bands.band_150_plus} onChange={(v) => updateBand("band_150_plus", v)} />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Default coin value mix</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="% worth 1 coin" value={values.coin_value_mix.one_coin} onChange={(v) => updateMix("one_coin", v)} />
            <NumberField label="% worth 2 coins" value={values.coin_value_mix.two_coin} onChange={(v) => updateMix("two_coin", v)} />
            <NumberField label="% worth 5 coins" value={values.coin_value_mix.five_coin} onChange={(v) => updateMix("five_coin", v)} />
          </div>
          {mixError ? <p className="text-sm text-red-600 mt-2">Coin value mix must total 100% so admins can clearly control what hunters receive.</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField label="Default minimum coin floor per grid" value={values.minimum_coin_floor_per_grid} onChange={(v) => update("minimum_coin_floor_per_grid", v)} />
          <NumberField label="Default maximum coin cap per grid" value={values.maximum_coin_cap_per_grid} onChange={(v) => update("maximum_coin_cap_per_grid", v)} />
          <NumberField label="Default arrival proximity in feet" value={values.arrival_proximity_feet} onChange={(v) => update("arrival_proximity_feet", v)} />
          <NumberField label="Default dwell time in seconds" value={values.dwell_time_seconds} onChange={(v) => update("dwell_time_seconds", v)} />
        </div>
      </CardContent>
    </Card>
  );
}