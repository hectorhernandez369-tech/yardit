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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F0' }}>
      <header className="bg-white border-b-2 sticky top-0 z-50 shadow-sm" style={{ borderColor: '#E84A3F' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/9bc50c75a_ChatGPTImageDec27202509_37_00AM.png" 
                alt="Yardit Logo" 
                className="w-12 h-12"
              />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#2C3E50', fontFamily: 'cursive' }}>Yardit</h1>
                <p className="text-xs" style={{ color: '#5DCCB5' }}>Find Treasure Nearby</p>
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
                      className="gap-2 text-white border-2 hover:opacity-90"
                      style={{ backgroundColor: '#E84A3F', borderColor: '#2C3E50' }}
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

      <footer className="bg-white border-t-2 py-4" style={{ borderColor: '#E84A3F' }}>
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm" style={{ color: '#2C3E50' }}>
            🏴‍☠️ Yardit - Seekers find the best residential yard sales
          </p>
        </div>
      </footer>
    </div>
  );
}