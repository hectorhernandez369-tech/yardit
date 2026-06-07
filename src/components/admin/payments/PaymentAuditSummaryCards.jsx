import React from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

const cards = [
  { key: "critical", label: "Critical", icon: ShieldAlert, className: "border-red-200 bg-red-50 text-red-700" },
  { key: "warning", label: "Warning", icon: AlertTriangle, className: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "info", label: "Info", icon: Info, className: "border-blue-200 bg-blue-50 text-blue-700" },
  { key: "total", label: "Total Findings", icon: CheckCircle2, className: "border-slate-200 bg-white text-slate-700" },
];

export default function PaymentAuditSummaryCards({ summary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, className }) => (
        <div key={key} className={`rounded-2xl border p-4 shadow-sm ${className}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium opacity-80">{label}</p>
              <p className="text-3xl font-black">{summary?.[key] || 0}</p>
            </div>
            <Icon className="h-8 w-8 opacity-70" />
          </div>
        </div>
      ))}
    </div>
  );
}