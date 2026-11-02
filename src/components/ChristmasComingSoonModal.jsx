import React, { useEffect, useState } from "react";
import { TreePine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const KEY = "yardit_christmas_coming_soon_2026_v1";
export default function ChristmasComingSoonModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(localStorage.getItem(KEY) !== "seen"); }
    catch { setOpen(true); }
  }, []);
  const dismiss = () => {
    try { localStorage.setItem(KEY, "seen"); } catch {}
    setOpen(false);
  };
  return <Dialog open={open} onOpenChange={value => { if (!value) dismiss(); }}>
    <DialogContent className="max-w-sm rounded-2xl border-amber-300 bg-slate-950 text-white">
      <DialogHeader>
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400 bg-emerald-950"><TreePine className="h-9 w-9 text-amber-300" /></div>
        <DialogTitle className="text-center text-2xl font-bold text-amber-200">Christmas Displays Coming Soon!</DialogTitle>
        <DialogDescription className="pt-2 text-center text-slate-200">Yardit is getting festive! Soon you'll be able to discover neighborhood Christmas lights, decorated homes, and holiday displays right on the map.</DialogDescription>
      </DialogHeader>
      <p className="text-center text-sm text-amber-200">Stay tuned for more holiday magic!</p>
      <Button onClick={dismiss} className="w-full bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">Got it!</Button>
    </DialogContent>
  </Dialog>;
}
