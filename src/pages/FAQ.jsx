import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Compass,
  HelpCircle,
  ListChecks,
  Map,
  MapPin,
  Search,
  ShoppingBag,
  Star,
  Store,
  Target,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";

const ROLE_FILTERS = [
  {
    id: "all",
    label: "All Help",
    icon: HelpCircle,
  },
  {
    id: "buyer",
    label: "Buying & Exploring",
    icon: Compass,
  },
  {
    id: "seller",
    label: "Selling",
    icon: ShoppingBag,
  },
  {
    id: "vendor",
    label: "Vendors",
    icon: Store,
  },
  {
    id: "organizer",
    label: "Event Organizers",
    icon: CalendarDays,
  },
  {
    id: "sports",
    label: "Sports & Fields",
    icon: Trophy,
  },
  {
    id: "support",
    label: "Safety & Support",
    icon: AlertTriangle,
  },
];

const GUIDE_SECTIONS = [
  {
    id: "post-yard-sale",
    role: "seller",
    title: "Post Your First Yard Sale",
    description:
      "Create, verify, review, and publish a residential yard-sale listing.",
    icon: ShoppingBag,
    estimatedTime: "About 5 minutes",
    steps: [
      {
        title: "Open the posting flow",
        text:
          "Sign in, tap Post Sale, and select Yard Sale as the listing type.",
      },
      {
        title: "Add the sale location",
        text:
          "Enter the sale address and confirm the map location. Yardit may require your primary address to be verified before publishing.",
      },
      {
        title: "Add the sale details",
        text:
          "Enter a title, description, categories, dates, opening time, closing time, and any helpful buyer instructions.",
      },
      {
        title: "Add photos",
        text:
          "Upload clear photos of featured items or the overall sale. Photos help buyers decide whether to add the sale to their Hunt.",
      },
      {
        title: "Choose visibility",
        text:
          "Review the available Free, Featured, Premium, or promotional options shown during the posting flow.",
      },
      {
        title: "Review and publish",
        text:
          "Confirm the address, dates, times, photos, and listing details before publishing or completing payment.",
      },
    ],
  },
  {
    id: "find-sales",
    role: "buyer",
    title: "Find Sales and Build a Hunt",
    description:
      "Search the map, save stops, and organize a local shopping route.",
    icon: Target,
    estimatedTime: "About 2 minutes",
    steps: [
      {
        title: "Open the Yardit map",
        text:
          "Use the main map or list view to see nearby yard sales, neighborhood sales, events, and vendor activity.",
      },
      {
        title: "Search and filter",
        text:
          "Search by location or keyword and use filters to narrow the results.",
      },
      {
        title: "Open a listing",
        text:
          "Tap a map marker or listing card to view the full description, photos, address information, dates, and hours.",
      },
      {
        title: "Save the stop",
        text:
          "Add listings you want to visit to your saved listings or Hunt.",
      },
      {
        title: "Plan your route",
        text:
          "Arrange your Hunt stops in the order that works best for your shopping trip.",
      },
    ],
  },
  {
    id: "create-neighborhood-sale",
    role: "seller",
    title: "Create a Neighborhood Sale",
    description:
      "Organize multiple nearby homes under one larger public event.",
    icon: Users,
    estimatedTime: "About 10 minutes",
    steps: [
      {
        title: "Choose Neighborhood Sale",
        text:
          "Start the posting flow and select Neighborhood Sale instead of a standard yard sale.",
      },
      {
        title: "Add the event information",
        text:
          "Enter the neighborhood sale name, description, dates, times, address, and organizer details.",
      },
      {
        title: "Invite nearby homes",
        text:
          "Share the neighborhood sale or approve eligible nearby homes that request to participate.",
      },
      {
        title: "Monitor participation",
        text:
          "Review participating homes and make sure the minimum activation requirements are met before the cutoff.",
      },
      {
        title: "Review the public page",
        text:
          "Confirm that buyers can see the neighborhood event and its participating homes correctly.",
      },
    ],
  },
  {
    id: "create-vendor-event",
    role: "organizer",
    title: "Create a Vendor Event",
    description:
      "Publish an event, accept vendors, and manage attendance.",
    icon: CalendarDays,
    estimatedTime: "About 10 minutes",
    steps: [
      {
        title: "Open Vendor Dashboard",
        text:
          "Select the correct Vendor Account, open the Events tab, and choose Create Event.",
      },
      {
        title: "Enter the event information",
        text:
          "Add the event name, description, location, dates, times, contact details, and event image.",
      },
      {
        title: "Choose vendor settings",
        text:
          "Turn Open to Vendors on when businesses should be able to find and request to join the event.",
      },
      {
        title: "Configure spaces and capacity",
        text:
          "Add vendor space options, prices, quantities, and the maximum number of vendors when applicable.",
      },
      {
        title: "Publish and manage",
        text:
          "Open Manage Event to review requests, approve vendors, invite businesses, post updates, and manage the public page.",
      },
    ],
  },
  {
    id: "create-multi-field-event",
    role: "sports",
    title: "Create a Multi-Field Event",
    description:
      "Create fields, upload a schedule, and let guests view each field.",
    icon: Map,
    estimatedTime: "About 15 minutes",
    steps: [
      {
        title: "Create the event",
        text:
          "From Vendor Dashboard, open Events, choose Create Event, and select the multi-field event type.",
      },
      {
        title: "Open Schedule Manager",
        text:
          "After creating the event, choose Manage Event and then open Schedule Manager.",
      },
      {
        title: "Create the fields",
        text:
          "Add every playing field or activity area. Use clear, unique names such as Field 1, Field 2, and Championship Field.",
      },
      {
        title: "Place the fields",
        text:
          "Place each field marker within the event area. Every field is stored as its own EventSpot.",
      },
      {
        title: "Upload the schedule",
        text:
          "Upload an Excel .xlsx or CSV file containing Field, Activity, Date, Start Time, and optional End Time and Notes columns.",
      },
      {
        title: "Match the fields",
        text:
          "Review imported rows and match any spreadsheet field name that Yardit could not automatically recognize.",
      },
      {
        title: "Correct import errors",
        text:
          "Fix missing activity names, invalid dates or times, and unassigned fields. Confirm Import remains unavailable while errors remain.",
      },
      {
        title: "Save the schedule",
        text:
          "Yardit sorts schedule rows by field, date, and time. Field 2 is naturally placed before Field 10.",
      },
      {
        title: "Check the public page",
        text:
          "Open the public event page and tap each field. The page should scroll to that field’s full schedule.",
      },
    ],
  },
  {
    id: "join-vendor-event",
    role: "vendor",
    title: "Request to Join an Event",
    description:
      "Find an event and submit a request using the correct business.",
    icon: Store,
    estimatedTime: "About 3 minutes",
    steps: [
      {
        title: "Open Find Events",
        text:
          "From Vendor Dashboard, open the Events tab and browse events that are accepting vendors.",
      },
      {
        title: "Filter the results",
        text:
          "Use distance, location, event type, date, and Available Vendor Spots filters.",
      },
      {
        title: "Open the event",
        text:
          "Review the event details, dates, location, vendor information, fees, and available space options.",
      },
      {
        title: "Choose your business",
        text:
          "When you manage more than one Vendor Account, select which business is requesting to join.",
      },
      {
        title: "Select a vendor space",
        text:
          "Choose the requested space option when the organizer has created space choices.",
      },
      {
        title: "Submit the request",
        text:
          "Add an optional message and send the request. The organizer must review it unless the event uses another approved completion flow.",
      },
    ],
  },
  {
    id: "view-field-schedule",
    role: "buyer",
    title: "View a Field Schedule",
    description:
      "Find the games or activities assigned to one field.",
    icon: MapPin,
    estimatedTime: "Less than 1 minute",
    steps: [
      {
        title: "Open the event page",
        text:
          "Open the public Event Detail page from the map, list view, shared link, or event search.",
      },
      {
        title: "Find the event map",
        text:
          "Scroll to the event map showing the available fields or activity areas.",
      },
      {
        title: "Tap a field",
        text:
          "Tap the field marker or field card and choose View Full Field Schedule when shown.",
      },
      {
        title: "Review the schedule",
        text:
          "Yardit scrolls to the schedule and shows the games or activities assigned to that field.",
      },
      {
        title: "Return to all fields",
        text:
          "Choose View All Fields to restore the complete event schedule.",
      },
    ],
  },
];

