import React from "react";
import { ChevronRight, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminWorkspaceShell({ groups, activeKey, roleLabel, onSelect, onExit, children }) {
  const group = groups.find((group) => group.items.some((item) => item.key === activeKey));
  const active = group?.items.find((item) => item.key === activeKey);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-8 pt-4 sm:px-4">
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 shrink-0" />
          <span className="font-semibold">Admin Workspace</span>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{roleLabel}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onExit} className="shrink-0 gap-2 text-destructive"><LogOut className="h-4 w-4" />Exit Admin</Button>
      </header>
      <div className="flex min-w-0 flex-col gap-5 md:flex-row">
        <aside className="w-full shrink-0 md:sticky md:top-20 md:w-60 md:self-start">
          <nav aria-label="Admin workspace navigation" className="flex gap-4 overflow-x-auto rounded-xl border border-border bg-card p-3 md:block md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto">
            {groups.map((section) => (
              <section key={section.label} className="min-w-52 md:mb-5 md:min-w-0 md:last:mb-0">
                <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</h2>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return <button key={item.key} type="button" aria-current={activeKey === item.key ? "page" : undefined} onClick={() => onSelect(item)} className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeKey === item.key ? "bg-primary font-semibold text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{item.label}</span>{item.count !== undefined && <span className="text-xs tabular-nums">({item.count})</span>}
                    </button>;
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 flex-1" aria-label={active?.label || "Admin content"}>
          <div className="mb-4 border-b border-border pb-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">{group?.label}<ChevronRight className="h-3 w-3" />{active?.label}</p>
            <h1 className="text-xl font-semibold text-foreground">{active?.label}</h1>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}