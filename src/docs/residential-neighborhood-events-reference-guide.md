# Yardit Reference Guide — Residential Yard Sales, Neighborhood Sales, and Residential Events

_Last updated: June 19, 2026_

This guide covers the public-facing Yardit flows outside the Vendor Dashboard. It is meant as a training reference for residential yard sales, neighborhood sales, residential events, public map behavior, list view behavior, zoom rules, clustering rules, and visibility rules.

---

## 1. What this guide covers

Covered:

- Residential individual yard sales
- Residential yard sale tiers: Free, Featured, Premium
- Neighborhood Sales
- Residential Events
- Map visibility
- List view visibility and sorting
- Zoom priority rules
- Clustering behavior
- Coming Soon / early advertising behavior
- Payment and non-refund acknowledgement behavior

Not covered:

- Vendor Dashboard tools
- Vendor subscriptions
- Vendor pins
- Vendor event management tools
- Assisted listing QR code flows

---

## 2. Main public listing types

Yardit has three main non-vendor public listing types:

1. **Yard Sale**
   - Individual residential sale.
   - Uses Free, Featured, or Premium tier.
   - Tied to a home/address.

2. **Neighborhood Sale**
   - One organized event that groups multiple nearby yard sales together.
   - Organizer invites and approves nearby homes.
   - Participants join free.
   - Organizer pays the neighborhood sale cost.

3. **Residential Event**
   - One-day community-style event such as church, school, fundraiser, charity, holiday, family, sports, food, entertainment, market, open house, car show, etc.
   - Uses a base event package plus optional add-ons.
   - Multi-day events are directed to Vendor Events / Event Organizer tools.

---

## 3. Residential yard sale creation flow

### Entry point

Users begin from **Post Sale**.

Important rule:

- A user must have a verified primary address before creating/posting a residential sale.
- If the user does not have a verified address, the app shows a verified-address-required message and sends them to Profile.

### Residential yard sale steps

The general flow is:

1. **Listing details**
   - User chooses listing type.
   - For a normal residential sale, listing type is `yard_sale`.
   - User enters sale title, description, categories, and related details.

2. **Address / location**
   - Sale is tied to a residential location.
   - Address verification and normalized address data are important because date availability is checked by address.

3. **Tier, schedule, photos, and open hours**
   - User chooses Free, Featured, or Premium.
   - Photo upload appears in this step.
   - Photo limit updates based on selected tier.
   - Featured and Premium require user-selected date ranges.
   - Free follows the locked weekend schedule.
   - Open hours are required for non-neighborhood yard sales.

4. **Review and payment**
   - Free listings do not require payment.
   - Paid listings go through Stripe checkout unless waived/admin promo applies.
   - Paid residential listings require non-refund acknowledgement.

---

## 4. Residential yard sale tier rules

## Free Yard Sale

### Price

- Free.

### Schedule rule

Free listings use a locked weekend policy:

- Users do **not** pick future dates/times for Free listings.
- Free window runs **Friday 5:00 AM through Sunday 10:00 PM** in the listing timezone.
- If created during the active weekend window, it activates immediately and ends Sunday at 10:00 PM.
- If created outside the active weekend window, it is scheduled for the next Friday at 5:00 AM through Sunday at 10:00 PM.

### Photos

- Maximum 3 photos.

### Public positioning

- Product copy says Free is primarily/list-view focused.
- Current map helper treats default/free pins as individual pins only at very close zoom, **zoom 15+**, if the listing is otherwise eligible and visible.

### Visibility limits

A Free listing must still pass standard visibility checks:

- Not draft.
- Not payment pending.
- Not expired/canceled/deleted/hidden/suspended/rejected/closed/completed.
- Has valid coordinates.
- Is within active dates.
- Is within open hours.

---

## Featured Yard Sale

### Price

- $4.99.

### Schedule rule

- User selects active dates.
- Featured allows **1 to 3 consecutive days**.
- If the selected end date is outside the allowed range, the UI corrects or blocks it.

### Photos

