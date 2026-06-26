import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ShoppingBag, Target, Users, Settings, AlertTriangle, HelpCircle, Star } from "lucide-react";

export default function FAQPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, []);

  const activeHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  const faqSections = [
    {
      title: "Getting Started",
      icon: <HelpCircle className="w-5 h-5 text-[#5DADA5]" />,
      questions: [
        {
          q: "What is Yardit?",
          a: "Yardit helps people find, plan, and promote local yard sales, neighborhood sales, community events, and vendor pop-ups. Buyers can browse the map or list view, save stops, and build a Hunt route. Sellers can post sales, manage listings, and use upgraded visibility options when they want more reach."
        },
        {
          q: "Do I need an account to use Yardit?",
          a: "You can browse public listings without an account. You need a free account to post a sale, save listings, build a Hunt, request to join a neighborhood sale, manage notifications, contact support from your account, or access seller tools."
        },
        {
          q: "Can I install Yardit like an app?",
          a: "Yes. When your device supports installation, Yardit shows an Install App button. On iPhone, Yardit provides simple instructions for adding it to your Home Screen. Once installed, the install button hides itself."
        }
      ]
    },
    {
      title: "Finding Sales",
      icon: <MapPin className="w-5 h-5 text-[#5DADA5]" />,
      questions: [
        {
          q: "How do I find yard sales near me?",
          a: "Open the main map or list view. You can search by location or keywords, filter what appears, and switch between yard sales, neighborhood sales, events, and vendor activity when available."
        },
        {
          q: "Why do some listings show as Coming Soon?",
          a: "Some listings can appear before they open so buyers can plan ahead. Coming Soon listings are visible but not open yet. Once the scheduled date and time arrives, they become active."
        },
        {
          q: "Why do descriptions look shorter on the map card?",
          a: "Map cards show a short preview so the card stays compact. Open the full listing page to read the complete description, see photos, view times, and use listing actions."
        }
      ]
    },
    {
      title: "Posting Listings",
      icon: <ShoppingBag className="w-5 h-5 text-[#F4A849]" />,
      questions: [
        {
          q: "How do I post a yard sale?",
          a: "Tap Post Sale and follow the guided listing flow. You’ll choose the listing type, add your sale details, confirm the location, add photos, select dates and hours, then choose the visibility tier before publishing or paying if needed."
        },
        {
          q: "Why does Yardit ask for a verified primary address?",
          a: "Verified address information helps keep listings accurate, reduces fake posts, and protects the quality of the map. Some live listing actions require your profile address to be completed and verified first."
        },
        {
          q: "What listing types can I create?",
          a: "Yardit supports individual yard sales, neighborhood sales, and event-style listings. Vendor accounts also have vendor tools for public business pages, check-ins, event participation, and promotions."
        },
        {
          q: "Can I edit or end my listing?",
          a: "Yes. Go to My Listings to manage listings you own. Depending on the listing status, you can edit details, update photos or hours, upgrade visibility, view billing history, or end the listing when it is no longer active."
        },
        {
          q: "Why can I only have one active residential yard sale listing?",
          a: "Yardit limits active residential yard sale listings to keep the map fair, reduce duplicates, and prevent spam. When your current sale ends or expires, you can create another one."
        }
      ]
    },
    {
      title: "Tiers, Payments & Promos",
      icon: <Star className="w-5 h-5 text-[#F4A849]" />,
      questions: [
        {
          q: "What is the difference between Free, Featured, Premium, and Marquee?",
          a: "Free listings provide basic visibility. Featured listings offer stronger placement and more scheduling flexibility. Premium listings provide the best residential visibility and early visibility options. Marquee is used for high-visibility event promotion when available."
        },
        {
          q: "What is Early Visibility?",
          a: "Early Visibility lets eligible listings appear before the sale opens so buyers can plan ahead. It can come from certain tiers or approved promo codes. The listing still clearly shows when it actually opens."
        },
        {
          q: "How do promo codes work?",
          a: "Promo codes can apply discounts, early-use benefits, or early visibility depending on how the code was created. Some codes may only apply to certain tiers, dates, cities, ZIP codes, radius areas, or custom coverage zones. Eligibility is checked during checkout."
        },
        {
          q: "Where can I see payment or upgrade history?",
          a: "Listing owners can review billing and upgrade information from their listing management area. Admins have additional payment audit tools for support and reconciliation."
        }
      ]
    },
    {
      title: "Neighborhood Sales",
      icon: <Users className="w-5 h-5 text-[#5DADA5]" />,
      questions: [
        {
          q: "How do Neighborhood Sales work?",
          a: "Neighborhood Sales group nearby homes into one larger event on the map. Buyers can open the neighborhood sale and see participating homes, event details, and sale times in one place."
        },
        {
          q: "How do I join a Neighborhood Sale?",
          a: "If a neighborhood sale is near your address and still accepting participants, you can ask to join. The organizer or co-host reviews the request. If approved, your sale is connected to the neighborhood event."
        },
        {
          id: "neighborhood-sale-pricing",
          q: "What is Neighborhood Sale pricing?",
          a: "Neighborhood Sales work best when planned ahead with your neighbors.\n\nThe organizer’s final cost is calculated as $19.99 base plus $2 per participating home. Participants are not charged.\n\nOnce the event reaches the required participation point and activation timing, the event can become locked so buyers and participants have a consistent experience. After activation, added-home rules may be limited."
        },
        {
          q: "What happens if the organizer is not hosting at their own home?",
          a: "The organizer can choose whether they are participating as a seller or organizing only. When needed, Yardit supports co-host and alternate host workflows so the event location and host responsibilities stay clear."
        }
      ]
    },
    {
      title: "Hunt, Saved Listings & Rewards",
      icon: <Target className="w-5 h-5 text-[#5DADA5]" />,
      questions: [
        {
          q: "What is the Hunt feature?",
          a: "The Hunt is your personal route planner. Add sales you want to visit, organize your stops, and use the route tools to plan your shopping trip."
        },
        {
          q: "Can I save listings for later?",
          a: "Yes. Logged-in users can save listings and return to them later from their account tools."
        },
        {
          q: "What are coins and rewards?",
          a: "Coins and rewards are part of Yardit’s Join The Hunt experience. When active, users may earn or redeem rewards through approved campaigns, vouchers, or location-based activities. Availability can vary by campaign."
        }
      ]
    },
    {
      title: "Notifications",
      icon: <Settings className="w-5 h-5 text-[#5DADA5]" />,
      questions: [
        {
          q: "What is the notification bell?",
          a: "The notification bell shows important in-app updates such as account alerts, listing updates, approvals, support activity, and other Yardit messages. Bell notifications are separate from push notifications."
        },
        {
          q: "Can I control push notifications?",
          a: "Yes. Alert Preferences let you choose which push notifications you want, including account, billing, approval, safety, support, policy, nearby listing, vendor, and marketing alerts. Turning off push alerts does not remove your in-app bell notifications."
        },
        {
          q: "How does Yardit handle nearby alerts?",
          a: "Nearby alerts are designed to protect privacy. Push messages use general wording such as “near you” instead of exposing a user’s exact location."
        }
      ]
    },
    {
      title: "Vendors & Events",
      icon: <ShoppingBag className="w-5 h-5 text-[#F4A849]" />,
      questions: [
        {
          q: "What can vendors do on Yardit?",
          a: "Vendors can manage a public business page, check in to live locations, post updates, use vendor pins, participate in events, and manage vendor-specific promotions depending on their account access."
        },
        {
          q: "Can events include vendors or collaborators?",
          a: "Yes. Yardit supports vendor events, event schedules, event updates, vendor requests, invitations, collaborators, map flags, and public event pages. Event owners can manage these tools from the vendor event dashboard."
        }
      ]
    },
    {
      title: "Safety, Reports & Support",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      questions: [
        {
          q: "How do I report a listing?",
          a: "Open the listing details and use the Report option. Choose the reason, add details, and include photos when helpful. Yardit’s moderation and case tools help the team review reports."
        },
        {
          q: "How do I contact support?",
          a: "Use Contact Support to submit a request. Logged-in users can also view My Support Tickets to track support conversations and case updates."
        },
        {
          q: "What should I do if a listing looks suspicious?",
          a: "Do not engage with suspicious activity. Report the listing with as much detail as possible so the Yardit team can review it."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="text-center mb-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5DADA5] mb-3">Yardit Help Center</p>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">Updated answers for finding sales, posting listings, neighborhood events, vendors, rewards, notifications, and support.</p>
        </div>

        {faqSections.map((section, index) => (
          <Card key={index} className="border border-slate-200 bg-white overflow-hidden shadow-sm rounded-2xl">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion
                type="single"
                collapsible
                defaultValue={(() => {
                  const matchIndex = section.questions.findIndex((question) => question.id === activeHash);
                  return matchIndex >= 0 ? `item-${index}-${matchIndex}` : undefined;
                })()}
                className="w-full"
              >
                {section.questions.map((item, qIndex) => (
                  <AccordionItem 
                    key={qIndex} 
                    id={item.id}
                    value={`item-${index}-${qIndex}`}
                    className="border-b border-slate-100 last:border-0 px-4 md:px-6"
                  >
                    <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-[#5DADA5] py-4">
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

        <Card className="border border-slate-200 bg-white overflow-hidden shadow-sm rounded-2xl">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
            <CardTitle className="text-xl text-slate-900">Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6">
            <Button
              onClick={() => navigate(createPageUrl("StartupGuide"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              View Startup Guide
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("FAQ"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              FAQ Section
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("ContactSupport"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              Contact Support
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("MySupportTickets"))}
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              My Support Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}