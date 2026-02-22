import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { logAdminEvent, searchCases, isSupervisor } from "../components/caseManagement";
import { hasCapability } from "../components/admin/adminCapabilities";

import InQueueTab from "../components/caseManagement/ui/InQueueTab";
import OpenCasesTab from "../components/caseManagement/ui/OpenCasesTab";
import SubmittedCasesTab from "../components/caseManagement/ui/SubmittedCasesTab";
import ClosedCasesTab from "../components/caseManagement/ui/ClosedCasesTab";
import CaseDetailView from "../components/caseManagement/ui/CaseDetailView";
import AdminLiteDashboard from "../components/admin/AdminLiteDashboard";
import CreateAdminTab from "../components/admin/CreateAdminTab";
import AdminLogsTab from "../components/admin/AdminLogsTab";
import EmployeeUsersTab from "../components/admin/EmployeeUsersTab";

export default function AdminLitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [allAdminUsers, setAllAdminUsers] = useState([]);

  // Top-level tab
  const urlParams = new URLSearchParams(location.search);
  const initialTopTab = urlParams.get("tab") || "cases";
  const [topTab, setTopTab] = useState(initialTopTab);

  // Case management state
  const [caseTab, setCaseTab] = useState("in_queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!('isAdmin' in currentUser)) {
          currentUser.isAdmin = ['admin', 'admin_lite', 'supervisor', 'master'].includes(currentUser.role);
        }
        if (!currentUser.isAdmin) {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);

        // First-login sync: convert AdminInviteProfile → AdminProfile
        const existingProfiles = await base44.entities.AdminProfile.filter({ email: currentUser.email.toLowerCase() });
        if (existingProfiles.length === 0) {
          const invites = await base44.entities.AdminInviteProfile.filter({ email: currentUser.email.toLowerCase(), status: "pending" });
          if (invites.length > 0) {
            const invite = invites[0];
            await base44.entities.AdminProfile.create({
              user_id: currentUser.id,
              email: invite.email,
              employee_id: invite.employee_id,
              role_label: invite.role_label,
              first_name: invite.first_name,
              last_name: invite.last_name,
              dob: invite.dob,
              phone: invite.phone,
              address: invite.address || "",
              capabilities: invite.capabilities,
              is_active: true,
              last_login_at: new Date().toISOString(),
              ...(invite.supervisor_user_id ? {
                supervisor_user_id: invite.supervisor_user_id,
                supervisor_employee_id: invite.supervisor_employee_id,
              } : {}),
            });
            await base44.entities.AdminInviteProfile.update(invite.id, { status: "accepted" });
          }
        } else {
          // Update last_login_at on subsequent logins
          await base44.entities.AdminProfile.update(existingProfiles[0].id, { last_login_at: new Date().toISOString() });
        }

        const users = await base44.entities.User.list();
        setAllAdminUsers(users.filter(u => ["admin", "admin_lite", "supervisor", "master"].includes(u.role)));
      } catch {
        navigate(createPageUrl("Home"));
      }
    };
    init();
  }, []);

  // Deep-link: openCaseId in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openCaseId = params.get("openCaseId");
    if (openCaseId && user) {
      setTopTab("cases");
      setSelectedCaseId(openCaseId);
      logAdminEvent({ adminId: user.id, caseId: openCaseId, eventType: "opened_case", page: "AdminHub" });
    }
    const tab = params.get("tab");
    if (tab) setTopTab(tab);
  }, [location.search, user]);

  const handleCaseTabChange = useCallback((tab) => {
    setCaseTab(tab);
    setSelectedCaseId(null);
    if (user) {
      logAdminEvent({ adminId: user.id, eventType: "changed_tab", payload: { tab }, page: "AdminHub" });
    }
  }, [user]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearching(true);
    const res = await searchCases(searchQuery.trim());
    setSearchResults(res.success ? res.results : []);
    setSearching(false);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => { setSearchQuery(""); setSearchResults(null); }, []);

  const handleOpenCase = useCallback((caseId) => {
    setSelectedCaseId(caseId);
    if (user) logAdminEvent({ adminId: user.id, caseId, eventType: "opened_case", page: "AdminHub" });
  }, [user]);

  const handleCloseCase = useCallback(() => { setSelectedCaseId(null); setRefreshKey(k => k + 1); }, []);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);


  if (!user) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  // If viewing a specific case, show the detail view
  if (selectedCaseId) {
    return (
      <CaseDetailView
        caseId={selectedCaseId}
        user={user}
        allAdminUsers={allAdminUsers}
        onClose={handleCloseCase}
        onRefresh={triggerRefresh}
        activeTab={caseTab}
      />
    );
  }

  const canManageAdmins = hasCapability(user, "admins.manage");
  const canViewLogs = hasCapability(user, "logs.view");

  const roleLabel = (() => {
    const r = user.role;
    if (r === "master") return "Master";
    if (r === "supervisor") return "Supervisor";
    return "Basic";
  })();

  return (
    <div className="min-h-[calc(100vh-140px)] pt-0 px-3 sm:px-4 md:px-8 pb-3 sm:pb-4 md:pb-8 overflow-x-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">

        {/* Top-level admin tabs */}
        <Tabs value={topTab} onValueChange={setTopTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto w-full mb-4 p-1">
            <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-[#2C4F4E] whitespace-nowrap pointer-events-none select-none">
              🛡️ Admin – {roleLabel}
            </span>
            <TabsTrigger value="cases" className="whitespace-nowrap">Case Management</TabsTrigger>
            <TabsTrigger value="lite" className="whitespace-nowrap">Admin Lite</TabsTrigger>
            {canManageAdmins && <TabsTrigger value="create-admin" className="whitespace-nowrap">Create Admin</TabsTrigger>}
            {canManageAdmins && <TabsTrigger value="employee-users" className="whitespace-nowrap">Employee Users</TabsTrigger>}
            {canViewLogs && <TabsTrigger value="logs" className="whitespace-nowrap">Logs</TabsTrigger>}
          </TabsList>

          {/* ─── Case Management ─── */}
          <TabsContent value="cases">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6 w-full max-w-xl">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by Account # or Listing ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-10 w-full"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSearch} disabled={searching} className="btn-primary px-4 py-2 text-sm rounded-lg flex-1 sm:flex-none">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </button>
                {searchResults && (
                  <button onClick={handleClearSearch} className="text-sm text-gray-500 underline">Clear</button>
                )}
              </div>
            </div>
            {searchResults && (
              <p className="text-sm text-gray-600 mb-2">
                Showing {searchResults.length} search result(s).
              </p>
            )}

            <Tabs value={caseTab} onValueChange={handleCaseTabChange}>
              <TabsList className="flex flex-wrap gap-1 h-auto w-full max-w-2xl p-1">
                <TabsTrigger value="in_queue" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">In Queue</TabsTrigger>
                <TabsTrigger value="open" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Open Cases</TabsTrigger>
                <TabsTrigger value="submitted" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Submitted</TabsTrigger>
                <TabsTrigger value="closed" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Closed</TabsTrigger>
              </TabsList>

              <TabsContent value="in_queue">
                <InQueueTab user={user} allAdminUsers={allAdminUsers} searchResults={searchResults} onOpenCase={handleOpenCase} onRefresh={triggerRefresh} refreshKey={refreshKey} />
              </TabsContent>
              <TabsContent value="open">
                <OpenCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} />
              </TabsContent>
              <TabsContent value="submitted">
                <SubmittedCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} />
              </TabsContent>
              <TabsContent value="closed">
                <ClosedCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ─── Admin Lite Dashboard ─── */}
          <TabsContent value="lite">
            <AdminLiteDashboard user={user} />
          </TabsContent>

          {/* ─── Create Admin ─── */}
          {canManageAdmins && (
            <TabsContent value="create-admin">
              <CreateAdminTab />
            </TabsContent>
          )}

          {/* ─── Employee Users ─── */}
          {canManageAdmins && (
            <TabsContent value="employee-users">
              <EmployeeUsersTab />
            </TabsContent>
          )}

          {/* ─── Logs ─── */}
          {canViewLogs && (
            <TabsContent value="logs">
              <AdminLogsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}