- Maximum 10 photos.

### Visibility / positioning

- Strong map visibility.
- Highlighted color / larger pin than Free.
- Higher placement than Free in list sorting.
- Individual map pin shows at **zoom 13+**.

### Current UI guidance

- Featured is marked **RECOMMENDED**.
- Featured is currently the default selected tier in the listing flow.

---

## Premium Yard Sale

### Price

- $7.99.

### Schedule rule

- User selects active dates.
- Premium allows **1 to 5 consecutive days**.

### Photos

- Maximum 25 photos.

### Coming Soon / early advertising

Premium supports optional pre-activation advertising:

- User may choose 0 to 3 days before the sale start.
- This shows the pin early for advertising only.
- It does **not** start the sale early.
- The listing becomes public as Coming Soon during the configured early advertising window.

### Visibility / positioning

- Highest residential yard sale tier.
- Largest highlighted residential pin.
- Higher placement than Featured and Free.
- Individual map pin shows at **zoom 11+**.

### Current UI guidance

- Premium is marked **BEST VISIBILITY**.

---

## 5. Residential yard sale open-hours rules

For residential `yard_sale` listings:

- The listing must be active on today’s date.
- The listing must be within the user’s open and close times.
- Open and close times must be valid.
- Open time must be before close time.
- Open time cannot be earlier than **5:00 AM**.
- Close time cannot be later than **10:00 PM**.
- If the sale is outside open hours, it is hidden from the public map/list as an active sale.

---

## 6. Residential date conflict / address reservation rules

Residential yard sale date availability is checked by address.

A listing can be blocked if the selected dates overlap already-reserved dates for that address.

Important training note:

- Draft or pending records can still create date conflicts if they reserve the same address/date range.
- If a tester sees “These dates are already reserved for this address,” check existing drafts, pending listings, or active listings for that address.
- The cleanest fix is usually to edit/delete the conflicting draft or choose different dates.

---

## 7. Neighborhood Sale flow

### What it is

A Neighborhood Sale groups multiple nearby yard sales under one public event so shoppers can find the whole neighborhood at once.

### Who it is for

- Neighbors who want shared visibility.
- Multiple homes coordinating one sale weekend/event.
- Organizers who want to invite and manage participating homes.

### Creation flow

1. User chooses **Neighborhood Sale** as listing type.
2. The app creates or assigns a neighborhood draft/invite code.
3. Organizer sets event dates and area details.
4. Organizer receives a shareable invite link.
5. Neighbor homes request to join.
6. Organizer approves participants.
7. Once enough homes are approved, the organizer can activate/pay.
8. The public map shows the Neighborhood Sale once it reaches the required visible state.

### Organizer responsibilities

- Invite nearby homes.
- Review and approve join requests.
- Confirm event details.
- Use Yardit as the organizing tool.

### Participant payment rule

- Participants join free.
- Organizer pays the neighborhood sale cost.

---

## 8. Neighborhood Sale rules

### Minimum homes

- Minimum required homes: **5**.
- The organizer counts as 1 home when counting approved homes.

### Maximum homes

- Maximum pricing/count cap: **25 homes**.

### Lead time

- Neighborhood Sales must be scheduled at least **7 days in advance**.

### Area size

- Neighborhood Sale area is shown as a **500 ft radius**.

### Pricing

- Base price: **$19.99**.
- Plus **$2 per approved participating home**.
- If fewer than 5 homes are approved, total due is $0 because it is not ready.
- Once 5+ homes are approved, total due is calculated as:

```text
$19.99 + ($2 × approved home count)
```

### Join status normalization

The system normalizes some statuses:

- `requested` becomes `pending`.
- `approved_pending_payment` becomes `approved`.

### Active approved home count excludes

A request does not count if:

- Removed by event organizer.
- Removed by listing owner.
- Status is canceled/cancelled.

---

## 9. Neighborhood Sale lifecycle states

Neighborhood Sale event states include:

