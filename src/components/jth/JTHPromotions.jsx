import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function PromotionCard({ item, index, onChange, onDelete }) {
  const setField = (key, value) => onChange(index, { ...item, [key]: value });
  const setBand = (key, value) => onChange(index, { ...item, override_probability_bands: { ...item.override_probability_bands, [key]: Number(value) } });
  const setMix = (key, value) => onChange(index, { ...item, override_coin_value_mix: { ...item.override_coin_value_mix, [key]: Number(value) } });

  return (
    <div className="rounded-xl border p-4 bg-slate-50 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Switch checked={item.active} onCheckedChange={(checked) => setField("active", checked)} />
          <div>
            <p className="font-semibold">{item.name || `Promotion #${index + 1}`}</p>
            <p className="text-xs text-slate-500">Published promotions can temporarily override normal JTH rules for a place and time range.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onDelete(index)}>Delete</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2"><Label>Promotion name</Label><Input value={item.name} onChange={(e) => setField("name", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Scope type</Label>
          <Select value={item.scope_type} onValueChange={(value) => setField("scope_type", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="county">County</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Scope selector</Label><Input value={item.scope_value || ""} onChange={(e) => setField("scope_value", e.target.value)} placeholder="Leave blank for All" /></div>
        <div className="space-y-2 h-10 px-3 rounded-md border flex items-center justify-between mt-7"><span className="text-sm">All eligible listings get coins</span><Switch checked={item.all_eligible_listings_get_coins} onCheckedChange={(checked) => setField("all_eligible_listings_get_coins", checked)} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Start date/time</Label><Input type="datetime-local" value={item.start_date_time || ""} onChange={(e) => setField("start_date_time", e.target.value)} /></div>
        <div className="space-y-2"><Label>End date/time</Label><Input type="datetime-local" value={item.end_date_time || ""} onChange={(e) => setField("end_date_time", e.target.value)} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2"><Label>1–5 listings</Label><Input type="number" value={item.override_probability_bands.band_1_5} onChange={(e) => setBand("band_1_5", e.target.value)} /></div>
        <div className="space-y-2"><Label>6–25 listings</Label><Input type="number" value={item.override_probability_bands.band_6_25} onChange={(e) => setBand("band_6_25", e.target.value)} /></div>
        <div className="space-y-2"><Label>26–150 listings</Label><Input type="number" value={item.override_probability_bands.band_26_150} onChange={(e) => setBand("band_26_150", e.target.value)} /></div>
        <div className="space-y-2"><Label>150+ listings</Label><Input type="number" value={item.override_probability_bands.band_150_plus} onChange={(e) => setBand("band_150_plus", e.target.value)} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>% worth 1 coin</Label><Input type="number" value={item.override_coin_value_mix.one_coin} onChange={(e) => setMix("one_coin", e.target.value)} /></div>
        <div className="space-y-2"><Label>% worth 2 coins</Label><Input type="number" value={item.override_coin_value_mix.two_coin} onChange={(e) => setMix("two_coin", e.target.value)} /></div>
        <div className="space-y-2"><Label>% worth 5 coins</Label><Input type="number" value={item.override_coin_value_mix.five_coin} onChange={(e) => setMix("five_coin", e.target.value)} /></div>
      </div>

      <div className="space-y-2"><Label>Notes</Label><Textarea value={item.notes || ""} onChange={(e) => setField("notes", e.target.value)} /></div>
    </div>
  );
}

export default function JTHPromotions({ promotions, setPromotions, template }) {
  const updateItem = (index, next) => setPromotions((prev) => prev.map((item, i) => i === index ? next : item));
  const deleteItem = (index) => setPromotions((prev) => prev.filter((_, i) => i !== index));
  const addItem = () => setPromotions((prev) => [...prev, template()]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Promotions</CardTitle>
        <Button variant="outline" onClick={addItem}>Add Promotion</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {promotions.length === 0 ? <p className="text-sm text-slate-500">No promotions yet. Use this for city, county, state, or all-area gold rush events.</p> : null}
        {promotions.map((item, index) => (
          <PromotionCard key={item.published_group_id || index} item={item} index={index} onChange={updateItem} onDelete={deleteItem} />
        ))}
      </CardContent>
    </Card>
  );
}