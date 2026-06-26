import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { logUserActivity, logUserActivityOncePerSession } from "@/lib/logUserActivity";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Plus, Map as MapIcon, CheckCircle2, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StartupGuidePage() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    base44.auth.me().then((user) => {
      setCurrentUserId(user?.id || null);
      return logUserActivityOncePerSession("yardit_startup_guide_viewed", {
        user_id: user?.id,
        event_type: "startup_guide_viewed",
        event_label: "Startup Guide Viewed",
        target_type: "startup_guide",
        source_page: window.location.pathname,
      });
    }).catch(() => null);
  }, []);

  const handleUnderstand = () => {
    logUserActivity({
      user_id: currentUserId,
      event_type: "startup_guide_completed",
      event_label: "Startup Guide Completed",
      target_type: "startup_guide",
      source_page: window.location.pathname,
    }).catch(() => null);
    localStorage.setItem("yardit_has_seen_startup_guide", "true");
    navigate(createPageUrl("Home"));
  };

  const sections = [
    {
      title: "Discover nearby sales",
      icon: <Search className="w-6 h-6 text-cyan-600" />,
      content: "Start on the map to see yard sales and neighborhood events around you. Use search and filters whenever you want to narrow things down."
    },
    {
      title: "Tap pins for details",
      icon: <MapPin className="w-6 h-6 text-rose-500" />,
      content: "Open any map pin or list item to view photos, descriptions, sale times, and the address so you know exactly what to expect."
    },
    {
      title: "Build your hunt",
      icon: <MapIcon className="w-6 h-6 text-[#5DADA5]" />,
      content: "Found a sale you like? Add it to your Hunt list and Yardit will help you plan a smoother route for your day of yard sailing."
    },
    {
      title: "Check in as you go",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
      content: "When you arrive near a sale on your Hunt list, check in, mark it complete when you’re done, and move on to the next stop."
    },
    {
      title: "Post your own sale",
      icon: <Plus className="w-6 h-6 text-amber-500" />,
      content: "Ready to clear out some clutter? Use Post Sale to add photos, describe what shoppers can find, and set your sale dates."
    },
    {
      title: "Choose your visibility",
      icon: <ShoppingBag className="w-6 h-6 text-indigo-500" />,
      content: "Pick the listing option that fits your goal, from a simple free listing to upgraded visibility that helps more shoppers find you."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-slate-50 p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-xl shadow-cyan-900/5">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#5DADA5]/15" />
          <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-[#F4A849]/15" />
          <div className="relative p-6 md:p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5DADA5] text-white shadow-lg shadow-cyan-900/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.24em] text-[#5DADA5]">Welcome aboard</p>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">How to use Yardit</h1>
            <p className="mx-auto max-w-2xl text-base md:text-lg text-slate-600 leading-relaxed">
              Yardit helps you find nearby sales, plan your route, and share your own sale with local shoppers. Here’s the quick tour.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section, index) => (
            <Card key={index} className="group border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="p-5 flex gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl h-fit border border-slate-100 shadow-sm shrink-0 group-hover:bg-cyan-50">
                  {section.icon}
                </div>
                <div>
                  <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5DADA5]/10 text-xs font-bold text-[#2C4F4E]">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{section.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{section.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7 shadow-lg shadow-slate-900/5">
          <div className="mb-6 text-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#5DADA5]">Map guide</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">How listings appear on the map</h2>
            <p className="mt-2 text-sm text-slate-600">Different listing options use different map styles so shoppers can quickly spot what’s nearby.</p>
          </div>
          
          <div className="grid gap-5">
            <Card className="border border-slate-200 bg-slate-50 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Free Listing</h3>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/7e93fa6d6_Screenshot_20260305_122152_Base44.jpg" 
                  alt="Free Listing Pin" 
                  className="w-full rounded-2xl border border-slate-200 shadow-sm object-cover"
                />
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-slate-50 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Featured Listing</h3>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/d4ca673d9_Screenshot_20260305_122239_Base44.jpg" 
                  alt="Featured Listing Pin" 
                  className="w-full rounded-2xl border border-slate-200 shadow-sm object-cover"
                />
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-slate-50 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Premium Listing</h3>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0d9ca6d4_Screenshot_20260305_122314_Base44.jpg" 
                  alt="Premium Listing Pin" 
                  className="w-full rounded-2xl border border-slate-200 shadow-sm object-cover"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-100 bg-white p-6 text-center shadow-lg shadow-cyan-900/5">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Ready to start exploring?</h2>
          <p className="text-slate-600 mb-5">You can come back to this guide anytime from the question mark in the navigation bar.</p>
          <Button 
            onClick={handleUnderstand}
            className="w-full sm:w-auto gap-2 rounded-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E]/20 shadow-md font-bold px-8 py-6 text-base"
          >
            Start using Yardit
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}