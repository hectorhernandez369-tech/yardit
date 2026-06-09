import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { loadSavedLaunchChecklist, readLocalChecklist, saveLaunchChecklist } from '@/lib/launchChecklistStorage';

const CHECKLIST_SECTIONS = [
  {
    title: '✅ Phase 1 Master Test Setup & Sign-off',
    items: [
      { id: 'phase1-test-data', label: 'Use consistent test locations, including 874 Asheville St, Lindsay CA, for repeatable launch testing', description: 'Always use the same test address when creating test listings so that geolocation, maps, and location-based filters behave predictably. This ensures your team can verify the same features each time without surprises from random addresses.', critical: true, default: false },
      { id: 'phase1-new-user-flow', label: 'New user can sign up/log in, complete account setup, and reach Post Sale flow', description: 'Walk through the entire experience as a brand new user: create account, verify email, complete profile setup (name, address verification), and successfully navigate to the Post Sale button. Should flow smoothly with no blockers or missing steps.', critical: true, default: false },
      { id: 'phase1-returning-user-flow', label: 'Returning user can log in and manage existing listings without setup blockers', description: 'Log in with an existing account and verify you can immediately access My Listings, edit listings, and manage settings without being re-prompted for setup. All previously saved data should be intact.', critical: true, default: false },
      { id: 'phase1-mobile-desktop', label: 'All Phase 1 flows work on desktop and mobile screen sizes', description: 'Test creation, map discovery, detail views, payments, and support flows on both a desktop browser and mobile (iOS Safari, Android Chrome). Buttons should be tappable, text readable, and no horizontal scrolling or clipped elements.', critical: true, default: false },
      { id: 'phase1-no-console-errors', label: 'No visible crashes or blocking errors during core listing, map, payment, report, and support flows', description: 'Open browser console and check for JavaScript errors, failed API calls, or warnings while creating a listing, browsing the map, completing a payment, submitting a report, and contacting support. The app should remain stable and responsive.', critical: true, default: false },
      { id: 'phase1-final-freeze', label: 'Owner approves Phase 1 after all critical checks pass so residential launch files can be frozen', description: 'After all critical checklist items are complete, the app owner reviews the Phase 1 checklist and gives final sign-off. Once approved, all related code files are frozen to prevent accidental changes during launch.', critical: true, default: false },
    ]
  },
  {
    title: '🏠 Yard Sale Types — Free, Featured & Premium',
    items: [
      { id: 'ys-free-create-live', label: 'Free yard sale can be created and appears live without checkout', description: 'Create a free tier yard sale and verify it immediately shows on the map and in list view without requiring payment or a checkout step. The listing should be searchable and discoverable by other users.', critical: true, default: false },
      { id: 'ys-featured-create-pay', label: 'Featured yard sale reaches checkout, requires payment, and activates only after payment confirmation', description: 'Create a Featured yard sale, proceed through checkout, complete payment with Stripe, and confirm the listing only appears live after the payment webhook is processed. Unpaid Featured sales should not show publicly.', critical: true, default: false },
      { id: 'ys-premium-create-pay', label: 'Premium yard sale reaches checkout, requires payment, and activates only after payment confirmation', description: 'Create a Premium yard sale, proceed through checkout, complete payment, and verify it becomes live only after payment is confirmed. Check the map to ensure it displays with Premium tier styling.', critical: true, default: false },
      { id: 'ys-premium-early-days', label: 'Premium early visibility days display correctly before active sale dates', description: 'In Premium tier, set up early visibility days (e.g., 2 days before the sale starts). On the map and detail cards, verify early visibility dates show in a different color/status to indicate "coming soon" vs. "active now".', critical: false, default: false },
      { id: 'ys-upgrade-featured', label: 'Existing free yard sale can upgrade to Featured through confirmed checkout', description: 'Create a free yard sale, then use the upgrade button to change it to Featured. Complete the upgrade checkout and confirm the listing now shows as Featured on the map with the new tier styling.', critical: true, default: false },
      { id: 'ys-upgrade-premium', label: 'Existing free/featured yard sale can upgrade to Premium through confirmed checkout', description: 'Take a free or Featured yard sale and upgrade it to Premium. Complete the upgrade payment and verify the map reflects the new Premium status and benefits.', critical: true, default: false },
      { id: 'ys-cancel-checkout', label: 'Canceled yard sale checkout does not grant paid tier benefits', description: 'Start creating a Featured or Premium yard sale, reach checkout, then close the payment tab or cancel the payment. Verify the listing stays in free tier or is not created at all.', critical: true, default: false },
      { id: 'ys-owner-detail-card', label: 'Yard sale detail card shows title, photos, categories, address, dates, tier, save/share/report actions', description: 'Click on a yard sale on the map to open its detail card. Confirm all key info is visible: title, up to 4 photos, category badges, full address, date range, tier badge, and action buttons (Save, Share, Report, Edit/Upgrade if owner).', critical: true, default: false },
    ]
  },
  {
    title: '🏠 Residential Listings — Creation & Editing',
    items: [
      { id: 'res-create-free', label: 'Create a free residential yard sale from start to finish', critical: true, default: false },
      { id: 'res-create-featured', label: 'Create a Featured residential listing and reach payment step', critical: true, default: false },
      { id: 'res-create-premium', label: 'Create a Premium residential listing and reach payment step', critical: true, default: false },
      { id: 'res-required-fields', label: 'Required fields block submission when missing', critical: true, default: false },
      { id: 'res-address-search', label: 'Address search selects the correct sale location', critical: true, default: false },
      { id: 'res-map-pin', label: 'Map pin placement saves correct latitude/longitude', critical: true, default: false },
      { id: 'res-photo-upload', label: 'Listing photos upload, display, and remain attached after save', critical: false, default: false },
      { id: 'res-edit-details', label: 'Seller can edit title, description, categories, photos, and times', critical: true, default: false },
      { id: 'res-owner-access', label: 'Only listing owner/admin can edit or delete the listing', critical: true, default: false },
    ]
  },
  {
    title: '🏠 Residential Listings — Dates, Status & Expiration',
    items: [
      { id: 'res-date-conflict', label: 'Date conflict detection blocks overlapping listings at the same address', critical: true, default: false },
      { id: 'res-active-window', label: 'Listing appears active only during valid active dates/times', critical: true, default: false },
      { id: 'res-early-visibility', label: 'Premium early visibility dates display correctly before active sale days', critical: false, default: false },
      { id: 'res-status-scheduled', label: 'Future listings show as scheduled/coming soon instead of active', critical: true, default: false },
      { id: 'res-status-expired', label: 'Expired listings stop showing on public map/list views', critical: true, default: false },
      { id: 'res-status-completed', label: 'Completed listings remain in owner history but not public discovery', critical: true, default: false },
      { id: 'res-sync-status-job', label: 'Listing status sync job updates scheduled/expired listings correctly', critical: true, default: false },
      { id: 'res-stale-visibility', label: 'Stale Stripe IDs or old checkout sessions do not grant visibility', critical: true, default: false },
    ]
  },
  {
    title: '💳 Residential Payments & Promo Codes',
    items: [
      { id: 'res-stripe-secrets', label: 'Stripe live keys and webhook secret are configured', critical: true, default: false },
      { id: 'res-featured-checkout', label: 'Featured residential checkout creates a valid Stripe session', critical: true, default: false },
      { id: 'res-premium-checkout', label: 'Premium residential checkout creates a valid Stripe session', critical: true, default: false },
      { id: 'res-payment-success', label: 'Successful payment marks listing payment_status as paid', critical: true, default: false },
      { id: 'res-payment-cancel', label: 'Canceled checkout does not activate paid visibility', critical: true, default: false },
      { id: 'res-webhook-live', label: 'Stripe webhook receives payment event within 60 seconds', critical: true, default: false },
      { id: 'res-webhook-idempotent', label: 'Duplicate webhook events do not double-process listings/payments', critical: true, default: false },
      { id: 'res-payment-transaction', label: 'PaymentTransaction records include listing ID, user email, amount, tier, and Stripe IDs', critical: true, default: false },
      { id: 'res-upgrade-checkout', label: 'Listing upgrade checkout upgrades an existing listing only after payment confirmation', critical: true, default: false },
      { id: 'res-free-promo', label: '100% promo code completes zero-dollar pathway without Stripe charge', critical: true, default: false },
      { id: 'res-percent-promo', label: 'Percentage promo applies correct discount and final amount', critical: false, default: false },
      { id: 'res-promo-usage', label: 'Promo usage counts and per-user limits increment correctly', critical: false, default: false },
      { id: 'res-nonrefund', label: 'Non-refundable purchase acknowledgment is captured before payment', critical: false, default: false },
    ]
  },
  {
    title: '🏘️ Neighborhood Sales — Setup & Participants',
    items: [
      { id: 'ns-create-event', label: 'Organizer can create a neighborhood sale event from start to finish', critical: true, default: false },
      { id: 'ns-host-address', label: 'Host address is validated and saved correctly', critical: true, default: false },
      { id: 'ns-500ft-validation', label: '500 ft radius validation accepts valid participant addresses and blocks invalid ones', critical: true, default: false },
      { id: 'ns-organizer-participating', label: 'Organizer participating mode creates linked organizer sale listing', critical: true, default: false },
      { id: 'ns-organizer-only', label: 'Organizer-only mode does not create a personal sale listing', critical: false, default: false },
      { id: 'ns-invite-code', label: 'Invite code/share link routes users to join the correct neighborhood sale', critical: true, default: false },
      { id: 'ns-join-flow', label: 'Participant can join a neighborhood sale and create their sale listing', critical: true, default: false },
      { id: 'ns-join-status', label: 'Participant join status updates correctly through pending/approved/denied states', critical: true, default: false },
      { id: 'ns-cohost-invite', label: 'Co-host invite can be sent, accepted, declined, and finalized', critical: false, default: false },
      { id: 'ns-cohost-permissions', label: 'Accepted co-host receives proper access without taking over unrelated listings', critical: false, default: false },
    ]
  },
  {
    title: '🏘️ Neighborhood Sales — Payments, Deadlines & Expiration',
    items: [
      { id: 'ns-setup-intent', label: 'Initial payment method collection/setup intent works', critical: true, default: false },
      { id: 'ns-initial-charge', label: 'Initial neighborhood sale charge is captured on creation', critical: true, default: false },
      { id: 'ns-payment-pending', label: 'Payment pending state prevents unearned active visibility', critical: true, default: false },
      { id: 'ns-adjustment-charge', label: 'Adjustment charge pathway works when participant count changes', critical: true, default: false },
      { id: 'ns-hold-deadline', label: 'Payment hold/deadline fields are saved and displayed correctly', critical: true, default: false },
      { id: 'ns-deadline-warning', label: '48-hour and 24-hour deadline jobs identify eligible neighborhood sales', critical: false, default: false },
      { id: 'ns-cancel-deadline', label: 'Neighborhood sale cancels/downgrades correctly if deadline requirements are not met', critical: true, default: false },
      { id: 'ns-status-lifecycle', label: 'Neighborhood sale transitions through collecting, ready for payment, active, expired/cancelled correctly', critical: true, default: false },
      { id: 'ns-expired-map', label: 'Expired neighborhood sale and participant pins leave public map/list views', critical: true, default: false },
    ]
  },
  {
    title: '🎪 Event Listings',
    items: [
      { id: 'event-create-basic', label: 'Create Basic event listing with no checkout required', critical: true, default: false },
      { id: 'event-featured-checkout', label: 'Featured event checkout creates valid Stripe session', critical: true, default: false },
      { id: 'event-premium-checkout', label: 'Premium event checkout creates valid Stripe session', critical: true, default: false },
      { id: 'event-marquee-checkout', label: 'Marquee event checkout creates valid Stripe session', critical: false, default: false },
      { id: 'event-payment-confirm', label: 'Paid event visibility is granted only after webhook-confirmed payment', critical: true, default: false },
      { id: 'event-location', label: 'Event location/address displays correctly on public map and detail page', critical: true, default: false },
      { id: 'event-photos-logo', label: 'Event photos, flyer, and logo upload/display correctly', critical: false, default: false },
      { id: 'event-status-lifecycle', label: 'Event transitions through coming soon, active, completed, and expired correctly', critical: true, default: false },
      { id: 'event-promo-upgrade', label: 'Event promotion upgrade payment activates extra promotion days only after payment', critical: false, default: false },
      { id: 'event-marquee-board', label: 'Marquee flyer/background/schedule slots display correctly on map board', critical: false, default: false },
      { id: 'event-expired-hidden', label: 'Expired events stop appearing in public event discovery', critical: true, default: false },
    ]
  },
  {
    title: '🧾 Listing Detail Cards & Public Detail Pages',
    items: [
      { id: 'detail-yard-sale-card', label: 'Yard sale map/list detail card opens and displays the correct listing data', description: 'Click on a yard sale marker or list item and verify the detail card/page loads with all saved information: correct title, address, dates, photos, description, and categories.', critical: true, default: false },
      { id: 'detail-featured-premium-styling', label: 'Featured and Premium yard sale detail cards show the correct tier styling and benefits', description: 'Open a Featured or Premium yard sale detail card and confirm the tier is clearly labeled with appropriate badge styling. If Premium, verify early visibility dates and all benefits are highlighted.', critical: true, default: false },
      { id: 'detail-neighborhood-card', label: 'Neighborhood sale detail card shows organizer, participant count, join/share actions, and sale radius context', description: 'Click a Neighborhood Sale listing and verify the detail card shows the organizer\'s name, number of participants joined, a Join button (if user qualifies), Share button, map view of the neighborhood radius, and a list of participating homes.', critical: true, default: false },
      { id: 'detail-event-card', label: 'Event detail card shows event name, category, icon/logo, schedule, location, photos, and tier', description: 'Open an Event listing detail card and confirm it displays event name, category badge, category icon or logo, start/end dates and times, venue address, uploaded photos, and its tier level (Basic/Featured/Premium/Marquee).', critical: true, default: false },
      { id: 'detail-actions-auth', label: 'Save, share, report, join, edit, and upgrade actions appear only for eligible users', description: 'Check that only the listing owner sees Edit and Upgrade buttons, only logged-in users can Save/Report, only eligible users can Join (neighborhood sales), and Share is always visible. Non-owners should never see edit options.', critical: true, default: false },
      { id: 'detail-expired-hidden', label: 'Expired/hidden/suspended listings cannot be opened as active public discovery cards', description: 'Try to find or directly navigate to an expired, hidden, or suspended listing on the map. It should not appear as a clickable marker or discoverable item. Admins may still view it in management tools.', critical: true, default: false },
      { id: 'detail-mobile-layout', label: 'Detail cards are readable and usable on mobile without clipped buttons or blocked scrolling', description: 'Open a detail card on a mobile device and scroll through all content. Confirm no text is cut off, buttons are tappable (not overlapped), images are visible, and you can close the card without issues.', critical: true, default: false },
    ]
  },
  {
    title: '🗺️ Map, Clustering & Public Discovery',
    items: [
      { id: 'map-loads', label: 'Home map loads without errors on desktop and mobile', critical: true, default: false },
      { id: 'map-res-pins', label: 'Residential listings appear as correct map pins', critical: true, default: false },
      { id: 'map-ns-pins', label: 'Neighborhood sale pins and participant pins appear correctly', critical: true, default: false },
      { id: 'map-event-pins', label: 'Event listing pins appear with correct tier/icon behavior', critical: true, default: false },
      { id: 'map-clustering', label: 'Nearby listings cluster correctly and expand/zoom properly', critical: true, default: false },
      { id: 'map-popup', label: 'Pin popup shows correct title, date, address, tier, and action links', critical: true, default: false },
      { id: 'map-filter-listing-type', label: 'Filters correctly show/hide residential, neighborhood, and event listings', critical: true, default: false },
      { id: 'map-filter-status', label: 'Expired/hidden/suspended listings never appear through filters', critical: true, default: false },
      { id: 'map-list-view-sync', label: 'List view matches current map/filter results', critical: true, default: false },
      { id: 'map-location-actions', label: 'User location / near-me behavior centers and filters correctly', critical: false, default: false },
      { id: 'map-mobile-behavior', label: 'Mobile map interactions, popups, and bottom panels are usable', critical: true, default: false },
    ]
  },
  {
    title: '🏴‍☠️ Join the Hunt Behavior',
    items: [
      { id: 'hunt-enable', label: 'Join the Hunt feature can start from eligible map/list listings', critical: true, default: false },
      { id: 'hunt-add-stop', label: 'User can add residential/neighborhood/event stops to hunt route', critical: true, default: false },
      { id: 'hunt-remove-stop', label: 'User can remove stops and route updates immediately', critical: false, default: false },
      { id: 'hunt-route-map', label: 'Hunt route displays selected stops on the map correctly', critical: true, default: false },
      { id: 'hunt-hidden-expired', label: 'Expired or hidden listings cannot remain visible as active hunt targets', critical: true, default: false },
      { id: 'hunt-checkin', label: 'Check-in works only near eligible active listings', critical: true, default: false },
      { id: 'hunt-saved-listings', label: 'Saved listings and tracked neighborhoods update correctly from hunt/map flows', critical: false, default: false },
      { id: 'hunt-guest-guard', label: 'Guest users are prompted to log in before save/check-in actions', critical: true, default: false },
      { id: 'hunt-mobile', label: 'Hunt route and check-in behavior works on mobile', critical: true, default: false },
    ]
  },
  {
    title: '🚩 Reports, Safety & Case Flow',
    items: [
      { id: 'report-listing', label: 'User can report a residential listing with reason/details/photo', critical: true, default: false },
      { id: 'report-neighborhood', label: 'User can report a neighborhood sale or participant listing', critical: true, default: false },
      { id: 'report-event', label: 'User can report an event listing', critical: false, default: false },
      { id: 'report-count', label: 'Report count and last reported timestamp update correctly', critical: true, default: false },
      { id: 'report-case-created', label: 'Report creates or routes to the correct admin case/ticket queue', critical: true, default: false },
      { id: 'report-status-change', label: 'Admin status changes can hide/suspend listings from public discovery', critical: true, default: false },
      { id: 'report-owner-notice', label: 'Owner-facing support or notice flow is clear after admin action', critical: false, default: false },
      { id: 'report-audit', label: 'Admin actions are logged with user, listing, action, and timestamp', critical: true, default: false },
    ]
  },
  {
    title: '🎫 Support, Contact & User Help Flows',
    items: [
      { id: 'support-contact-form', label: 'Contact Support form opens, validates required fields, and submits successfully', description: 'Navigate to Contact Support, fill in name, email, phone, issue description, and submit. The form should validate required fields and show a success message or redirect after submission.', critical: true, default: false },
      { id: 'support-photo-upload', label: 'Support ticket photo upload attaches images and keeps them visible to admins', description: 'When submitting a support ticket, upload 1-2 photos. Verify the images appear in the ticket and are visible to admins when they review the ticket details.', critical: false, default: false },
      { id: 'support-ticket-number', label: 'Submitted support ticket receives a readable ticket number', description: 'After submitting a support ticket, you should receive a confirmation message with a unique ticket number (e.g., ST-00001) that you can reference in future communications.', critical: true, default: false },
      { id: 'support-my-tickets', label: 'User can view their submitted support tickets from My Support Tickets', description: 'Log in and navigate to My Support Tickets or Notifications. You should see all your submitted support tickets with status, date, and the ability to view details.', critical: true, default: false },
      { id: 'support-admin-queue', label: 'Support ticket appears in the correct admin queue with status, priority, and source context', description: 'From the admin dashboard, go to the Support or Case Management section and verify the submitted ticket appears in the correct queue (residential/vendor/billing) with its status, priority, and source listing/account info.', critical: true, default: false },
      { id: 'support-admin-status', label: 'Admin can update ticket status without losing user-submitted details or photos', description: 'As an admin, open a support ticket and change its status (e.g., from Open to In Review). Confirm all user details, uploaded photos, and comments remain intact after the update.', critical: true, default: false },
      { id: 'support-report-routing', label: 'Listing reports and general support requests route to the correct residential support/case workflow', description: 'Submit a report from a listing and a general contact form submission. Both should appear in the admin queue, correctly labeled as "report" vs. "general inquiry", and assigned to the right support team.', critical: true, default: false },
      { id: 'support-mobile', label: 'Support forms and ticket views work correctly on mobile', description: 'Test Contact Support and My Tickets on a mobile device. Forms should be fully visible, buttons tappable, and text readable without horizontal scrolling.', critical: true, default: false },
    ]
  },
  {
    title: '👤 Account, Address & Guest Guard Readiness',
    items: [
      { id: 'account-login-required-post', label: 'Guest user is prompted to log in/sign up before creating a listing', description: 'As a logged-out user, click Post Sale. You should be presented with a login/signup dialog before the create listing form opens. Guest users cannot create listings without first creating an account.', critical: true, default: false },
      { id: 'account-primary-address-required', label: 'Post Sale flow blocks users without a verified primary address and sends them to Profile', description: 'Log in as a new user without a verified address and click Post Sale. You should see a modal explaining you need to confirm your address, with a button that takes you to your Profile to add it.', critical: true, default: false },
      { id: 'account-address-confirmation', label: 'Primary address confirmation saves correctly and removes listing creation blocker', description: 'Go to Profile, add/verify your primary address, confirm the save. Return to Post Sale and verify you can now proceed to create a listing without the address blocker.', critical: true, default: false },
      { id: 'account-profile-loads', label: 'Profile page loads user details, saved listings, payment history, and address tools', description: 'Open your Profile and confirm it displays your name, email, primary address (with verification status), list of saved listings, payment/billing history, and tools to edit address.', critical: true, default: false },
      { id: 'account-logout-login', label: 'Logout and login return users to a stable app state without losing access to their listings', description: 'Log out from the app, log back in with the same credentials, and verify you can access your My Listings page and all your previous listings are intact.', critical: true, default: false },
      { id: 'account-rls-owner-only', label: 'Users can only edit/delete their own listings while admins retain authorized access', description: 'Try to edit or delete another user\'s listing (or use dev tools to fake the request). You should get an access denied error. Only the owner or admins can modify listings.', critical: true, default: false },
    ]
  },
  {
    title: '🔒 Phase 1 Freeze & Launch Approval',
    items: [
      { id: 'freeze-create-listing', label: 'Create listing files for yard sale, neighborhood sale, and event flows are approved for freeze', description: 'All code for the create listing flow (form components, validation, API calls) is reviewed, tested, and ready to be locked. No further changes will be made to these files.', critical: true, default: false },
      { id: 'freeze-map-discovery', label: 'Home map, list view, filters, clustering, and detail card files are approved for freeze', description: 'The map rendering, pin clustering, filter UI, list view, and detail card display code is finalized and will be frozen after Phase 1 to prevent launch-day regressions.', critical: true, default: false },
      { id: 'freeze-payments', label: 'Residential payment, promo, upgrade, and webhook functions are approved for freeze', description: 'All residential payment flows (new listing checkout, tier upgrades, promo code validation) and Stripe webhook handlers are tested and will be locked to ensure payment stability at launch.', critical: true, default: false },
      { id: 'freeze-support-report', label: 'Report, support ticket, and admin case routing files are approved for freeze', description: 'The report submission form, support ticket creation, admin queue routing, and case management UI are finalized and will not change after Phase 1.', critical: true, default: false },
      { id: 'freeze-neighborhood-events', label: 'Neighborhood sale and event listing launch flows are approved for freeze', description: 'Neighborhood sale creation, event listing flows, co-host invites, and event tier display are tested and ready to be frozen for the Phase 1 launch.', critical: true, default: false },
      { id: 'freeze-assisted-locked', label: 'Assisted listing QR code workflow remains locked and untouched', description: 'The assisted listing QR code creation, approval flow, and seller claim process is stable and will remain locked. No changes will be made to these files during Phase 1.', critical: true, default: false },
      { id: 'freeze-owner-signoff', label: 'Final owner sign-off completed before launch', description: 'The app owner reviews the completed Phase 1 checklist, confirms all critical items are checked, and gives final approval to proceed with the launch. Once approved, the app is ready for production.', critical: true, default: false },
    ]
  },
  {
    title: '🛡️ Admin Controls & Data Integrity',
    items: [
      { id: 'admin-auth', label: 'Admin Employee ID + PIN login works', critical: true, default: false },
      { id: 'admin-rbac', label: 'Admin roles enforce correct residential permissions', critical: true, default: false },
      { id: 'admin-listing-search', label: 'Admin can search/filter residential, neighborhood, and event listings', critical: true, default: false },
      { id: 'admin-status-change', label: 'Admin status changes immediately affect public map/list visibility', critical: true, default: false },
      { id: 'admin-payment-gating', label: 'Admin cannot accidentally grant paid visibility without payment/approved waiver', critical: true, default: false },
      { id: 'admin-assisted-listing', label: 'Admin-assisted listing creation, QR approval, claim, and expiration flow works', critical: false, default: false },
      { id: 'admin-demo-cleanup', label: 'Demo/test listing cleanup does not remove real production listings', critical: true, default: false },
      { id: 'data-owner-rls', label: 'Users cannot access or mutate listings they do not own', critical: true, default: false },
      { id: 'data-payment-linking', label: 'Every paid listing/event/neighborhood sale links to matching payment transaction', critical: true, default: false },
      { id: 'data-no-orphans', label: 'No orphaned participant, payment, promo, or report records after common flows', critical: false, default: false },
    ]
  },
];

