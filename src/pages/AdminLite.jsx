import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getAdminSession, clearAdminSession } from "../components/admin/AdminLoginModal";
import AdminLoginModal from "../components/admin/AdminLoginModal";

export default function AdminLitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  const [showAdminLogin, setShowAdminLogin] = useState(false);
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

  const [activationBanner, setActivationBanner] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();

        // ── Step 1: Run invite acceptance BEFORE checking admin role ──
        // Bootstrap: fix MasterOB1k placeholder profile
        const allProfiles = await base44.entities.AdminProfile.list();
        const bootstrapProfile = allProfiles.find(p => p.employee_id === "MasterOB1k" && (!p.user_id || p.user_id === "__PLACEHOLDER__"));
        if (bootstrapProfile) {
          await base44.entities.AdminProfile.update(bootstrapProfile.id, {
            user_id: currentUser.id,
            email: currentUser.email.toLowerCase(),
            first_name: currentUser.full_name?.split(" ")[0] || bootstrapProfile.first_name,
            last_name: currentUser.full_name?.split(" ").slice(1).join(" ") || bootstrapProfile.last_name,
            last_login_at: new Date().toISOString(),
          });
          const accessKeys = await base44.entities.AdminAccessKey.filter({ employee_id: "MasterOB1k" });
          for (const ak of accessKeys) {
            if (!ak.user_id || ak.user_id === "__PLACEHOLDER__") {
              await base44.entities.AdminAccessKey.update(ak.id, { user_id: currentUser.id });
            }
          }
        }

        // Check for existing AdminProfile by email or user_id
        let existingProfiles = allProfiles.filter(
          p => p.email === currentUser.email.toLowerCase() || p.user_id === currentUser.id
        );

        let justActivated = false;

        if (existingProfiles.length === 0) {
          // Look for pending invite and accept it
          const invites = await base44.entities.AdminInviteProfile.filter({ email: currentUser.email.toLowerCase() });
          const pendingInvite = invites.find(i => i.status === "pending");
          if (pendingInvite) {
            await base44.entities.AdminProfile.create({
              user_id: currentUser.id,
              email: pendingInvite.email,
              employee_id: pendingInvite.employee_id,
              role_label: pendingInvite.role_label,
              first_name: pendingInvite.first_name,
              last_name: pendingInvite.last_name,
              dob: pendingInvite.dob,
              phone: pendingInvite.phone,
              address: pendingInvite.address || "",
              capabilities: pendingInvite.capabilities,
              is_active: true,
              last_login_at: new Date().toISOString(),
              ...(pendingInvite.supervisor_user_id ? {
                supervisor_user_id: pendingInvite.supervisor_user_id,
                supervisor_employee_id: pendingInvite.supervisor_employee_id,
              } : {}),
            });
            await base44.entities.AdminInviteProfile.update(pendingInvite.id, { status: "accepted" });

            // Link AdminAccessKey to this user_id
            const accessKeys = await base44.entities.AdminAccessKey.filter({ employee_id: pendingInvite.employee_id });
            for (const ak of accessKeys) {
              if (!ak.user_id || ak.user_id === "__PLACEHOLDER__") {
                await base44.entities.AdminAccessKey.update(ak.id, { user_id: currentUser.id });
              }
            }

            justActivated = true;
            // Re-fetch profiles after creation
            existingProfiles = await base44.entities.AdminProfile.filter({ user_id: currentUser.id });
          }
        } else {
          // Update last_login_at on subsequent logins
          await base44.entities.AdminProfile.update(existingProfiles[0].id, { last_login_at: new Date().toISOString() });
        }

        // ── Step 2: Determine admin access from AdminProfile ──
        const adminProfile = existingProfiles[0];
        if (!adminProfile || !adminProfile.is_active) {
          navigate(createPageUrl("Home"));
          return;
        }

        // Enrich currentUser with role info from AdminProfile
        currentUser.role = adminProfile.role_label;
        currentUser.isAdmin = true;
        setUser(currentUser);

        if (justActivated) {
          setActivationBanner(true);
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

  // Admin Mode gate: require valid admin session
  if (!adminSession) {
    return (
      <>
        <div className="p-8 text-center max-w-md mx-auto mt-12">
          <Shield className="w-12 h-12 text-[#5DADA5] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2C4F4E] mb-2">Admin Mode Required</h2>
          <p className="text-gray-600 mb-6 text-sm">You must verify your Employee ID and PIN to access the Admin portal.</p>
          <Button onClick={() => setShowAdminLogin(true)} className="bg-[#5DADA5] hover:bg-[#4A9B93] gap-2">
            <Shield className="w-4 h-4" /> Enter Admin Mode
          </Button>
        </div>
        <AdminLoginModal
          open={showAdminLogin}
          onClose={() => setShowAdminLogin(false)}
          onSuccess={(session) => {
            setAdminSession(session);
            setShowAdminLogin(false);
          }}
        />
      </>
    );
  }

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
      {activationBanner && (
        <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 mb-4 flex items-center justify-between max-w-7xl mx-auto">
          <p className="text-sm text-green-800 font-medium">
            ✅ Admin activated. Click <strong>Admin</strong> and enter your Employee ID + PIN to access the portal.
          </p>
          <button onClick={() => setActivationBanner(false)} className="text-green-600 hover:text-green-800 ml-4 text-lg font-bold">×</button>
        </div>
      )}
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
              <EmployeeUsersTab currentUser={user} />
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