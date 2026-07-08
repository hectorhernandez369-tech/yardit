import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";


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