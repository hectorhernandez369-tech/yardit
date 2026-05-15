import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle2, MapPin, CalendarDays, AlertTriangle, Ticket } from "lucide-react";

function StatCard({ icon: Icon, label, value, color = "text-[#2C4F4E]", bg = "bg-white" }) {
  return (
    <Card className={`${bg} border border-slate-200 shadow-sm`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-100 shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-[#2C4F4E]">{value ?? "—"}</p>
          <p className="text-xs text-slate-500 leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorAdminSummaryCards() {
  const { data: accounts = [] } = useQuery({
    queryKey: ["vendorAccountsAdmin"],
    queryFn: () => base44.entities.VendorAccount.list(),
  });

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorPinsAdmin"],
    queryFn: () => base44.entities.VendorPin.list(),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["vendorCheckInsAdmin"],
    queryFn: () => base44.entities.VendorPinCheckIn.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["vendorEventsAdmin"],
    queryFn: () => base44.entities.VendorEvent.list(),
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["supportTicketsAdmin"],
    queryFn: () => base44.entities.SupportTicket.list(),
  });

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.is_active !== false && a.subscription_status === "active").length;
  const liveCheckIns = checkIns.filter(c => c.status === "live").length;
  const totalEvents = events.length;

  // Flagged: vendor pins with expired/removed or accounts with past_due
  const flaggedItems = accounts.filter(a => a.subscription_status === "past_due").length
    + pins.filter(p => p.is_active === false).length;

  // Vendor/event support tickets (open)
  const openVendorTickets = tickets.filter(t =>
    ["open", "in_review", "waiting_for_user"].includes(t.status) &&
    (t.ticket_type === "vendor" || t.ticket_type === "event" || t.category === "vendor" || t.category === "event")
  ).length;

  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard icon={Building2} label="Total Vendor Accounts" value={totalAccounts} />
      <StatCard icon={CheckCircle2} label="Active Vendor Accounts" value={activeAccounts} color="text-green-600" />
      <StatCard icon={MapPin} label="Live Vendor Pins" value={liveCheckIns} color="text-[#5DADA5]" />
      <StatCard icon={CalendarDays} label="Vendor Events" value={totalEvents} color="text-blue-600" />
      <StatCard icon={AlertTriangle} label="Flagged Items" value={flaggedItems} color="text-amber-600" />
      <StatCard icon={Ticket} label="Open Vendor Tickets" value={openVendorTickets} color="text-purple-600" />
    </div>
  );
}