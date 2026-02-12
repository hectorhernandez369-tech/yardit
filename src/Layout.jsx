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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F4EBDD' }}>
      <header className="bg-white border-b-2 sticky top-0 z-50 shadow-sm" style={{ borderColor: '#0F766E' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/5a679ad0d_file_00000000efbc71fd87985abd77ca1f58.png" 
                alt="Yardit Logo" 
                className="w-12 h-12"
              />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#0F766E', fontFamily: 'cursive' }}>Yardit</h1>
                <p className="text-xs" style={{ color: '#C6A75E' }}>Find Treasure Nearby</p>
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
                      className="gap-2 text-white border-0 hover:opacity-90 shadow-md"
                      style={{ backgroundColor: '#0F766E' }}
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

      <footer className="bg-white border-t-2 py-4" style={{ borderColor: '#0F766E' }}>
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm" style={{ color: '#1F2937' }}>
            🏴‍☠️ Yardit - Seekers find the best residential yard sales
          </p>
        </div>
      </footer>
    </div>
  );
}