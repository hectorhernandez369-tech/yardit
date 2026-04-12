import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ActivityLogList from "./activityLog/ActivityLogList";

export default function EmployeeActivityDrawer({ open, onClose, admin }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [references, setReferences] = useState({ admins: {}, users: {} });
  const [activeFilter, setActiveFilter] = useState("all");
  const [showNoise, setShowNoise] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !admin) return;
    const load = async () => {
      setLoading(true);
      const [byUser, byEmpId, adminActions, adminEvents, adminProfiles] = await Promise.all([
        admin.user_id ? base44.entities.AdminAuditLog.filter({ user_id: admin.user_id }, "-created_date", 100) : Promise.resolve([]),
        base44.entities.AdminAuditLog.filter({ admin_employee_id: admin.employee_id }, "-created_date", 100),
        admin.user_id ? base44.entities.AdminAction.filter({ admin_id: admin.user_id }, "-created_date", 200).catch(() => []) : Promise.resolve([]),
        admin.user_id ? base44.entities.AdminEvent.filter({ admin_id: admin.user_id }, "-created_date", 200).catch(() => []) : Promise.resolve([]),
        base44.entities.AdminProfile.list("-created_date", 200).catch(() => []),
      ]);
      const refs = {
        admins: Object.fromEntries(adminProfiles.map((record) => {
          const profile = record.data || record;
          const label = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Unknown Admin";
          return [profile.user_id, `${label} – ${profile.employee_id || "No Employee ID"}`];
        })),
        users: {},
      };
      setReferences(refs);
      const map = new Map();
      [...byUser, ...byEmpId, ...adminActions, ...adminEvents].forEach(l => map.set(`${l.entity_name || "log"}-${l.id}`, l));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)
      );
      setLogs(merged);
      setLoading(false);
    };
    load();
  }, [open, admin]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            Activity: {admin?.first_name} {admin?.last_name}
            <span className="text-xs font-mono text-gray-500 ml-2">({admin?.employee_id})</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <ActivityLogList
              logs={logs}
              references={references}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              showNoise={showNoise}
              onToggleNoise={() => setShowNoise((value) => !value)}
              emptyText="No activity found."
              onViewCase={(caseId) => navigate(`/CaseManagement?caseId=${caseId}`)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}