import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PushCategoryRow from "./PushCategoryRow";

const ALERT_ITEMS = [
  ["account_alerts_push_enabled", "Account Alerts", "Login, profile, account status, and important account notices."],
  ["billing_alerts_push_enabled", "Billing Alerts", "Payments, receipts, upgrades, renewals, and billing issues."],
  ["approval_alerts_push_enabled", "Approval Alerts", "Listing, vendor, event, invite, and approval updates."],
  ["safety_alerts_push_enabled", "Safety Alerts", "Reports, safety reviews, removals, and urgent trust notices."],
  ["support_alerts_push_enabled", "Support Alerts", "Support tickets, case updates, assignments, and admin replies."],
  ["policy_alerts_push_enabled", "Policy Notices", "Policy, terms, feature, and platform rule notices."]
];

export default function AlertsPushGroup({ pref, onGroupChange, onItemChange, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const groupChecked = pref.alerts_push_enabled !== false;
  const enabledCount = ALERT_ITEMS.filter(([field]) => pref[field] !== false).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex flex-1 items-start gap-3 text-left">
          <ChevronDown className={`mt-1 h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          <div>
            <h4 className="font-bold text-[#2C4F4E]">Alerts</h4>
            <p className="mt-1 text-sm text-slate-600">Important account, billing, approval, safety, support, and policy notices.</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {groupChecked ? `${enabledCount} of ${ALERT_ITEMS.length} alert types on` : "Alert pushes off"}
            </p>
          </div>
        </button>
        <Switch checked={groupChecked} disabled={disabled} onCheckedChange={onGroupChange} />
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {ALERT_ITEMS.map(([field, title, description]) => (
            <PushCategoryRow key={field} title={title} description={description} checked={pref[field] !== false} disabled={disabled || !groupChecked} onCheckedChange={(value) => onItemChange(field, value)} />
          ))}
        </div>
      )}
    </div>
  );
}