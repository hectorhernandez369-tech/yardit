export const STARTER_RESOURCE_MODULES = [
  {
    resource_key: "home_page_overview",
    version_number: 1,
    title: "Home Page: What Users See First",
    section: "Home Page",
    category: "Residential Basics",
    lesson_type: "guide",
    estimated_minutes: 5,
    display_order: 10,
    is_active: true,
    golden_rule: "The Home Page is the public discovery surface: users should immediately understand where sales are, how to search, and what actions are available.",
    content: "The Home Page is where residential users begin. It introduces the Yardit map, nearby listings, search, filters, list view, and actions like saving, reporting, and building a hunt route. A trained team member should be able to explain what each visible control does and why it matters to a shopper or seller.",
    examples: "If a shopper says they opened Yardit but do not know where to start, teach them to search their city, review the pins, switch to List View if they prefer rows, then open a listing for details.",
    teacher_notes: "People often think the Home Page is only a map. Teach that it is the main discovery hub: map, search, filters, list view, and listing actions all work together.",
    behind_the_scenes: "The Home Page displays listings based on visibility rules, location/search state, listing status, tier, dates, and filters.",
    knowledge_checks: [
      { question: "What should a new shopper understand after landing on the Home Page?", answer: "They should know how to search an area, view pins/listings, use filters, open listing details, and begin a Hunt route if desired." },
      { question: "Why might a listing not appear on the Home Page?", answer: "It may be outside the search area, filtered out, expired, hidden, not active yet, not inside its visibility window, or unavailable under current public visibility rules." }
    ]
  },
  {
    resource_key: "header_navigation_rules",
    version_number: 1,
    title: "Header: Navigation, Account, and Post Sale Rules",
    section: "Header",
    category: "Navigation",
    lesson_type: "guide",
    estimated_minutes: 5,
    display_order: 20,
    is_active: true,
    golden_rule: "The header moves users between discovery, account actions, posting a sale, admin access, and install options without changing residential listing rules.",
    content: "The header contains the Yardit logo, Map/Home navigation, Checklist access, install prompt when available, login/sign-up, notifications, Post Sale, account menu, My Listings, My Profile, Settings, Admin Login, and Logout. Staff should be able to teach what appears for logged-out users versus logged-in users.",
    examples: "If a logged-out user clicks Post Sale, they should be guided to log in/sign up. If a logged-in seller clicks Post Sale without a verified address, they should be guided to Profile first.",
    teacher_notes: "Do not teach users to bypass verification. The header may show actions, but residential posting still follows profile and address rules.",
    behind_the_scenes: "Header actions depend on authentication state, verified address status, vendor access, admin profile status, install prompt availability, and current route.",
    knowledge_checks: [
      { question: "What happens when a logged-out user clicks Post Sale?", answer: "They should be prompted to log in or sign up before continuing." },
      { question: "What should happen if a logged-in user has no verified primary address and clicks Post Sale?", answer: "They should see an address-required prompt and be directed to Profile to verify an address." }
    ]
  },
  {
    resource_key: "settings_profile_verification",
    version_number: 1,
    title: "Settings and Profile: Account Setup Rules",
    section: "Settings",
    category: "Account Rules",
    lesson_type: "guide",
    estimated_minutes: 6,
    display_order: 30,
    is_active: true,
    golden_rule: "Residential posting depends on a trusted user profile, especially a verified primary address; phone is not required for residential listing creation unless a separate flow asks for it.",
    content: "Users manage personal information, address verification, preferences, saved listings, payment history, and coins through Profile and Settings. Staff should understand that the primary address is used as a trust requirement for posting residential listings, while sale addresses can still be separate from the profile address.",
    examples: "If a seller cannot post, first check whether they are logged in and whether their primary address is verified. If the profile address was edited, reverification may be required.",
    teacher_notes: "A common mistake is assuming the profile address must be the sale address. It does not. The profile address proves account trust; the listing address controls where the sale appears.",
    behind_the_scenes: "User data may store address fields in more than one place. The app normalizes profile data so verification logic reads the same trusted values consistently.",
    knowledge_checks: [
      { question: "What is the difference between a profile address and a listing address?", answer: "The profile address supports account verification and trust. The listing address determines where a specific sale appears." },
      { question: "Is phone required to create a residential listing?", answer: "No, phone should not be required for standard residential listing creation unless a separate feature explicitly asks for it." }
    ]
  },
  {
    resource_key: "map_search_filter_logic",
    version_number: 1,
    title: "Map: Search, Filters, Pins, and Visibility Logic",
    section: "Map",
    category: "Discovery Rules",
    lesson_type: "guide",
    estimated_minutes: 7,
    display_order: 40,
    is_active: true,
    golden_rule: "The map only shows listings that match the viewer’s area, filters, and the listing’s visibility rules.",
    content: "The map is the main residential discovery tool. Users can search an area, allow current location, use filters, open pins, switch to List View, and interact with visible listings. Staff should be able to explain pin types, cluster behavior, filtering, search results, and why a listing may be visible or hidden.",
    examples: "If a user says a pin disappeared after changing filters, ask which filters are enabled, whether the listing type is selected, and whether the listing is currently visible by date and status.",
    teacher_notes: "Teach map visibility as a checklist: location/search area, filters, listing type, status, dates/hours, coming-soon window, and owner/public viewer context.",
    behind_the_scenes: "Map and list results share similar visibility logic so the same listing should appear in both when it matches the current public view and filters.",
    knowledge_checks: [
      { question: "Name three reasons a listing might not show on the map.", answer: "It may be filtered out, outside the searched area, expired, hidden, before its visibility window, after its end time/date, or not public to the current viewer." },
      { question: "What should happen when a user turns off Residential filters?", answer: "Residential pins and residential list rows should disappear until the filter is turned back on." }
    ]
  },
  {
    resource_key: "hunt_map_how_hunt_works",
    version_number: 1,
    title: "Hunt Map: How the Hunt Works",
    section: "Hunt Map",
    category: "Hunt Rules",
    lesson_type: "guide",
    estimated_minutes: 6,
    display_order: 50,
    is_active: true,
    golden_rule: "A Hunt is a shopper-planned route made from selected visible listings; it helps organize stops but does not change listing visibility or seller rules.",
    content: "The Hunt experience lets shoppers add visible listings as stops, remove stops, and plan a route. Staff should explain that Hunt is shopper-side organization: it helps people plan where to go, but it does not make hidden, expired, or filtered listings visible.",
    examples: "If a shopper asks why they cannot add a listing to the Hunt, confirm the listing is visible, the action is available, and the user is in a supported view such as popup/detail/listing card.",
    teacher_notes: "Avoid implying Hunt is a reservation system. It is not a claim, RSVP, purchase, or seller notification by default unless a separate feature explicitly does that.",
    behind_the_scenes: "Hunt actions are separate from listing creation and payment. They rely on currently visible listing records and route/list state.",
    knowledge_checks: [
      { question: "Does adding a sale to the Hunt reserve anything with the seller?", answer: "No. It is a shopper planning tool and does not reserve inventory or guarantee seller availability." },
      { question: "Does Hunt make expired or hidden listings visible?", answer: "No. Hunt works with listings that are already eligible to be seen." }
    ]
  },
  {
    resource_key: "residential_listing_types",
    version_number: 1,
    title: "Residential Listing Types: Yard Sale, Neighborhood Sale, Event",
    section: "Residential Listings",
    category: "Core Flows",
    lesson_type: "guide",
    estimated_minutes: 7,
    display_order: 60,
    is_active: true,
    golden_rule: "Every residential flow starts with the listing type because Yard Sale, Neighborhood Sale, and Event each have different rules, fields, and public behavior.",
    content: "Yard Sale is an individual residential sale. Neighborhood Sale is an organizer-led multi-home sale with participant rules. Residential Event is an event-style residential discovery listing with add-ons. Staff should know the purpose, required fields, payment path, visibility behavior, and support expectations for each type.",
    examples: "A single family selling household items should use Yard Sale. A block captain coordinating homes should use Neighborhood Sale. A community event or organized residential event should use Event.",
    teacher_notes: "The most important teaching point is choosing the correct listing type at the start. Wrong listing type creates confusion later in billing, visibility, and management.",
    behind_the_scenes: "Listing type determines which fields, validations, statuses, tiers, add-ons, and visibility behavior the app applies.",
    knowledge_checks: [
      { question: "Which flow should a block organizer use for many homes participating together?", answer: "Neighborhood Sale." },
      { question: "Which flow should a single household use for a standard garage or yard sale?", answer: "Yard Sale." }
    ]
  },
  {
    resource_key: "yard_sale_flow_rules",
    version_number: 1,
    title: "Yard Sale Flow: Fields, Schedule, Photos, Tiers, Publish",
    section: "Residential Listings",
    category: "Yard Sale Rules",
    lesson_type: "guide",
    estimated_minutes: 8,
    display_order: 70,
    is_active: true,
    golden_rule: "A Yard Sale listing must collect enough information for shoppers to understand what, where, and when the sale is available, then apply tier and visibility rules before publishing.",
    content: "The Yard Sale flow includes title, optional description up to 500 characters, categories, location, schedule, photos where available, tier selection, preview, payment for paid tiers, and publishing. Free listings have simpler rules and should not require selected future dates if the flow is designed that way. Paid tiers go through review and checkout.",
    examples: "If the seller enters a description over 500 characters, the app should cap or block it before save/checkout. If the seller chooses Featured or Premium, they should see payment review before Stripe checkout.",
    teacher_notes: "Make staff comfortable explaining every step in plain language: what is for shoppers, what is for map placement, what is for billing, and what is for visibility.",
    behind_the_scenes: "Description limits are enforced in the UI and saving/checkout functions. Paid listings rely on payment confirmation before paid benefits are granted.",
    knowledge_checks: [
      { question: "What is the Yard Sale description limit?", answer: "500 characters." },
      { question: "When should paid tier benefits be granted?", answer: "Only after a successful payment or an approved promo/free path confirms the listing." }
    ]
  },
  {
    resource_key: "neighborhood_sale_flow_rules",
    version_number: 1,
    title: "Neighborhood Sale Flow: Organizer, Radius, Participants, Billing",
    section: "Residential Listings",
    category: "Neighborhood Rules",
    lesson_type: "guide",
    estimated_minutes: 9,
    display_order: 80,
    is_active: true,
    golden_rule: "A Neighborhood Sale is controlled by the organizer, participant approval, radius rules, activation state, and billing adjustments.",
    content: "The Neighborhood Sale flow covers organizer setup, title and description up to 1000 characters, host address, organizer participation, radius validation, participant join requests, approval/denial/removal, billing totals, activation, Coming Soon, and public/organizer views. Staff should be able to rewrite the logic from memory.",
    examples: "If a participant is outside the allowed radius, they should not be able to join successfully. If an organizer approves another home, the approved participant can become visible when the sale’s visibility rules allow it.",
    teacher_notes: "Teach that organizer controls and public views are different. Public shoppers should not see organizer-only billing or approval controls.",
    behind_the_scenes: "Participant records, join requests, home counts, payment holds/adjustments, and event states work together to determine the neighborhood sale status and public pins.",
    knowledge_checks: [
      { question: "Who controls participant approval in a Neighborhood Sale?", answer: "The organizer, through the organizer management flow." },
      { question: "Should denied participants appear publicly on the map?", answer: "No. Denied participants should not appear as public sale pins." }
    ]
  },
  {
    resource_key: "residential_event_flow_rules",
    version_number: 1,
    title: "Residential Event Flow: Base Event and Add-Ons",
    section: "Residential Listings",
    category: "Event Rules",
    lesson_type: "guide",
    estimated_minutes: 8,
    display_order: 90,
    is_active: true,
    golden_rule: "Residential Events use event-specific details, timing, location, and optional add-ons to control the public event experience.",
    content: "The Residential Event flow includes event name, description up to 1000 characters, category/icon, event location, date/time, base package, add-ons, payment, and public display. Staff should know add-ons such as visibility boosts, animation, flyer, gallery, custom icon, and marquee where available.",
    examples: "If a seller chooses a custom icon add-on, staff should know to check whether the public map marker uses that icon during the event visibility window.",
    teacher_notes: "Do not mix Residential Events with Vendor Dashboard events. This lesson only covers residential event behavior outside the vendor dashboard.",
    behind_the_scenes: "Selected event add-ons affect payment totals and may affect map marker, listing detail, flyer display, gallery, and public promotion behavior.",
    knowledge_checks: [
      { question: "What is the Residential Event description limit?", answer: "1000 characters." },
      { question: "Should selected add-ons appear in the payment total?", answer: "Yes. The payment review should include the base event plus selected add-ons." }
    ]
  },
  {
    resource_key: "visibility_coming_soon_rules",
    version_number: 1,
    title: "Visibility Rules: Active, Scheduled, Coming Soon, Expired, Hidden",
    section: "Residential Rules and Logic",
    category: "Visibility",
    lesson_type: "guide",
    estimated_minutes: 8,
    display_order: 100,
    is_active: true,
    golden_rule: "A listing’s public visibility is decided by status, date/time, tier, filters, and viewer context; Coming Soon is visible before active hours only when rules allow it.",
    content: "Staff must be able to explain when residential listings appear active, Coming Soon, scheduled, hidden, expired, completed, or owner-preview only. Visibility affects both map pins and list results. Early visibility and Premium Coming Soon should never make unrelated listings visible.",
    examples: "A paid listing with early visibility may appear as Coming Soon before the sale start date, then active during open hours. An expired listing should not appear to public shoppers.",
    teacher_notes: "Teach visibility as logic, not guessing. Ask: Who is viewing? What is the status? What are the dates and hours? What tier/promo applies? What filters are on?",
    behind_the_scenes: "Visibility logic is shared across map/list display and uses listing dates, status, tier, early visibility fields, and current time.",
    knowledge_checks: [
      { question: "What should a listing show as during a valid early visibility window before the sale opens?", answer: "Coming Soon." },
      { question: "Should expired listings show on the public map?", answer: "No, expired listings should not appear publicly." }
    ]
  },
  {
    resource_key: "payments_promos_billing_rules",
    version_number: 1,
    title: "Payments, Promo Codes, Receipts, and Billing Rules",
    section: "Residential Rules and Logic",
    category: "Payments",
    lesson_type: "guide",
    estimated_minutes: 8,
    display_order: 110,
    is_active: true,
    golden_rule: "Paid residential benefits must match the confirmed tier, promo result, and payment status; canceled checkout must not grant paid benefits.",
    content: "Staff should understand checkout, promo validation, successful payment, canceled checkout, retries, receipts, billing history, payment transactions, and payment audit context. Promo codes can affect discounts and may grant early visibility only when configured for that listing path.",
    examples: "If a seller cancels Stripe checkout, the listing should remain unpaid or unchanged. If a valid early visibility promo is applied, listing-level early visibility fields should be stored only on that listing.",
    teacher_notes: "The safest support explanation is: benefits follow confirmed payment or confirmed promo path, never an attempted checkout alone.",
    behind_the_scenes: "Stripe webhooks, checkout sessions, payment transactions, promo redemptions, and listing fields coordinate to confirm payment status and benefits.",
    knowledge_checks: [
      { question: "Should paid tier benefits apply after canceled checkout?", answer: "No. Canceled checkout should not grant paid benefits." },
      { question: "Where should early visibility promo effects be stored?", answer: "On the specific listing that used the promo, including enabled state, days, visibility start date, and promo code." }
    ]
  },
  {
    resource_key: "my_listings_detail_support_rules",
    version_number: 1,
    title: "My Listings, Listing Detail, Support, Reports, Notifications",
    section: "Residential Rules and Logic",
    category: "Management Flows",
    lesson_type: "guide",
    estimated_minutes: 7,
    display_order: 120,
    is_active: true,
    golden_rule: "After creation, residential users manage listings through My Listings, shoppers learn from Listing Detail, and safety/support flows protect the marketplace.",
    content: "My Listings is where sellers edit, relist, upgrade, cancel, review receipts, and manage neighborhood sales. Listing Detail is where shoppers view title, photos, description, category, dates, hours, address/location label, badges, sharing, saving, route actions, and reporting. Support, reports, and notifications help users resolve issues and stay informed.",
    examples: "If a seller wants to change hours, send them to My Listings > Edit. If a shopper sees a problematic listing, teach them to use Report from the listing detail.",
    teacher_notes: "Separate seller management from shopper discovery: My Listings is private owner management; Listing Detail is the public explanation of one listing.",
    behind_the_scenes: "Editing updates listing records and public detail rendering. Reports can create review workflows. Notifications may link users back to listings or support actions.",
    knowledge_checks: [
      { question: "Where should a seller go to edit or upgrade their listing?", answer: "My Listings." },
      { question: "Where should a shopper go to report a listing?", answer: "The listing detail/report action for that listing." }
    ]
  }
];