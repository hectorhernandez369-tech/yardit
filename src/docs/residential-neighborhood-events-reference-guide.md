# Yardit Training Guide — Residential Yard Sales, Neighborhood Sales, and Residential Events

_Last updated: June 19, 2026_

This guide explains the public Yardit flows outside the Vendor Dashboard in plain English. It is written as a training document for learning how Yardit handles residential yard sales, neighborhood sales, residential events, address verification, time rules, map visibility, zoom priority, clustering, and examples.

This guide does not cover Vendor Dashboard tools or assisted listing QR code flows.

---

## 1. The three public listing types

Yardit has three main public listing types outside the Vendor Dashboard.

### 1. Individual Yard Sale

This is a regular residential yard sale at one home.

The seller chooses one of three visibility tiers:

- Free
- Featured
- Premium

The listing is tied to the seller’s verified home address.

Example:

A homeowner wants to sell furniture, clothes, and toys from their driveway this Saturday. They create an individual yard sale.

---

### 2. Neighborhood Sale

This is one organized sale event that brings several nearby homes together under one shared event.

The organizer chooses the sale area, invites neighbors, approves participants, and pays the neighborhood sale cost once it is ready.

Participants join free.

Example:

A person on Oak Street wants five or more nearby homes to hold sales on the same weekend. They create a Neighborhood Sale, share the invite link, approve neighbors, and Yardit shows the neighborhood as one larger event.

---

### 3. Residential Event

This is a one-day local event outside the Vendor Dashboard.

Examples include:

- Church event
- School fundraiser
- Charity event
- Community event
- Holiday event
- Sports event
- Open house
- Car show
- Food event
- Craft fair
- Family event

Residential Events have a base event package and optional add-ons.

Example:

A church is hosting a Saturday fundraiser from 10 AM to 2 PM. They create a Residential Event, choose the church address, pick the event category, and add optional visibility upgrades.

---

## 2. Address verification for individual residential yard sales

Address verification is one of the most important rules in Yardit.

A normal residential yard sale must use the seller’s verified primary home address. Yardit does this to prevent users from posting fake sales, posting at someone else’s house, or moving a residential listing far away from their confirmed address.

---

## 3. What “verified address” means

A user is considered address verified only when Yardit has both:

1. A confirmed address flag on the user account.
2. Complete address details saved on the user account.

Complete address details means Yardit has:

- Street address
- City
- State
- ZIP code
- Latitude
- Longitude

This matters because an account might have an old verification flag, but if the actual address fields are missing, Yardit should not let that user post a residential sale.

Example:

If Sarah’s account says “address verified,” but her street address or coordinates are missing, Yardit treats the address as not ready. She must confirm her address again before posting.

---

## 4. How a user verifies an address

When a user does not already have a verified address, Yardit asks them to confirm one during the listing flow.

The process works like this:

1. The user enters their street address, city, state, and ZIP code.
2. Yardit searches for matching addresses.
3. The user must select one of the suggested address matches.
4. Yardit saves the selected address as the user’s verified home address.
5. Yardit saves the address coordinates and timezone.
6. The user can then continue creating the listing.

The important point is that typing an address is not enough. The user must select and confirm a suggested address match.

Example:

John types “123 Main St, Fresno, CA 93720.” Yardit finds a matching address suggestion. John taps that suggestion and confirms it. Now Yardit saves it as his verified primary address and allows him to continue.

---

## 5. Why the verified address becomes locked

Once the user has a verified address, Yardit uses that address as the trusted source for individual residential yard sales.

In Live Mode:

- The sale address comes from the verified profile address.
- The seller cannot freely change the sale to a different house.
- The map pin can only be adjusted slightly for map accuracy.
- If the selected location is too far away from the verified home, Yardit blocks publishing.

The current allowed distance is about 500 feet from the verified home. This is meant to allow small map corrections, not a different location.

Example:

Maria’s verified address is 55 Pine Ave. She can slightly adjust the pin if the map places it on the wrong side of the street. But she cannot move the sale pin two miles away to a park or another person’s house.

---

## 6. Individual yard sale creation flow

The normal yard sale flow is:

1. Enter sale details.
2. Confirm the home address.
3. Choose a tier.
4. Add photos.
5. Choose dates if using Featured or Premium.
6. Choose open and close times.
7. Review and publish or pay.

