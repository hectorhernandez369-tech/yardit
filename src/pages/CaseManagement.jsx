import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { logAdminEvent, searchCases, isSupervisor } from "../components/caseManagement";
import InQueueTab from "../components/caseManagement/ui/InQueueTab";
import OpenCasesTab from "../components/caseManagement/ui/OpenCasesTab";
import SubmittedCasesTab from "../components/caseManagement/ui/SubmittedCasesTab";
import ClosedCasesTab from "../components/caseManagement/ui/ClosedCasesTab";
import CaseDetailView from "../components/caseManagement/ui/CaseDetailView";

export default function CaseManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("in_queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [allAdminUsers, setAllAdminUsers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const init = async () => {
      const currentUser = await base44.auth.me();
      if (!currentUser.isAdmin) {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
      const users = await base44.entities.User.list();
      setAllAdminUsers(users.filter(u => ["admin_lite", "supervisor", "master"].includes(u.role)));

      // Deep-link: open a specific case from notification click
      const params = new URLSearchParams(window.location.search);
      const openCaseId = params.get("openCaseId");
      if (openCaseId) {
        setSelectedCaseId(openCaseId);
        logAdminEvent({ adminId: currentUser.id, caseId: openCaseId, eventType: "opened_case", page: "CaseManagement" });
      }
    };
    init();
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedCaseId(null);
    if (user) {
      logAdminEvent({ adminId: user.id, eventType: "changed_tab", payload: { tab }, page: "CaseManagement" });
    }
  }, [user]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const res = await searchCases(searchQuery.trim());
    setSearchResults(res.success ? res.results : []);
    setSearching(false);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
  }, []);

  const handleOpenCase = useCallback((caseId) => {
    setSelectedCaseId(caseId);
    if (user) {
      logAdminEvent({ adminId: user.id, caseId, eventType: "opened_case", page: "CaseManagement" });
    }
  }, [user]);

  const handleCloseCase = useCallback(() => {
    setSelectedCaseId(null);
    setRefreshKey(k => k + 1);
  }, []);

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  if (!user) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  if (selectedCaseId) {
    return (
      <CaseDetailView
        caseId={selectedCaseId}
        user={user}
        allAdminUsers={allAdminUsers}
        onClose={handleCloseCase}
        onRefresh={triggerRefresh}
        activeTab={activeTab}
      />
    );
  }

  const isSup = isSupervisor(user);

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">🗂️ Case Management</h1>

        <div className="flex items-center gap-2 mb-6 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by Account Number or Listing ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <button onClick={handleSearch} disabled={searching} className="btn-primary px-4 py-2 text-sm rounded-lg">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
          {searchResults && (
            <button onClick={handleClearSearch} className="text-sm text-gray-500 underline">Clear</button>
          )}
        </div>
        {searchResults && (
          <p className="text-sm text-gray-600 mb-2">
            Showing {searchResults.length} search result(s). <span className="text-xs text-gray-400">(Address/phone search requires Listing join — not supported in global search.)</span>
          </p>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`grid w-full max-w-2xl ${isSup ? "grid-cols-4" : "grid-cols-4"}`}>
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
      </div>
    </div>
  );
}