import React from "react";
import { ChevronRight, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminNavigationGroups from "@/components/admin/AdminNavigationGroups";
import AdminMobileMenu from "@/components/admin/AdminMobileMenu";

export default function AdminWorkspaceShell({ groups, activeKey, roleLabel, onSelect, onExit, children }) {
  const group = groups.find((group) => group.items.some((item) => item.key === activeKey));
  const active = group?.items.find((item) => item.key === activeKey);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-8 pt-4 sm:px-4">
      <header className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3 md:gap-3">
        <AdminMobileMenu groups={groups} activeKey={activeKey} onSelect={onSelect} />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-foreground md:flex-none">
          <Shield className="hidden h-5 w-5 shrink-0 md:block" />
          <div className="min-w-0 md:contents">
            <span className="block text-sm font-semibold md:text-base">Admin Workspace</span>
            <span className="text-xs text-muted-foreground md:rounded-md md:bg-muted md:px-2 md:py-1">{roleLabel}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onExit} className="h-11 w-11 shrink-0 gap-2 p-0 text-destructive md:h-9 md:w-auto md:px-3"><LogOut className="h-4 w-4" /><span className="sr-only md:not-sr-only">Exit Admin</span></Button>
      </header>
      <div className="flex min-w-0 flex-col gap-5 md:flex-row">
        <aside className="hidden w-full shrink-0 md:sticky md:top-20 md:block md:w-60 md:self-start">
          <nav aria-label="Admin workspace navigation" className="rounded-xl border border-border bg-card p-3 md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto">
            <AdminNavigationGroups groups={groups} activeKey={activeKey} onSelect={onSelect} />
          </nav>
        </aside>
        <section className="min-w-0 flex-1" aria-label={active?.label || "Admin content"}>
          <div className="mb-4 border-b border-border pb-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">{group?.label}<ChevronRight className="hidden h-3 w-3 md:block" /><span className="hidden md:inline">{active?.label}</span></p>
            <h1 className="text-xl font-semibold text-foreground">{active?.label}</h1>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}