Free listings publish without payment.

Featured and Premium listings go to payment before final publishing.

Example:

A user chooses Featured, selects Saturday and Sunday, uploads six photos, sets open hours from 8 AM to 1 PM, reviews the listing, accepts the non-refundable notice, and pays.

---

## 7. The difference between sale dates and open hours

This is one of the most important rules in the system.

Yardit uses two separate time ideas:

1. The full date window for the listing.
2. The daily open and close times shown to shoppers.

They are not the same thing.

---

## 8. The full date window

The full date window tells Yardit which calendar dates the listing belongs to.

For Featured and Premium yard sales:

- The listing date window starts at 5:00 AM on the first selected date.
- The listing date window ends at 10:00 PM on the last selected date.

This wide window helps Yardit manage the listing lifecycle, date reservations, and expiration.

It does not mean the sale is visible as open all day.

Example:

A seller chooses Saturday only. Yardit treats the listing’s full date window as Saturday from 5:00 AM to 10:00 PM.

But if the seller’s open hours are 8:00 AM to 2:00 PM, shoppers should only see it as open during 8:00 AM to 2:00 PM.

---

## 9. Open and close times

Open and close times are the seller’s actual shopper-facing sale hours.

For individual yard sales:

- The open time cannot be earlier than 5:00 AM.
- The close time cannot be later than 10:00 PM.
- The open time must be before the close time.
- The sale is only publicly visible as active during those open hours.

Example:

A seller chooses:

- Date: Saturday
- Open time: 9:00 AM
- Close time: 3:00 PM

Yardit’s full date window is Saturday 5:00 AM to 10:00 PM, but the sale is only visible to shoppers as active from 9:00 AM to 3:00 PM.

---

## 10. Example: one-day Featured yard sale

A seller creates a Featured yard sale.

They choose:

- Date: Saturday
- Open time: 8:00 AM
- Close time: 2:00 PM

What happens:

- Before Saturday 5:00 AM, the listing has not reached its full date window yet.
- From 5:00 AM to 7:59 AM, the listing is inside the date window but is not open to shoppers yet.
- From 8:00 AM to 2:00 PM, the listing is visible as active/open.
- After 2:00 PM, the listing is outside the seller’s open hours.
- After 10:00 PM, the listing is considered ended for that date window.

Plain English summary:

The 5 AM to 10 PM window is the system’s daily boundary. The seller’s open and close times are what shoppers actually care about.

---

## 11. Example: three-day Premium yard sale

A seller creates a Premium sale.

They choose:

- Dates: Friday through Sunday
- Open time: 9:00 AM
- Close time: 4:00 PM

What happens:

- Yardit reserves Friday, Saturday, and Sunday.
- The full listing window begins Friday at 5:00 AM.
- The full listing window ends Sunday at 10:00 PM.
- The sale can be shown as open only from 9:00 AM to 4:00 PM on each selected day.

Plain English summary:

Premium gives the seller multiple calendar days, but each day still follows the seller’s daily open and close times.

---

## 12. Free yard sale rules

Free yard sales use a locked weekend schedule.

The seller does not choose future dates for Free listings.

Free listing schedule:

- Friday 5:00 AM through Sunday 10:00 PM.
- If the user creates the listing during that weekend window, it can activate immediately.
- If the user creates it outside that weekend window, it is scheduled for the next Friday.

Photo limit:

- Up to 3 photos.

Map visibility:

- Free listings have the lowest map priority.
- They generally require close zoom before showing as individual pins.

Example:

A user creates a Free listing on Wednesday. Yardit schedules it for the upcoming Friday at 5:00 AM through Sunday at 10:00 PM.

Example:

A user creates a Free listing on Saturday at 10:00 AM. Since it is already inside the active weekend window, Yardit can activate it right away and keep it active until Sunday at 10:00 PM.

---

## 13. Featured yard sale rules

Featured is the recommended paid residential tier.

Price:

- $4.99

Date rules:

- Seller chooses 1 to 3 consecutive days.

Photo limit:

- Up to 10 photos.

Map visibility:

- Stronger than Free.
- Shows as an individual map pin sooner than Free when users zoom in.

