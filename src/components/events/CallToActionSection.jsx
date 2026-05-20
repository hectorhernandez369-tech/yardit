import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { ArrowRight } from "lucide-react";

export default function CallToActionSection() {
  const handleSignUp = async () => {
    // Store promo code for after authentication
    localStorage.setItem("yardit_events_promo", "FIRST50");
    
    // Route to Base44 Auth
    await base44.auth.redirectToLogin("/VendorSignup");
  };

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0A1628] to-[#0D1A33]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            READY TO GET SEEN?
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Join Yardit Events and connect with local event organizers, vendor opportunities, markets, pop-ups, food truck nights, tournaments, and upcoming community events.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              onClick={handleSignUp}
              className="bg-gradient-to-r from-[#D4A849] to-[#C99635] hover:from-[#E3B859] hover:to-[#D9A645] text-[#0A1628] font-bold text-lg sm:text-xl px-12 py-7 h-auto rounded-xl shadow-lg shadow-[#D4A849]/20 transition-all hover:scale-105"
            >
              SIGN UP NOW — DON'T MISS OUT
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-sm text-gray-400"
          >
            The First 50 Approved Vendors Receive: 60 Days Free Pro Vendor Access
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}