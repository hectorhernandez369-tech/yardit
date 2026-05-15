import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function VendorPinsTable({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: pins = [], isLoading: pinsLoading } = useQuery({
    queryKey: ["vendorPinsAdmin"],
    queryFn: () => base44.entities.VendorPin.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["vendorAccountsAdmin"],
    queryFn: () => base44.entities.VendorAccount.list(),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["vendorCheckInsAdmin"],
    queryFn: () => base44.entities.VendorPinCheckIn.list("-created_date"),
  });

  const accountMap = {};
  accounts.forEach(a => { accountMap[a.id] = a; });

  // Get latest check-in per pin
  const latestCheckInByPin = {};
  checkIns.forEach(ci => {
    if (!latestCheckInByPin[ci.vendor_pin_id]) {
      latestCheckInByPin[ci.vendor_pin_id] = ci;
    }
  });

  const enriched = pins.map(pin => ({
    ...pin,
    account: accountMap[pin.vendor_account_id],
    latestCheckIn: latestCheckInByPin[pin.id],
  }));

  const filtered = enriched.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.pin_name || "").toLowerCase().includes(q) ||
      (p.account?.business_name || "").toLowerCase().includes(q)
    );
  });

  const handleDeactivatePin = async (pin) => {
    if (!confirm(`Deactivate pin "${pin.pin_name}"? This will mark it inactive.`)) return;
    try {
      await base44.entities.VendorPin.update(pin.id, { is_active: false });
      await base44.entities.AdminAuditLog?.create?.({
        admin_id: user?.id,
        action: "deactivate_vendor_pin",
        entity_type: "VendorPin",
        entity_id: pin.id,
        details: `Deactivated pin "${pin.pin_name}"`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
      toast.success("Pin deactivated");
      queryClient.invalidateQueries({ queryKey: ["vendorPinsAdmin"] });
    } catch (e) {
      toast.error("Failed to deactivate pin");
    }
  };

  const getCheckInStatus = (pin) => {
    const ci = pin.latestCheckIn;
    if (!ci) return { label: "No check-ins", color: "bg-slate-100 text-slate-600" };
    if (ci.status === "live") return { label: "Live", color: "bg-green-100 text-green-800" };
    if (ci.status === "paused") return { label: "Paused", color: "bg-amber-100 text-amber-800" };
    return { label: "Ended", color: "bg-slate-100 text-slate-600" };
  };

  if (pinsLoading) return <div className="p-8 text-center text-slate-500">Loading vendor pins...</div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by pin name or business..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border">No vendor pins found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 50).map(pin => {
            const ciStatus = getCheckInStatus(pin);
            const ci = pin.latestCheckIn;
            return (
              <Card key={pin.id} className={`border ${pin.is_active === false ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#5DADA5] shrink-0" />
                        <span className="font-semibold text-[#2C4F4E]">{pin.pin_name || "Unnamed Pin"}</span>
                        {pin.is_active === false && <Badge className="bg-red-100 text-red-800">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">
                        Business: <span className="text-slate-700">{pin.account?.business_name || "Unknown"}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Badge className={ciStatus.color}>{ciStatus.label}</Badge>
                        {ci && ci.status === "live" && ci.checkin_end_time && (
                          <span className="text-xs text-slate-500">
                            Expires {formatDistanceToNow(new Date(ci.checkin_end_time), { addSuffix: true })}
                          </span>
                        )}
                        {ci && ci.checkin_start_time && (
                          <span className="text-xs text-slate-400">
                            Last check-in: {format(new Date(ci.checkin_start_time), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                      {ci && ci.checkin_display_address && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{ci.checkin_display_address}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {ci && ci.checkin_latitude && ci.checkin_longitude && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => window.open(`https://maps.google.com/?q=${ci.checkin_latitude},${ci.checkin_longitude}`, "_blank")}
                        >
                          <MapPin className="w-3.5 h-3.5" /> Map
                        </Button>
                      )}
                      {pin.is_active !== false && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDeactivatePin(pin)}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length > 50 && (
            <p className="text-xs text-slate-400 text-center pt-2">Showing first 50 of {filtered.length} results. Use search to narrow.</p>
          )}
        </div>
      )}
    </div>
  );
}