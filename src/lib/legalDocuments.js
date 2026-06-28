export const legalDocuments = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "How Yardit collects, uses, and protects information across listings, maps, payments, notifications, support, and safety workflows.",
    effectiveDate: "June 28, 2026",
    intro: "This Privacy Policy is based on Yardit’s current app behavior. Sections marked Recommended Addition cover legal or Google Play readiness topics that should be supported publicly even where Yardit does not yet have a dedicated in-app workflow.",
    sections: [
      { title: "Information Yardit collects", body: [
        "Yardit may collect account information such as first name, last name, email address, optional phone number, user ID, account role, account creation date, and Terms/Privacy acceptance records.",
        "Yardit may collect address and location information such as street address, city, state, ZIP code, latitude, longitude, address confirmation status, listing location, event location, vendor check-in location, and time zone.",
        "Yardit may collect user-submitted content including listing titles, descriptions, categories, photos, event flyers, vendor profile content, support tickets, reports, and uploaded evidence photos.",
        "Yardit may collect payment-related records such as Stripe checkout session IDs, payment intent IDs, customer IDs, subscription IDs, transaction amount, payment status, refund status, promo code details, and non-refundable acknowledgement records.",
        "Yardit may collect push notification information including OneSignal subscription ID, push permission status, user agent, push preferences, push delivery logs, and user ID linked to push subscriptions."
      ]},
      { title: "How Yardit uses information", body: [
        "Yardit uses information to create accounts, verify addresses, publish listings, show map and list results, process payments, apply promo eligibility, send notifications, provide support, review reports, prevent fraud, and maintain safety and billing records.",
        "Address and location information are used for residential listing verification, map display, Neighborhood Sale radius rules, vendor check-ins, nearby listing/vendor alerts, route/list sorting, and geographically limited promo codes."
      ]},
      { title: "Public information", body: [
        "Published listings, events, vendor profiles, vendor check-ins, and Neighborhood Sales may show public content such as titles, descriptions, photos, display locations, event details, business details, and participation-related information.",
        "Users should not post personal information they do not want visible to others."
      ]},
      { title: "Location and Mapbox", body: [
        "Yardit uses Mapbox-supported location and geocoding features to search, confirm, display, and place addresses or coordinates on the map.",
        "Residential listing features rely on verified address and coordinate data to reduce fake, duplicate, or misplaced listings."
      ]},
      { title: "Payments and Stripe", body: [
        "Yardit uses Stripe for checkout, payment confirmation, subscription payments, failed payment records, and payment-related support workflows.",
        "Yardit does not directly store full payment card numbers in the Yardit app database."
      ]},
      { title: "Push notifications and OneSignal", body: [
        "Push notifications are optional and require browser or device permission. Yardit uses OneSignal to manage push subscriptions and delivery.",
        "Users can manage push categories for account, billing, approval, safety, support, policy, nearby listings, vendor near-me alerts, followed vendors, and marketing where enabled.",
        "Turning off push notifications does not remove in-app notification history or bell notifications."
      ]},
      { title: "Support, reports, and moderation", body: [
        "Yardit stores support tickets, report details, uploaded report photos, case records, admin comments, internal notes, and audit history when needed for support, safety, fraud prevention, billing review, or moderation.",
        "Safety-related reports may be prioritized in Yardit’s internal case workflow."
      ]},
      { title: "Cookies and local storage", body: [
        "Yardit may use browser storage to remember app install state, startup page preference, checkout return state, push setup state, temporary app messages, tester access, and similar app preferences."
      ]},
      { title: "Third-party services", body: [
        "Yardit uses Base44 platform services for hosting, authentication, database, files, backend functions, and app infrastructure.",
        "Yardit uses Stripe for payment processing, OneSignal for push notifications, and Mapbox for mapping/geocoding features.",
        "Recommended Addition: If Yardit later uses Google Analytics, Google APIs, Google sign-in, Google Maps, or other Google services, those services should be listed here before launch."
      ]},
      { title: "Data retention", body: [
        "Recommended Addition: Yardit should retain account, listing, payment, notification, support, moderation, and audit records only as long as reasonably needed to operate the service, comply with legal obligations, prevent fraud, resolve disputes, process payments, provide support, and enforce platform rules."
      ]},
      { title: "Account deletion and privacy requests", body: [
        "Recommended Addition: Yardit should provide a clear account deletion process. Until a self-service deletion feature exists, users should be directed to request deletion through Yardit support.",
        "Recommended Addition: Yardit should provide a clear process for users to request access, correction, deletion, or privacy assistance. Some records may need to be retained for payment, safety, fraud prevention, legal compliance, or dispute-resolution reasons."
      ]},
      { title: "Children’s privacy", body: [
        "Recommended Addition: Yardit should state that the service is not intended for children under 13 and does not knowingly collect personal information from children under 13."
      ]},
      { title: "Security", body: [
        "Recommended Addition: Yardit should state that it uses reasonable safeguards and trusted platform services, while also explaining that no online service can guarantee complete security."
      ]}
    ]
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Rules for using Yardit listings, maps, payments, Neighborhood Sales, Residential Events, Vendor tools, notifications, support, and safety systems.",
    effectiveDate: "June 28, 2026",
    intro: "These Terms are based on Yardit’s current app behavior. Sections marked Recommended Addition identify legal language that should be confirmed before public launch when the app does not yet contain a fully implemented public policy.",
    sections: [
      { title: "Acceptance of Terms", body: [
        "By creating or using a Yardit account, users agree to these Terms and acknowledge the Privacy Policy. Yardit stores acceptance status, policy version, and acceptance timestamp during account setup."
      ]},
      { title: "Yardit’s role", body: [
        "Yardit is a discovery and marketplace platform for residential yard sales, Neighborhood Sales, Residential Events, Vendor Events, vendor check-ins, and related local activity.",
        "Yardit does not own, inspect, sell, deliver, or guarantee user-listed items, sale attendance, buyer behavior, vendor participation, event results, or user-to-user transactions."
      ]},
      { title: "User accounts and responsibilities", body: [
        "Users are responsible for keeping account, listing, event, vendor, location, photo, payment, and support information accurate.",
        "Yardit may restrict, suspend, hide, review, or remove accounts or content used for fraud, abuse, spam, unsafe activity, payment misuse, false listings, or rule violations."
      ]},
      { title: "Address verification and location accuracy", body: [
        "Residential yard sale listings must use the seller’s verified primary residential address. Users may not place a residential sale at an unauthorized, fake, misleading, or unrelated address.",
        "Yardit may use address verification, geocoding, coordinates, radius checks, and date conflict checks to protect listing accuracy."
      ]},
      { title: "Residential Listings", body: [
        "Free, Featured, and Premium residential tiers control listing features, photo limits, schedule behavior, and public visibility priority.",
        "Paid visibility improves presentation or placement, but does not guarantee visits, traffic, clicks, sales, buyer interest, or attendance.",
        "Listings may be hidden or not public if they are draft, payment-pending, outside open hours, outside active dates, missing coordinates, expired, closed, canceled, hidden, suspended, under review, filtered out, or hidden by zoom/clustering behavior."
      ]},
      { title: "Coming Soon and preview behavior", body: [
        "Some listings or events may appear before opening as Coming Soon or preview-style visibility. Coming Soon does not mean the sale or event is open early."
      ]},
      { title: "Date conflicts", body: [
        "Yardit may block overlapping residential listings at the same verified address. Dates may be checked before checkout and again around payment confirmation."
      ]},
      { title: "Residential Events", body: [
        "Residential Events are local event listings separate from Vendor Events. Event organizers are responsible for accurate event details, dates, location, descriptions, images, and legal compliance.",
        "Paid event tiers and add-ons improve display or promotion but do not guarantee attendance, revenue, traffic, or vendor participation."
      ]},
      { title: "Neighborhood Sales", body: [
        "Neighborhood Sales group nearby homes into a shared event. Yardit uses radius, host address, participant approval, home count, deadline, payment, and visibility rules to manage these sales.",
        "Organizers manage setup, invitations, approvals, and payment. Participants can request to join and may be approved, denied, removed, detached, or notified based on sale status and origin.",
        "Canceled Neighborhood Sales may close the event, notify users, remove or detach participants, create rescue flows for eligible users, cancel deadline jobs, and update payment or cancellation status."
      ]},
      { title: "Vendor accounts", body: [
        "Vendor tiers control access to pins, authorized users, check-ins, branding, logo pins, animation, visibility, and Vendor Events.",
        "Vendor account owners are responsible for business profile information, authorized users, vendor pins, check-ins, event activity, and subscription choices."
      ]},
      { title: "Vendor Events and participation", body: [
        "Vendor Events may include event types, collaborators, vendor invitations, spaces, custom space requests, deadlines, capacity limits, payment settings, flyers, locations, and schedules.",
        "Only eligible Event Organizer accounts can create certain Vendor Events. Vendor Event dates may become locked when vendors are already approved.",
        "Recommended Addition: Yardit should confirm public refund, payout, and cancellation rules for vendor reserve deposits before launch."
      ]},
      { title: "Payments", body: [
        "Yardit uses Stripe for payments, checkout, subscriptions, payment confirmation, failed payment tracking, and payment-related records.",
        "Paid features activate only after payment is confirmed. A checkout redirect or success URL alone may not activate paid access if payment has not been confirmed."
      ]},
      { title: "Refund Policy", body: [
        "Residential Listings: Paid residential listing purchases and paid residential listing upgrades require users to acknowledge that the purchase is non-refundable once payment is submitted. Refund requests can be reviewed through support but are not automatic.",
        "Featured and Premium upgrades: Upgrade amounts are calculated as the difference between the current tier and the target tier where applicable. Failed or unconfirmed upgrade payments do not activate the upgraded tier. Paid upgrades follow the same non-refundable acknowledgement behavior when required.",
        "Residential Events: Event purchases and event upgrades are processed through Stripe and activate after confirmed payment. Recommended Addition: Yardit should confirm whether Residential Event purchases are non-refundable, support-reviewed, or subject to a separate event refund rule.",
        "Neighborhood Sales: Organizer-paid Neighborhood Sales may close, detach or remove participants, trigger rescue flows, and update payment/cancellation state when canceled or failed. Existing backend behavior can charge a saved organizer payment method if the sale is committed, not already charged, and cancellation conditions apply. Recommended Addition: Yardit should publish the exact Neighborhood Sale cancellation charge and refund rule, including whether any public cap applies.",
        "Vendor purchases and subscriptions: Vendor subscriptions are processed through Stripe. Failed invoices can place subscriptions into past-due, inactive, or canceled states. Recommended Addition: Yardit should confirm whether vendor subscription charges are refundable, prorated, cancel-at-period-end, or handled only by support review.",
        "Vendor Event promotion upgrades: Promotion upgrades activate only after Stripe confirms payment. Recommended Addition: Yardit should confirm whether these promotion upgrades are non-refundable or support-reviewed.",
        "Promotional credits: Admins can request promotional compensation through support workflows. Promotional credits, promo codes, or upgrades are not guaranteed and may require review.",
        "Failed payments: Failed Stripe payments are recorded and do not activate paid access.",
        "Cancellations: Canceling, closing, hiding, or removing a listing, event, subscription, or Neighborhood Sale does not automatically guarantee a refund under current Yardit behavior."
      ]},
      { title: "Promo codes and promotions", body: [
        "Promo codes may be limited by status, start date, expiration date, tier, usage count, per-user limit, geography, early-use bucket, early visibility rules, and payment completion requirements.",
        "Yardit may reject or remove promo use when a code is invalid, expired, paused, unavailable, already used, geographically ineligible, or otherwise not allowed."
      ]},
      { title: "Reports and enforcement", body: [
        "Users may report listings for safety, fraud, misleading information, wrong location, adult/offensive content, spam, duplicate listings, tier circumvention, or other concerns.",
        "Yardit may review reports and take action such as no action, user education, listing adjustment, warning, removal, suspension, support review, or case escalation. Safety reports may be prioritized."
      ]},
      { title: "User-generated content", body: [
        "Users are responsible for content they submit, including listings, photos, flyers, descriptions, vendor profiles, events, reports, and support messages.",
        "By submitting content, users give Yardit permission to host, store, display, process, and use that content to operate Yardit. Users must not upload content they do not own or have permission to use."
      ]},
      { title: "Prohibited activity", body: [
        "Users may not use Yardit for illegal activity, weapons or dangerous items, drugs or controlled substances, stolen goods, threats, harassment, hate, scams, fake listings, misleading photos or descriptions, wrong locations, pricing deception, explicit/adult content, offensive content, duplicate listings, spam, tier circumvention, fraudulent promo use, or payment abuse."
      ]},
      { title: "Notifications", body: [
        "Yardit may send in-app notifications and optional push notifications for account, billing, approval, safety, support, policy, listing, vendor, event, and nearby activity. Users can manage push preferences, but in-app notification history may still be maintained separately."
      ]},
      { title: "Governing law and disputes", body: [
        "Recommended Addition: Yardit should choose governing law and define a dispute-resolution process before publication."
      ]}
    ]
  },
  community: {
    title: "Community Guidelines",
    subtitle: "Plain-English rules for safe, honest, local Yardit activity.",
    effectiveDate: "June 28, 2026",
    intro: "These guidelines are based on Yardit’s existing report categories, listing rules, location rules, vendor tools, support workflows, and moderation behavior.",
    sections: [
      { title: "Be honest", body: [
        "Listings, events, vendor profiles, check-ins, photos, descriptions, categories, and locations must be accurate. Do not post fake, misleading, duplicate, or deceptive content."
      ]},
      { title: "Use accurate locations", body: [
        "Residential listings must use a valid verified residential address. Neighborhood Sales must follow valid event and host location rules. Vendor check-ins must represent real vendor presence.",
        "Do not place pins at fake, unrelated, or unauthorized locations."
      ]},
      { title: "Follow the law", body: [
        "Do not use Yardit to promote or sell illegal items or illegal activity. Do not post or promote drugs, controlled substances, stolen goods, weapons, dangerous items, illegal services, or unsafe activity."
      ]},
      { title: "No scams or fraud", body: [
        "Do not use Yardit for scams, bait-and-switch behavior, fake listings, misleading pricing, payment abuse, promo abuse, tier circumvention, or identity misrepresentation."
      ]},
      { title: "Keep content appropriate", body: [
        "Do not upload or post explicit/adult content, offensive content, hate content, harassing content, threats, graphic or unsafe imagery, or content you do not have the right to use."
      ]},
      { title: "No spam", body: [
        "Do not flood Yardit with repeated posts, duplicate listings, irrelevant promotions, fake vendor activity, or low-quality spam content."
      ]},
      { title: "Respect the community", body: [
        "Treat buyers, sellers, neighbors, vendors, organizers, collaborators, and Yardit staff respectfully. Harassment, threats, intimidation, hate, or abusive behavior are not allowed."
      ]},
      { title: "Neighborhood Sale conduct", body: [
        "Neighborhood Sale organizers should use accurate event information, use valid host addresses, approve or deny participants responsibly, avoid abusive removals, and keep participants informed where possible.",
        "Participants should submit accurate sale information, respect organizer decisions, follow Yardit rules, and keep their own listing details accurate."
      ]},
      { title: "Vendor and event conduct", body: [
        "Vendors and event organizers should use accurate business information, truthful check-in locations, clear event details, clear space or fee details, and accurate instructions and deadlines."
      ]},
      { title: "Reporting problems", body: [
        "Users can report listings that appear unsafe, illegal, fake, misleading, offensive, spammy, duplicated, in the wrong location, in the wrong category, abusive, or in violation of Yardit rules.",
        "Reports may include details and photos. Safety-related issues may be prioritized."
      ]},
      { title: "Enforcement", body: [
        "Yardit may take actions such as no action, user education, listing adjustment, warning, listing removal, listing suspension, participant removal, account restriction, account suspension, support review, billing review, or case escalation."
      ]},
      { title: "Stay safe", body: [
        "Yardit helps users discover local activity, but users are responsible for their own safety. Use caution when meeting others, attending events, handling transactions, or visiting unfamiliar locations."
      ]}
    ]
  }
};