Example:

A seller wants a Saturday and Sunday yard sale with several photos. Featured is a good fit because it supports up to 3 consecutive days and 10 photos.

---

## 14. Premium yard sale rules

Premium is the highest residential yard sale tier.

Price:

- $7.99

Date rules:

- Seller chooses 1 to 5 consecutive days.

Photo limit:

- Up to 25 photos.

Early advertising:

- Seller can choose up to 3 days of early advertising before the sale starts.
- Early advertising shows the listing as Coming Soon.
- Early advertising does not mean the sale is open early.

Map visibility:

- Premium has the best residential yard sale map priority.
- Premium pins appear at wider zoom levels than Featured and Free.

Example:

A seller wants a Friday through Monday estate sale with many photos and wants people to see it early. Premium is the right choice because it supports up to 5 days, 25 photos, and early advertising.

---

## 15. Early advertising and Coming Soon

Coming Soon means the listing can be advertised before the sale starts.

It does not mean the seller is open for shoppers.

For Premium yard sales:

- The seller may choose 0 to 3 early advertising days.
- During that early window, shoppers may see the listing as Coming Soon.
- When the sale date arrives and the open time is reached, the sale becomes active/open.

Example:

A Premium sale starts Saturday at 8:00 AM. The seller chooses 2 early advertising days.

Yardit can show it as Coming Soon on Thursday and Friday. It should not show as open until Saturday at 8:00 AM.

---

## 16. Date conflict rules for residential yard sales

Yardit prevents overlapping yard sales at the same verified address.

The same home can have multiple listings over time, but the dates cannot overlap.

Example:

A seller has a Featured sale scheduled for Saturday and Sunday. They try to create another yard sale at the same address for Sunday. Yardit blocks it because Sunday is already reserved.

Example:

A seller has a sale scheduled for Saturday. They create a new sale for the following Saturday. Yardit allows it because the dates do not overlap.

---

## 17. Which listings can reserve dates

A listing can reserve dates if it is active, scheduled, under review, coming soon, or waiting on payment.

This means a listing does not have to be fully live to block the same dates.

Examples of listings that can block dates:

- Active listing
- Scheduled listing
- Coming Soon listing
- Pending payment listing
- Payment adjustment listing
- Under review listing

Expired listings do not continue blocking future dates after their end time has passed.

Example:

A seller starts checkout for a Premium listing, but payment is still pending. That listing can still reserve those dates so another overlapping listing is not created while payment is being completed.

---

## 18. Early advertising dates can also reserve dates

Premium early advertising dates can count as reserved dates.

Example:

A Premium sale is scheduled for Saturday and Sunday, with 2 early advertising days on Thursday and Friday.

Yardit may treat Thursday, Friday, Saturday, and Sunday as protected dates for that address. This prevents a second listing from interfering with the Premium promotion window.

---

## 19. Neighborhood Sale overview

A Neighborhood Sale groups several nearby homes into one larger event.

The organizer:

- Creates the event.
- Chooses the center of the sale area.
- Confirms a host address inside the area.
- Invites neighbors.
- Reviews and approves participants.
- Pays when enough homes are approved.

Participants:

- Join for free.
- Request to join.
- Must be approved.

Example:

A homeowner wants to organize a block-wide sale. They create the Neighborhood Sale, choose the center of the block, invite nearby homes, and approve participants as they join.

---

## 20. Neighborhood Sale area and host address

Neighborhood Sales use two location ideas:

1. Sale center
2. Host address

The sale center is the middle of the 500-foot Neighborhood Sale radius.

The host address is the confirmed home address that anchors the sale.

The host address must be inside the 500-foot radius.

Example:

An organizer drops the sale center pin in the middle of Oak Street. Their own verified address is 250 feet from that center. Yardit allows their address to be used as the host address.

Example:

An organizer drops the sale center pin in another neighborhood two miles away. Their own verified address is not inside the 500-foot radius. Yardit requires an alternate host/co-host address inside the radius.

---

## 21. Neighborhood Sale alternate host flow

If the organizer does not live inside the selected 500-foot radius, they must use an alternate host.

The alternate host flow works like this:

