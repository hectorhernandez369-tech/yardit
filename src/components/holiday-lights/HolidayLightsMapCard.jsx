import React from 'react';
import { Link } from 'react-router-dom';
import { TreePine, Star } from 'lucide-react';

export default function HolidayLightsMapCard({ enabled, query }) {
  return (
    <div className="absolute right-3 top-3 z-[1000] max-w-[65%] overflow-hidden rounded-xl bg-holiday-snow px-2 pb-1.5 pt-4 text-xs text-holiday-night shadow-lg sm:overflow-visible sm:rounded-xl sm:border sm:border-holiday-gold/50 sm:bg-holiday-night sm:p-2 sm:text-holiday-snow">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-4 sm:hidden">
        <div className="absolute inset-x-0 top-0 h-2 rounded-b-[50%] border-b border-holiday-night/30" />
        <div className="absolute inset-x-2 top-1 flex justify-between">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className={`h-2 w-1 rounded-b-full border-t border-holiday-night/40 ${index % 2 ? 'bg-holiday-night/70' : 'bg-holiday-gold'}`} />
          ))}
        </div>
      </div>
      <Link to="/CreateHolidayLights" className="flex items-center gap-1.5 font-semibold sm:gap-2">
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-holiday-night sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
          <TreePine className="h-4 w-4 text-holiday-gold" />
          <Star aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 fill-holiday-gold text-holiday-gold sm:hidden" />
        </span>
        <span className="text-[11px] font-bold sm:text-xs sm:font-semibold">Post Holiday Lights</span>
      </Link>
      <div className="mt-0.5 text-[10px] leading-snug sm:mt-0 sm:text-xs sm:leading-normal" aria-live="polite">
        {enabled && query.isPending && <p className="mt-1 opacity-75">Finding displays…</p>}
        {enabled && query.isSuccess && !query.hasNextPage && query.data.pages.every(page => page.items.length === 0) && <p className="mt-1 opacity-75">No displays in this area yet.</p>}
        {enabled && query.isError && <p className="mt-1">Could not load displays. <button type="button" onClick={() => query.refetch()} className="underline">Retry</button></p>}
        {enabled && query.hasNextPage && <button type="button" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} className="mt-1 underline">{query.isFetchingNextPage ? 'Loading…' : 'Load more displays'}</button>}
      </div>
    </div>
  );
}