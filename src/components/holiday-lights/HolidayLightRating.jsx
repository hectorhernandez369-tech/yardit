import React, {useState} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PREVIEW_EMAIL = 'hectorhernandez369@gmail.com';
function getFreshPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location services are unavailable. Enable precise location to vote.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({coords, timestamp}) => resolve({
        latitude: coords.latitude, longitude: coords.longitude,
        accuracy_meters: coords.accuracy, sampled_at: timestamp,
      }),
      () => reject(new Error('Enable precise location in your phone settings to rate this home.')),
      {enableHighAccuracy: true, maximumAge: 0, timeout: 15000}
    );
  });
}

export default function HolidayLightRating({locationId, displayActive=true, compact=false, onSaved=()=>{}}) {
  const { user, isAuthenticated } = useAuth();
  const [hover, setHover] = useState(0);
  const [locationMessage, setLocationMessage] = useState('');
  const client = useQueryClient();
  const ratingQuery = useQuery({
    queryKey: ['christmasVote', locationId, user?.id],
    enabled: !!locationId && !!user?.id,
    queryFn: async () => (await base44.functions.invoke('manageChristmasRating', {action:'read', location_id:locationId})).data,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (value = 0) => {
      const exempt = String(user?.email || '').trim().toLowerCase() === PREVIEW_EMAIL;
      setLocationMessage(exempt ? 'Saving rating…' : 'Checking your location…');
      const geo = exempt ? null : await getFreshPosition();
      setLocationMessage('Saving rating…');
      return (await base44.functions.invoke('manageChristmasRating',
        {action:'rate', location_id:locationId, rating:value, ...(geo ? {geo} : {})})).data;
    },
    onSuccess: data => {
      client.setQueryData(['christmasVote', locationId, user?.id], data);
      client.invalidateQueries({queryKey:['holidayLeaderboardLocations']});
      client.invalidateQueries({queryKey:['holidayLights']});
      client.invalidateQueries({queryKey:['holidayLights','map']});
      onSaved?.(data);
      setLocationMessage('');
      toast.success('Your Christmas rating was saved.');
    },
    onError: err => {
      setLocationMessage('');
      toast.error(err?.response?.data?.error || err?.message || 'Could not save your rating.');
    },
  });
  const saved = Number(ratingQuery.data?.my_rating || 0);
  const selected = hover || saved;
  return <div className={'rounded-xl border border-amber-300/35 bg-[#123f30] text-white '+(compact?'px-2 py-2':'p-3')}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold">{saved ? 'Your rating (tap to change)' : 'Rate this display'}</span>
      {ratingQuery.isLoading && isAuthenticated && <Loader2 size={13} className="animate-spin" />}
    </div>
    <div role="group" aria-label="Rate this Christmas display one to five stars" className="mt-1 flex items-center gap-1">
      {[1,2,3,4,5].map(value=><button key={value} type="button"
        aria-label={value+' star'+(value===1?'':'s')} aria-pressed={saved===value}
        title={!isAuthenticated?'Sign in to rate':value+' stars'}
        disabled={!displayActive || !isAuthenticated || ratingQuery.isLoading || mutation.isPending}
        onClick={e=>{e.stopPropagation();mutation.mutate(value);}}
        onMouseEnter={()=>setHover(value)} onMouseLeave={()=>setHover(0)}
        className="flex min-h-8 min-w-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-70"
      ><Star size={compact?20:25} className={value<=selected?'fill-amber-400 text-amber-400':'fill-transparent text-amber-200/70'}/></button>)}
      {mutation.isPending && <Loader2 size={15} className="animate-spin text-amber-200"/>}
    </div>
    {locationMessage && <p className="mt-1 text-[10px] text-amber-100" role="status">{locationMessage}</p>}
    {isAuthenticated && user?.email?.toLowerCase() !== PREVIEW_EMAIL && <p className="mt-1 text-[10px] text-amber-100/90">Vote while within 150 feet of this home. Precise location required.</p>}
    {!isAuthenticated && <p className="mt-1 text-[10px] text-amber-100/90">Sign in to leave a rating.</p>}
    {ratingQuery.isError && isAuthenticated && <p className="mt-1 text-[10px] text-amber-100">Rating unavailable right now.</p>}
  </div>;
}
