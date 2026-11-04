import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import HolidayLightsSummary from '@/components/holiday-lights/HolidayLightsSummary';
import HolidayLightsActions from '@/components/holiday-lights/HolidayLightsActions';
import HolidayLightsNotFound from '@/components/holiday-lights/HolidayLightsNotFound';
import HolidayDetailSnow from '@/components/holiday-lights/HolidayDetailSnow';

export default function HolidayLightsDetail() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get('id');
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const query = useQuery({ queryKey: ['holidayLights', 'detail', id, user?.id], enabled: !!id && user?.email?.toLowerCase() === 'hectorhernandez369@gmail.com', 
    queryFn: async () => (await base44.functions.invoke('getPublicMapData', { holidayLightId: id })).data.location || null,
  });
  if (user?.email?.toLowerCase() !== 'hectorhernandez369@gmail.com') return <div className="mx-auto max-w-lg p-8 text-center"><h1 className="text-2xl font-bold">Christmas Displays Coming Soon</h1><p>Displays aren't available yet.</p><Link to="/">Back to map</Link></div>;
  if (id && query.isPending) return <p className="p-8 text-center">Loading holiday display…</p>;
  if (query.isError) return <p role="alert" className="p-8 text-center text-destructive">Could not load this display. <button onClick={() => query.refetch()} className="underline">Retry</button></p>;
  if (!id || !query.data) return <HolidayLightsNotFound />;
  return <div className="relative isolate min-h-screen bg-gradient-to-br from-christmas-red via-christmas-green to-christmas-red px-3 pb-28 pt-4 sm:px-5 sm:pb-10 sm:pt-6">
    <HolidayDetailSnow />
    <div className="relative mx-auto w-full max-w-5xl space-y-5">
      <Link to="/" className="inline-flex rounded-lg border border-amber-300/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white">← Back to Map</Link>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(270px,0.8fr)] lg:gap-5">
        <HolidayLightsSummary spot={query.data} now={now} />
        <HolidayLightsActions spot={query.data} user={user} />
      </div>
    </div>
  </div>;
}