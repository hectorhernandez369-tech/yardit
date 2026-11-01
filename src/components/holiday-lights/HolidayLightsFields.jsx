import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function HolidayLightsFields({ form, setForm }) {
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  return <div className="space-y-5">
    <div className="space-y-2"><Label htmlFor="lights-title">Display name</Label><Input id="lights-title" required maxLength={120} placeholder="e.g., Winter Wonderland on Maple Street" value={form.title} onChange={e => change('title', e.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="lights-description">What can visitors expect?</Label><Textarea id="lights-description" rows={4} maxLength={3000} placeholder="Describe the decorations, music, walking areas, parking, or other visitor notes." value={form.description} onChange={e => change('description', e.target.value)} /></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label htmlFor="lights-start">First night</Label><Input id="lights-start" type="date" required value={form.start} onChange={e => change('start', e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="lights-end">Last night</Label><Input id="lights-end" type="date" required min={form.start} value={form.end} onChange={e => change('end', e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="lights-open">Lights on</Label><Input id="lights-open" type="time" required value={form.viewing_start_time} onChange={e => change('viewing_start_time', e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="lights-close">Lights off</Label><Input id="lights-close" type="time" required value={form.viewing_end_time} onChange={e => change('viewing_end_time', e.target.value)} /></div>
    </div>
    <p className="text-sm text-muted-foreground">Times follow the display’s location. Displays appear November 1 through January 2, including Coming Soon before their first night.</p>
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><Label htmlFor="lights-enabled">Display is running</Label><p className="text-xs text-muted-foreground">Turn off for weather or a night off without removing your listing.</p></div><Switch id="lights-enabled" checked={form.display_active} onCheckedChange={value => change('display_active', value)} /></div>
  </div>;
}