1. Organizer enters an alternate host address.
2. Yardit checks that the address is inside the 500-foot radius.
3. If a user account already exists at that confirmed address, Yardit can send a co-host request.
4. If no account exists yet, Yardit can provide an invite link.
5. The host must create or have an account, confirm the matching address, and accept.
6. The Neighborhood Sale cannot use that address until the host accepts.

Example:

A PTA parent wants to organize a Neighborhood Sale near the school but does not live there. They choose a parent who lives inside the radius as the host. That parent must confirm their address and accept the co-host request before the sale can continue.

---

## 22. Neighborhood Sale date rules

Neighborhood Sales have their own date rules.

Rules:

- Must be scheduled at least 7 days in advance.
- Can run up to 3 days total.
- End date cannot be before start date.
- The system uses 5:00 AM on the start date through 10:00 PM on the end date as the broad event window.

Example:

Today is June 1. A Neighborhood Sale cannot start on June 3 because that is less than 7 days away. It must start June 8 or later.

Example:

An organizer chooses Friday through Sunday. That is 3 days, so it is allowed. Friday through Monday would be 4 days, so it is blocked.

---

## 23. Neighborhood Sale participation rules

Minimum homes:

- At least 5 homes are required for the Neighborhood Sale to be ready.

Maximum counted homes:

- Up to 25 homes are counted for pricing.

Organizer count:

- If the organizer is hosting a sale at their own address, they count as one home.
- If the organizer is only organizing and not hosting a sale, they do not count as a participant home.

Participants:

- Join free.
- Must request to join.
- Must be approved.
- Can be removed by the organizer or by their own action.

Example:

The organizer is also selling at home, and four neighbors are approved. That equals 5 homes, so the Neighborhood Sale reaches the minimum.

Example:

The organizer is only organizing and not selling. Five neighbors must be approved before the sale reaches the minimum.

---

## 24. Neighborhood Sale pricing

Neighborhood Sale pricing:

- $49.99 total flat price.
- Covers 5 to 25 approved participating homes.
- Participants do not pay.
- Organizer pays.

Example:

A Neighborhood Sale has 6 approved homes.

Price is:

$49.99 total.

Example:

A Neighborhood Sale has only 4 homes. It has not reached the 5-home minimum, so it is not ready for paid activation yet.

---

## 25. When a Neighborhood Sale appears publicly

A Neighborhood Sale appears on the public map only when it is ready enough to show.

It must:

- Be active or in Coming Soon state.
- Have at least 5 homes.
- Have valid map coordinates.
- Not be canceled, hidden, removed, or expired.

Example:

A Neighborhood Sale has 3 approved homes. It is still being built and does not appear publicly as a full Neighborhood Sale yet.

Example:

A Neighborhood Sale has 6 approved homes, has been activated, and the event window is approaching. Yardit can show it publicly as Coming Soon or active depending on timing.

---

## 26. Neighborhood participant display rules

Participant homes do not behave exactly like normal standalone yard sale pins.

A participant home can show under the Neighborhood Sale only when:

- The Neighborhood Sale itself is visible.
- The participant listing is active.
- The participant was approved.
- The participant was not removed or canceled.
- The participant’s sale dates overlap the Neighborhood Sale dates.
- Today is inside that overlap.

Participant homes appear only at very close zoom.

Example:

The Neighborhood Sale runs Friday through Sunday. A participant is approved but only sells Saturday. Their home should show as a participant on Saturday, not necessarily on Friday or Sunday.

---

## 27. Residential Event flow

Residential Events are one-day local events outside the Vendor Dashboard.

The flow is:

1. Enter event name, description, and category.
2. Choose event location by address search or map pin.
3. Choose event date, start time, and end time.
4. Choose optional add-ons.
5. Review and pay.

Example:

A school fundraiser is happening Saturday from 11 AM to 3 PM. The organizer creates a Residential Event, picks the school address, selects “School Fundraiser,” chooses the event time, optionally uploads a flyer, and pays.

---

## 28. Residential Event schedule rules

Residential Events are limited to one calendar day.

Rules:

- Event date is required.
- Start time is required.
- End time is required.
- End time must be after start time.
- Multi-day events require Vendor Events or Event Organizer tools.

Example:

A charity car wash runs Saturday from 9 AM to 1 PM. This is allowed as a Residential Event.

