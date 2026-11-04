import React from 'react';
import { TreePine, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ChristmasMapFilterPill({ value, onChange, belowHalloween = false, mapCenter }) {
  const enabled = value.holidayLights !== false && value.halloween === false;
  const coordinates = Array.isArray(mapCenter) && mapCenter.length === 2
    ? '?lat=' + encodeURIComponent(mapCenter[0]) + '&lng=' + encodeURIComponent(mapCenter[1])
    : '';
  return <div className={'absolute left-1/2 z-[1001] -translate-x-1/2 ' + (belowHalloween ? 'top-14' : 'top-3')}>
    <div className="flex items-center gap-2 whitespace-nowrap">
      <button type="button" aria-pressed={enabled}
        onClick={() => onChange(current => ({ ...current, holidayLights: !enabled, ...(!enabled ? { halloween: false } : {}) }))}
        className={'flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-md backdrop-blur-sm ' + (enabled ? 'border-[#e9c36b] bg-[#123f30] text-white' : 'border-[#123f30] bg-[#fff8e7] text-[#123f30]')}>
        <TreePine className="h-3.5 w-3.5" />Christmas
      </button>
      <Link to={'/Leaderboard' + coordinates} className="flex h-9 items-center gap-1.5 rounded-full border-2 border-[#b18a27] bg-[#fff8e7] px-3 text-xs font-extrabold text-[#123f30] shadow-md hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#123f30]" aria-label="Christmas leaderboard">
        <Trophy className="h-3.5 w-3.5 text-[#9a6b00]" />Leaderboard
      </Link>
    </div>
  </div>;
}
