import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TIER_COLORS = {
  free: "bg-slate-100 text-slate-700",
  starter: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  growth: "bg-amber-100 text-amber-800",
  event_organizer: "bg-green-100 text-green-800",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  trialing: "bg-blue-100 text-blue-800",
  past_due: "bg-red-100 text-red-800",
  inactive: "bg-slate-100 text-slate-700",
  canceled: "bg-red-200 text-red-900",
};

export default function VendorAccountsTable({ user }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["vendorAccountsAdmin"],
    queryFn: () => base44.entities.VendorAccount.list("-created_date"),
  });

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorPinsAdmin"],
    queryFn: () => base44.entities.VendorPin.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["vendorEventsAdmin"],
    queryFn: () => base44.entities.VendorEvent.list(),
  });

  const pinCountByAccount = {};
  pins.forEach(p => {
    pinCountByAccount[p.vendor_account_id] = (pinCountByAccount[p.vendor_account_id] || 0) + 1;
  });

  const eventCountByAccount = {};
  events.forEach(e => {
    eventCountByAccount[e.organizer_business_id] = (eventCountByAccount[e.organizer_business_id] || 0) + 1;
  });

  const filtered = accounts.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.business_name || "").toLowerCase().includes(q) ||
      (a.owner_name || "").toLowerCase().includes(q) ||
      (a.vendor_account_number || "").toLowerCase().includes(q) ||
      (a.owner_email || "").toLowerCase().includes(q)
    );
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading vendor accounts...</div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, account #, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border">No vendor accounts found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 50).map(account => (
            <Card key={account.id} className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#2C4F4E] truncate">{account.business_name || "Unnamed Business"}</span>
                      {account.vendor_display_name && account.vendor_display_name !== account.business_name && (
                        <span className="text-xs text-slate-400">({account.vendor_display_name})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={TIER_COLORS[account.vendor_tier] || "bg-slate-100 text-slate-700"}>
                        {(account.vendor_tier || "free").replace("_", " ")}
                      </Badge>
                      <Badge className={STATUS_COLORS[account.subscription_status] || "bg-slate-100 text-slate-700"} variant="outline">
                        {account.subscription_status || "unknown"}
                      </Badge>
                      {account.is_active === false && (
                        <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Account #: <span className="font-mono text-slate-700">{account.vendor_account_number || "—"}</span></p>
                      <p>Owner: {account.owner_name || "—"} · {account.owner_email || "—"}</p>
                      <p>
                        <span className="mr-3">📍 {pinCountByAccount[account.id] || 0} pin(s)</span>
                        <span>📅 {eventCountByAccount[account.id] || 0} event(s)</span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => navigate("/VendorPublicPage?vendorId=" + account.id)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Page
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length > 50 && (
            <p className="text-xs text-slate-400 text-center pt-2">Showing first 50 of {filtered.length} results. Use search to narrow.</p>
          )}
        </div>
      )}
    </div>
  );
}