Example:

A festival runs Friday, Saturday, and Sunday. This is not a Residential Event. It should use Vendor Events or Event Organizer tools.

---

## 29. Residential Event address and location rules

Residential Events can use an event location instead of the user’s verified home address.

The user can:

- Search for an event address.
- Drop a pin on the map.
- Edit the public display address.

This is different from individual residential yard sales, which are tied to the seller’s verified home address.

Example:

A church fundraiser can use the church address, even if the organizer’s home address is somewhere else.

Example:

A community cleanup meeting at a park can use the park location as the event location.

---

## 30. Residential Event pricing

Base Residential Event package:

- $9.99

Includes:

- Event detail page
- Event map pin
- Standard category icon
- One-day event listing
- Local visibility

Optional add-ons:

- Premium visibility: $1.99
- Animation: $3.99
- Flyer upload: $2.99
- Photo gallery: $1.99
- Custom icon: $4.99
- Marquee: $9.99

Coming Soon packages:

- 3 days: $2.99
- 7 days: $4.99
- 14 days: $7.99

Example:

A school chooses the base event package and flyer upload. The base is $9.99 and flyer upload is $2.99, so the total is $12.98.

Example:

A large fundraiser chooses base event, premium visibility, flyer upload, and marquee. It pays more, but receives much stronger presentation on the map.

---

## 31. Residential Event visibility levels

Residential Events do not use the same Free, Featured, and Premium picker as yard sales.

Instead, visibility is based on add-ons:

- If Marquee is selected, it gets the strongest event presentation.
- If Premium Visibility is selected, it gets stronger visibility than the base event.
- If neither is selected, it uses the standard event visibility.

Example:

A simple community meetup uses the base event package. It appears as a standard event.

Example:

A major charity event chooses Marquee. It receives the large event-board style presentation on the map.

---

## 32. Public map visibility rules

A listing must pass several checks before it appears publicly.

A listing is hidden if:

- It is expired.
- It is canceled.
- It is deleted or removed.
- It is hidden or suspended.
- It is rejected or closed.
- It does not have valid coordinates.
- It is a draft.
- It is waiting for payment and not ready to show.
- It is a yard sale outside its open hours.
- It is a yard sale outside its active dates.

Example:

A Premium sale is paid and scheduled for Saturday, but today is Wednesday. If it does not have early advertising, it should not show publicly yet.

Example:

A sale ended yesterday. Even if it still exists in the database, it should not appear publicly as active.

---

## 33. Owner preview

Owners may be able to preview some of their own listings before the public can see them.

Preview listings are usually faded or labeled as preview.

This helps the owner understand what will appear later without making it public early.

Example:

A seller schedules a Premium sale for next weekend. They may see a preview of their own listing, but shoppers do not see it until the public visibility rules allow it.

---

## 34. Map zoom priority rules

Yardit does not show every pin at every zoom level.

Higher-priority listings appear sooner. Lower-priority listings require closer zoom or appear inside clusters.

General yard sale zoom priority:

- Premium yard sales appear before Featured.
- Featured yard sales appear before Free.
- Free yard sales require the closest zoom.

General event zoom priority:

- Marquee events appear before Premium-style events.
- Premium-style events appear before standard events.
- Standard/basic events require closer zoom.

Neighborhood Sales:

- Neighborhood Sale markers appear before individual participant homes.
- Participant homes appear only at very close zoom.

Example:

At a city-level zoom, a Premium sale may appear while a Free sale is still hidden inside a cluster.

Example:

A shopper zooms closer into a neighborhood. Featured and Free sales begin appearing individually as the map gets closer.

---

## 35. Practical zoom examples

Approximate current behavior:

- Premium yard sale: individual pin around zoom 11 and closer.
- Featured yard sale: individual pin around zoom 13 and closer.
- Free yard sale: individual pin around zoom 15 and closer.
- Neighborhood Sale: individual marker around zoom 12 and closer.
- Neighborhood participant homes: individual participant dots around zoom 18 and closer.
- Marquee event: visible earlier than normal events and can show a board-style display.
- Standard event: requires closer zoom than upgraded events.

Example:

A shopper viewing the whole city may see upgraded listings first. As they zoom into a specific neighborhood, more individual pins appear.

