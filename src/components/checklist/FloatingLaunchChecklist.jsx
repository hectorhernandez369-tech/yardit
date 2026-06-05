import React from 'react';
import { X } from 'lucide-react';
import LaunchChecklistContent from './LaunchChecklistContent';

export default function FloatingLaunchChecklist({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] pointer-events-none">
      <div
        className="absolute top-20 left-4 sm:left-8 w-[calc(100vw-2rem)] sm:w-[760px] h-[75vh] min-w-[320px] min-h-[320px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] resize overflow-auto pointer-events-auto rounded-2xl border-2 border-[#2C4F4E] bg-[#F3E6CF] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#5DADA5] border-b-2 border-[#2C4F4E] px-4 py-3 text-white">
          <div>
            <h2 className="font-bold leading-tight">Launch Checklist</h2>
            <p className="text-xs text-white/80">Drag the bottom-right corner to resize.</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
            aria-label="Close checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <LaunchChecklistContent embedded />
      </div>
    </div>
  );
}