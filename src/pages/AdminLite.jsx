import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Shield, LogOut, Home, Building2, ShieldCheck, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAdminEvent, searchCases } from "../components/caseManagement";
import { hasCapability } from "../components/admin/adminCapabilities";

import OpenCasesTab from "../components/caseManagement/ui/OpenCasesTab";
import ActiveOpenCasesTab from "../components/caseManagement/ui/ActiveOpenCasesTab";
import SubmittedCasesTab from "../components/caseManagement/ui/SubmittedCasesTab";
import ClosedCasesTab from "../components/caseManagement/ui/ClosedCasesTab";
import CaseDetailView from "../components/caseManagement/ui/CaseDetailView";
import AdminLiteDashboard from "../components/admin/AdminLiteDashboard";
import AdminInternalTab from "../components/admin/AdminInternalTab";
import VendorAdminDashboard from "../components/admin/vendor/VendorAdminDashboard";
import { getAdminSession, clearAdminSession } from "../components/admin/AdminLoginModal";
import AdminLoginModal from "../components/admin/AdminLoginModal";
import { ensureAdminVendorAccount, isMasterAdminRole } from "../lib/ensureAdminVendorAccount";
import SupportTicketQueue from "../components/admin/SupportTicketQueue";
import InQueueTab from "../components/caseManagement/ui/InQueueTab";

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

  // Primary top-level section: residential | vendor | admin | case_management
  const urlParams = new URLSearchParams(location.search);
  const initialSection = urlParams.get("section") || "residential";
  const [primarySection, setPrimarySection] = useState(initialSection);
  const [caseManagementTab, setCaseManagementTab] = useState("pending_review");

  // Case management state (used in Residential > Case queue)
  const [caseTab, setCaseTab] = useState("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState({ in_queue: 0, assigned: 0, open: 0, submitted: 0, closed: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const allCases = await base44.entities.Case.list();
        const newCounts = { in_queue: 0, assigned: 0, open: 0, submitted: 0, closed: 0 };
        allCases.forEach(c => {
          if (c.status === "in_queue") newCounts.in_queue++;
          else if (c.status === "assigned" && c.assigned_admin_id === user.id) newCounts.assigned++;
          else if (c.status === "open" && c.assigned_admin_id === user.id) newCounts.open++;
          else if (c.status === "closed") newCounts.closed++;
          else if (["submitted", "submitted_for_review", "escalated_to_supervisor", "escalated_to_master"].includes(c.status)) newCounts.submitted++;
        });
        setCounts(newCounts);
      } catch (e) {
        console.error("Error fetching case counts:", e);
      }
    };
    if (user && adminSession) fetchCounts();
  }, [user, adminSession, refreshKey]);

  useEffect(() => {
    const init = async () => {
      setLoadingProfile(true);
      try {
        const currentUser = await base44.auth.me();

        const [profilesByUserId, profilesByEmail] = await Promise.all([
          base44.entities.AdminProfile.filter({ user_id: currentUser.id }),
          base44.entities.AdminProfile.filter({ email: currentUser.email.toLowerCase() }),
        ]);

        let adminProfile = profilesByUserId[0] || profilesByEmail[0];
        const profileUserId = relId(adminProfile?.user_id);

        console.log("ADMIN_DEBUG", {
          meId: currentUser.id,
          meEmail: currentUser.email,
          profilesByUserIdCount: profilesByUserId?.length,
          profilesByEmailCount: profilesByEmail?.length,
          profileUserIdRaw: adminProfile?.user_id,
          profileUserId,
          profileActive: adminProfile?.is_active,
          profileRole: adminProfile?.role_label,
        });

        if (adminProfile && profileUserId !== currentUser.id) {
          console.log("ADMIN_DEBUG - healing user_id", { old: profileUserId, new: currentUser.id });
          await base44.entities.AdminProfile.update(adminProfile.id, { user_id: currentUser.id });
          adminProfile = { ...adminProfile, user_id: currentUser.id };
        }

        if (!adminProfile || adminProfile.is_active !== true) {
          setNoAdminAccess(true);
          setLoadingProfile(false);
          return;
        }

        await base44.entities.AdminProfile.update(adminProfile.id, { last_login_at: new Date().toISOString() });

        currentUser.role = adminProfile.role_label;
        currentUser.isAdmin = true;
        setUser(currentUser);

        // Auto-provision vendor account for master admins (silent, non-blocking)
        if (isMasterAdminRole(adminProfile.role_label)) {
          ensureAdminVendorAccount({ ...currentUser, role: adminProfile.role_label }).catch(() => {});
        }

        if (adminSession) {
          try {
            const users = await base44.entities.User.list();
            setAllAdminUsers(users.filter(u => ["admin", "admin_lite", "supervisor", "master"].includes(u.role)));
          } catch {
            setAllAdminUsers([]);
          }
        }
      } catch (err) {
        console.error("ADMIN_DEBUG - init error", err);
        setNoAdminAccess(true);
      } finally {
        setLoadingProfile(false);
      }
    };
    init();
  }, [adminSession]);

  // Deep-link: openCaseId in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openCaseId = params.get("openCaseId");
    if (openCaseId && user) {
      setPrimarySection("residential");
      setSelectedCaseId(openCaseId);
      logAdminEvent({ adminId: user.id, caseId: openCaseId, eventType: "opened_case", page: "AdminHub" });
    }
    const section = params.get("section");
    if (section) setPrimarySection(section);
  }, [location.search, user]);

  const handleCaseTabChange = useCallback((tab) => {
    setCaseTab(tab);
    setSelectedCaseId(null);
    if (user) logAdminEvent({ adminId: user.id, eventType: "changed_tab", payload: { tab }, page: "AdminHub" });
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

  // ── Loading / access guards ──────────────────────────────────────────────

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
        <Button onClick={() => navigate(-1)} variant="outline">Back</Button>
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  if (!adminSession) {
    return (
      <>
        <div className="p-8 text-center max-w-md mx-auto mt-12">
          <Shield className="w-12 h-12 text-[#5DADA5] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2C4F4E] mb-2">Admin Mode Required</h2>
          <p className="text-gray-600 text-sm mb-2">You are already signed in as {user.email}.</p>
          <p className="text-gray-600 mb-6 text-sm">This screen requires your Employee ID and PIN to proceed.</p>
          <Button onClick={() => setShowAdminLogin(true)} className="bg-[#5DADA5] hover:bg-[#4A9B93] gap-2">
            <Shield className="w-4 h-4" /> Enter Admin Mode
          </Button>
        </div>
        <AdminLoginModal
          open={showAdminLogin}
          onClose={() => setShowAdminLogin(false)}
          onSuccess={(session) => { setAdminSession(session); setShowAdminLogin(false); }}
        />
      </>
    );
  }

  // If a case is open, show its detail view
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

  const roleLabel = (() => {
    const r = user.role;
    if (r === "master") return "Master";
    if (r === "supervisor") return "Supervisor";
    return "Basic";
  })();

  // ── Main 3-tab dashboard ─────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-140px)] pt-0 px-3 sm:px-4 md:px-8 pb-8 overflow-x-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto w-full overflow-x-hidden">

        {/* ── Primary Section Header ── */}
        <div className="flex flex-wrap items-center gap-2 pt-4 pb-3 border-b border-slate-200 mb-4 w-full">
          {/* Role badge */}
          <span className="flex items-center gap-1.5 text-sm font-semibold text-[#2C4F4E] mr-2">
            🛡️ Admin – {roleLabel}
          </span>

          {/* 3 primary section tabs — full width on mobile */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 flex-1 sm:flex-none">
            <button
              onClick={() => setPrimarySection("residential")}
              className={`flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                primarySection === "residential"
                  ? "bg-white text-[#2C4F4E] shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Residential</span>
            </button>
            <button
              onClick={() => setPrimarySection("vendor")}
              className={`flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                primarySection === "vendor"
                  ? "bg-[#2C4F4E] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Vendor /</span><span>&nbsp;Events</span>
            </button>
            <button
              onClick={() => setPrimarySection("admin")}
              className={`flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                primarySection === "admin"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => setPrimarySection("case_management")}
              className={`flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                primarySection === "case_management"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Case Mgmt</span>
            </button>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearAdminSession();
              toast.success("Admin Mode exited");
              navigate(createPageUrl("Home"));
            }}
            className="text-red-600 border-red-200 hover:bg-red-50 h-8 gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Admin</span>
          </Button>
        </div>

        {/* ── RESIDENTIAL SECTION ── */}
        {primarySection === "residential" && (
          <>
            {/* Residential ops dashboard (listings, users, tickets, etc.) */}
            <AdminLiteDashboard
              user={user}
              counts={counts}
              allAdminUsers={allAdminUsers}
              searchResults={searchResults}
              onOpenCase={handleOpenCase}
              refreshKey={refreshKey}
              triggerRefresh={triggerRefresh}
            />
          </>
        )}

        {/* ── VENDOR / EVENTS SECTION ── */}
        {primarySection === "vendor" && (
          <VendorAdminDashboard user={user} />
        )}

        {/* ── ADMIN INTERNAL SECTION ── */}
        {primarySection === "admin" && (
          <AdminInternalTab user={user} adminSession={adminSession} />
        )}

        {/* ── CASE MANAGEMENT SECTION ── */}
        {primarySection === "case_management" && (
          <div className="mt-4">
            {/* Case search bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 w-full max-w-xl">
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
              <p className="text-sm text-gray-600 mb-2">Showing {searchResults.length} search result(s).</p>
            )}

            <Tabs value={caseManagementTab} onValueChange={setCaseManagementTab}>
              <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1">
                <TabsTrigger value="pending_review" className="whitespace-nowrap">
                  Pending Review
                </TabsTrigger>
                <TabsTrigger value="reports_queue" className="whitespace-nowrap">
                  Reports Queue {counts?.in_queue !== undefined ? `(${counts.in_queue})` : ""}
                </TabsTrigger>
                <TabsTrigger value="support_tickets" className="whitespace-nowrap">Support Tickets</TabsTrigger>
              </TabsList>

              <TabsContent value="pending_review">
                <Tabs value={caseTab} onValueChange={handleCaseTabChange}>
                  <TabsList className="flex flex-wrap gap-1 h-auto w-full max-w-3xl p-1 mt-2">
                    <TabsTrigger value="queue" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Queue ({counts.assigned})</TabsTrigger>
                    <TabsTrigger value="open" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Open ({counts.open})</TabsTrigger>
                    <TabsTrigger value="submitted" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Submitted ({counts.submitted})</TabsTrigger>
                    <TabsTrigger value="closed" className="flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Closed ({counts.closed})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="queue">
                    <OpenCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} triggerRefresh={triggerRefresh} />
                  </TabsContent>
                  <TabsContent value="open">
                    <ActiveOpenCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} />
                  </TabsContent>
                  <TabsContent value="submitted">
                    <SubmittedCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} />
                  </TabsContent>
                  <TabsContent value="closed">
                    <ClosedCasesTab user={user} searchResults={searchResults} onOpenCase={handleOpenCase} refreshKey={refreshKey} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="reports_queue">
                <InQueueTab
                  user={user}
                  allAdminUsers={allAdminUsers || []}
                  searchResults={searchResults}
                  onOpenCase={handleOpenCase}
                  onRefresh={triggerRefresh}
                  refreshKey={refreshKey}
                />
              </TabsContent>
              <TabsContent value="support_tickets">
                <SupportTicketQueue user={user} mode="residential" />
              </TabsContent>
            </Tabs>
          </div>
        )}

      </div>
    </div>
  );
}