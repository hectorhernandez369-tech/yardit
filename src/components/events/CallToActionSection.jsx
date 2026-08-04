import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isVendorPublicSignupEnabled } from "@/lib/vendorLaunchGate";
import { ArrowRight } from "lucide-react";

export default function CallToActionSection() {
  const navigate = useNavigate();
  const { data: settings = [] } = useQuery({
    queryKey: ["vendorLaunchGateSettings"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicAppSettings", {});
      return response?.data?.settings || [];
    },
    staleTime: 60000,
  });
  const publicEnabled = isVendorPublicSignupEnabled(settings);

  const handleSignUp = async () => {
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
            {publicEnabled ? "READY TO GET SEEN?" : "VENDOR ACCOUNTS COMING SOON"}
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            {publicEnabled
              ? "Join Yardit Events and connect with local event organizers, vendor opportunities, markets, pop-ups, food truck nights, tournaments, and upcoming community events."
              : "Yardit is launching Residential Yard Sales, Neighborhood Sales, and local Residential Events first. Vendor Accounts and Vendor Events will open in a future release."}
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {publicEnabled ? (
              <Button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-[#D4A849] to-[#C99635] hover:from-[#E3B859] hover:to-[#D9A645] text-[#0A1628] font-bold text-lg sm:text-xl px-12 py-7 h-auto rounded-xl shadow-lg shadow-[#D4A849]/20 transition-all hover:scale-105"
              >
                SIGN UP NOW — DON'T MISS OUT
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/")}
                className="bg-gradient-to-r from-[#D4A849] to-[#C99635] hover:from-[#E3B859] hover:to-[#D9A645] text-[#0A1628] font-bold text-lg sm:text-xl px-12 py-7 h-auto rounded-xl shadow-lg shadow-[#D4A849]/20 transition-all hover:scale-105"
              >
                BACK TO YARDIT
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            )}
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}