- `pending_activation`
- `committed`
- `activated`
- `activated_locked`
- `coming_soon`
- `active`
- `expired`
- `downgraded`
- `canceled`

### State rules

- If canceled/cancelled, state is canceled.
- If downgraded, state is downgraded.
- If end time has passed, state is expired.
- `ready_for_payment` becomes committed.
- `collecting_participants` or `payment_pending` becomes pending activation.
- If active/activated and before start:
  - If advertising has started, state is coming soon.
  - If payment is locked/captured, state is activated locked.
  - Otherwise state is activated.
- If active/activated and within start/end time, state is active.

### When a Neighborhood Sale appears on the main map

A Neighborhood Sale appears publicly only when:

- It is in `coming_soon` or `active` state.
- It has at least **5 homes**.
- It has valid coordinates.
- It is not terminal/expired/canceled/hidden.

### When joining is allowed

Joining is allowed only while the Neighborhood Sale is in:

- `pending_activation`

---

## 10. Neighborhood participant display rules

Participant homes are not shown as normal standalone yard sale pins when they are part of a Neighborhood Sale.

A participant home can show in the Neighborhood participant view only when:

- The Neighborhood Sale is visible on the map.
- Participant listing status is active.
- Participant listing is linked to the Neighborhood Sale.
- Participant join status is approved.
- Join request status is approved.
- The request has not been removed by the organizer or listing owner.
- The request is not canceled/cancelled.
- The participant listing date range overlaps the Neighborhood Sale date range.
- Today is within that overlap window.

### Participant map zoom rule

- Participant homes show only at very close zoom: **zoom 18+**.

---

## 11. Residential Event flow

### What it is

Residential Events are for non-vendor community events such as:

- Community events
- Block parties
- Neighborhood meetups
- School events
- Church events
- Fundraisers
- Charity events
- Sports events
- Food events
- Entertainment events
- Family events
- Holiday events
- Craft fairs
- Art / makers markets
- Vendor markets
- Car shows
- Open houses
- Collectibles events
- Games / tabletop events
- Other local events

### Creation flow

1. **Event details**
   - User selects listing type `event`.
   - User enters event name.
   - User enters event description.
   - User selects event category.
   - A default graphic icon is chosen based on category.

2. **Event location**
   - User can search for an event address.
   - Or user can drop a pin on the map.
   - User can edit the public display address.

3. **Event schedule**
   - Residential Events are limited to **one calendar day**.
   - User selects date, start time, and end time.
   - Multi-day events require Vendor Events or Event Organizer tools.

4. **Event package and add-ons**
   - Base Residential Event package is required.
   - Add-ons are optional.

5. **Review and payment**
   - Event goes through the Residential Payment Step.
   - Event payments require non-refund acknowledgement.
   - Promo input is disabled for residential events.

---

## 12. Residential Event pricing and add-ons

### Base Residential Event package

Price:

- **$9.99**

Includes:

- Event detail page.
- Event map pin.
- Standard category icon.
- One-day event listing.
- Local/neighborhood visibility.
- Basic event card.

### Optional event add-ons

| Add-on | Price | Purpose |
|---|---:|---|
| Be Seen By More People / Premium Visibility | $1.99 | Increases visibility beyond the immediate neighborhood |
| Animation | $3.99 | Adds Pulse or Bounce animation to stand out on map |
| Flyer Upload | $2.99 | Flyer becomes main event image/header/share image |
| Photo Gallery | $1.99 | Adds up to 10 gallery photos |
| Custom Icon | $4.99 | Replaces standard category icon with approved uploaded/custom icon |
| Marquee | $9.99 | Gives maximum visibility with large event-board presentation |

### Coming Soon packages

| Package | Price |
|---|---:|
| 3 Days | $2.99 |
| 7 Days | $4.99 |
| 14 Days | $7.99 |

Coming Soon packages make the event visible before the event start date based on the package selected.

---

## 13. Residential Event visibility tiers

Residential Events do not use the old Basic/Featured/Premium tier picker. Instead, visibility is derived from add-ons:

