import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EventsFooter() {
  return (
    <footer className="bg-[#0A1628] border-t border-[#1A2F4D] py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/690f554506edf795e5d84121/4b5d05a11_file_000000008c6871fdbab262129d9590f6.png"
              alt="Yardit Events Logo"
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold text-[#D4A849] tracking-widest font-[cursive]">
              YARDIT
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              to="/events#cta"
              className="text-gray-400 hover:text-[#D4A849] transition-colors"
            >
              Vendors
            </Link>
            <Link
              to="/events"
              className="text-gray-400 hover:text-[#D4A849] transition-colors"
            >
              Events
            </Link>
            <Link
              to={createPageUrl("FAQ")}
              className="text-gray-400 hover:text-[#D4A849] transition-colors"
            >
              Privacy
            </Link>
            <Link
              to={createPageUrl("ContactSupport")}
              className="text-gray-400 hover:text-[#D4A849] transition-colors"
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
              className="text-gray-400 hover:text-[#D4A849] transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#D4A849] transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#1A2F4D] text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Yardit Events. All rights reserved.
        </div>
      </div>
    </footer>
  );
}