import React from 'react';
import { Lock, MapPin } from 'lucide-react';
import AddressReviewMap from '@/components/create/AddressReviewMap';

export default function HolidayLightsLocation({ form }) {
  return <section className="space-y-3 rounded-xl border p-4">
    <h2 className="font-semibold">Verified display location</h2>
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4 shrink-0" />Uses your verified primary address from your profile.</p>
    {form.address && <p className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" />{form.address}</p>}
    <AddressReviewMap lat={form.latitude} lng={form.longitude} />
    <p className="text-sm text-muted-foreground">This address and map pin will be public. To change your verified address, update it in your profile.</p>
  </section>;
}