1. If Marquee add-on is selected → visibility tier is `marquee`.
2. Else if Premium Visibility add-on is selected → visibility tier is `premium`.
3. Otherwise → visibility tier is `featured`.

### Event public visibility

Events are public when:

- They have valid coordinates.
- They are not terminal/expired/canceled/hidden.
- They are active or scheduled.
- End time has not passed.
- Coming Soon applies if configured and current date is inside the coming soon window before the event start.

---

## 14. Public visibility rules for all listing types

A listing is hidden if it has a terminal status or terminal timestamp.

Terminal hidden statuses include:

- `expired`
- `canceled`
- `cancelled`
- `deleted`
- `removed`
- `hidden`
- `suspended`
- `rejected`
- `closed`
- `completed`

Terminal timestamp fields also hide a listing:

- `canceled_at`
- `cancelled_at`
- `deleted_at`
- `removed_at`
- `expired_at`

Draft/payment statuses hidden publicly:

- `draft`
- `pending_payment`
- `payment_pending`

Coordinate rule:

- Listings must have valid numeric latitude and longitude.

Payment rule:

- Events are treated as payment-valid after creation.
- Paid residential tiers need a public-valid payment state.
- Accepted paid states include `paid`, `skipped_admin_promo`, or `waived`.
- Captured payment intent is also treated as valid.
- Blocked payment states include `pending`, `failed`, `unpaid`, `none`, `canceled`, `cancelled`, `requires_payment_method`, and `requires_payment_action`.

---

## 15. Coming Soon / preview visibility

### Residential Premium Coming Soon

Residential Premium can show as Coming Soon when:

- Early visibility is enabled.
- Visibility start date is before the listing start date.
- Today is between visibility start date and listing start date.
- Or `earlyVisibilityDates` / `earlyVisibilityDays` places today inside the early window.

### Event Coming Soon

Residential Events can show as Coming Soon when:

- Event has a configured coming soon start date.
- Current time is after that coming soon start.
- Current time is before event start.

### Owner preview

Owners can see some non-public/pre-live listings in preview mode when:

- They own the listing.
- Listing is not draft.
- Listing is not terminal/expired.
- Listing has valid coordinates.
- Listing has enough basic label data.
- Status is previewable, such as active, scheduled, upcoming, coming soon, pending, under review, collecting participants, ready for payment, payment pending adjustment, activated, or activated locked.

Preview pins are faded and labeled as preview.

---

## 16. Map zoom priority rules

The map does not show every listing pin at every zoom level. Higher-value or broader-visibility listings appear earlier.

### Residential yard sale individual pin thresholds

| Type / Tier | Individual pin appears at |
|---|---:|
| Premium yard sale | Zoom 11+ |
| Featured yard sale | Zoom 13+ |
| Map pin tier | Zoom 13+ |
| Free/default yard sale | Zoom 15+ |

### Neighborhood Sale pin threshold

| Type | Individual pin appears at |
|---|---:|
| Neighborhood Sale | Zoom 12+ |
| Neighborhood participant homes | Zoom 18+ |

### Residential Event pin thresholds

| Event visibility | Individual pin appears at |
|---|---:|
| Marquee event | Zoom 11+ |
| Premium event | Zoom 12+ |
| Featured event | Zoom 13+ |
| Basic/default event | Zoom 14+ |

### Marquee special zoom rules

- Marquee listing can appear starting around **zoom 10+**.
- Marquee board overlay appears at **zoom 12+**.
- Marquee board can be collapsed or expanded.
- Marquee board state persists across zoom changes.
- Other nearby pins overlapped by the visual marquee board can be hidden so the board stays readable.
- Hidden overlapped listings can be reviewed through the hidden listings overlay.

### Temporary Show Listings rule

The **Show Listings** button temporarily bypasses normal zoom reveal behavior for about 3 seconds, making eligible listings appear even if they would normally be clustered at the current zoom.

### Premium fallback rule

If no pins are visible, there are active eligible listings, and the map is at **zoom 11+**, the map can reveal active Premium residential pins as a fallback.

