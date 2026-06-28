import React from "react";
import { AlertTriangle, Activity, FolderOpen, Inbox, Settings, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statCards = [
  { key: "in_queue", label: "Queue", helper: "unassigned work", tone: "border-orange-200 bg-orange-50 text-orange-800" },
  { key: "assigned", label: "Waiting", helper: "assigned to you", tone: "border-teal-200 bg-teal-50 text-teal-800" },
  { key: "open", label: "Open", helper: "in progress", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  { key: "submitted", label: "Review", helper: "submitted cases", tone: "border-purple-200 bg-purple-50 text-purple-800" },
  { key: "closed", label: "Closed", helper: "your closed work", tone: "border-slate-200 bg-slate-50 text-slate-800" },
];

export default function AdminOperationsCenterHome({ counts = {}, onNavigate }) {
  const shortcuts = [
    { label: "Open Case Queue", section: "case_management", icon: FolderOpen },
    { label: "View Alerts", section: "inbox", icon: Inbox },
    { label: "Manage Operations", section: "operations", icon: BriefcaseBusiness },
    { label: "System Settings", section: "settings", icon: Settings },
  ];

  return (
    <div className="mt-4 space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-[#2C4F4E] to-[#5DADA5] p-5 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.25em] text-white/60">Operations Center</p>
        <h1 className="mt-1 text-2xl font-black">Admin Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/75">Platform overview, quick statistics, recent operational signals, and shortcuts to the most common admin work areas.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.key} className={`border ${card.tone}`}>
            <CardContent className="p-4">
              <p className="text-2xl font-black">{counts?.[card.key] || 0}</p>
              <p className="text-sm font-bold">{card.label}</p>
              <p className="text-xs opacity-75">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Priority Work</h2>
                <p className="text-sm text-slate-600">Safety items belong at the top of Case Management, followed by reports and support work.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => onNavigate?.("case_management")} className="bg-orange-600 hover:bg-orange-700">Go to Case Management</Button>
              <Button onClick={() => onNavigate?.("inbox")} variant="outline">Review Alerts</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">System Health</h2>
                <p className="text-sm text-slate-600">Use Settings for full system configuration, audit logs, and health tools.</p>
              </div>
            </div>
            <Button onClick={() => onNavigate?.("settings")} variant="outline" className="mt-4 w-full">Open Settings</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-bold text-slate-900">Common Admin Actions</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button key={shortcut.section} type="button" onClick={() => onNavigate?.(shortcut.section)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon className="h-4 w-4 text-[#5DADA5]" />
                  {shortcut.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}