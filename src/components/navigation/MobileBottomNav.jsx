import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Plus, MoreVertical, User, Settings, Shield, LogOut, HelpCircle, Map as MapIcon, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function MobileBottomNav({ user, isAuthenticated, hasVendorAccount, hasAdminProfile, showVendorHomeButton, navigateToLogin, onPostSale, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMapActive = location.pathname === createPageUrl("Home") || location.pathname === "/";
  const isVendorDashboardActive = location.pathname === "/VendorDashboard";
  const handleMapClick = () => {
    window.dispatchEvent(new CustomEvent("yardit:show-map-view"));
    navigate(createPageUrl("Home"));
  };

  if (!isAuthenticated) {
    return (
      <nav className="yardit-mobile-bottom-nav yardit-mobile-bottom-nav-guest" aria-label="Mobile navigation">
        <button onClick={handleMapClick} className={`yardit-mobile-nav-item ${isMapActive ? "is-active" : ""}`}>
          <Home className="w-5 h-5" />
          <span>Map</span>
        </button>
        <button onClick={navigateToLogin} className="yardit-mobile-nav-item yardit-mobile-nav-primary">
          <User className="w-5 h-5" />
          <span>Log In</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className={`yardit-mobile-bottom-nav ${showVendorHomeButton ? "yardit-mobile-bottom-nav-vendor-home" : ""}`} aria-label="Mobile navigation">
      <div className="yardit-mobile-nav-logo" aria-hidden="true">
        <img
          src="https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png"
          alt=""
        />
      </div>

      <button onClick={handleMapClick} className={`yardit-mobile-nav-item yardit-mobile-nav-map ${isMapActive ? "is-active" : ""}`}>
        <Home className="w-5 h-5" />
        <span>Map</span>
      </button>

      {showVendorHomeButton && (
        <button onClick={() => navigate("/VendorDashboard")} className={`yardit-mobile-nav-item yardit-mobile-nav-vendor-home ${isVendorDashboardActive ? "is-active" : ""}`}>
          <Store className="w-5 h-5" />
          <span>Vendor</span>
        </button>
      )}

      <div className="yardit-mobile-nav-item yardit-mobile-nav-bell">
        <NotificationBell />
        <span>Alerts</span>
      </div>

      <button onClick={onPostSale} className="yardit-mobile-nav-item yardit-mobile-nav-primary yardit-mobile-nav-halloween-post">
        <Plus className="w-5 h-5" />
        <span>Post</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="yardit-mobile-nav-item yardit-mobile-nav-menu">
            <MoreVertical className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={12} className="z-[3001] w-52 rounded-xl shadow-xl border border-gray-200 bg-white/95 backdrop-blur-md p-1.5">
          <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase">Account</div>
          <DropdownMenuItem onClick={() => navigate(createPageUrl("MyListings"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
            <MapIcon className="w-3.5 h-3.5 text-[#5DADA5]" /> My Listings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
            <User className="w-3.5 h-3.5 text-[#5DADA5]" /> My Profile
          </DropdownMenuItem>
          {hasVendorAccount && (
            <DropdownMenuItem onClick={() => navigate("/VendorDashboard")} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
              <Store className="w-3.5 h-3.5 text-[#5DADA5]" /> Vendor Tools
            </DropdownMenuItem>
          )}
          {hasAdminProfile && (
            <DropdownMenuItem onClick={() => navigate(createPageUrl("AdminLite"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
              <Shield className="w-3.5 h-3.5 text-[#F4A849]" /> Admin Login
            </DropdownMenuItem>
          )}
          <div className="h-px bg-gray-100 my-0.5" />
          <DropdownMenuItem onClick={() => navigate(createPageUrl("StartupGuide"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
            <HelpCircle className="w-3.5 h-3.5 text-[#5DADA5]" /> Help
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0fdfa] transition">
            <Settings className="w-3.5 h-3.5 text-gray-500" /> Settings
          </DropdownMenuItem>
          <div className="h-px bg-gray-100 my-0.5" />
          <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 transition mt-1">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}