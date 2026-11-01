import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EventLocationPicker from '@/components/vendor/events/EventLocationPicker';

export default function HolidayLightsLocation({ form, setForm }) {
  const [open, setOpen] = useState(false);
  return <section className="space-y-3 rounded-xl border p-4">
    <h2 className="font-semibold">Where is your display?</h2>
    <p className="text-sm text-muted-foreground">The address and map pin will be public. Only post a display you own or have permission to list.</p>
    {form.address && <p className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" />{form.address}</p>}
    <Button type="button" variant="outline" onClick={() => setOpen(true)}>{form.address ? 'Change display location' : 'Choose display location'}</Button>
    <EventLocationPicker open={open} onOpenChange={setOpen} eventType="single" title="Choose Holiday Lights Location" description="Search for the display address or tap the map to place its pin." value={{ latitude: form.latitude, longitude: form.longitude, display_address: form.address }} onChange={value => setForm(prev => ({ ...prev, address: value.display_address, latitude: value.latitude, longitude: value.longitude }))} />
  </section>;
}