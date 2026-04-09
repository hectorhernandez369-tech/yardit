import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import JTHPercentField from "@/components/jth/JTHPercentField";
import JTHCoinIconPicker from "@/components/jth/JTHCoinIconPicker";

function OverrideCard({ item, index, onChange, onDuplicate, onDelete }) {
  const setField = (key, value) => onChange(index, { ...item, [key]: value });
  const setBand = (key, value) => onChange(index, { ...item, probability_bands: { ...item.probability_bands, [key]: Number(value) } });
  const setMix = (key, value) => onChange(index, { ...item, coin_value_mix: { ...item.coin_value_mix, [key]: Number(value) } });

  return (
    <div className="rounded-xl border p-4 space-y-4 bg-slate-50">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={item.status === "active"} onCheckedChange={(checked) => setField("status", checked ? "active" : "inactive")} />
          <div>
            <p className="font-semibold">Override #{index + 1}</p>
            <p className="text-xs text-slate-500">Priority {item.priority} — City overrides County, County overrides State, State overrides Global.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onDuplicate(index)}>Duplicate</Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(index)}>Delete</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>Location Type</Label>
          <Select value={item.location_type} onValueChange={(value) => setField("location_type", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="county">County</SelectItem>
              <SelectItem value="state">State</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Location selector</Label>
          <Input value={item.location_value} onChange={(e) => setField("location_value", e.target.value)} placeholder="Example: Lindsay or Tulare County" />
        </div>
        <div className="space-y-2">
          <Label>Start date/time</Label>
          <Input type="datetime-local" value={item.start_date_time || ""} onChange={(e) => setField("start_date_time", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End date/time</Label>
          <Input type="datetime-local" value={item.end_date_time || ""} onChange={(e) => setField("end_date_time", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <JTHPercentField label="1–5 listings" value={item.probability_bands.band_1_5} onChange={(v) => setBand("band_1_5", v)} />
        <JTHPercentField label="6–25 listings" value={item.probability_bands.band_6_25} onChange={(v) => setBand("band_6_25", v)} />
        <JTHPercentField label="26–150 listings" value={item.probability_bands.band_26_150} onChange={(v) => setBand("band_26_150", v)} />
        <JTHPercentField label="150+ listings" value={item.probability_bands.band_150_plus} onChange={(v) => setBand("band_150_plus", v)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-2"><Label>% worth 1 coin</Label><Input type="number" value={item.coin_value_mix.one_coin} onChange={(e) => setMix("one_coin", e.target.value)} /></div>
        <div className="space-y-2"><Label>% worth 2 coins</Label><Input type="number" value={item.coin_value_mix.two_coin} onChange={(e) => setMix("two_coin", e.target.value)} /></div>
        <div className="space-y-2"><Label>% worth 5 coins</Label><Input type="number" value={item.coin_value_mix.five_coin} onChange={(e) => setMix("five_coin", e.target.value)} /></div>
        <div className="space-y-2"><Label>Minimum coin floor</Label><Input type="number" value={item.minimum_coin_floor} onChange={(e) => setField("minimum_coin_floor", Number(e.target.value))} /></div>
        <div className="space-y-2"><Label>Maximum coin cap</Label><Input type="number" value={item.maximum_coin_cap} onChange={(e) => setField("maximum_coin_cap", Number(e.target.value))} /></div>
      </div>

      <JTHCoinIconPicker
        title="Location override coin icon"
        helperText="If set, this icon replaces the global default for coin listings in this city, county, or state override."
        iconKey={item.coin_icon_key}
        imageUrl={item.coin_icon_url}
        onIconChange={(key) => setField("coin_icon_key", key) || setField("coin_icon_url", "")}
        onImageChange={(url) => setField("coin_icon_url", url)}
        onClear={() => {
          setField("coin_icon_key", "");
          setField("coin_icon_url", "");
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Cooldown override (optional)</Label>
          <Input type="number" value={item.cooldown_override_days || ""} onChange={(e) => setField("cooldown_override_days", e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={item.notes || ""} onChange={(e) => setField("notes", e.target.value)} placeholder="Explain when this override should be used." />
        </div>
      </div>
    </div>
  );
}

export default function JTHLocationOverrides({ overrides, setOverrides, template }) {
  const updateItem = (index, next) => setOverrides((prev) => prev.map((item, i) => i === index ? next : item));
  const duplicateItem = (index) => setOverrides((prev) => [...prev, { ...prev[index], published_group_id: crypto.randomUUID() }]);
  const deleteItem = (index) => setOverrides((prev) => prev.filter((_, i) => i !== index));
  const addItem = () => setOverrides((prev) => [...prev, template()]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Location Overrides</CardTitle>
        <Button onClick={addItem} variant="outline">Add Override</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {overrides.length === 0 ? <p className="text-sm text-slate-500">No location overrides yet. Add one when a city, county, or state needs different JTH behavior.</p> : null}
        {overrides.map((item, index) => (
          <OverrideCard key={item.published_group_id || index} item={item} index={index} onChange={updateItem} onDuplicate={duplicateItem} onDelete={deleteItem} />
        ))}
      </CardContent>
    </Card>
  );
}