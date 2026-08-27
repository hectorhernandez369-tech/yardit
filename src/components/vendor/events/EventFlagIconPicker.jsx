import { EVENT_FLAG_ICONS } from "@/lib/eventFlagIcons";
import { cn } from "@/lib/utils";

export default function EventFlagIconPicker({ value = "flag", onChange }) {
  const categories = [...new Set(EVENT_FLAG_ICONS.map((icon) => icon.category))];

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{category}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
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
                <span className="flex h-12 items-center justify-center">
                  {icon.image ? (
                    <img src={icon.image} alt="" className="h-11 w-11 object-contain" />
                  ) : (
                    <span className="text-xl leading-none">{icon.icon}</span>
                  )}
                </span>
                <span className="mt-1 block min-h-[2rem] text-[10px] font-semibold leading-tight text-[#2C4F4E]">
                  {icon.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
