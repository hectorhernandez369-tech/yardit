import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Compass, Plus, Home, User, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-lg">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Yardit</h1>
                <p className="text-xs text-slate-500">Find Treasure Nearby</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2">
              <Link to={createPageUrl("Home")}>
                <Button
                  variant={location.pathname === createPageUrl("Home") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </Link>
              
              {user && (
                <>
                  <Link to={createPageUrl("MyListings")}>
                    <Button
                      variant={location.pathname === createPageUrl("MyListings") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">My Listings</span>
                    </Button>
                  </Link>
                  
                  <Link to={createPageUrl("Settings")}>
                    <Button
                      variant={location.pathname === createPageUrl("Settings") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Settings</span>
                    </Button>
                  </Link>

                  {user.isAdmin && (
                    <Link to={createPageUrl("AdminLite")}>
                      <Button
                        variant={location.pathname === createPageUrl("AdminLite") ? "default" : "ghost"}
                        size="sm"
                        className="gap-2 border-amber-600 text-amber-700"
                      >
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>
                  )}
                  
                  <Link to={createPageUrl("CreateListing")}>
                    <Button
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900"
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

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-slate-600">
            🏴‍☠️ Yardit - Seekers find the best residential yard sales
          </p>
        </div>
      </footer>
    </div>
  );
}