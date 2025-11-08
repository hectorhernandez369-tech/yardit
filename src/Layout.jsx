import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Plus, Home, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Map")} className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                  Community Map
                </h1>
                <p className="text-xs text-gray-500">Find local events & spots</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2">
              <Link to={createPageUrl("Map")}>
                <Button
                  variant={location.pathname === createPageUrl("Map") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Profile")}>
                <Button
                  variant={location.pathname === createPageUrl("Profile") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
              </Link>
              <Link to={createPageUrl("AddLocation")}>
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Location</span>
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <p className="text-gray-600 text-center sm:text-left">
              🎃 Share your yard sales & Halloween candy spots with the community! 🏡
            </p>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-600" />
              <span className="text-gray-600">Yard Sales:</span>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                $4.99/5 days
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                $20/month
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}