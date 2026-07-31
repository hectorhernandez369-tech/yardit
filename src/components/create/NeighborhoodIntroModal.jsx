import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, DollarSign, HelpCircle, Home, House, Megaphone, PartyPopper, Users } from "lucide-react";
import NeighborhoodIntroCard from "./NeighborhoodIntroCard";
import NeighborhoodIntroFAQ from "./NeighborhoodIntroFAQ";

const NEIGHBORHOOD_INTRO_HIDE_KEY = "yardit_hide_neighborhood_sale_intro";

const cards = [
  {
    icon: Home,
    emoji: "🏡",
    title: "What Is A Neighborhood Sale?",
    content: (
      <div className="space-y-2">
        <p>A Neighborhood Sale allows multiple homes in the same area to participate under a single event. Instead of shoppers discovering one yard sale at a time, they discover an entire neighborhood of sales in one place.</p>
        <p>Yardit helps organize the event, display participating homes on the map, and make the sale easier for shoppers to find and navigate.</p>
      </div>
    ),
  },
  {
    icon: Users,
    emoji: "👥",
    title: "Who Is a Neighborhood Sale For?",
    content: (
      <div className="space-y-2">
        <p>Neighborhood Sales are ideal for communities that want to work together to attract more shoppers.</p>
        <p className="font-semibold text-[#2C4F4E]">Examples include:</p>
        <ul className="space-y-1 pl-4 list-disc">
          <li>HOA community sales</li>
          <li>Gated communities</li>
          <li>Neighborhood-wide yard sale weekends</li>
          <li>Cul-de-sacs and residential streets</li>
          <li>Apartment and condominium communities</li>
          <li>Mobile home and senior living communities</li>
          <li>Church, school, and fundraising sales</li>
          <li>Groups of friends or family hosting sales in the same area</li>
        </ul>
        <p>If multiple homes are planning to sell items around the same time, a Neighborhood Sale can help turn several individual sales into one larger destination for shoppers.</p>
      </div>
    ),
  },
  {
    icon: Megaphone,
    emoji: "📣",
    title: "What Am I Creating?",
    content: (
      <div className="space-y-2">
        <p>You are creating a Neighborhood Sale event that other nearby homes can join.</p>
        <p>Once approved, participating homes are grouped together and promoted as one larger event on Yardit.</p>
        <p>Each participating home manages its own yard sale listing while benefiting from increased visibility and shopper traffic.</p>
      </div>
    ),
  },
  {
    icon: House,
    emoji: "🏠",
    title: "How Many Homes Do I Need?",
    content: (
      <div className="space-y-2">
        <p>A Neighborhood Sale requires at least <strong>5 approved participating homes</strong> to activate.</p>
        <p>The most successful events typically have between 5 and 15 participating homes, but larger events can attract even more shopper traffic.</p>
        <p className="rounded-xl bg-[#F4A849]/20 px-3 py-2 text-center font-black text-[#2C4F4E]">More Homes = More Traffic</p>
      </div>
    ),
  },
  {
    icon: DollarSign,
    emoji: "💲",
    title: "How Does Pricing Work?",
    content: (
      <div className="space-y-2">
        <p><strong>Only the organizer is charged.</strong></p>
        <p>Participants always join free.</p>
        <p className="font-semibold text-[#2C4F4E]">Organizer pricing:</p>
        <ul className="space-y-1 pl-4 list-disc">
          <li>$49.99 total flat price</li>
          <li>Includes 5 to 25 approved participating homes</li>
          <li>No variable home-count charges</li>
        </ul>
        <p>You are only charged if the event qualifies and moves forward as a Neighborhood Sale.</p>
      </div>
    ),
  },
  {
    icon: ClipboardList,
    emoji: "📋",
    title: "What Am I Responsible For?",
    content: (
      <div className="space-y-2">
        <p>Yardit helps organize and manage the event, but successful Neighborhood Sales still require local participation.</p>
        <p className="font-semibold text-[#2C4F4E]">The most successful organizers:</p>
        <ul className="space-y-1 pl-4 list-disc">
          <li>Personally invite neighbors</li>
          <li>Share their Yardit event link</li>
          <li>Approve participation requests</li>
          <li>Encourage nearby homes to join</li>
          <li>Help the event reach the activation requirement</li>
        </ul>
        <p className="font-semibold text-[#2C4F4E]">Think of Yardit as the event organizer&apos;s toolkit.</p>
      </div>
    ),
  },
  {
    icon: HelpCircle,
    emoji: "❓",
    title: "What Happens If I Don't Reach 5 Homes?",
    content: (
      <div className="space-y-2">
        <p>Neighborhood Sales must reach the minimum participation requirement before activation.</p>
        <ul className="space-y-1 pl-4 list-disc">
          <li>A reminder is sent if participation is low before the event.</li>
          <li>If the event does not reach the required number of homes, it cannot launch as a Neighborhood Sale.</li>
          <li>Participants will be notified and provided available options.</li>
        </ul>
        <p>For complete details regarding activation requirements, deadlines, downgrades, cancellations, invitations, co-hosts, refunds, and participant management, view the full FAQ below.</p>
      </div>
    ),
  },
];

