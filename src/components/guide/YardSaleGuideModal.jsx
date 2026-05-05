import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, Share2, Camera, Tag, LayoutDashboard, MapPin, Sparkles, CheckSquare, X } from "lucide-react";
import { guideContent, checklistData } from "./YardSaleGuideContent";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function YardSaleGuideModal({ open, onOpenChange }) {
  const navigate = useNavigate();

  const handlePrint = () => {
    onOpenChange(false);
    navigate(createPageUrl("PrintableChecklist"));
  };

  const sections = [
    { id: "socialMedia", icon: Share2, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "setup", icon: LayoutDashboard, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "pricing", icon: Tag, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "photos", icon: Camera, color: "text-purple-500", bg: "bg-purple-50" },
    { id: "stopTheCar", icon: Sparkles, color: "text-rose-500", bg: "bg-rose-50" },
    { id: "useYardit", icon: MapPin, color: "text-teal-500", bg: "bg-teal-50" },
    { id: "dayOfSale", icon: CheckCircle2, color: "text-slate-500", bg: "bg-slate-100" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-slate-50 rounded-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900">
              Successful Yard Sale Guide
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-1">
              Practical tips to get more traffic and sell more items.
            </DialogDescription>
          </div>
          <div className="flex gap-2 items-center">
              <Button onClick={handlePrint} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white shrink-0 shadow-sm rounded-full">
                <Printer className="w-4 h-4" />
                Print Checklist
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full shrink-0 sm:hidden">
                  <X className="w-5 h-5 text-slate-500" />
              </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
          {sections.map(({ id, icon: Icon, color, bg }) => {
            const data = guideContent[id];
            return (
              <section key={id} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/60 relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${bg} ${color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">{data.title}</h3>
                    <div className="space-y-2.5">
                      {data.content.map((paragraph, idx) => (
                        <p key={idx} className="text-slate-600 leading-relaxed text-sm sm:text-base">
                          {paragraph.includes("[Your Yardit Link]") ? (
                            <span className="block mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg italic text-slate-700 font-medium">
                              {paragraph}
                            </span>
                          ) : (
                            paragraph
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          {/* Quick Success Reminder / Checklist Summary */}
          <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <CheckSquare className="w-8 h-8 text-teal-400" />
              <h3 className="text-xl sm:text-2xl font-bold">{guideContent.quickReminder.title}</h3>
            </div>
            <ul className="grid sm:grid-cols-2 gap-4">
              {guideContent.quickReminder.content.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <span className="font-medium text-slate-100">{item}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <Button onClick={handlePrint} size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-bold gap-2 rounded-full px-8 shadow-sm">
                <Printer className="w-5 h-5" />
                Download Full Printable Checklist
              </Button>
            </div>
          </section>
          
          <div className="flex justify-center pb-2 hidden sm:flex">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-800 rounded-full px-6">
                  Close Guide
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}