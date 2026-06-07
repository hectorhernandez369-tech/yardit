import React from "react";
import { Input } from "@/components/ui/input";

export default function PaymentAuditFilters({ filters, setFilters, issueTypes }) {
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
      <select className="rounded-md border px-3 py-2 text-sm" value={filters.issueType} onChange={(e) => update("issueType", e.target.value)}>
        <option value="all">All issue types</option>
        {issueTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" value={filters.recordType} onChange={(e) => update("recordType", e.target.value)}>
        <option value="all">All record types</option>
        <option value="listing">Listing</option>
        <option value="neighborhood_sale">Neighborhood Sale</option>
        <option value="vendor_event">Vendor Event</option>
        <option value="vendor_account">Vendor Account</option>
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" value={filters.severity} onChange={(e) => update("severity", e.target.value)}>
        <option value="all">All severity</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" value={filters.reviewStatus} onChange={(e) => update("reviewStatus", e.target.value)}>
        <option value="all">All review statuses</option>
        <option value="open">Open</option>
        <option value="reviewed">Reviewed</option>
        <option value="ignored">Ignored</option>
        <option value="resolved">Resolved</option>
      </select>
      <Input placeholder="Owner email" value={filters.ownerEmail} onChange={(e) => update("ownerEmail", e.target.value)} />
      <Input placeholder="Stripe session ID" value={filters.sessionId} onChange={(e) => update("sessionId", e.target.value)} />
      <Input placeholder="Listing number / event name" value={filters.recordLabel} onChange={(e) => update("recordLabel", e.target.value)} />
      <Input placeholder="Payment status" value={filters.paymentStatus} onChange={(e) => update("paymentStatus", e.target.value)} />
    </div>
  );
}