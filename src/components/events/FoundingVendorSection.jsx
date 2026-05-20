import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Star, Zap, Award } from "lucide-react";

export default function FoundingVendorSection({ onCta }) {
  const benefits = [
    {
      icon: Zap,
      text: "60 Days Free Pro Vendor Access",
    },
    {
      icon: Star,
      text: "Priority Visibility",
    },
    {
      icon: Crown,
      text: "Early Vendor Opportunities",
    },
    {
      icon: Award,
      text: "Founding Vendor Recognition",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-[#0D1A33] via-[#0A1628] to-[#0F1F3D] relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4A849] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block mb-6">
            <div className="bg-gradient-to-br from-[#D4A849] to-[#C99635] rounded-2xl px-8 py-4 shadow-2xl shadow-[#D4A849]/25">
              <span className="text-4xl sm:text-5xl font-black text-[#0A1628] tracking-wider">
                FIRST50
              </span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Get In Before Everyone Else Does — Limited Founding Access
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center gap-3 bg-[#0D1A33]/50 rounded-xl px-6 py-4 border border-[#1A2F4D]"
              >
                <benefit.icon className="w-6 h-6 text-[#D4A849] flex-shrink-0" />
                <span className="text-gray-200 font-medium text-left">
                  {benefit.text}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button
              onClick={onCta}
              className="bg-gradient-to-r from-[#D4A849] to-[#C99635] hover:from-[#E3B859] hover:to-[#D9A645] text-[#0A1628] font-bold text-lg px-10 py-6 h-auto rounded-xl shadow-lg shadow-[#D4A849]/25 transition-all hover:scale-105"
            >
              Claim Founding Access
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}