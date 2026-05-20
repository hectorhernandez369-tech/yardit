import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EventsFooter() {
  return (
    <footer className="bg-gray-950 border-t border-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/aa5288319_file_00000000c1b871f5aeb839b78344a9a4.png"
              alt="Yardit Logo"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="text-xl font-bold text-[#F4A849] tracking-widest font-[cursive]">
              YARDIT
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              to="/events#signup"
              className="text-gray-400 hover:text-[#F4A849] transition-colors"
            >
              Vendors
            </Link>
            <Link
              to="/events"
              className="text-gray-400 hover:text-[#F4A849] transition-colors"
            >
              Events
            </Link>
            <Link
              to={createPageUrl("FAQ")}
              className="text-gray-400 hover:text-[#F4A849] transition-colors"
            >
              Privacy
            </Link>
            <Link
              to={createPageUrl("ContactSupport")}
              className="text-gray-400 hover:text-[#F4A849] transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#F4A849] transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#F4A849] transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-900 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Yardit Events. All rights reserved.
        </div>
      </div>
    </footer>
  );
}