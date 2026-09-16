import { LayoutDashboard, Inbox, FolderOpen, BriefcaseBusiness, Bot, MapPin, Users, Store, ClipboardList, Gift, CreditCard, Compass, Shield, ScrollText, BookOpen, Settings, Activity, UserCog } from "lucide-react";
import { hasCapability } from "@/components/admin/adminCapabilities";

const item = (section, tab, label, icon) => ({ section, tab, label, icon, key: `${section}:${tab || ""}` });

export default function adminNavigation(user) {
  const isMaster = user?.role === "master" || user?.role_label === "master";
  return [
    { label: "Overview", items: [item("dashboard", null, "Dashboard", LayoutDashboard)] },
    { label: "Support & Safety", items: [
      item("inbox", null, "Admin Inbox", Inbox),
      item("case_management", "queue", "Case & Support Queue", FolderOpen),
      item("case_management", "my_cases", "My Cases", BriefcaseBusiness),
      item("astra", null, "Astra Customer Service", Bot),
    ] },
    { label: "Operations", items: [
      item("operations", "listings", "Listings & Neighborhood Sales", MapPin),
      item("operations", "assisted", "Assisted Listings", ClipboardList),
      item("operations", "users", "Users", Users),
      item("operations", "vendors", "Vendors & Events", Store),
      item("operations", "promos", "Promotions & Vouchers", Gift),
      item("operations", "payments", "Payments", CreditCard),
      item("operations", "jth", "Join the Hunt", Compass),
    ] },
    { label: "Administration", items: [
      ...(hasCapability(user, "admins.manage") ? [item("settings", "admin-management", "Admin Management & Permissions", Shield)] : []),
      ...(hasCapability(user, "logs.view") ? [item("settings", "logs", "Audit Logs", ScrollText)] : []),
      item("settings", "resources", "Resources / Training", BookOpen),
      ...(isMaster ? [item("settings", "system-config", "System Configuration", Settings), item("settings", "system-health", "System Health", Activity)] : []),
      item("settings", "settings", "My Admin Settings", UserCog),
    ] },
  ];
}