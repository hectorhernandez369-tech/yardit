import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import NeighborhoodIntroCard from "./NeighborhoodIntroCard";
import NeighborhoodIntroFAQ from "./NeighborhoodIntroFAQ";

const NEIGHBORHOOD_INTRO_HIDE_KEY = "yardit_hide_neighborhood_sale_intro";

const sections = [
  {
    id: "what",
    emoji: "🏡",
    title: "What Is a Neighborhood Sale?",
    content: (
      <div className="space-y-3">
        <p>A Neighborhood Sale allows multiple homes in the same area to participate under a single event. Instead of shoppers discovering one yard sale at a time, they discover an entire neighborhood of sales in one place.</p>
        <p>Yardit helps organize the event, display participating homes on the map, and make the sale easier for shoppers to find and navigate.</p>
      </div>
    ),
  },
  {
    id: "who",
    emoji: "👥",
    title: "Who Is a Neighborhood Sale For?",
    content: (
      <div className="space-y-3">
        <p>Neighborhood Sales are ideal for communities that want to work together to attract more shoppers.</p>
        <div>
          <p className="font-bold text-[#2C4F4E]">Examples include:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>HOA community sales</li>
            <li>Gated communities</li>
            <li>Neighborhood-wide yard sale weekends</li>
            <li>Cul-de-sacs and residential streets</li>
            <li>Apartment and condominium communities</li>
            <li>Mobile home and senior living communities</li>
            <li>Church, school, and fundraising sales</li>
            <li>Groups of friends or family hosting sales in the same area</li>
          </ul>
        </div>
        <p>If multiple homes are planning to sell items around the same time, a Neighborhood Sale can help turn several individual sales into one larger destination for shoppers.</p>
      </div>
    ),
  },
  {
    id: "creating",
    emoji: "📣",
    title: "What Am I Creating?",
    content: (
      <div className="space-y-3">
        <p>You are creating a Neighborhood Sale event that other nearby homes can join.</p>
        <p>Once approved, participating homes are grouped together and promoted as one larger event on Yardit.</p>
        <p>Each participating home manages its own yard sale listing while benefiting from increased visibility and shopper traffic.</p>
      </div>
    ),
  },
  {
    id: "homes",
    emoji: "🏠",
    title: "How Many Homes Do I Need?",
    content: (
      <div className="space-y-3">
        <p>A Neighborhood Sale requires at least 5 approved participating homes to activate.</p>
        <p>The most successful events typically have between 5 and 15 participating homes, but larger events can attract even more shopper traffic.</p>
        <p className="rounded-xl bg-[#2C4F4E] px-3 py-2 text-center font-black text-white">More Homes = More Traffic</p>
      </div>
    ),
  },
  {
    id: "pricing",
    emoji: "💲",
    title: "How Does Pricing Work?",
    content: (
      <div className="space-y-3">
        <p>Only the organizer is charged.</p>
        <p className="font-bold text-[#006168]">Participants always join free.</p>
        <div>
          <p className="font-bold text-[#2C4F4E]">Organizer pricing:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>$10 base event fee</li>
            <li>$2 per approved participating home</li>
            <li>Maximum charge: $50</li>
          </ul>
        </div>
        <p>You are only charged if the event qualifies and moves forward as a Neighborhood Sale.</p>
      </div>
    ),
  },
  {
    id: "responsible",
    emoji: "📋",
    title: "What Am I Responsible For?",
    content: (
      <div className="space-y-3">
        <p>Yardit helps organize and manage the event, but successful Neighborhood Sales still require local participation.</p>
        <div>
          <p className="font-bold text-[#2C4F4E]">The most successful organizers:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Personally invite neighbors</li>
            <li>Share their Yardit event link</li>
            <li>Approve participation requests</li>
            <li>Encourage nearby homes to join</li>
            <li>Help the event reach the activation requirement</li>
          </ul>
        </div>
        <p className="font-bold text-[#2C4F4E]">Think of Yardit as the event organizer&apos;s toolkit.</p>
      </div>
    ),
  },
  {
    id: "minimum",
    emoji: "❓",
    title: "What Happens If I Don&apos;t Reach 5 Homes?",
    content: ({ onFaq }) => (
      <div className="space-y-3">
        <p>Neighborhood Sales must reach the minimum participation requirement before activation.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A reminder is sent if participation is low before the event.</li>
          <li>If the event does not reach the required number of homes, it cannot launch as a Neighborhood Sale.</li>
          <li>Participants will be notified and provided available options.</li>
        </ul>
        <p>For complete details regarding activation requirements, deadlines, downgrades, cancellations, invitations, co-hosts, refunds, and participant management:</p>
        <button type="button" onClick={onFaq} className="text-sm font-black text-[#006168] underline-offset-4 hover:underline">
          📖 View Full Neighborhood Sale FAQ →
        </button>
      </div>
    ),
  },
];

export default function NeighborhoodIntroModal({ open, onClose, onContinue }) {
  const [reviewed, setReviewed] = useState(false);
  const [understandsRole, setUnderstandsRole] = useState(false);
  const [hideAgain, setHideAgain] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const resetAndClose = () => {
    setReviewed(false);
    setUnderstandsRole(false);
    setHideAgain(false);
    setShowFaq(false);
    setExpandedSection(null);
    onClose?.();
  };

  const handleToggleSection = (id) => {
    setExpandedSection((current) => (current === id ? null : id));
  };

  const handleContinue = () => {
    if (!reviewed || !understandsRole) return;
    if (hideAgain) localStorage.setItem(NEIGHBORHOOD_INTRO_HIDE_KEY, "true");
    setReviewed(false);
    setUnderstandsRole(false);
    setHideAgain(false);
    setShowFaq(false);
    setExpandedSection(null);
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
                <DialogTitle className="text-center text-lg font-black leading-tight">🏡 Create a Neighborhood Sale</DialogTitle>
                <p className="text-center text-xs text-white/90">Turn multiple yard sales into one larger community event.</p>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-2.5">
                {sections.map((section) => (
                  <NeighborhoodIntroCard
                    key={section.id}
                    id={section.id}
                    emoji={section.emoji}
                    title={section.title}
                    isOpen={expandedSection === section.id}
                    onToggle={handleToggleSection}
                  >
                    {typeof section.content === "function" ? section.content({ onFaq: () => setShowFaq(true) }) : section.content}
                  </NeighborhoodIntroCard>
                ))}
              </div>

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