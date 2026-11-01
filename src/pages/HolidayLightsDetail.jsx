import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import HolidayLightsSummary from '@/components/holiday-lights/HolidayLightsSummary';
import HolidayLightsActions from '@/components/holiday-lights/HolidayLightsActions';
import HolidayLightsNotFound from '@/components/holiday-lights/HolidayLightsNotFound';

export default function HolidayLightsDetail() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get('id');
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const query = useQuery({ queryKey: ['holidayLights', 'detail', id, user?.id], enabled: !!id,
    queryFn: async () => (await base44.functions.invoke('getPublicMapData', { holidayLightId: id })).data.location || null,
  });
  if (id && query.isPending) return <p className="p-8 text-center">Loading holiday display…</p>;
  if (query.isError) return <p role="alert" className="p-8 text-center text-destructive">Could not load this display. <button onClick={() => query.refetch()} className="underline">Retry</button></p>;
  if (!id || !query.data) return <HolidayLightsNotFound />;
  return <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6">
    <Link to="/" className="text-sm underline">Back to Map</Link>
    <HolidayLightsSummary spot={query.data} now={now} />
    <HolidayLightsActions spot={query.data} user={user} />
  </div>;
}