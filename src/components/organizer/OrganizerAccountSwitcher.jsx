import { ChevronDown, Store, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const getOrganizerDashboardType = (account) => (
  account?.organization_type === "league_team" ? "league_team" : "vendor_event"
);

export const getOrganizerTypeLabel = (account) => (
  getOrganizerDashboardType(account) === "league_team" ? "League / Team" : "Vendor / Event"
);

const getOrganizerRoute = (account, dashboardType, currentTab, adminPreview) => {
  const targetType = getOrganizerDashboardType(account);
  const params = new URLSearchParams();
  params.set("tab", targetType === dashboardType ? (currentTab || "profile") : "profile");
  params.set("account", account.id);
  if (adminPreview && targetType === "vendor_event") params.set("adminPreview", "1");
  return `${targetType === "league_team" ? "/LeagueTeamDashboard" : "/VendorDashboard"}?${params.toString()}`;
};

export function useOrganizerAccountSelect({ dashboardType, currentTab, onSelectSameDashboard, adminPreview = false }) {
  const navigate = useNavigate();
  return (account) => {
    if (!account?.id) return;
    if (getOrganizerDashboardType(account) === dashboardType && onSelectSameDashboard) {
      onSelectSameDashboard(account);
      return;
    }
    navigate(getOrganizerRoute(account, dashboardType, currentTab, adminPreview), { replace: true });
  };
}

export function OrganizerAccountMenuItems({ accounts, activeAccount, defaultAccountId, onSelect }) {
  return accounts.map((acc) => {
    const isLeague = getOrganizerDashboardType(acc) === "league_team";
    const Icon = isLeague ? Trophy : Store;
    return (
      <DropdownMenuItem
        key={acc.id}
        onClick={() => onSelect(acc)}
        className={`gap-2 ${acc.id === activeAccount?.id ? "bg-[#5DADA5]/10 text-[#2C4F4E] font-semibold" : ""}`}
      >
        {acc.business_logo ? (
          <img src={acc.business_logo} alt="" className="w-5 h-5 rounded object-cover" />
        ) : (
          <Icon className={`w-4 h-4 ${isLeague ? "text-[#F4A849]" : "text-[#5DADA5]"}`} />
        )}
        <span className="min-w-0 flex-1 truncate">{acc.business_name}</span>
        <Badge className="shrink-0 rounded-full bg-slate-100 px-2 py-0 text-[10px] font-bold text-slate-600 hover:bg-slate-100">
          {getOrganizerTypeLabel(acc)}
        </Badge>
        {acc.id === defaultAccountId && <span className="ml-auto text-[10px] text-[#5DADA5]">Default</span>}
      </DropdownMenuItem>
    );
  });
}

export default function OrganizerAccountSwitcher({ accounts, activeAccount, defaultAccountId, dashboardType, currentTab, onSelectSameDashboard, adminPreview = false }) {
  const handleSelect = useOrganizerAccountSelect({ dashboardType, currentTab, onSelectSameDashboard, adminPreview });
  if (!accounts || accounts.length <= 1) return null;

  return (
    <div className="bg-[#2C4F4E] text-white px-4 py-2 flex items-center gap-2 text-sm">
      <Store className="w-4 h-4 shrink-0 opacity-70" />
      <span className="opacity-70 text-xs mr-1">Organizer account:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-white hover:bg-white/10 font-semibold gap-1">
            <span className="max-w-[14rem] truncate">{activeAccount?.business_name || "Select Account"}</span>
            <Badge className="rounded-full bg-white/15 px-2 py-0 text-[10px] font-bold text-white hover:bg-white/15">
              {activeAccount ? getOrganizerTypeLabel(activeAccount) : "Organizer"}
            </Badge>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <OrganizerAccountMenuItems accounts={accounts} activeAccount={activeAccount} defaultAccountId={defaultAccountId} onSelect={handleSelect} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}