export default function NeighborhoodIntroModal({ open, onClose, onContinue }) {
  const [reviewed, setReviewed] = useState(false);
  const [understandsRole, setUnderstandsRole] = useState(false);
  const [hideAgain, setHideAgain] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const savedScrollYRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    savedScrollYRef.current = window.scrollY || 0;

    return () => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollYRef.current, left: 0, behavior: "auto" });
      });
    };
  }, [open]);

  const resetAndClose = () => {
    setReviewed(false);
    setUnderstandsRole(false);
    setHideAgain(false);
    setShowFaq(false);
    setExpandedCard(null);
    onClose?.();
  };

  const handleContinue = () => {
    if (!reviewed || !understandsRole) return;
    if (hideAgain) localStorage.setItem(NEIGHBORHOOD_INTRO_HIDE_KEY, "true");
    setReviewed(false);
    setUnderstandsRole(false);
    setHideAgain(false);
    setShowFaq(false);
    setExpandedCard(null);
    onContinue?.();
  };

  const toggleCard = (index) => {
    setExpandedCard((current) => {
      const next = current === index ? null : index;
      if (next !== null) {
        setTimeout(() => {
          document.querySelector(`[data-neighborhood-intro-card="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) resetAndClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col overflow-hidden overscroll-contain border-0 p-0 bg-[#F3E6CF] sm:rounded-3xl">
        {showFaq ? (
          <NeighborhoodIntroFAQ onBack={() => setShowFaq(false)} />
        ) : (
          <>
            <div className="shrink-0 bg-[#5DADA5] px-5 py-4 text-white">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold">Create a Neighborhood Sale</DialogTitle>
                <p className="text-sm text-white/90">Turn multiple yard sales into one larger community event.</p>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div className="space-y-3">
                {cards.map((card, index) => (
                  <div key={card.title} data-neighborhood-intro-card={index}>
                    <NeighborhoodIntroCard
                      icon={card.icon}
                      emoji={card.emoji}
                      title={card.title}
                      expanded={expandedCard === index}
                      onToggle={() => toggleCard(index)}
                    >
                      {card.content}
                    </NeighborhoodIntroCard>
                  </div>
                ))}
              </div>

              <section className="mt-3 rounded-lg bg-white border-0 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#2C4F4E] mb-1">Need More Details?</h3>
                <button
                  type="button"
                  onClick={() => setShowFaq(true)}
                  className="text-sm font-bold text-[#2C4F4E] hover:text-[#5DADA5]"
                >
                  View Full Neighborhood Sale FAQ →
                </button>
              </section>

              <div className="mt-4 space-y-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <Checkbox checked={reviewed} onCheckedChange={(checked) => setReviewed(checked === true)} />
                  <span>I have reviewed the information above.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <Checkbox checked={understandsRole} onCheckedChange={(checked) => setUnderstandsRole(checked === true)} />
                  <span>I understand that I should invite neighbors and use Yardit as the organizing tool.</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 px-0 text-sm text-slate-600">
                  <Checkbox checked={hideAgain} onCheckedChange={(checked) => setHideAgain(checked === true)} />
                  <span>Don&apos;t show this again.</span>
                </label>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
              <Button
                onClick={handleContinue}
                disabled={!reviewed || !understandsRole}
                className="w-full rounded-lg bg-[#5DADA5] font-bold text-white hover:bg-[#4A9B93] disabled:cursor-not-allowed disabled:opacity-50"
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