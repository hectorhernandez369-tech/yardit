import { useState } from "react";
import { ChevronDown, Plus, Store, Trophy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DefaultVendorPageControl from "@/components/vendor/DefaultVendorPageControl";

export const ORGANIZER_TYPE_CONFIG = {
  vendor_event: { label: "Vendor/Event Organizer", shortLabel: "Vendor", icon: Store, route: "/VendorDashboard", createPath: "/VendorAccountIntro?organizer=vendor_event", badgeClass: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100", iconClass: "text-[#F4A849]" },
  league: { label: "League Organizer", shortLabel: "League", icon: Trophy, route: "/LeagueTeamDashboard", createPath: "/VendorAccountIntro?organizer=league", badgeClass: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100", iconClass: "text-blue-600" },
  team: { label: "Team Organizer", shortLabel: "Team", icon: Users, route: "/TeamDashboard", createPath: "/VendorAccountIntro?organizer=team", badgeClass: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100", iconClass: "text-green-600" },
  league_team: { label: "League Organizer", shortLabel: "League", icon: Trophy, route: "/LeagueTeamDashboard", createPath: "/VendorAccountIntro?organizer=league", badgeClass: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100", iconClass: "text-blue-600" },
  fair_organizer: { label: "Fair Organizer", shortLabel: "Fair", icon: Store, route: "/VendorDashboard", createPath: "/VendorAccountIntro?organizer=fair_organizer", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100", iconClass: "text-emerald-600" },
  school_organizer: { label: "School Organizer", shortLabel: "School", icon: Store, route: "/VendorDashboard", createPath: "/VendorAccountIntro?organizer=school_organizer", badgeClass: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100", iconClass: "text-violet-600" },
  tournament_organizer: { label: "Tournament Organizer", shortLabel: "Tournament", icon: Trophy, route: "/LeagueTeamDashboard", createPath: "/VendorAccountIntro?organizer=tournament_organizer", badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-100", iconClass: "text-cyan-600" },
};

const ORGANIZATION_TYPE_TO_ORGANIZER_TYPE = {
  vendor: "vendor_event", event_organizer: "vendor_event", nonprofit: "vendor_event", food_truck: "vendor_event", retail: "vendor_event", service: "vendor_event", other: "vendor_event",
  league: "league", team: "team", league_team: "league", fair_organizer: "fair_organizer", school_organizer: "school_organizer", tournament_organizer: "tournament_organizer",
};

export const getOrganizerDashboardType = (account) => {
  const name = String(account?.business_name || account?.vendor_display_name || "").trim().toLowerCase();
  if (account?.organization_type === "league_team" && name === "lindsay youth football and cheer") return "team";
  return ORGANIZATION_TYPE_TO_ORGANIZER_TYPE[account?.organization_type] || account?.organization_type || "vendor_event";
};
export const getOrganizerTypeConfig = (accountOrType) => {
  const type = typeof accountOrType === "string" ? accountOrType : getOrganizerDashboardType(accountOrType);
  return ORGANIZER_TYPE_CONFIG[type] || { label: "Organizer Account", shortLabel: "Organizer", icon: Store, route: "/VendorDashboard", createPath: "/VendorAccountIntro", badgeClass: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100", iconClass: "text-slate-500" };
};
export const getOrganizerTypeLabel = (account) => getOrganizerTypeConfig(account).shortLabel;
export const getOrganizerFullTypeLabel = (account) => getOrganizerTypeConfig(account).label;
export const getOrganizerAccountName = (account) => account?.vendor_display_name || account?.business_name || account?.legal_business_name || "Unnamed organizer account";

const getOrganizerRoute = (account, dashboardType, currentTab, adminPreview) => {
  const targetType = getOrganizerDashboardType(account);
  const config = getOrganizerTypeConfig(targetType);
  const params = new URLSearchParams();
  if (currentTab) params.set("tab", targetType === dashboardType ? currentTab : "profile");
  params.set("account", account.id);
  if (adminPreview) params.set("adminPreview", "1");
  return `${config.route}?${params.toString()}`;
};

export function useOrganizerAccountSelect({ dashboardType, currentTab, adminPreview = false }) {
  const navigate = useNavigate();
  return (account) => {
    if (!account?.id) return;
    if (!adminPreview) sessionStorage.setItem("yardit_explicit_organizer_account_id", account.id);
    navigate(getOrganizerRoute(account, dashboardType, currentTab, adminPreview));
  };
}

export function OrganizerAccountMenuItems({ accounts, activeAccount, defaultAccountId, onSelect }) {
  return accounts.map((acc) => {
    const config = getOrganizerTypeConfig(acc); const Icon = config.icon; const isDefault = acc.id === defaultAccountId;
    return <DropdownMenuItem key={acc.id} onClick={() => onSelect(acc)} className={`gap-2 ${acc.id === activeAccount?.id ? "bg-[#5DADA5]/10 text-[#2C4F4E] font-semibold" : ""}`}>
      {acc.business_logo ? <img src={acc.business_logo} alt="" className="w-5 h-5 rounded object-cover" /> : <Icon className={`w-4 h-4 ${config.iconClass}`} />}
      <div className="min-w-0 flex-1"><div className="truncate">{getOrganizerAccountName(acc)}</div><div className="text-[10px] font-semibold text-slate-500">{config.label}</div></div>
      <Badge className={`shrink-0 rounded-full border px-2 py-0 text-[10px] font-bold ${config.badgeClass}`}>{config.shortLabel}</Badge>
      {isDefault && <span className="text-[10px] font-bold text-[#5DADA5]">Default</span>}
    </DropdownMenuItem>;
  });
}

export function OrganizerAccountCreateMenu() {
  const navigate = useNavigate(); const [open, setOpen] = useState(false);
  const startAccount = (type) => {
    const config = getOrganizerTypeConfig(type);
    localStorage.setItem("yardit_pending_organizer_type", type);
    setOpen(false);
    const separator = config.createPath.includes("?") ? "&" : "?";
    navigate(`${config.createPath}${separator}mode=add`);
  };
  return <><div className="my-1 h-px bg-slate-100" /><DropdownMenuItem onSelect={(event) => { event.preventDefault(); setOpen(true); }} className="gap-2 font-semibold text-[#2C4F4E]"><Plus className="h-4 w-4 text-[#5DADA5]" />Open Another Organizer Account</DropdownMenuItem>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Open another organizer account</DialogTitle><DialogDescription>Choose the account you want to run.</DialogDescription></DialogHeader>
      <div className="grid gap-3 pt-2">
        <Button onClick={() => startAccount("vendor_event")} variant="outline" className="justify-start gap-3 rounded-xl"><Store className="h-5 w-5 text-[#F4A849]" /><span className="text-left"><span className="block font-bold">Vendor/Event Organizer</span><span className="block text-xs text-slate-600">Food trucks, vendors, markets, and events</span></span></Button>
        <Button onClick={() => startAccount("league")} variant="outline" className="justify-start gap-3 rounded-xl"><Trophy className="h-5 w-5 text-blue-600" /><span className="text-left"><span className="block font-bold">League Account</span><span className="block text-xs text-slate-600">Runs multiple teams and the league master schedule</span></span></Button>
        <Button onClick={() => startAccount("team")} variant="outline" className="justify-start gap-3 rounded-xl"><Users className="h-5 w-5 text-green-600" /><span className="text-left"><span className="block font-bold">Team Account</span><span className="block text-xs text-slate-600">Runs one organization/team and its own schedule</span></span></Button>
      </div></DialogContent></Dialog></>;
}

export default function OrganizerAccountSwitcher({ accounts, activeAccount, defaultAccountId, dashboardType, currentTab, adminPreview = false, canManageDefaultPage = false, isDefaultPage = false, onMakeDefaultPage }) {
  const handleSelect = useOrganizerAccountSelect({ dashboardType, currentTab, adminPreview });
  if (!accounts || accounts.length === 0) return null;
  const activeConfig = getOrganizerTypeConfig(activeAccount);
  const makeGlobalDefault = () => { if (activeAccount?.id && !adminPreview) localStorage.setItem("yardit_default_organizer_account_id", activeAccount.id); onMakeDefaultPage?.(); };
  return <div className="bg-[#2C4F4E] text-white px-4 py-2 flex items-center gap-2 text-sm"><Store className="w-4 h-4 shrink-0 opacity-70" /><span className="opacity-70 text-xs mr-1">Organizer account:</span>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 min-w-0 px-2 text-white hover:bg-white/10 font-semibold gap-1"><span className="max-w-[14rem] truncate">{activeAccount ? getOrganizerAccountName(activeAccount) : "Select Account"}</span><Badge className={`rounded-full border px-2 py-0 text-[10px] font-bold ${activeConfig.badgeClass}`}>{activeAccount ? activeConfig.shortLabel : "Organizer"}</Badge><ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80"><OrganizerAccountMenuItems accounts={accounts} activeAccount={activeAccount} defaultAccountId={defaultAccountId} onSelect={handleSelect} /><OrganizerAccountCreateMenu /></DropdownMenuContent></DropdownMenu>
    <DefaultVendorPageControl canManage={canManageDefaultPage} isDefault={isDefaultPage} onMakeDefault={makeGlobalDefault} className="ml-auto shrink-0" /></div>;
}