import React, {useState} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HolidayLightRating({locationId, displayActive=true, compact=false, onSaved=()=>{}}) {
  const { user, isAuthenticated } = useAuth();
  const [hover, setHover] = useState(0);
  const client = useQueryClient();
  const ratingQuery = useQuery({
    queryKey: ['christmasVote', locationId, user?.id],
    enabled: !!locationId && !!user?.id,
    queryFn: async () => (await base44.functions.invoke('manageChristmasRating', {action:'read', location_id:locationId})).data,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (value = 0) => (await base44.functions.invoke('manageChristmasRating', {action:'rate', location_id:locationId, rating:value})).data,
    onSuccess: data => {
      client.setQueryData(['christmasVote', locationId, user?.id], data);
      client.invalidateQueries({queryKey:['holidayLeaderboardLocations']});
      client.invalidateQueries({queryKey:['holidayLights']});
      client.invalidateQueries({queryKey:['holidayLights','map']});
      onSaved?.(data);
      toast.success('Your Christmas rating was saved.');
    },
    onError: err => toast.error(err?.message || 'Could not save your rating.'),
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
    {!isAuthenticated && <p className="mt-1 text-[10px] text-amber-100/90">Sign in to leave a rating.</p>}
    {ratingQuery.isError && isAuthenticated && <p className="mt-1 text-[10px] text-amber-100">Rating unavailable right now.</p>}
  </div>;
}
