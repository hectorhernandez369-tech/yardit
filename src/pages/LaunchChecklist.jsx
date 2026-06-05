import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

const CHECKLIST_SECTIONS = [
  {
    title: '🏠 Residential Listings',
    items: [
      { id: 'res-stripe-test', label: 'Run live Stripe test (test card purchase)', critical: true, default: false },
      { id: 'res-date-conflict', label: 'Verify date conflict detection blocks overlaps', critical: true, default: true },
      { id: 'res-promo-free', label: 'Test free promo code redemption (zero-dollar pathway)', critical: false, default: true },
      { id: 'res-promo-tracking', label: 'Confirm promo usage counts increment correctly', critical: false, default: true },
      { id: 'res-nonrefund', label: 'Verify non-refund acknowledgment flow captures consent', critical: false, default: true },
      { id: 'res-webhook', label: 'Confirm webhook receipt within 60 seconds of payment', critical: true, default: false },
    ]
  },
  {
    title: '🏘️ Neighborhood Sales',
    items: [
      { id: 'ns-payment-setup', label: 'Initial payment method collection (setup intent) working', critical: true, default: false },
      { id: 'ns-initial-charge', label: 'Initial charge captured on sale creation', critical: true, default: false },
      { id: 'ns-adjustment-charge', label: 'Adjustment charge pathway defined & tested', critical: true, default: false },
      { id: 'ns-cohost-liability', label: 'Co-host liability & payment handling documented', critical: false, default: false },
      { id: 'ns-500ft-validation', label: '500 ft radius validation for host addresses enforced', critical: false, default: true },
    ]
  },
  {
    title: '🎪 Event Listings',
    items: [
      { id: 'event-basic-free', label: 'Basic tier is free (no checkout required)', critical: false, default: true },
      { id: 'event-featured-checkout', label: 'Featured tier checkout created & tested', critical: true, default: false },
      { id: 'event-premium-checkout', label: 'Premium tier checkout created & tested', critical: true, default: false },
      { id: 'event-marquee-checkout', label: 'Marquee tier checkout created & tested', critical: false, default: false },
      { id: 'event-promo-upgrade', label: 'Event promotion upgrade payment working', critical: false, default: true },
    ]
  },
  {
    title: '💳 Payment Infrastructure',
    items: [
      { id: 'stripe-webhook-live', label: 'Stripe webhook endpoint registered & receiving events', critical: true, default: false },
      { id: 'stripe-idempotent', label: 'Webhook deduplication prevents double-processing', critical: true, default: true },
      { id: 'stripe-metadata', label: 'Stripe metadata extraction handles nested objects', critical: false, default: true },
      { id: 'stripe-failed-payments', label: 'Failed payment recording & notification working', critical: false, default: true },
      { id: 'stripe-refunds', label: 'Refund webhook processing implemented', critical: false, default: true },
    ]
  },
  {
    title: '🛡️ Admin & Security',
    items: [
      { id: 'admin-auth', label: 'Admin authentication (Employee ID + PIN) operational', critical: true, default: true },
      { id: 'admin-rbac', label: 'Role-based access control (master/supervisor/basic) enforced', critical: true, default: true },
      { id: 'admin-payment-gating', label: 'Admin cannot bypass payment for paid listing tiers', critical: true, default: false },
      { id: 'admin-fraud-audit', label: 'Admin listing creation audit trail in place', critical: true, default: false },
      { id: 'case-management', label: 'Case management workflow (queue → assigned → open → submitted → closed)', critical: false, default: true },
      { id: 'support-tickets', label: 'Support ticket routing & resolution workflow defined', critical: false, default: false },
    ]
  },
  {
    title: '📊 Data Integrity',
    items: [
      { id: 'visibility-safety', label: 'Listing visibility only granted if payment_status="paid"', critical: true, default: false },
      { id: 'stale-stripe-ids', label: 'Stale Stripe IDs do NOT grant unearned visibility', critical: true, default: false },
      { id: 'payment-linking', label: 'All payment transactions linked to listing/vendor/event', critical: false, default: true },
      { id: 'webhook-timeout', label: 'Webhook confirmation timeout handling (15-min expiry) implemented', critical: false, default: false },
    ]
  },
];

export default function LaunchChecklist() {
  const [checkedItems, setCheckedItems] = useState(() => {
    const stored = localStorage.getItem('yardit_launch_checklist');
    if (stored) return JSON.parse(stored);
    
    // Initialize with default values
    const defaults = {};
    CHECKLIST_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        defaults[item.id] = item.default;
      });
    });
    return defaults;
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

    const totalItems = Object.keys(checkedItems).length;
    const completedItems = Object.values(checkedItems).filter(Boolean).length;
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
  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const criticalItems = allItems.filter(i => i.critical);
  const criticalCompleted = criticalItems.filter(i => checkedItems[i.id]).length;
  const progressPercent = Math.round((completedCount / allItems.length) * 100);

  return (
    <div className="min-h-screen bg-[#F3E6CF] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2C4F4E] mb-2">
            🚀 Yardit Phase 1 Launch Checklist
          </h1>
          <p className="text-gray-600 mb-4">
            Track all critical items before going live. Review our audit report to understand blockers.
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