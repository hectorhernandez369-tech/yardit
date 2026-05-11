import React from "react";
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert } from "lucide-react";

const cards = [
  { key: "score", label: "Overall Health", icon: CheckCircle2, tone: "text-emerald-700", bg: "bg-emerald-50" },
  { key: "critical", label: "Critical", icon: ShieldAlert, tone: "text-red-700", bg: "bg-red-50" },
  { key: "warning", label: "Warnings", icon: AlertTriangle, tone: "text-amber-700", bg: "bg-amber-50" },
  { key: "notice", label: "Notices", icon: Bell, tone: "text-blue-700", bg: "bg-blue-50" },
];

export default function HealthSummaryCards({ summary }) {
  const values = {
    score: `${summary.score}%`,
    critical: summary.critical,
    warning: summary.warning,
    notice: summary.notice,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className={`${card.bg} border rounded-xl p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{card.label}</p>
                <p className={`text-2xl font-bold ${card.tone}`}>{values[card.key] || 0}</p>
              </div>
              <Icon className={`w-6 h-6 ${card.tone}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}