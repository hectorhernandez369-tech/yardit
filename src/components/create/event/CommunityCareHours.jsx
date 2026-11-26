import React from 'react';
import { SEASONAL_COMMUNITY_CARE_CATEGORIES } from '@/lib/eventListingConfig';

export default function CommunityCareHours({ formData, setFormData, children }) {
  if (formData.listingType !== 'event' || !Object.hasOwn(SEASONAL_COMMUNITY_CARE_CATEGORIES, formData.event_category)) return children;
  const allDay = formData.event_start_time === '00:00' && formData.event_end_time === '23:59';
  function changeHours(checked) {
    setFormData(prev => ({ ...prev,
      event_start_time: checked ? '00:00' : '', event_end_time: checked ? '23:59' : '',
      start_datetime: '', end_datetime: '', startDateTime: '', endDateTime: '',
    }));
  }
  return <>
    <label className="flex items-center gap-3 text-sm font-semibold">
      <input type="checkbox" checked={allDay} onChange={e => changeHours(e.target.checked)} />
      Open 24/7
    </label>
    {allDay ? <p className="text-xs text-muted-foreground">Available at any hour on the listed date(s).</p> : children}
  </>;
}