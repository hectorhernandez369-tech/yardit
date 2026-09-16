import React, { useEffect, useState } from "react";
import { Content } from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetPortal, SheetOverlay, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import AdminNavigationGroups from "@/components/admin/AdminNavigationGroups";

export default function AdminMobileMenu({ groups, activeKey, onSelect }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 md:hidden" aria-label="Open admin navigation"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetPortal>
        <SheetOverlay className="z-[4000]" />
        <Content className="fixed inset-y-0 left-0 z-[4100] flex w-[85vw] max-w-sm !max-h-none flex-col border-r border-border bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-4">
            <div><SheetTitle>Admin navigation</SheetTitle><SheetDescription>Choose a workspace tool.</SheetDescription></div>
            <SheetClose asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Close admin navigation"><X className="h-5 w-5" /></Button></SheetClose>
          </div>
          <nav aria-label="Mobile admin workspace navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <AdminNavigationGroups groups={groups} activeKey={activeKey} onSelect={(item) => { onSelect(item); setOpen(false); }} />
          </nav>
        </Content>
      </SheetPortal>
    </Sheet>
  );
}