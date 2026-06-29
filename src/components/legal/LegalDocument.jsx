import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

function Section({ section }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-[#2C4F4E]">{section.title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
        {section.body.map((paragraph, index) => {
          const recommended = paragraph.startsWith("Recommended Addition:");
          return (
            <p key={index} className={recommended ? "rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900" : ""}>
              {recommended && <AlertTriangle className="mr-2 inline h-4 w-4" />}
              {paragraph}
            </p>
          );
        })}
      </div>
    </section>
  );
}

export default function LegalDocument({ document }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/Settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2C4F4E] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <header className="rounded-3xl bg-gradient-to-br from-[#2C4F4E] to-[#5DADA5] p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">Yardit Legal</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{document.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90">{document.subtitle}</p>
          <p className="mt-5 text-xs font-semibold text-white/70">Effective draft date: {document.effectiveDate}</p>
        </header>
        <div className="rounded-2xl border border-[#5DADA5]/25 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
          {document.intro}
        </div>
        {document.sections.map((section) => <Section key={section.title} section={section} />)}
      </div>
    </div>
  );
}