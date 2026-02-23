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

const relId = (v) => (v && typeof v === "object" ? v.id : v);

export default function AdminLitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [allAdminUsers, setAllAdminUsers] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [noAdminAccess, setNoAdminAccess] = useState(false);

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
      setLoadingProfile(true);
      try {
        const currentUser = await base44.auth.me();

        // Look up AdminProfile — prefer by user_id, fallback to email
        const [profilesByUserId, profilesByEmail] = await Promise.all([
          base44.entities.AdminProfile.filter({ user_id: currentUser.id }),
          base44.entities.AdminProfile.filter({ email: currentUser.email.toLowerCase() }),
        ]);

        let adminProfile = profilesByUserId[0] || profilesByEmail[0];
        const profileUserId = relId(adminProfile?.user_id);

        // TEMPORARY DEBUG LOG
        console.log("ADMIN_DEBUG", {
          meId: currentUser.id,
          meEmail: currentUser.email,
          profilesByUserIdCount: profilesByUserId?.length,
          profilesByEmailCount: profilesByEmail?.length,
          profileUserIdRaw: adminProfile?.user_id,
          profileUserId: profileUserId,
          profileActive: adminProfile?.is_active,
          profileRole: adminProfile?.role_label,
        });

        // Heal: if found by email but user_id doesn't match, fix it
        if (adminProfile && profileUserId !== currentUser.id) {
          console.log("ADMIN_DEBUG - healing user_id", { oldRaw: adminProfile.user_id, old: profileUserId, new: currentUser.id });
          await base44.entities.AdminProfile.update(adminProfile.id, { user_id: currentUser.id });
          adminProfile = { ...adminProfile, user_id: currentUser.id };
        }

        // Gate: must have an active profile
        if (!adminProfile || adminProfile.is_active !== true) {
          setNoAdminAccess(true);
          setLoadingProfile(false);
          return;
        }

        // Update last_login_at
        await base44.entities.AdminProfile.update(adminProfile.id, { last_login_at: new Date().toISOString() });

        // Enrich currentUser with role from AdminProfile
        currentUser.role = adminProfile.role_label;
        currentUser.isAdmin = true;
        setUser(currentUser);

        try {
          const users = await base44.entities.User.list();
          setAllAdminUsers(users.filter(u => ["admin", "admin_lite", "supervisor", "master"].includes(u.role)));
        } catch (userListErr) {
          console.warn("Could not fetch User list:", userListErr);
          setAllAdminUsers([]);
        }
      } catch (err) {
        console.error("ADMIN_DEBUG - init error", err);
        setNoAdminAccess(true);
      } finally {
        setLoadingProfile(false);
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


  if (loadingProfile) return (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-500">Checking admin access…</p>
    </div>
  );

  if (noAdminAccess) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#2C4F4E] mb-2">No Admin Access</h2>
        <p className="text-gray-600 mb-6 text-sm">You don't have an active admin profile. Contact a master administrator for access.</p>
        <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline">Back to Map</Button>
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  // Admin Mode gate: require valid admin session (stays on page, no redirect)
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