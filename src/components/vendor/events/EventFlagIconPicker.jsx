import { EVENT_FLAG_ICONS } from "@/lib/eventFlagIcons";
import { cn } from "@/lib/utils";

export default function EventFlagIconPicker({ value = "flag", onChange }) {
  const categories = [...new Set(EVENT_FLAG_ICONS.map((icon) => icon.category))];

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{category}</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {EVENT_FLAG_ICONS.filter((icon) => icon.category === category).map((icon) => (
              <button
                key={icon.key}
                type="button"
                onClick={() => onChange(icon.key)}
                className={cn(
                  "rounded-xl border bg-white p-2 text-center transition hover:border-[#5DADA5] hover:bg-[#F0FCFA]",
                  value === icon.key && "border-[#5DADA5] bg-[#F0FCFA] ring-2 ring-[#5DADA5]/20"
                )}
                title={icon.label}
              >
                <span className="block text-xl leading-none">{icon.icon}</span>
                <span className="mt-1 block truncate text-[10px] font-semibold text-[#2C4F4E]">{icon.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}