import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, User, Clock } from "lucide-react";

const FRIENDLY_LABELS = {
  assign_self: "Assigned to Self",
  assign_other: "Assigned by Supervisor",
  set_disposition: "Disposition Set",
  submit_case: "Submitted for Review",
  approve_case: "Approved & Closed",
  send_back: "Sent Back for More Info",
  reassign_submitted: "Reassigned While Submitted",
  reassign: "Reassigned",
  change_priority: "Priority Updated",
  admin_comment: "Admin Comment",
  supervisor_comment: "Supervisor Comment",
};

const ACTION_COLORS = {
  assign_self: "bg-green-100 text-green-800",
  assign_other: "bg-green-100 text-green-800",
  change_priority: "bg-yellow-100 text-yellow-800",
  set_disposition: "bg-purple-100 text-purple-800",
  submit_case: "bg-blue-100 text-blue-800",
  approve_case: "bg-green-100 text-green-800",
  send_back: "bg-orange-100 text-orange-800",
  reassign_submitted: "bg-indigo-100 text-indigo-800",
  reassign: "bg-indigo-100 text-indigo-800",
  admin_comment: "bg-gray-100 text-gray-700",
  supervisor_comment: "bg-purple-100 text-purple-700",
};

const DIFF_KEYS = ["status", "assigned_admin_id", "originating_admin_id", "case_priority", "disposition"];

function safeParse(val) {
  if (!val) return null;
  try { return typeof val === "object" ? val : JSON.parse(val); } catch { return val; }
}

function formatValue(key, val, adminMap) {
  if (val == null || val === "") return "—";
  if ((key === "assigned_admin_id" || key === "originating_admin_id") && adminMap[val]) {
    const a = adminMap[val];
    return a.full_name || a.email;
  }
  return String(val).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function DiffBullets({ oldVal, newVal, adminMap }) {
  const oldObj = typeof oldVal === "object" && oldVal ? oldVal : {};
  const newObj = typeof newVal === "object" && newVal ? newVal : {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const diffs = [];
  for (const key of allKeys) {
    if (!DIFF_KEYS.includes(key)) continue;
    const o = oldObj[key];
    const n = newObj[key];
    if (o !== n) diffs.push({ key, from: o, to: n });
  }
  if (diffs.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {diffs.map(d => (
        <li key={d.key} className="flex flex-wrap items-center gap-1 text-sm">
          <span className="font-medium text-gray-700">{formatKey(d.key)}:</span>
          {d.from != null && <span className="line-through text-gray-400">{formatValue(d.key, d.from, adminMap)}</span>}
          {d.from != null && d.to != null && <span className="text-gray-400">→</span>}
          {d.to != null && <span className="text-gray-800 font-medium">{formatValue(d.key, d.to, adminMap)}</span>}
        </li>
      ))}
    </ul>
  );
}

function TechnicalDetails({ oldVal, newVal }) {
  const [open, setOpen] = useState(false);
  const hasData = oldVal || newVal;
  if (!hasData) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1 min-h-[32px]"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        View technical details
      </button>
      {open && (
        <div className="mt-1 bg-gray-50 rounded p-2 text-xs text-gray-500 overflow-x-auto max-w-full">
          {oldVal && <div className="break-all"><span className="font-semibold">From:</span> {typeof oldVal === "object" ? JSON.stringify(oldVal, null, 2) : String(oldVal)}</div>}
          {newVal && <div className="break-all mt-1"><span className="font-semibold">To:</span> {typeof newVal === "object" ? JSON.stringify(newVal, null, 2) : String(newVal)}</div>}
        </div>
      )}
    </div>
  );
}

export default function CaseAuditTimeline({ actions, allAdminUsers }) {
  const adminMap = {};
  (allAdminUsers || []).forEach(a => { adminMap[a.id] = a; });

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Case Timeline ({actions.length})</CardTitle></CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-500">No actions recorded.</p>
        ) : (
          <div className="relative ml-3 border-l-2 border-gray-200 space-y-0">
            {actions.map(a => {
              const admin = adminMap[a.admin_id];
              const oldVal = safeParse(a.old_value);
              const newVal = safeParse(a.new_value);
              const label = FRIENDLY_LABELS[a.action_type] || a.action_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              const color = ACTION_COLORS[a.action_type] || "bg-gray-100 text-gray-800";

              return (
                <div key={a.id} className="relative pl-6 pb-5">
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${color} text-xs`}>{label}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {admin?.full_name || admin?.email || a.admin_id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.created_date).toLocaleString()}
                    </span>
                  </div>
                  <DiffBullets oldVal={oldVal} newVal={newVal} adminMap={adminMap} />
                  {a.comment && <p className="mt-1.5 text-sm italic text-gray-600">"{a.comment}"</p>}
                  <TechnicalDetails oldVal={oldVal} newVal={newVal} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}