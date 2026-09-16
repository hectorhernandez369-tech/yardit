import React from "react";

export default function AdminNavigationGroups({ groups, activeKey, onSelect }) {
  return groups.map((section) => (
    <section key={section.label} className="mb-5 last:mb-0">
      <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</h2>
      <div className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon;
          return <button key={item.key} type="button" aria-current={activeKey === item.key ? "page" : undefined} onClick={() => onSelect(item)} className={`flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2.5 py-3 text-left text-sm leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0 md:py-2 ${activeKey === item.key ? "bg-primary font-semibold text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{item.label}</span>{item.count !== undefined && <span className="text-xs tabular-nums">({item.count})</span>}
          </button>;
        })}
      </div>
    </section>
  ));
}