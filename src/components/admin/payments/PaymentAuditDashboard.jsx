import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PaymentAuditFilters from "./PaymentAuditFilters";
import PaymentAuditIssuesTable from "./PaymentAuditIssuesTable";
import PaymentAuditSummaryCards from "./PaymentAuditSummaryCards";

const defaultFilters = {
  issueType: "all",
  recordType: "all",
  severity: "all",
  reviewStatus: "open",
  ownerEmail: "",
  sessionId: "",
  recordLabel: "",
  paymentStatus: "",
};

const includes = (value, query) => String(value || "").toLowerCase().includes(String(query || "").toLowerCase());

export default function PaymentAuditDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(defaultFilters);
  const [thresholdMinutes, setThresholdMinutes] = useState(30);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["paymentAuditScan", thresholdMinutes],
    queryFn: async () => {
      const res = await base44.functions.invoke("paymentAuditScan", { threshold_minutes: thresholdMinutes });
      return res.data;
    },
    initialData: null,
  });

  const markMutation = useMutation({
    mutationFn: async ({ issue, reviewStatus, reviewNote }) => {
      const res = await base44.functions.invoke("paymentAuditScan", {
        action: "markReview",
        issue_key: issue.issue_key,
        issue_type: issue.issue_type,
        record_type: issue.record_type,
        record_id: issue.record_id,
        payment_transaction_id: issue.payment_transaction_id,
        review_status: reviewStatus,
        review_note: reviewNote,
      });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paymentAuditScan"] }),
  });

  const issues = data?.issues || [];
  const issueTypes = useMemo(() => [...new Set(issues.map((issue) => issue.issue_type).filter(Boolean))].sort(), [issues]);
  const filteredIssues = useMemo(() => issues.filter((issue) => {
    if (filters.issueType !== "all" && issue.issue_type !== filters.issueType) return false;
    if (filters.recordType !== "all" && issue.record_type !== filters.recordType) return false;
    if (filters.severity !== "all" && issue.severity !== filters.severity) return false;
    if (filters.reviewStatus !== "all" && issue.review_status !== filters.reviewStatus) return false;
    if (filters.ownerEmail && !includes(issue.owner_email, filters.ownerEmail)) return false;
    if (filters.sessionId && !includes(issue.stripe_checkout_session_id, filters.sessionId)) return false;
    if (filters.recordLabel && !includes(`${issue.record_label} ${issue.record_id}`, filters.recordLabel)) return false;
    if (filters.paymentStatus && !includes(issue.payment_status, filters.paymentStatus)) return false;
    return true;
  }), [issues, filters]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Payment Audit is only available to master/super master admins or admins with payment access.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl bg-[#2C4F4E] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">Admin Payments</p>
          <h1 className="text-2xl font-black">Payment Health</h1>
          <p className="mt-1 text-sm text-white/75">Find paid records, pending sessions, duplicate receipts, missing links, and Stripe metadata issues.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-white/70">Pending threshold</label>
          <select className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm" value={thresholdMinutes} onChange={(e) => setThresholdMinutes(Number(e.target.value))}>
            <option className="text-slate-900" value={30}>30 min</option>
            <option className="text-slate-900" value={60}>1 hour</option>
            <option className="text-slate-900" value={240}>4 hours</option>
            <option className="text-slate-900" value={1440}>24 hours</option>
          </select>
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <PaymentAuditSummaryCards summary={data?.summary} />
      <PaymentAuditFilters filters={filters} setFilters={setFilters} issueTypes={issueTypes} />

      <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
        <span>{filteredIssues.length} of {issues.length} finding(s) shown</span>
        <span>Generated: {data?.generated_at ? new Date(data.generated_at).toLocaleString() : isLoading ? "Scanning…" : "—"}</span>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Scanning payment health…</div>
      ) : (
        <PaymentAuditIssuesTable
          issues={filteredIssues}
          onMarkReview={(issue, reviewStatus, reviewNote) => markMutation.mutateAsync({ issue, reviewStatus, reviewNote })}
        />
      )}
    </div>
  );
}