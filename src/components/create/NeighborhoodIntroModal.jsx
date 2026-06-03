import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BookOpen, DollarSign, Home, Megaphone, PartyPopper, Users } from "lucide-react";
import NeighborhoodIntroCard from "./NeighborhoodIntroCard";
import NeighborhoodIntroFAQ from "./NeighborhoodIntroFAQ";

const NEIGHBORHOOD_INTRO_HIDE_KEY = "yardit_hide_neighborhood_sale_intro";

const cards = [
  {
    icon: Home,
    emoji: "🏡",
    title: "What Is A Neighborhood Sale?",
    text: "One shared event that brings nearby yard sales together so shoppers can discover the whole neighborhood at once.",
  },
  {
    icon: Users,
    emoji: "👥",
    title: "Who Is It For?",
    text: "Neighbors who want more visibility, shared traffic, and a simple way to coordinate several homes in one event.",
  },
  {
    icon: DollarSign,
    emoji: "💲",
    title: "What Does It Cost?",
    text: "The organizer pays $19.99 plus $2 per approved participating home. Participants join for free.",
  },
  {
    icon: Megaphone,
    emoji: "📣",
    title: "What Am I Responsible For?",
    text: "Invite neighbors, approve participants, and use Yardit as the organizing tool for the sale.",
  },
];

export default function NeighborhoodIntroModal({ open, onClose, onContinue }) {
  const [reviewed, setReviewed] = useState(false);
  const [understandsRole, setUnderstandsRole] = useState(false);
  const [hideAgain, setHideAgain] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const resetAndClose = () => {
    setReviewed(false);
    setUnderstandsRole(false);
    setHideAgain(false);
    setShowFaq(false);
    onClose?.();
  };

  const handleContinue = () => {
    if (!reviewed || !understandsRole) return;
    if (hideAgain) localStorage.setItem(NEIGHBORHOOD_INTRO_HIDE_KEY, "true");
    setReviewed(false);
    setUnderstandsRole(false);
    setHideAgain(false);
    setShowFaq(false);
    onContinue?.();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) resetAndClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border-0 p-0 bg-[#F3E6CF] sm:rounded-3xl">
        {showFaq ? (
          <NeighborhoodIntroFAQ onBack={() => setShowFaq(false)} />
        ) : (
          <>
            <div className="bg-gradient-to-r from-[#5DADA5] to-[#2C4F4E] px-5 py-3 text-white">
              <DialogHeader className="space-y-1">
                <div className="mx-auto flex h-10 w-10 max-h-10 max-w-10 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/20">
                  <PartyPopper className="h-5 w-5 text-[#F4A849]" />
                </div>
                <DialogTitle className="text-center text-lg font-black leading-tight">Create a Neighborhood Sale</DialogTitle>
                <p className="text-center text-xs text-white/90">Bring multiple yard sales together under one event.</p>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {cards.map((card) => (
                  <NeighborhoodIntroCard key={card.title} icon={card.icon} emoji={card.emoji} title={card.title}>
                    {card.text}
                  </NeighborhoodIntroCard>
                ))}
              </div>

              <section className="mt-3 rounded-2xl border border-[#F4A849]/45 bg-white/90 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-[#2C4F4E]">
                  <BookOpen className="h-4 w-4 text-[#F4A849]" />
                  <h3 className="text-sm font-bold">📖 Need More Details?</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFaq(true)}
                  className="mt-2 text-sm font-bold text-[#006168] underline-offset-4 hover:underline"
                >
                  View Full Neighborhood Sale FAQ →
                </button>
              </section>

              <div className="mt-4 space-y-2.5">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2C4F4E]/15 bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <Checkbox checked={reviewed} onCheckedChange={(checked) => setReviewed(checked === true)} />
                  <span>I have reviewed the information above.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2C4F4E]/15 bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <Checkbox checked={understandsRole} onCheckedChange={(checked) => setUnderstandsRole(checked === true)} />
                  <span>I understand that I should invite neighbors and use Yardit as the organizing tool.</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 px-1 text-sm text-slate-600">
                  <Checkbox checked={hideAgain} onCheckedChange={(checked) => setHideAgain(checked === true)} />
                  <span>Don&apos;t show this again.</span>
                </label>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-[#2C4F4E]/10 bg-white/85 px-4 py-3 sm:px-5">
              <Button
                onClick={handleContinue}
                disabled={!reviewed || !understandsRole}
                className="w-full rounded-xl border-2 border-[#2C4F4E] bg-[#F4A849] font-bold text-[#2C4F4E] shadow-md hover:bg-[#E39635] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue Creating Event
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}