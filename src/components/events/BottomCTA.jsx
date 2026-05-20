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
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Get connected with local events, organizers, and future community experiences through Yardit Events.
          </p>
        </motion.div>
      </div>
    </section>
  );
}