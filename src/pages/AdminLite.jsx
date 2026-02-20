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

  return (
    <div className="min-h-[calc(100vh-140px)] p-3 sm:p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          🛡️ Admin – {
            (() => {
              const r = user.role;
              if (r === "master") return "Master";
              if (r === "supervisor") return "Supervisor";
              return "Basic";
            })()
          }
        </h1>

        {/* Top-level admin tabs */}
        <Tabs value={topTab} onValueChange={setTopTab}>
          <TabsList className="flex w-full max-w-2xl overflow-x-auto mb-4">
            <TabsTrigger value="cases">Case Management</TabsTrigger>
            <TabsTrigger value="lite">Admin Lite</TabsTrigger>
            {canManageAdmins && <TabsTrigger value="create-admin">Create Admin</TabsTrigger>}
            {canViewLogs && <TabsTrigger value="logs">Logs</TabsTrigger>}
          </TabsList>

          {/* ─── Case Management ─── */}
          <TabsContent value="cases">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by Account # or Listing ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-10"
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
              <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="in_queue">In Queue</TabsTrigger>
                <TabsTrigger value="open">Open Cases</TabsTrigger>
                <TabsTrigger value="submitted">Submitted</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
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