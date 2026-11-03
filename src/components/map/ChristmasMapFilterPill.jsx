import React from 'react';
import { TreePine } from 'lucide-react';

export default function ChristmasMapFilterPill({ value, onChange, belowHalloween = false }) {
  const enabled = value.holidayLights !== false && value.halloween === false;
  return <div className={'absolute left-1/2 z-[1001] -translate-x-1/2 ' + (belowHalloween ? 'top-14' : 'top-3')}>
    <button type="button" aria-pressed={enabled}
      onClick={() => onChange(current => ({ ...current, holidayLights: !enabled, ...(!enabled ? { halloween: false } : {}) }))}
      className={'flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-md backdrop-blur-sm ' + (enabled ? 'border-holiday-gold bg-christmas-green text-holiday-snow' : 'border-christmas-green/40 bg-holiday-snow text-christmas-green')}>
      <TreePine className="h-3.5 w-3.5" />Christmas
    </button>
  </div>;
}