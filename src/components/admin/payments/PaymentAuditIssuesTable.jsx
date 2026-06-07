import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const severityClasses = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const dateText = (value) => value ? new Date(value).toLocaleString() : "—";

export default function PaymentAuditIssuesTable({ issues, onMarkReview }) {
  const [selected, setSelected] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("reviewed");
  const [reviewNote, setReviewNote] = useState("");

  const openReview = (issue) => {
    setSelected(issue);
    setReviewStatus(issue.review_status || "reviewed");
    setReviewNote(issue.review_note || "");
  };

  const submitReview = async () => {
    await onMarkReview(selected, reviewStatus, reviewNote);
    setSelected(null);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Issue Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Owner Email</th>
              <th className="px-4 py-3">Payment Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Stripe Session</th>
              <th className="px-4 py-3">Payment Intent</th>
              <th className="px-4 py-3">Transaction ID</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Suggested Fix</th>
              <th className="px-4 py-3">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {issues.length === 0 ? (
              <tr><td colSpan="13" className="px-4 py-10 text-center text-slate-500">No payment health findings match these filters.</td></tr>
            ) : issues.map((issue) => (
              <tr key={issue.issue_key} className="align-top hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-800">{issue.issue_type}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={severityClasses[issue.severity] || severityClasses.info}>{issue.severity}</Badge></td>
                <td className="px-4 py-3 space-y-1">
                  <div className="font-medium text-slate-900">{issue.record_type || "—"}</div>
                  <div className="text-xs text-slate-500 break-all">{issue.record_id || "—"}</div>
                  <div className="text-xs text-slate-700">{issue.record_label || "—"}</div>
                  {issue.record_type === "listing" && issue.record_id && (
                    <Link className="text-xs font-medium text-blue-600 underline" to={`/ListingDetail?id=${issue.record_id}`}>Open listing</Link>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{issue.owner_email || "—"}</td>
                <td className="px-4 py-3">{issue.payment_status || "—"}</td>
                <td className="px-4 py-3 font-semibold">{money(issue.amount_cents)}</td>
                <td className="px-4 py-3 max-w-[180px] truncate" title={issue.stripe_checkout_session_id}>{issue.stripe_checkout_session_id || "—"}</td>
                <td className="px-4 py-3 max-w-[180px] truncate" title={issue.stripe_payment_intent_id}>{issue.stripe_payment_intent_id || "—"}</td>
                <td className="px-4 py-3 max-w-[180px] truncate" title={issue.payment_transaction_id}>{issue.payment_transaction_id || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{dateText(issue.created_date)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{dateText(issue.updated_date)}</td>
                <td className="px-4 py-3 max-w-[260px] text-slate-700">{issue.suggested_fix}<div className="mt-1 text-xs text-slate-500">{issue.details}</div></td>
                <td className="px-4 py-3 space-y-2">
                  <Badge variant="outline">{issue.review_status || "open"}</Badge>
                  {issue.review_note && <p className="max-w-[180px] text-xs text-slate-500">{issue.review_note}</p>}
                  <Button size="sm" variant="outline" onClick={() => openReview(issue)}>Mark</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Audit Finding</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={selected?.issue_type || ""} readOnly />
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="ignored">Ignored</option>
              <option value="resolved">Resolved</option>
            </select>
            <Textarea placeholder="Review note" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={submitReview} className="bg-[#2C4F4E] hover:bg-[#223f3e]">Save Review</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}