import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";
import HealthSummaryCards from "./HealthSummaryCards";
import SystemHealthIssueCard from "./SystemHealthIssueCard";

const categories = [
  "all",
  "VendorAccount Health",
  "VendorAccountIdentityReservation Health",
  "Event Organizer Collaboration Health",
  "Event Health",
  "Listing / Map Visibility Health",
  "Notification Health",
  "Subscription / Tier Health",
  "Admin / Security Health",
  "Legacy Migration Health",
];

export default function SystemHealthDashboard({ user }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [lastRepair, setLastRepair] = useState(null);

  const isMaster = user?.role === "master" || user?.role_label === "master";

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["systemHealthIssues"],
    queryFn: () => base44.entities.SystemHealthIssue.list("-last_detected_at", 500),
    enabled: isMaster,
    initialData: [],
  });

  const openIssues = issues.filter((issue) => ["open", "reviewed"].includes(issue.status));
  const summary = useMemo(() => {
    const critical = openIssues.filter((issue) => issue.severity === "CRITICAL").length;
    const warning = openIssues.filter((issue) => issue.severity === "WARNING").length;
    const notice = openIssues.filter((issue) => issue.severity === "NOTICE").length;
    const score = Math.max(0, 100 - critical * 15 - warning * 5 - notice * 1);
    return { critical, warning, notice, score };
  }, [openIssues]);

  const filteredIssues = openIssues.filter((issue) => {
    const haystack = [issue.title, issue.description, issue.category, issue.affected_entity_type, issue.affected_entity_id, issue.affected_display_name, issue.suggested_fix].join(" ").toLowerCase();
    return (category === "all" || issue.category === category) &&
      (severity === "all" || issue.severity === severity) &&
      (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });

  const scanMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runSystemHealthScan", {}),
    onSuccess: (res) => {
      setLastScan(res.data?.scanned_at || new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ["systemHealthIssues"] });
      toast.success("System health scan completed");
    },
  });

  const reviewedMutation = useMutation({
    mutationFn: (issue) => base44.entities.SystemHealthIssue.update(issue.id, { status: "reviewed", reviewed_by: user?.email || user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["systemHealthIssues"] }),
  });

  const repairMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runSafeLegacyRepair", {}),
    onSuccess: (res) => {
      setLastRepair(res.data);
      toast.success(res.data?.message || "Safe repair batch completed");
      queryClient.invalidateQueries({ queryKey: ["systemHealthIssues"] });
    },
  });

  if (!isMaster) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border">
        <ShieldAlert className="w-10 h-10 mx-auto text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-[#2C4F4E]">Master Admin Only</h2>
        <p className="text-sm text-slate-600 mt-2">System Health is restricted to Master Admin / Super Master access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#2C4F4E]">Yardit System Health</h2>
          <p className="text-sm text-slate-600">Detects bad data, missing fields, permission conflicts, notification issues, and legacy migration problems without blocking users.</p>
          <p className="text-xs text-slate-500 mt-1">Last scan: {lastScan ? new Date(lastScan).toLocaleString() : "Not run in this session"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending} className="bg-[#5DADA5] hover:bg-[#4A9B93]">
            {scanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Health Scan
          </Button>
          <Button onClick={() => repairMutation.mutate()} disabled={repairMutation.isPending} variant="outline" className="border-[#2C4F4E] text-[#2C4F4E]">
            {repairMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            Run Next Batch
          </Button>
        </div>
      </div>

      <HealthSummaryCards summary={summary} />

      {lastRepair && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-[#2C4F4E] mb-2">Last Safe Repair Batch</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div><span className="font-semibold">Scanned:</span> {lastRepair.scanned || 0}</div>
            <div><span className="font-semibold">Repaired:</span> {lastRepair.repaired || 0}</div>
            <div><span className="font-semibold">Skipped:</span> {lastRepair.skipped || 0}</div>
            <div><span className="font-semibold">Failed:</span> {lastRepair.failed || 0}</div>
            <div><span className="font-semibold">Manual review:</span> {lastRepair.needs_manual_review || 0}</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3 bg-white rounded-xl border p-3">
        <Input placeholder="Search user, email, vendor number, event, listing ID..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item === "all" ? "All Categories" : item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="NOTICE">Notice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filteredIssues.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border text-slate-600">No matching open health issues.</div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => (
            <SystemHealthIssueCard
              key={issue.id}
              issue={issue}
              onReviewed={(item) => reviewedMutation.mutate(item)}
              onRepair={() => repairMutation.mutate()}
            />
          ))}
        </div>
      )}
    </div>
  );
}