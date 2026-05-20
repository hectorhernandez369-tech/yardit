import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function EventsHero({ onPrimaryCta, onSecondaryCta }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,168,73,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(244,168,73,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
            EVENT ORGANIZERS ARE{" "}
            <span className="text-[#F4A849]">LOOKING FOR</span>{" "}
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
            <div className="inline-block bg-gradient-to-br from-[#F4A849] to-orange-600 rounded-2xl p-1 shadow-2xl shadow-orange-500/20">
              <div className="bg-gray-950 rounded-xl px-6 sm:px-10 py-6 sm:py-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#F4A849]" />
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-wider">
                    FIRST50
                  </span>
                  <Sparkles className="w-5 h-5 text-[#F4A849]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                  The First 50 Vendors Receive:
                </h3>
                <ul className="text-left space-y-2 text-gray-300 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#F4A849] mt-1">•</span>
                    <span>30 Days Free Pro Vendor Access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#F4A849] mt-1">•</span>
                    <span>Early Access To Local Events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#F4A849] mt-1">•</span>
                    <span>Founding Vendor Status</span>
                  </li>
                </ul>
                <p className="text-sm text-orange-400 font-semibold uppercase tracking-wide">
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
              className="bg-[#F4A849] hover:bg-[#E39635] text-gray-950 font-bold text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
            >
              Become A Founding Vendor
            </Button>
            <Button
              onClick={onSecondaryCta}
              variant="outline"
              className="border-2 border-gray-700 text-white hover:bg-gray-800 font-semibold text-lg px-8 py-6 h-auto rounded-xl transition-all"
            >
              Learn More
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}