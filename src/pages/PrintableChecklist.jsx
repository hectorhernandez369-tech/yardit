import React, { useEffect } from "react";
import { checklistData } from "../components/guide/YardSaleGuideContent";

export default function PrintableChecklist() {
  useEffect(() => {
    // Optionally trigger print automatically when the page loads
    // setTimeout(() => {
    //   window.print();
    // }, 500);
  }, []);

  return (
    <div className="bg-white min-h-screen text-slate-900 p-8 max-w-4xl mx-auto">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-8 no-print border-b pb-4">
        <button 
          onClick={() => window.history.back()} 
          className="text-slate-500 hover:text-slate-800 px-4 py-2 border rounded-md"
        >
          &larr; Back
        </button>
        <button 
          onClick={() => window.print()} 
          className="bg-teal-600 text-white px-6 py-2 rounded-md font-bold hover:bg-teal-700 shadow-sm"
        >
          Print Checklist
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2 text-slate-900">Yardit</h1>
        <h2 className="text-xl text-slate-600">Successful Yard Sale Checklist</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8 print:grid-cols-2">
        {checklistData.map((section, idx) => (
          <div key={idx} className="mb-6 break-inside-avoid">
            <h3 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 text-slate-800">
              {section.section}
            </h3>
            <ul className="space-y-3">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start">
                  <div className="w-5 h-5 border-2 border-slate-500 mr-3 mt-0.5 shrink-0"></div>
                  <span className="text-slate-700 leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-center mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500">
        Have a great sale! Remember to keep your listing updated at Yardit.
      </div>
    </div>
  );
}