---

## 17. Clustering rules

When listings should not yet appear as individual pins, they can be grouped into clusters.

### Cluster algorithm

- Clustering is pixel-distance based.
- Cluster radius: **50 pixels**.
- Minimum points per cluster: **2**.
- A cluster is formed when two or more points are within the cluster radius at the current map zoom.
- Cluster location is the average latitude/longitude of grouped points.

### Cluster display styles

| Cluster count | Color | Radius |
|---:|---|---:|
| 25+ | Gold `#F4A849` | 20 |
| 10–24 | Teal `#5DADA5` | 16 |
| 2–9 | Teal `#5DADA5` | 14 |

All cluster markers use:

- Dark teal border `#2C4F4E`.
- White text.
- Bold count label.
- Drop shadow.

### Cluster click behavior

Clicking a cluster zooms the map in by 2 levels, capped at zoom 18.

```text
new zoom = min(current zoom + 2, 18)
```

---

## 18. Map quick filters

The floating map filters can toggle these groups on/off:

- Yard Sales
- Neighborhood Sales
- Events
- Vendors

For this guide, the first three are relevant. Vendor behavior is outside the scope of this document.

If a filter is off, matching listings are not shown on the map even if they otherwise pass visibility rules.

---

## 19. Map search behavior

Search checks fields such as:

- Title
- Description
- Categories
- Category
- Display address
- Address text
- City

If a search exactly matches a listing title or listing number, normal exact match behavior is preserved.

If a search matches a city exactly, the map centers on the average location of valid listings in that city and sets a city-level zoom around zoom 12.

Fuzzy matching is used when strict matches do not return results.

---

## 20. List view rules

List View is separate from Map View.

### Public visibility gate

List View starts from listings that pass public/owner-preview visibility rules.

### Default tier filter

List View defaults to showing:

- Premium
- Featured

This means Free listings may not appear by default unless filters are changed.

### List View supported filters

List View can filter by:

- Tier
- Listing type
- Category
- Date
- Distance
- Search query

### List View search fields

Search can match:

- Title
- Event name
- Description
- Event description
- City
- State
- ZIP
- Address fields
- Listing number
- Listing type
- Category
- Collectible type
- Event category
- Event type
- Categories array

### List View sorting

List View sorts by:

1. Distance ascending, if user/map location is available.
2. Tier priority.
3. Soonest start time.

### Tier priority order in List View

Lower number = higher priority.

| Listing type / tier | Priority |
|---|---:|
| Marquee event | 1 |
| Premium event | 2 |
| Featured/event default | 3 |
| Basic event | 4 |
| Neighborhood Sale | 5 |
| Premium yard sale | 6 |
| Featured yard sale | 7 |
| Basic yard sale | 8 |
| Free/default yard sale | 9 |

List View returns up to 20 results.

---

## 21. Map marker visual hierarchy

### Residential yard sales

- Premium:
  - Teal fill.
  - Gold stroke.
  - Larger pin.
- Featured / map pin:
  - Teal fill.
  - Dark teal stroke.
  - Medium pin.
- Free/default:
  - Gray fill.
  - Gray stroke.
  - Smaller pin.

### Neighborhood Sales

- Neighborhood Sales use a treasure chest-style marker.
- Marker size scales by home count:
  - 5+ homes: 1.05 scale.
  - 12+ homes: 1.2 scale.
  - 20+ homes: 1.35 scale.
- Badge shows the home count.

### Neighborhood participant homes

- Participant homes use a small teal dot marker with white border.
- They only show at close zoom when the participant view is allowed.

### Residential Events

- Event marker icon is based on event category/icon/add-ons.
- Marquee events receive special large board-style map presentation.
- Event animation add-on can create pulse or bounce behavior.

---

## 22. Public popup behavior

Public map popups can show:

- Listing type badge.
- Tier/status badge.
- Title or event name.
- Description.
- Address/display address.
- Schedule text.
- Categories.
- View Listing / Public View button.
- Save Listing button.
- Report button.
- Add Stop / route planning controls for eligible residential listings.

