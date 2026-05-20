import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BottomCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0A1628] to-[#0D1A33]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            More Visibility = More Customers
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Get connected with local events, organizers, and future community experiences through Yardit Events.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/events#cta")}
              className="bg-gradient-to-r from-[#D4A849] to-[#C99635] hover:from-[#E3B859] hover:to-[#D9A645] text-[#0A1628] font-bold text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-[#D4A849]/25 transition-all hover:scale-105"
            >
              Become A Vendor
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="border-2 border-[#1A2F4D] text-gray-300 hover:bg-[#0D1A33] hover:border-[#2A3F5D] font-semibold text-lg px-8 py-6 h-auto rounded-xl transition-all"
            >
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}