export default function LaunchChecklistContent({ embedded = false }) {
  const getDefaults = () => {
    const defaults = {};
    CHECKLIST_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        defaults[item.id] = item.default;
      });
    });
    return defaults;
  };

  const [checkedItems, setCheckedItems] = useState(() => readLocalChecklist(getDefaults()));
  const [settingId, setSettingId] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    loadSavedLaunchChecklist(getDefaults()).then(({ recordId, values }) => {
      setSettingId(recordId);
      setCheckedItems(values);
    });
  }, []);

  const toggleItem = (id) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    saveLaunchChecklist(updated, settingId).then((savedSettingId) => {
      if (savedSettingId && !settingId) setSettingId(savedSettingId);
    });
  };

  const allItems = CHECKLIST_SECTIONS.flatMap(s => s.items);
  const completedCount = allItems.filter(item => checkedItems[item.id]).length;
  const criticalItems = allItems.filter(i => i.critical);
  const criticalCompleted = criticalItems.filter(i => checkedItems[i.id]).length;
  const progressPercent = Math.round((completedCount / allItems.length) * 100);

  const downloadChecklist = () => {
    let content = '🚀 YARDIT PHASE 1 LAUNCH CHECKLIST\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += '='.repeat(60) + '\n\n';

    CHECKLIST_SECTIONS.forEach(section => {
      content += `${section.title}\n`;
      content += '-'.repeat(60) + '\n';
      section.items.forEach(item => {
        const checked = checkedItems[item.id] ? '✓' : '○';
        const critical = item.critical ? ' [CRITICAL]' : '';
        content += `${checked} ${item.label}${critical}\n`;
      });
      content += '\n';
    });

    content += '='.repeat(60) + '\n';
    content += `PROGRESS: ${completedCount}/${allItems.length} items completed\n`;
    content += `CRITICAL: ${criticalCompleted}/${criticalItems.length} critical items completed\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yardit-launch-checklist-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Checklist downloaded');
  };

  return (
    <div className={embedded ? 'bg-[#F3E6CF] p-4' : 'min-h-screen bg-[#F3E6CF] p-4 sm:p-6'}>
      <div className={embedded ? 'w-full' : 'max-w-4xl mx-auto'}>
        <div className="mb-6">
          <h1 className={embedded ? 'text-2xl font-bold text-[#2C4F4E] mb-2' : 'text-3xl sm:text-4xl font-bold text-[#2C4F4E] mb-2'}>
            🚀 Yardit Phase 1 Launch Master Checklist
          </h1>
          <p className="text-gray-600 mb-4">
            Full launch-readiness checklist for all yard sale types, neighborhood sales, events, detail cards, payments, reports, support, map behavior, expiration, clustering, and Join the Hunt behavior.
          </p>

          <div className="bg-white rounded-lg p-4 border border-[#5DADA5] mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[#2C4F4E]">Overall Progress</span>
              <span className="text-sm text-gray-600">{completedCount}/{allItems.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-[#5DADA5] h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{progressPercent}% complete</p>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Critical Items</p>
                <p className="font-bold text-lg text-[#2C4F4E]">{criticalCompleted}/{criticalItems.length}</p>
              </div>
              <div>
                <p className="text-gray-600">All Items</p>
                <p className="font-bold text-lg text-[#2C4F4E]">{completedCount}/{allItems.length}</p>
              </div>
            </div>
          </div>

          <Button onClick={downloadChecklist} className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold gap-2">
            <Download className="w-4 h-4" />
            Download Checklist
          </Button>
        </div>

        <div className="space-y-6">
          {CHECKLIST_SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-lg border-2 border-[#5DADA5] p-4 sm:p-6">
              <h2 className="text-xl font-bold text-[#2C4F4E] mb-4">{section.title}</h2>
              <div className="space-y-2">
                {section.items.map(item => {
                  const isExpanded = expandedItems[item.id];
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => toggleItem(item.id)} className="w-full flex items-start gap-3 p-3 hover:bg-[#F3E6CF] transition-colors text-left group">
                        {checkedItems[item.id] ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 group-hover:text-[#5DADA5]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${checkedItems[item.id] ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                            {item.label}
                          </p>
                          {item.critical && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-xs font-semibold text-red-600">CRITICAL</span>
                            </div>
                          )}
                        </div>
                        {item.description && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedItems(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }));
                            }}
                            className="text-gray-400 hover:text-gray-600 text-lg font-bold flex-shrink-0 ml-2"
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        )}
                      </button>
                      {item.description && isExpanded && (
                        <div className="px-3 pb-3 text-xs text-slate-600 bg-slate-50 border-t border-slate-200">
                          {item.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#E7D7B8] rounded-lg p-4 sm:p-6 border border-[#2C4F4E]">
          <h3 className="font-bold text-[#2C4F4E] mb-2">⚠️ Launch Verdict</h3>
          {criticalCompleted === criticalItems.length ? (
            <p className="text-sm text-gray-700">✅ <strong>All critical items complete!</strong> Ready for staged launch testing.</p>
          ) : (
            <p className="text-sm text-gray-700">🔴 <strong>{criticalItems.length - criticalCompleted} critical blockers remaining.</strong> Address these before publishing.</p>
          )}
        </div>
      </div>
    </div>
  );
}