---

## 36. Clustering rules in plain English

When too many listings are close together or the user is zoomed too far out, Yardit groups them into clusters.

A cluster is a circle with a number inside it.

The number tells the shopper how many listings are grouped nearby.

Clicking a cluster zooms the map closer.

Example:

There are 12 yard sales in the same neighborhood, but the shopper is zoomed out. Instead of showing 12 overlapping pins, Yardit shows one cluster marker with “12.” When the shopper taps it, the map zooms closer and begins separating the listings.

---

## 37. Cluster size and color

Clusters visually change based on how many listings they contain.

Small cluster:

- Used for a few nearby listings.
- Teal color.

Medium cluster:

- Used for more nearby listings.
- Teal color with a larger size.

Large cluster:

- Used for many nearby listings.
- Gold color and larger size.

Example:

A cluster with 3 listings is a smaller teal circle. A cluster with 30 listings is a larger gold circle.

---

## 38. Show Listings button

The Show Listings button temporarily reveals eligible listings that might otherwise still be clustered or hidden by zoom priority.

It is temporary and lasts only a few seconds.

Example:

A shopper is zoomed out and wants to quickly see what listings are nearby. They tap Show Listings, and Yardit briefly reveals more eligible pins before returning to normal zoom behavior.

---

## 39. Marquee event behavior

Marquee events are designed for maximum visibility.

They can show as a large board-style display on the map.

The board can collapse or expand.

If the board overlaps smaller nearby pins, Yardit may hide those smaller pins temporarily so the board remains readable.

The user can still view the hidden nearby listings through the overlay option.

Example:

A large charity festival buys Marquee. On the map, it appears as a large event board. A nearby standard event pin would overlap the board, so Yardit hides the smaller pin until the user asks to view hidden nearby listings.

---

## 40. Map filters

The map has quick filters for:

- Yard Sales
- Neighborhood Sales
- Events
- Vendors

This guide focuses on Yard Sales, Neighborhood Sales, and Events.

If a filter is turned off, that type is hidden even if the listing would normally qualify.

Example:

If Events are turned off, a church fundraiser will not show on the map until Events are turned back on.

---

## 41. Search behavior

Search can match things like:

- Listing title
- Event name
- Description
- Category
- Address
- City
- Listing number

If the user searches a city name, Yardit can center the map around listings in that city.

Example:

A shopper searches “Fresno.” Yardit finds listings in Fresno and moves the map toward that area.

Example:

A shopper searches “toys.” Yardit can match listings with “toys” in the title, description, or category.

---

## 42. List view behavior

List View is separate from Map View.

The map is controlled heavily by zoom and clusters.

List View is controlled by filters, distance, visibility, and sorting.

List View can filter by:

- Tier
- Type
- Category
- Date
- Distance
- Search

List View usually prioritizes:

1. Closest listings first.
2. Higher visibility tiers next.
3. Soonest start time next.

Example:

If two sales are both nearby, the Premium sale may rank above the Featured sale when distance is similar.

Example:

If one sale is 0.5 miles away and another is 10 miles away, the closer sale usually appears first unless filters change the result.

---

## 43. Payment rules

Individual yard sales:

- Free does not require payment.
- Featured requires payment unless covered by promo/admin waiver.
- Premium requires payment unless covered by promo/admin waiver.

Residential Events:

- Base event and selected add-ons require payment.
- Promo input is not used for Residential Events in the current event checkout.

Neighborhood Sales:

- Organizer handles the cost.
- Participants join free.
- A payment method may be collected for the organizer as part of setup.

Non-refundable acknowledgement:

- Paid residential listings and events require the user to acknowledge the non-refundable notice before continuing.

Example:

A seller chooses Premium for $7.99. Before checkout, they must acknowledge that the payment is non-refundable.

---

## 44. Payment timing example for a paid yard sale

A user creates a Featured sale for Saturday.

Flow:

1. User enters details.
2. User confirms verified address.
3. User chooses Featured.
4. User selects Saturday.
5. User sets open hours.
6. User continues to payment.
7. Yardit checks date availability before checkout.
8. User pays.
9. Yardit checks date availability again after payment.
10. Yardit creates or links the final listing.
11. The listing is scheduled until its active window.

