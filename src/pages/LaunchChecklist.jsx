import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

const CHECKLIST_SECTIONS = [
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

export default function LaunchChecklist() {
  const [checkedItems, setCheckedItems] = useState(() => {
    const defaults = {};
    CHECKLIST_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        defaults[item.id] = item.default;
      });
    });

    const stored = localStorage.getItem('yardit_launch_checklist');
    if (!stored) return defaults;

    const saved = JSON.parse(stored);
    return { ...defaults, ...saved };
  });

  const toggleItem = (id) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    localStorage.setItem('yardit_launch_checklist', JSON.stringify(updated));
  };

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

    const totalItems = allItems.length;
    const completedItems = allItems.filter(item => checkedItems[item.id]).length;
    const criticalItems = CHECKLIST_SECTIONS.flatMap(s => s.items).filter(i => i.critical);
    const criticalCompleted = criticalItems.filter(i => checkedItems[i.id]).length;

    content += '='.repeat(60) + '\n';
    content += `PROGRESS: ${completedItems}/${totalItems} items completed\n`;
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

  const allItems = CHECKLIST_SECTIONS.flatMap(s => s.items);
  const completedCount = allItems.filter(item => checkedItems[item.id]).length;
  const criticalItems = allItems.filter(i => i.critical);
  const criticalCompleted = criticalItems.filter(i => checkedItems[i.id]).length;
  const progressPercent = Math.round((completedCount / allItems.length) * 100);

  return (
    <div className="min-h-screen bg-[#F3E6CF] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2C4F4E] mb-2">
            🚀 Yardit Phase 1 Residential Launch QA Checklist
          </h1>
          <p className="text-gray-600 mb-4">
            Full launch-readiness checklist for residential listings, neighborhood sales, event listings, payments, reports, expiration, clustering, and Join the Hunt behavior.
          </p>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 border border-[#5DADA5] mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[#2C4F4E]">Overall Progress</span>
              <span className="text-sm text-gray-600">{completedCount}/{allItems.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#5DADA5] h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{progressPercent}% complete</p>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Critical Items</p>
                <p className="font-bold text-lg text-[#2C4F4E]">
                  {criticalCompleted}/{criticalItems.length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">All Items</p>
                <p className="font-bold text-lg text-[#2C4F4E]">
                  {completedCount}/{allItems.length}
                </p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <Button
            onClick={downloadChecklist}
            className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold gap-2"
          >
            <Download className="w-4 h-4" />
            Download Checklist
          </Button>
        </div>

        {/* Checklist Sections */}
        <div className="space-y-6">
          {CHECKLIST_SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-lg border-2 border-[#5DADA5] p-4 sm:p-6">
              <h2 className="text-xl font-bold text-[#2C4F4E] mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-[#F3E6CF] transition-colors text-left group"
                  >
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
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 bg-[#E7D7B8] rounded-lg p-4 sm:p-6 border border-[#2C4F4E]">
          <h3 className="font-bold text-[#2C4F4E] mb-2">⚠️ Launch Verdict</h3>
          {criticalCompleted === criticalItems.length ? (
            <p className="text-sm text-gray-700">
              ✅ <strong>All critical items complete!</strong> Ready for staged launch testing.
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              🔴 <strong>{criticalItems.length - criticalCompleted} critical blockers remaining.</strong> Address these before publishing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}