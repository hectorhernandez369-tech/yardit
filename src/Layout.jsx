import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Home, User, Settings, Shield } from "lucide-react";
import AdminNotificationBell from "./components/caseManagement/ui/AdminNotificationBell";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Toaster } from "sonner";
import DemoModeToggle, { isDemoMode } from "./components/shared/DemoMode";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        // Derive isAdmin from role if not already set
        if (!('isAdmin' in currentUser)) {
          currentUser.isAdmin = ['admin', 'admin_lite', 'supervisor', 'master'].includes(currentUser.role);
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handler = () => setDemoActive(isDemoMode());
    window.addEventListener("demo-mode-change", handler);
    return () => window.removeEventListener("demo-mode-change", handler);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onLogoPointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      didLongPress.current = true;
      console.log("DEMO LONG PRESS TRIGGERED");
      setShowDemoPanel(prev => !prev);
    }, 1000);
  }, []);

  const onLogoPointerEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const onLogoClick = useCallback((e) => {
    if (didLongPress.current) {
      e.preventDefault();
      didLongPress.current = false;
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3E6CF] overflow-x-hidden max-w-[100vw]">
      <Toaster richColors position="top-center" />
      <header className="bg-[#5DADA5] border-b-2 border-[#2C4F4E] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={createPageUrl("Home")}
                className="flex items-center gap-3 group select-none touch-none"
                onPointerDown={onLogoPointerDown}
                onPointerUp={onLogoPointerEnd}
                onPointerCancel={onLogoPointerEnd}
                onPointerLeave={onLogoPointerEnd}
                onContextMenu={(e) => e.preventDefault()}
                onClick={onLogoClick}
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/5a679ad0d_file_00000000efbc71fd87985abd77ca1f58.png" 
                  alt="Yardit Logo" 
                  className="w-12 h-12"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'cursive' }}>Yardit</h1>
                  <p className="text-xs text-white/90">Find Treasure Nearby</p>
                </div>
              </Link>
              {demoActive && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Demo
                </span>
              )}
            </div>

            <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* TEMPORARY: visible Demo toggle button — remove later */}
              <button
                onClick={() => setShowDemoPanel(prev => !prev)}
                className="text-[10px] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1"
              >
                Demo
              </button>
              <Link to={createPageUrl("Home")}>
                <Button
                  variant={location.pathname === createPageUrl("Home") || location.pathname === "/" ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 ${location.pathname === createPageUrl("Home") || location.pathname === "/" ? "bg-white/20 text-white hover:bg-white/30" : "text-white hover:bg-white/10"}`}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </Link>
              
              {user && (
                <>
                  <Link to={createPageUrl("MyListings")}>
                    <Button
                      variant={location.pathname === createPageUrl("MyListings") ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-2 ${location.pathname === createPageUrl("MyListings") ? "bg-white/20 text-white hover:bg-white/30" : "text-white hover:bg-white/10"}`}
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">My Listings</span>
                    </Button>
                  </Link>
                  
                  <Link to={createPageUrl("Settings")}>
                    <Button
                      variant={location.pathname === createPageUrl("Settings") ? "secondary" : "ghost"}
                      size="icon"
                      className={`${location.pathname === createPageUrl("Settings") ? "bg-white/20 text-white hover:bg-white/30" : "text-white hover:bg-white/10"}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Link>

                  {user.isAdmin && (
                    <>
                      <AdminNotificationBell user={user} />
                      <Link to={createPageUrl("AdminLite")}>
                        <Button
                          variant={location.pathname.includes(createPageUrl("AdminLite")) || location.pathname.includes(createPageUrl("CaseManagement")) ? "secondary" : "ghost"}
                          size="sm"
                          className={`gap-2 ${location.pathname.includes(createPageUrl("AdminLite")) || location.pathname.includes(createPageUrl("CaseManagement")) ? "bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]" : "text-white hover:bg-white/10"} border-2 border-white/30`}
                        >
                          <Shield className="w-4 h-4" />
                          <span className="hidden sm:inline">Admin</span>
                        </Button>
                      </Link>
                    </>
                  )}
                  
                  <Link to={createPageUrl("CreateListing")}>
                    <Button
                      size="sm"
                      className="gap-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] shadow-md font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Post Sale</span>
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {showDemoPanel && (
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 flex items-center justify-center gap-3">
          <DemoModeToggle />
          <button
            onClick={() => setShowDemoPanel(false)}
            className="text-xs text-purple-500 hover:text-purple-700 underline"
          >
            close
          </button>
        </div>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-[#5DADA5] border-t-2 border-[#2C4F4E] py-4">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-white">
            🏴‍☠️ Yardit - Seekers find the best residential yard sales
          </p>
        </div>
      </footer>
    </div>
  );
}