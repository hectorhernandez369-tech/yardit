import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, DollarSign, Home, Megaphone, PartyPopper, Users } from "lucide-react";

const NEIGHBORHOOD_INTRO_HIDE_KEY = "yardit_hide_neighborhood_sale_intro";

const introCards = [
  {
    icon: Home,
    emoji: "🏡",
    title: "What Is A Neighborhood Sale?",
    text: "One event that brings nearby yard sales together so shoppers can find the whole neighborhood at once.",
  },
  {
    icon: Users,
    emoji: "👥",
    title: "Who Is It For?",
    text: "Neighbors who want more visibility, shared traffic, and an easier way to coordinate several homes.",
  },
  {
    icon: DollarSign,
    emoji: "💲",
    title: "What Does It Cost?",
    text: "$19.99 base price plus $2 per approved participating home. Participants join free.",
  },
  {
    icon: Megaphone,
    emoji: "📣",
    title: "What Am I Responsible For?",
    text: "Invite neighbors, approve participants, and use Yardit to organize the event details in one place.",
  },
];

const faqItems = [
  {
    question: "How do Neighborhood Sales work?",
    answer: "Neighborhood Sales group multiple nearby yard sales under one event. Yardit shows the event and participating homes together so shoppers can easily explore the area.",
  },
  {
    question: "When does the event activate?",
    answer: "The event becomes ready once it reaches the required number of participating homes. Until then, you can keep inviting neighbors and managing requests.",
  },
  {
    question: "What does the organizer do?",
    answer: "The organizer invites neighbors, reviews join requests, confirms event details, and helps build enough participation to make the sale successful.",
  },
  {
    question: "What do participants pay?",
    answer: "Participants are never charged to join a Neighborhood Sale. The organizer handles the event cost.",
  },
  {
    question: "What is the price?",
    answer: "Neighborhood Sales start at $19.99 plus $2 per approved participating home.",
  },
];

function InfoCard({ card }) {
  const Icon = card.icon;
  return (
    <section className="rounded-2xl border border-[#5DADA5]/20 bg-white/85 p-3.5 shadow-sm">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5DADA5]/12 text-lg">
          <span aria-hidden="true">{card.emoji}</span>
        </div>
        <h3 className="text-sm font-bold leading-tight text-[#2C4F4E]">{card.title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-600">{card.text}</p>
      <Icon className="mt-2 h-4 w-4 text-[#5DADA5]" />
    </section>
  );
}

export default function NeighborhoodSaleIntroModal({ open, onClose, onContinue }) {
  const [reviewed, setReviewed] = useState(false);
  const [understandsRole, setUnderstandsRole] = useState(false);
  const [hideAgain, setHideAgain] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const canContinue = reviewed && understandsRole;

  const handleContinue = () => {
    if (hideAgain) {
      localStorage.setItem(NEIGHBORHOOD_INTRO_HIDE_KEY, "true");
    }
    onContinue();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border-0 p-0 bg-[#F3E6CF] sm:rounded-3xl">
        {!showFaq ? (
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
                {introCards.map((card) => <InfoCard key={card.title} card={card} />)}
              </div>

              <section className="mt-3 rounded-2xl border border-[#F4A849]/45 bg-white/90 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-[#2C4F4E]">
                  <BookOpen className="h-4 w-4 text-[#F4A849]" />
                  <h3 className="text-sm font-bold">📖 Need More Details?</h3>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                  See the full Neighborhood Sale FAQ before continuing.
                </p>
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
                disabled={!canContinue}
                className="w-full rounded-xl border-2 border-[#2C4F4E] bg-[#F4A849] font-bold text-[#2C4F4E] shadow-md hover:bg-[#E39635] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue Creating Event
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="border-b border-[#2C4F4E]/10 bg-white/90 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setShowFaq(false)}
                className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#006168] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to intro
              </button>
              <DialogHeader>
                <DialogTitle className="text-lg font-black text-[#2C4F4E]">Neighborhood Sale FAQ</DialogTitle>
                <p className="text-sm text-slate-600">Quick details about creating and managing your event.</p>
              </DialogHeader>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-3">
                {faqItems.map((item) => (
                  <section key={item.question} className="rounded-2xl border border-[#5DADA5]/20 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-[#2C4F4E]">{item.question}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{item.answer}</p>
                  </section>
                ))}
              </div>
            </div>
            <DialogFooter className="shrink-0 border-t border-[#2C4F4E]/10 bg-white/85 px-4 py-3 sm:px-5">
              <Button
                type="button"
                onClick={() => setShowFaq(false)}
                className="w-full rounded-xl bg-[#006168] font-bold text-white hover:bg-[#004d52]"
              >
                Return to Intro
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}