const FAQ_SECTIONS = [
  {
    id: "getting-started",
    role: "all",
    title: "Getting Started",
    icon: HelpCircle,
    questions: [
      {
        id: "what-is-yardit",
        q: "What is Yardit?",
        a:
          "Yardit helps people find, plan, and promote local yard sales, neighborhood sales, community events, vendor pop-ups, and supported sports events. Buyers can browse the map or list view, save stops, and build a Hunt route. Sellers, vendors, and organizers receive tools based on their account type.",
      },
      {
        q: "Do I need an account to use Yardit?",
        a:
          "You can browse many public listings without an account. A free account is required to post, save listings, build a Hunt, submit participation requests, manage notifications, contact support from your account, or access seller and vendor tools.",
      },
      {
        q: "Can I install Yardit like an app?",
        a:
          "Yes. When your device supports installation, Yardit displays an Install App option. On iPhone, follow the Add to Home Screen instructions. Once installed, the install option may hide automatically.",
      },
    ],
  },
  {
    id: "finding-sales",
    role: "buyer",
    title: "Buying and Exploring",
    icon: Compass,
    questions: [
      {
        q: "How do I find yard sales near me?",
        a:
          "Open the main map or list view. Search by location or keyword, apply filters, and open markers or cards to see full listing details.",
      },
      {
        q: "What does Coming Soon mean?",
        a:
          "Coming Soon means the listing is visible for planning but has not opened yet. It becomes active when its scheduled date and opening time arrive.",
      },
      {
        q: "Why does a description look shorter on the map?",
        a:
          "Map cards use a shorter preview to keep the map easy to use. Open the full listing page for the complete description, photos, address, dates, and actions.",
      },
      {
        q: "What is the Hunt?",
        a:
          "The Hunt is Yardit’s route-planning feature. Add sales you want to visit, organize the stops, and use the route tools to plan your shopping trip.",
      },
    ],
  },
  {
    id: "posting-listings",
    role: "seller",
    title: "Selling and Listings",
    icon: ShoppingBag,
    questions: [
      {
        q: "How do I post a yard sale?",
        a:
          "Tap Post Sale and follow the guided flow. Select the listing type, confirm the address, enter the sale details, add photos, choose dates and hours, review visibility options, and publish.",
      },
      {
        q: "Why does Yardit ask for a verified address?",
        a:
          "Address verification improves map accuracy, reduces fake or duplicate listings, and helps buyers trust the information they see.",
      },
      {
        q: "Can I edit or end my listing?",
        a:
          "Yes. Open My Listings and select the listing you own. Available actions depend on its status and can include editing details, changing photos or hours, upgrading visibility, viewing billing information, or ending the listing.",
      },
      {
        q: "Why can I only have one active residential sale?",
        a:
          "The active residential listing limit helps prevent duplicates and spam and keeps the map fair. After the current sale ends or expires, another sale can be created.",
      },
    ],
  },
  {
    id: "pricing",
    role: "seller",
    title: "Tiers, Payments and Promos",
    icon: Star,
    questions: [
      {
        q: "What is the difference between listing tiers?",
        a:
          "Free provides basic visibility. Featured and Premium provide stronger placement or scheduling benefits. Marquee is intended for eligible high-visibility event promotion. The exact benefits and price are shown before checkout.",
      },
      {
        q: "What is Early Visibility?",
        a:
          "Early Visibility lets an eligible listing appear before it opens so buyers can plan ahead. The listing still shows its actual opening date and time.",
      },
      {
        q: "How do promo codes work?",
        a:
          "Promo codes can provide discounts, visibility benefits, or approved campaign access. A code may be limited by tier, date, city, ZIP code, radius, or another eligibility rule.",
      },
      {
        q: "Where can I see payment history?",
        a:
          "Open the listing or account management area connected to the purchase. Available billing and upgrade history is shown there.",
      },
    ],
  },
  {
    id: "neighborhood-sales",
    role: "seller",
    title: "Neighborhood Sales",
    icon: Users,
    questions: [
      {
        q: "How do Neighborhood Sales work?",
        a:
          "Neighborhood Sales combine nearby participating homes into one larger event. Buyers can open the event and review the participating homes, dates, times, and sale information.",
      },
      {
        q: "How do I join a Neighborhood Sale?",
        a:
          "Open an eligible nearby Neighborhood Sale and request to join. The organizer or authorized co-host reviews the request.",
      },
      {
        id: "neighborhood-sale-pricing",
        q: "What is Neighborhood Sale pricing?",
        a:
          "The organizer’s final cost is calculated from the current base price and participating-home charge shown during setup. Participants are not charged. Review the final amount before activation because current pricing or promotional offers may change.",
      },
      {
        q: "Can the organizer participate without selling?",
        a:
          "Yes. The organizer can manage the event without listing their own home as a participating sale when the event setup allows it.",
      },
    ],
  },
  {
    id: "vendors",
    role: "vendor",
    title: "Vendor Accounts",
    icon: Store,
    questions: [
      {
        q: "What can a Vendor Account do?",
        a:
          "A Vendor Account can manage a public business page, vendor pins, check-ins, updates, event participation, invitations, and other vendor tools included with its account access.",
      },
      {
        q: "Why am I seeing the wrong Vendor Account?",
        a:
          "Open the Vendor Account selector and choose the correct business. The account marked as your default should be selected when entering the Vendor Dashboard normally.",
      },
      {
        q: "Can I request to join the same event twice?",
        a:
          "No. Yardit blocks duplicate active requests, existing attendance, and conflicting event invitations for the same Vendor Account.",
      },
      {
        q: "Why can’t I request to join an event?",
        a:
          "The event may be closed to vendors, full, ended, missing required space information, or your selected Vendor Account may already have a request, invitation, or attendee status.",
      },
    ],
  },
  {
    id: "event-organizers",
    role: "organizer",
    title: "Event Organizers",
    icon: CalendarDays,
    questions: [
      {
        q: "How do I create an event?",
        a:
          "Open Vendor Dashboard, choose the correct Vendor Account, open Events, and select Create Event. Enter the event information and configure vendor settings when applicable.",
      },
      {
        q: "How do I invite vendors?",
        a:
          "Open Manage Event and use the vendor invitation tools. Search for eligible businesses, select the vendor, and send the invitation.",
      },
      {
        q: "How do I review vendor requests?",
        a:
          "Open Manage Event and review Pending Vendor Requests. Verify the business, message, space request, capacity, and any payment requirements before approving or denying it.",
      },
      {
        q: "When does an approved vendor appear publicly?",
        a:
          "After the approval and attendee process completes successfully, the vendor can appear in the public attendee section according to the event’s visibility rules.",
      },
    ],
  },
  {
    id: "sports-fields",
    role: "sports",
    title: "Sports, Fields and Schedules",
    icon: Trophy,
    questions: [
      {
        q: "What is a multi-field event?",
        a:
          "A multi-field event has multiple playing fields or activity areas inside one event. Each field is stored separately and can have its own schedule.",
      },
      {
        q: "What spreadsheet columns should I use?",
        a:
          "Use Field, Activity, Date, Start Time, and optional End Time and Notes columns. Keep field names consistent with the fields already created in Yardit.",
      },
      {
        q: "Why is Confirm Import disabled?",
        a:
          "Confirm Import stays disabled while imported rows have unresolved warnings, such as an unknown field, missing activity name, or invalid date or time.",
      },
      {
        q: "How are imported games sorted?",
        a:
          "Schedules are sorted using the field name, date, and start time. Natural field ordering places Field 2 before Field 10.",
      },
      {
        q: "Can League games and manual activities appear together?",
        a:
          "Yes. Linked League games and standard event schedule entries can appear together in the unified public schedule and are grouped by field.",
      },
      {
        q: "How do guests view one field?",
        a:
          "Guests tap the field marker or field card on the public event page. Yardit then scrolls to and filters the schedule for that field.",
      },
    ],
  },
  {
    id: "notifications",
    role: "all",
    title: "Notifications",
    icon: CircleHelp,
    questions: [
      {
        q: "What is the notification bell?",
        a:
          "The notification bell contains in-app updates such as approvals, requests, listing activity, support messages, billing notices, and account alerts.",
      },
      {
        q: "Can I control push notifications?",
        a:
          "Yes. Open Alert Preferences and choose which supported push notification categories you want. Disabling push notifications does not remove messages from the in-app bell.",
      },
      {
        q: "Do nearby alerts reveal my exact location?",
        a:
          "Nearby alerts use general language such as near you and are designed not to expose the user’s exact location in the notification.",
      },
    ],
  },
  {
    id: "troubleshooting",
    role: "support",
    title: "Troubleshooting",
    icon: AlertTriangle,
    questions: [
      {
        q: "My listing will not publish. What should I check?",
        a:
          "Confirm that all required fields are complete, the address is verified when required, dates and times are valid, required photos or payment steps are complete, and no duplicate active listing rule is blocking the post.",
      },
      {
        q: "My schedule will not import. What should I check?",
        a:
          "Use an .xlsx or .csv file. Confirm the file includes recognizable Field, Activity, Date, and Start Time values. Review every warning in the import preview before confirming.",
      },
      {
        q: "My field is not showing the correct schedule.",
        a:
          "Confirm that the schedule rows are assigned to the correct field and contain the correct EventSpot reference. Reopen Schedule Manager and review the field assignment.",
      },
      {
        q: "My vendor request is still pending.",
        a:
          "A pending request is waiting for the event organizer to review it. The vendor should not submit another request using the same Vendor Account.",
      },
      {
        q: "I accepted an invitation. What happens next?",
        a:
          "Follow any event setup, space selection, payment, or approval instructions shown after acceptance. Some events require additional organizer action before attendance is finalized.",
      },
    ],
  },
  {
    id: "safety-support",
    role: "support",
    title: "Safety, Reports and Support",
    icon: AlertTriangle,
    questions: [
      {
        q: "How do I report a listing?",
        a:
          "Open the listing and choose Report. Select the reason, add useful details, and attach evidence when appropriate.",
      },
      {
        q: "What should I do if something looks suspicious?",
        a:
          "Do not engage with suspicious activity. Report the listing, vendor, or event with enough detail for Yardit to review it.",
      },
      {
        q: "How do I contact support?",
        a:
          "Use Contact Support to submit a request. Logged-in users can use My Support Tickets to follow replies and case updates.",
      },
    ],
  },
];

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export default function FAQPage() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] =
    useState("");

  const [selectedRole, setSelectedRole] =
    useState("all");

  const [openGuideId, setOpenGuideId] =
    useState("");

  const activeHash =
    typeof window !== "undefined"
      ? window.location.hash.replace("#", "")
      : "";

  useEffect(() => {
    if (!activeHash) return;

    const matchingGuide =
      GUIDE_SECTIONS.find(
        (guide) => guide.id === activeHash
      );

    if (matchingGuide) {
      setOpenGuideId(matchingGuide.id);
    }

    window.setTimeout(() => {
      document
        .getElementById(activeHash)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 150);
  }, [activeHash]);

  const filteredGuides = useMemo(() => {
    const query =
      normalizeSearchText(searchQuery);

    return GUIDE_SECTIONS.filter((guide) => {
      const matchesRole =
        selectedRole === "all" ||
        guide.role === selectedRole;

      if (!matchesRole) return false;
      if (!query) return true;

      const searchableText =
        normalizeSearchText(
          [
            guide.title,
            guide.description,
            ...guide.steps.flatMap((step) => [
              step.title,
              step.text,
            ]),
          ].join(" ")
        );

      return searchableText.includes(query);
    });
  }, [searchQuery, selectedRole]);

  const filteredFaqSections = useMemo(() => {
    const query =
      normalizeSearchText(searchQuery);

    return FAQ_SECTIONS.map((section) => {
      const matchesRole =
        selectedRole === "all" ||
        section.role === "all" ||
        section.role === selectedRole;

      if (!matchesRole) {
        return {
          ...section,
          questions: [],
        };
      }

      if (!query) return section;

      const questions =
        section.questions.filter((item) => {
          const searchableText =
            normalizeSearchText(
              `${item.q} ${item.a}`
            );

          return searchableText.includes(query);
        });

      return {
        ...section,
        questions,
      };
    }).filter(
      (section) =>
        section.questions.length > 0
    );
  }, [searchQuery, selectedRole]);

  const resultCount =
    filteredGuides.length +
    filteredFaqSections.reduce(
      (total, section) =>
        total + section.questions.length,
      0
    );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
  };

  const scrollToGuides = () => {
    document
      .getElementById("help-guides")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#2C4F4E] via-[#356E6A] to-[#5DADA5] px-6 py-10 text-white md:px-10 md:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-4 bg-white/15 text-white hover:bg-white/15">
                Yardit Help Center
              </Badge>

              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                What do you need help with?
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
                Search quick answers or follow a complete step-by-step guide for listings, vendors, events, fields, schedules, and support.
              </p>

              <div className="relative mx-auto mt-7 max-w-2xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <Input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search Yardit help..."
                  className="h-14 rounded-2xl border-0 bg-white pl-12 pr-12 text-base text-slate-900 shadow-lg"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery("")
                    }
                    aria-label="Clear search"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  onClick={scrollToGuides}
                  className="rounded-full bg-[#F4A849] font-bold text-slate-950 hover:bg-[#e99a35]"
                >
                  View Step-by-Step Guides
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      createPageUrl(
                        "ContactSupport"
                      )
                    )
                  }
                  className="rounded-full border-white/50 bg-white/10 text-white hover:bg-white hover:text-[#2C4F4E]"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {ROLE_FILTERS.map((filter) => {
                const Icon = filter.icon;
                const selected =
                  selectedRole === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() =>
                      setSelectedRole(filter.id)
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? "border-[#2C4F4E] bg-[#2C4F4E] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#5DADA5] hover:text-[#2C4F4E]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {(searchQuery ||
          selectedRole !== "all") && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              <span className="font-black text-[#2C4F4E]">
                {resultCount}
              </span>{" "}
              matching help result
              {resultCount === 1 ? "" : "s"}
            </p>

            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className="text-[#2C4F4E]"
            >
              Clear Filters
            </Button>
          </div>
        )}

        <section
          id="help-guides"
          className="space-y-4 scroll-mt-6"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5DADA5]">
              Learn Yardit
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
              Step-by-Step Guides
            </h2>

            <p className="mt-2 text-slate-600">
              Follow the complete process instead of searching through individual questions.
            </p>
          </div>

          {filteredGuides.length === 0 ? (
            <Card className="rounded-3xl border-dashed">
              <CardContent className="p-8 text-center">
                <Search className="mx-auto h-9 w-9 text-slate-300" />

                <h3 className="mt-3 font-black text-slate-900">
                  No guides matched
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try a different search or category.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredGuides.map((guide) => {
                const Icon = guide.icon;
                const isOpen =
                  openGuideId === guide.id;

                return (
                  <Card
                    key={guide.id}
                    id={guide.id}
                    className={`scroll-mt-6 overflow-hidden rounded-3xl border transition ${
                      isOpen
                        ? "border-[#5DADA5] shadow-md"
                        : "border-slate-200 shadow-sm"
                    }`}
                  >
                    <CardHeader className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[#E8F5F3] p-3">
                          <Icon className="h-6 w-6 text-[#2C4F4E]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-xl text-slate-900">
                            {guide.title}
                          </CardTitle>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {guide.description}
                          </p>

                          <Badge
                            variant="outline"
                            className="mt-3"
                          >
                            {guide.estimatedTime}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5">
                      <Button
                        type="button"
                        onClick={() =>
                          setOpenGuideId(
                            isOpen
                              ? ""
                              : guide.id
                          )
                        }
                        className="w-full rounded-xl bg-[#2C4F4E] hover:bg-[#23413f]"
                      >
                        {isOpen
                          ? "Hide Guide"
                          : "Open Guide"}
                      </Button>

                      {isOpen && (
                        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                          {guide.steps.map(
                            (step, index) => (
                              <div
                                key={`${guide.id}-${index}`}
                                className="flex gap-3 rounded-2xl bg-slate-50 p-4"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4A849] text-sm font-black text-slate-950">
                                  {index + 1}
                                </div>

                                <div>
                                  <h4 className="font-black text-slate-900">
                                    {step.title}
                                  </h4>

                                  <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {step.text}
                                  </p>
                                </div>
                              </div>
                            )
                          )}

                          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                            <p className="text-sm leading-6 text-emerald-900">
                              Review the final page or public view before considering the process complete.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F4A849]">
              Quick Answers
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>

          {filteredFaqSections.length === 0 ? (
            <Card className="rounded-3xl border-dashed">
              <CardContent className="p-8 text-center">
                <CircleHelp className="mx-auto h-9 w-9 text-slate-300" />

                <h3 className="mt-3 font-black text-slate-900">
                  No answers matched
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try fewer words or clear the selected category.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFaqSections.map(
              (section, sectionIndex) => {
                const Icon = section.icon;

                return (
                  <Card
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <CardHeader className="border-b border-slate-200 bg-slate-50 py-4">
                      <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                        <Icon className="h-5 w-5 text-[#5DADA5]" />
                        {section.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                      <Accordion
                        type="single"
                        collapsible
                        defaultValue={(() => {
                          const matchIndex =
                            section.questions.findIndex(
                              (question) =>
                                question.id ===
                                activeHash
                            );

                          return matchIndex >= 0
                            ? `faq-${sectionIndex}-${matchIndex}`
                            : undefined;
                        })()}
                      >
                        {section.questions.map(
                          (item, questionIndex) => (
                            <AccordionItem
                              key={`${section.id}-${questionIndex}`}
                              id={item.id}
                              value={`faq-${sectionIndex}-${questionIndex}`}
                              className="border-b border-slate-100 px-4 last:border-0 md:px-6"
                            >
                              <AccordionTrigger className="py-4 text-left font-bold text-slate-900 hover:text-[#2C4F4E]">
                                {item.q}
                              </AccordionTrigger>

                              <AccordionContent className="whitespace-pre-wrap pb-5 leading-7 text-slate-700">
                                {item.a}
                              </AccordionContent>
                            </AccordionItem>
                          )
                        )}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              }
            )
          )}
        </section>

        <section>
          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-[#2C4F4E] text-white">
              <CardTitle className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                Still Need Help?
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-3 p-5 md:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(
                    createPageUrl(
                      "StartupGuide"
                    )
                  )
                }
                className="h-auto justify-start rounded-2xl p-4 text-left"
              >
                <ListChecks className="mr-3 h-5 w-5 shrink-0 text-[#5DADA5]" />

                <span>
                  <span className="block font-black">
                    Startup Guide
                  </span>

                  <span className="block text-xs font-normal text-slate-500">
                    General setup instructions
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(
                    createPageUrl(
                      "ContactSupport"
                    )
                  )
                }
                className="h-auto justify-start rounded-2xl p-4 text-left"
              >
                <HelpCircle className="mr-3 h-5 w-5 shrink-0 text-[#F4A849]" />

                <span>
                  <span className="block font-black">
                    Contact Support
                  </span>

                  <span className="block text-xs font-normal text-slate-500">
                    Submit a new request
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(
                    createPageUrl(
                      "MySupportTickets"
                    )
                  )
                }
                className="h-auto justify-start rounded-2xl p-4 text-left"
              >
                <Upload className="mr-3 h-5 w-5 shrink-0 text-[#5DADA5]" />

                <span>
                  <span className="block font-black">
                    My Support Tickets
                  </span>

                  <span className="block text-xs font-normal text-slate-500">
                    Review your existing cases
                  </span>
                </span>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}