Preview listings show a preview warning instead of normal public details.

---

## 23. Route / Hunt behavior outside vendor tools

For public residential listings:

- Users can add eligible stops to their route/hunt.
- Guest users can preview a limited number of stops.
- Check-in requires the user to be within about **50 feet** of the listing location.
- Check-in states include not started, arrived, completed, and skipped.

Events are excluded from normal yard-sale Hunt stop behavior in the current popup logic.

---

## 24. Payment and non-refund notes

### Residential yard sales

- Featured and Premium go through Stripe unless waived or promo-covered.
- Non-refund acknowledgement is required.
- Promo codes can apply to residential yard sale checkout where enabled.

### Residential Events

- Events go through Stripe payment.
- Non-refund acknowledgement is required.
- Promo input is disabled for residential events.

### Neighborhood Sales

- Organizer pays once the neighborhood sale reaches the required state/count.
- Participants are not charged.

---

## 25. Admin / demo notes for training

### Demo Mode

Demo Mode changes testing behavior, but payment processing still uses the live Stripe flow.

Currently documented Demo Mode changes:

- Address testing is unlocked.
- One-listing test limit is unlocked.
- Stripe payment flow remains live.

### Common tester issue

If a tester cannot create a listing for dates at an address, check for:

- Existing active listing.
- Draft listing.
- Pending payment listing.
- Any address/date reservation conflict.

---

## 26. Quick cheat sheet

### Residential tier quick rules

| Tier | Price | Dates | Photos | Early advertising | Map pin zoom |
|---|---:|---|---:|---|---:|
| Free | $0 | Locked Fri 5 AM–Sun 10 PM | 3 | No | 15+ if map-eligible |
| Featured | $4.99 | 1–3 consecutive days | 10 | No | 13+ |
| Premium | $7.99 | 1–5 consecutive days | 25 | 0–3 days | 11+ |

### Neighborhood quick rules

| Rule | Value |
|---|---:|
| Minimum homes | 5 |
| Maximum counted homes | 25 |
| Lead time | 7 days |
| Area radius | 500 ft |
| Base price | $19.99 |
| Per approved home | $2 |
| Main map visible | Coming Soon or Active + 5 homes |
| Participant pin zoom | 18+ |

### Residential Event quick rules

| Rule | Value |
|---|---:|
| Base price | $9.99 |
| Event length | 1 calendar day |
| Premium visibility add-on | $1.99 |
| Animation add-on | $3.99 |
| Flyer upload add-on | $2.99 |
| Photo gallery add-on | $1.99, up to 10 photos |
| Custom icon add-on | $4.99 |
| Marquee add-on | $9.99 |
| Coming Soon packages | 3, 7, or 14 days |

### Map zoom quick rules

| Listing | Pin zoom |
|---|---:|
| Premium yard sale | 11+ |
| Featured yard sale | 13+ |
| Free yard sale | 15+ |
| Neighborhood Sale | 12+ |
| Neighborhood participant | 18+ |
| Marquee event | 11+ |
| Premium event | 12+ |
| Featured event | 13+ |
| Basic/default event | 14+ |

---

## 27. Teaching summary

The simple way to teach the system:

1. **Free yard sales** are basic weekend listings with limited photos and lowest visibility.
2. **Featured yard sales** are the recommended paid option for stronger local visibility and up to 3 days.
3. **Premium yard sales** are the highest residential yard sale tier with the best zoom priority, most photos, up to 5 days, and optional early advertising.
4. **Neighborhood Sales** are organizer-led group events that need at least 5 homes and are priced by approved home count.
5. **Residential Events** are one-day community events with a $9.99 base package and optional add-ons for visibility, media, icons, coming soon, and marquee presentation.
6. **Map visibility is controlled by status, payment, dates, open hours, coordinates, listing type, tier, and zoom level.**
7. **Clusters are used when listings should not appear as individual pins yet. Higher-value listings appear earlier as users zoom out/in.**