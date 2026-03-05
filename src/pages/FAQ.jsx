import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ShoppingBag, Target, Users, Settings, AlertTriangle, HelpCircle, Star } from "lucide-react";

export default function FAQPage() {
  const faqSections = [
    {
      title: "General",
      icon: <HelpCircle className="w-5 h-5 text-blue-500" />,
      questions: [
        {
          q: "What is Yardit?",
          a: "Yardit is a community platform designed to connect yard sale enthusiasts. It helps sellers promote their sales and helps buyers discover, navigate, and track the best yard sales in their local area."
        },
        {
          q: "How do I find yard sales near me?",
          a: "You can find yard sales by opening the main map or list view. The app automatically detects your location to show you sales nearby. You can use the search bar to find specific items or addresses, and use the filter buttons to switch between regular yard sales and neighborhood events."
        },
        {
          q: "Do I need an account to use Yardit?",
          a: "You can browse the map and view listings without an account. However, to create a listing, build a custom hunt route, or join neighborhood sales, you'll need to create a free account."
        }
      ]
    },
    {
      title: "Listings",
      icon: <MapPin className="w-5 h-5 text-emerald-500" />,
      questions: [
        {
          q: "How do I post a yard sale?",
          a: "Click the 'Post Sale' button at the top of the screen. You'll be guided through a simple 3-step process: provide details (title, description), set your location and dates, and finally choose your listing tier (Free, Featured, or Premium)."
        },
        {
          q: "Why can I only have one active listing?",
          a: "To ensure fair visibility for everyone and prevent spam, each user account is limited to one active residential yard sale listing at a time. Once your current sale ends, you can post a new one."
        },
        {
          q: "What happens when my listing expires?",
          a: "When the end date and time pass, your listing automatically disappears from the public map and list views. It is not deleted; you can always view it in your 'My Listings' under the Past Listings tab."
        }
      ]
    },
    {
      title: "Selling",
      icon: <ShoppingBag className="w-5 h-5 text-amber-500" />,
      questions: [
        {
          q: "What is the difference between Free, Featured, and Premium listings?",
          a: "Free listings appear on the map during the upcoming weekend with standard visibility. Featured listings can be scheduled for any 3 consecutive days, allow more photos, and have a unique map pin. Premium listings offer the most visibility, up to 5 consecutive days, maximum photos, and include Early Visibility on the map before the sale starts."
        },
        {
          q: "What is Early Visibility?",
          a: "Early Visibility is a feature for Premium listings. It allows your yard sale pin to appear on the map several days before the actual sale date. The pin appears slightly muted with an 'OPENS IN X DAYS' tag, letting buyers add your sale to their upcoming Hunt route ahead of time."
        }
      ]
    },
    {
      title: "Buying / Hunting",
      icon: <Target className="w-5 h-5 text-purple-500" />,
      questions: [
        {
          q: "What is the Hunt feature?",
          a: "The Hunt is your personal itinerary planner. When you see a sale you like, click 'Add Stop to Hunt'. You can then view your Hunt list, automatically generate an optimized driving route between your selected stops, and track your progress throughout the day."
        },
        {
          q: "How do I mark a sale as completed?",
          a: "When you arrive within 50 feet of a sale on your Hunt list, the 'Check In' button will activate. Once you're done shopping, click 'Complete' to check it off your list and move on to the next stop."
        }
      ]
    },
    {
      title: "Join The Hunt",
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      questions: [
        {
          q: "What are coins?",
          a: "Coins are part of our interactive 'Join The Hunt' game. Occasionally, special coin icons will appear on the map at specific locations. Collecting them is a fun way to engage with the app and explore your community."
        },
        {
          q: "How do I collect a coin?",
          a: "To collect a coin, you must physically travel to its location on the map. Once your GPS shows you are close enough, tap the coin pin to collect it and add it to your profile."
        }
      ]
    },
    {
      title: "Neighborhood Sales",
      icon: <Users className="w-5 h-5 text-indigo-500" />,
      questions: [
        {
          q: "How do Neighborhood Sales work?",
          a: "Neighborhood Sales are special events that group multiple yard sales (up to 25 homes) within a 500-foot radius. They appear as a single, large, highly visible pin on the map. When buyers click the pin, they can see all participating homes."
        },
        {
          q: "How do I join a Neighborhood Sale?",
          a: "If a Neighborhood Sale is happening near your home (within 500 feet), you will be prompted with an option to 'Ask to Join' when you create a listing. The event organizer will review your request. If approved, your listing is added to the event."
        }
      ]
    },
    {
      title: "Account",
      icon: <Settings className="w-5 h-5 text-slate-500" />,
      questions: [
        {
          q: "How do I update my profile?",
          a: "Click on your profile menu (the three dots in the top right corner) and select 'Settings'. From there, you can update your name, address, and notification preferences."
        },
        {
          q: "How do I reset my password?",
          a: "Currently, authentication is handled via magic links or social login depending on your setup. If you are having trouble logging in, use the 'Forgot Password' or login help link on the main login screen."
        }
      ]
    },
    {
      title: "Reporting",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      questions: [
        {
          q: "How do I report a listing?",
          a: "If you see a listing that violates our guidelines, is inappropriate, or is no longer active, click the listing to view its details. Then, click the 'Report' button, select a reason, and our moderation team will review it."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3E6CF] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2C4F4E] mb-3">Frequently Asked Questions</h1>
          <p className="text-slate-600">Find answers to common questions about using Yardit.</p>
        </div>

        {faqSections.map((section, index) => (
          <Card key={index} className="border-2 border-[#2C4F4E] bg-[#E7D7B8] overflow-hidden shadow-sm">
            <CardHeader className="bg-[#5DADA5]/10 border-b border-[#2C4F4E]/10 py-4">
              <CardTitle className="flex items-center gap-3 text-xl text-[#2C4F4E]">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {section.questions.map((item, qIndex) => (
                  <AccordionItem 
                    key={qIndex} 
                    value={`item-${index}-${qIndex}`}
                    className="border-b border-[#2C4F4E]/10 last:border-0 px-4 md:px-6"
                  >
                    <AccordionTrigger className="text-left font-semibold text-[#1F2937] hover:text-[#5DADA5] py-4">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-700 pb-4 leading-relaxed whitespace-pre-wrap">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}

        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Still need help? Please reach out to our support team.</p>
        </div>
      </div>
    </div>
  );
}