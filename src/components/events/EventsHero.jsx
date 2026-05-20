import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function EventsHero({ onPrimaryCta, onSecondaryCta }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0A1628] via-[#0D1A33] to-[#0F1F3D]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,168,73,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(212,168,73,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
            EVENT ORGANIZERS ARE{" "}
            <span className="text-[#D4A849]">LOOKING FOR</span>{" "}
            VENDORS
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            Yardit Events is building a local network of vendors, food trucks, pop-ups, collectibles, creators, community events, and event organizers.
          </p>

          {/* Premium Promo Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <div className="inline-block bg-gradient-to-br from-[#D4A849] to-[#C99635] rounded-2xl p-1 shadow-2xl shadow-[#D4A849]/25">
              <div className="bg-[#0A1628] rounded-xl px-6 sm:px-10 py-6 sm:py-8 border border-[#1A2F4D]">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#D4A849]" />
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-wider">
                    FIRST50
                  </span>
                  <Sparkles className="w-5 h-5 text-[#D4A849]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                  The First 50 Approved Vendors Receive:
                </h3>
                <ul className="text-left space-y-2 text-gray-300 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A849] mt-1">•</span>
                    <span>60 Days Free Pro Vendor Access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A849] mt-1">•</span>
                    <span>Early Access To Local Events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A849] mt-1">•</span>
                    <span>Founding Vendor Status</span>
                  </li>
                </ul>
                <p className="text-sm text-[#D4A849] font-semibold uppercase tracking-wide">
                  Limited Founding Vendor Access
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={onPrimaryCta}
              className="bg-gradient-to-r from-[#D4A849] to-[#C99635] hover:from-[#E3B859] hover:to-[#D9A645] text-[#0A1628] font-bold text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-[#D4A849]/25 transition-all hover:scale-105"
            >
              Become A Founding Vendor
            </Button>
            <Button
              onClick={onSecondaryCta}
              variant="outline"
              className="border-2 border-[#1A2F4D] text-gray-300 hover:bg-[#0D1A33] hover:border-[#2A3F5D] font-semibold text-lg px-8 py-6 h-auto rounded-xl transition-all"
            >
              Learn More
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}