import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const faqItems = [
  {
    question: "What is a Neighborhood Sale?",
    answer: "A Neighborhood Sale is one shared event that brings multiple nearby yard sales together so shoppers can find the whole area at once.",
  },
  {
    question: "Who is it for?",
    answer: "It is for neighbors who want to coordinate several homes, attract more shoppers, and make the sale easier to discover.",
  },
  {
    question: "What does it cost?",
    answer: "Neighborhood Sales start at $19.99 plus $2 per approved participating home. Participants join for free.",
  },
  {
    question: "What am I responsible for?",
    answer: "You invite neighbors, approve participants, and use Yardit as the organizing tool for the event.",
  },
  {
    question: "Where can I learn more?",
    answer: "This FAQ explains the basics, and you can return to the intro any time without losing the checkboxes you already selected.",
  },
];

export default function NeighborhoodIntroFAQ({ onBack }) {
  return (
    <>
      <div className="border-b border-[#2C4F4E]/10 bg-white/90 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
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
        <Button type="button" onClick={onBack} className="w-full rounded-xl bg-[#006168] font-bold text-white hover:bg-[#004d52]">
          Return to Intro
        </Button>
      </DialogFooter>
    </>
  );
}