Why Yardit checks more than once:

Another listing could reserve the same date while the user is in checkout. Rechecking prevents duplicate overlapping sales at the same home.

---

## 45. Common training scenarios

### Scenario 1: User cannot post because address is not verified

What happened:

The account does not have a complete confirmed address with coordinates.

What to explain:

The user must select and confirm an address suggestion first. Yardit needs the verified home address before allowing a residential yard sale.

---

### Scenario 2: User says they changed the address but it keeps going back

What happened:

In Live Mode, individual residential yard sales are locked to the verified profile address.

What to explain:

A normal yard sale must happen at the verified home address. The user can only adjust the pin slightly for accuracy, not move the sale to another location.

---

### Scenario 3: User says their sale is not visible at 6 AM

What happened:

The sale may be inside the broad date window but outside the seller’s open hours.

What to explain:

The system window may begin at 5 AM, but shoppers only see the sale as open once the seller’s chosen open time arrives.

Example:

If open time is 8 AM, it should not appear as open at 6 AM.

---

### Scenario 4: User says their Premium sale is showing before the sale starts

What happened:

They may have early advertising enabled.

What to explain:

Premium can show as Coming Soon before the sale starts. That does not mean the sale is open early.

---

### Scenario 5: User gets a date unavailable message

What happened:

Another listing at the same address is already reserving one or more selected dates.

What to check:

- Active listings
- Scheduled listings
- Coming Soon listings
- Pending payment listings
- Payment adjustment listings
- Under review listings

What to explain:

Yardit prevents overlapping sales at the same verified address.

---

### Scenario 6: Neighborhood Sale cannot continue because host address is outside radius

What happened:

The host address is not within 500 feet of the selected sale center.

What to explain:

A Neighborhood Sale must be anchored to a confirmed host address inside the sale area. Either move the center or use an accepted alternate host inside the radius.

---

### Scenario 7: Neighborhood Sale is not public yet

What happened:

It may not have enough approved homes or may not be activated yet.

What to explain:

A Neighborhood Sale needs at least 5 homes and the right active or Coming Soon state before it appears publicly.

---

### Scenario 8: Event organizer wants a three-day event

What happened:

Residential Events are limited to one calendar day.

What to explain:

Multi-day events need Vendor Events or Event Organizer tools.

---

## 46. Quick reference: yard sale tiers

Free:

- No payment.
- Locked weekend schedule.
- Up to 3 photos.
- Lowest map priority.

Featured:

- $4.99.
- 1 to 3 consecutive days.
- Up to 10 photos.
- Recommended tier.
- Stronger map visibility than Free.

Premium:

- $7.99.
- 1 to 5 consecutive days.
- Up to 25 photos.
- Best residential yard sale visibility.
- Can use early advertising.

---

## 47. Quick reference: Neighborhood Sales

Main rules:

- 500-foot radius.
- Host address must be inside the radius.
- Must be scheduled at least 7 days in advance.
- Can run up to 3 days.
- Needs at least 5 homes.
- Organizer pays.
- Participants join free.
- Price is $49.99 total for 5 to 25 approved homes.
- Public visibility requires the right state and at least 5 homes.

---

## 48. Quick reference: Residential Events

Main rules:

- One calendar day only.
- Base price is $9.99.
- Uses event location, not necessarily the user’s home address.
- Requires event date, start time, and end time.
- End time must be after start time.
- Optional add-ons increase presentation and visibility.
- Multi-day events belong in Vendor/Event Organizer tools.

---

## 49. Simple teaching summary

Teach it this way:

1. Individual yard sales are tied to the seller’s verified home address.
2. The full date window is not the same thing as the seller’s open hours.
3. The 5 AM to 10 PM window is the system boundary for the selected dates.
4. The seller’s open and close times decide when shoppers see the sale as open.
5. Free is basic and weekend-based.
6. Featured is recommended for better visibility and up to 3 days.
7. Premium gives the best residential visibility, up to 5 days, more photos, and early advertising.
8. Neighborhood Sales need a 500-foot area, a confirmed host address, and at least 5 homes.
9. Residential Events are one-day community events with optional visibility add-ons.
10. The map uses zoom priority and clustering so higher-priority listings appear sooner and crowded areas stay readable.