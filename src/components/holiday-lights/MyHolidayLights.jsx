import React from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { holidayLightState } from '@/lib/holidayLights';

export default function MyHolidayLights({ user }) {
  const client = useQueryClient();
  const query = useInfiniteQuery({ queryKey: ['holidayLights', 'owned', user.id], initialPageParam: null,
    queryFn: ({ pageParam }) => base44.entities.Location.filter({ type: 'holiday_lights', owner_user_id: user.id }, { sort: '-created_date', limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const mutation = useMutation({ mutationFn: ({ spot, remove, value }) => remove ? base44.entities.Location.delete(spot.id) : base44.entities.Location.update(spot.id, { display_active: value }), onSuccess: () => client.invalidateQueries({ queryKey: ['holidayLights'] }) });
  return <section className="mb-6 space-y-4 rounded-2xl border border-holiday-gold/40 bg-card p-5 text-card-foreground">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">My Holiday Lights</h2><Button asChild variant="outline" size="sm"><Link to="/CreateHolidayLights">Post a display</Link></Button></div>
    {query.isPending && <p className="text-sm text-muted-foreground">Loading displays…</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">Could not load your displays. <button onClick={() => query.refetch()} className="underline">Retry</button></p>}
    {query.data?.pages[0]?.items.length === 0 && <p className="text-sm text-muted-foreground">Your holiday displays will appear here, separately from Halloween listings.</p>}
    {query.data?.pages.flatMap(page => page.items).map(spot => <div key={spot.id} className="space-y-3 rounded-xl border p-4">
      <div><Link to={`/HolidayLightsDetail?id=${spot.id}`} className="font-semibold underline">{spot.display_title || spot.title}</Link><p className="mt-1 text-xs text-muted-foreground">{spot.address} · {holidayLightState(spot)}</p></div>
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><Switch aria-label={`Display running: ${spot.title}`} checked={spot.display_active} disabled={mutation.isPending} onCheckedChange={value => mutation.mutate({ spot, value })} />Display running</label><Button asChild size="sm" variant="outline"><Link to={`/CreateHolidayLights?id=${spot.id}`}>Edit</Link></Button><Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => { if (window.confirm('Remove this Holiday Lights display?')) mutation.mutate({ spot, remove: true }); }}>Remove</Button></div>
    </div>)}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">Could not update this display. Please try again.</p>}
    {query.hasNextPage && <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>}
  </section>;
}