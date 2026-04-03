import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { logUserActivity, logUserActivityOncePerSession } from "@/lib/logUserActivity";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Plus, Map as MapIcon, Target, Users, Settings, LogOut, Navigation, CheckCircle2, ShoppingBag } from "lucide-react";
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
      title: "1. Discover Sales",
      icon: <Search className="w-6 h-6 text-blue-500" />,
      content: "Open the map to see yard sales and neighborhood events happening around you. Yardit automatically detects your location and shows nearby sales. You can use the search bar or filters to narrow down your results."
    },
    {
      title: "2. View Details",
      icon: <MapPin className="w-6 h-6 text-red-500" />,
      content: "Click on any pin on the map or item in the List View to see more details. You'll find photos, item descriptions, sale times, and the exact address."
    },
    {
      title: "3. Build Your Hunt",
      icon: <Target className="w-6 h-6 text-purple-500" />,
      content: "Planning a day of yard sailing? When you find a sale you like, click 'Add Stop to Hunt'. Yardit will build a custom list for you and can even optimize the driving route to save you time and gas."
    },
    {
      title: "4. Arrive and Complete",
      icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
      content: "When you arrive within 50 feet of a sale on your Hunt list, the 'Check In' button activates. Once you're done shopping, mark it as 'Complete' to cross it off your list and head to the next stop."
    },
    {
      title: "5. Post Your Own Sale",
      icon: <Plus className="w-6 h-6 text-amber-500" />,
      content: "Ready to clear out some clutter? Click 'Post Sale' at the top of the screen to create your own listing. It takes less than 2 minutes to add photos, a description, and set your dates."
    },
    {
      title: "6. Listing Visibility",
      icon: <ShoppingBag className="w-6 h-6 text-indigo-500" />,
      content: "Choose how you want to be seen! Free listings appear during the weekend. Featured listings can run any 3 days with a special pin. Premium listings run up to 5 days, offer Early Visibility on the map, and get a glowing gold pin."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3E6CF] p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8 pt-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2C4F4E] mb-3">How to use Yardit</h1>
          <p className="text-slate-600">Your quick guide to finding the best yard sales and neighborhood events.</p>
        </div>

        <div className="grid gap-4">
          {sections.map((section, index) => (
            <Card key={index} className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-sm">
              <CardContent className="p-5 flex gap-4">
                <div className="bg-white p-3 rounded-full h-fit border border-[#2C4F4E]/20 shadow-sm shrink-0">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2C4F4E] mb-1">{section.title}</h3>
                  <p className="text-slate-700 text-sm leading-relaxed">{section.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t-2 border-[#2C4F4E]/20">
          <h2 className="text-2xl font-bold text-[#2C4F4E] mb-6 text-center">How Listings Appear on the Map</h2>
          
          <div className="grid gap-6">
            <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-xl font-bold text-[#2C4F4E] mb-4">Free Listing</h3>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/7e93fa6d6_Screenshot_20260305_122152_Base44.jpg" 
                  alt="Free Listing Pin" 
                  className="w-full rounded-lg border-2 border-[#2C4F4E]/20 shadow-sm object-cover"
                />
              </CardContent>
            </Card>

            <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-xl font-bold text-[#2C4F4E] mb-4">Featured Listing</h3>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/d4ca673d9_Screenshot_20260305_122239_Base44.jpg" 
                  alt="Featured Listing Pin" 
                  className="w-full rounded-lg border-2 border-[#2C4F4E]/20 shadow-sm object-cover"
                />
              </CardContent>
            </Card>

            <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-xl font-bold text-[#2C4F4E] mb-4">Premium Listing</h3>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0d9ca6d4_Screenshot_20260305_122314_Base44.jpg" 
                  alt="Premium Listing Pin" 
                  className="w-full rounded-lg border-2 border-[#2C4F4E]/20 shadow-sm object-cover"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#2C4F4E]/20 flex justify-center">
          <Button 
            onClick={handleUnderstand}
            className="w-full sm:w-auto bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] shadow-md font-bold px-8 py-6 text-lg"
          >
            I Understand How To Use Yardit
          </Button>
        </div>
      </div>
    </div>
  );
}