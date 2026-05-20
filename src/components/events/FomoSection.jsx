import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, MapPin, Users, Eye } from "lucide-react";

export default function FomoSection() {
  const stats = [
    {
      icon: TrendingUp,
      label: "Vendor Opportunities",
      value: "Growing",
    },
    {
      icon: MapPin,
      label: "Local Event Access",
      value: "Expanding",
    },
    {
      icon: Users,
      label: "Community Exposure",
      value: "Active",
    },
    {
      icon: Eye,
      label: "Priority Visibility",
      value: "Exclusive",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0D1A33] to-[#0A1628]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Get In Before Everyone Else Does
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Event organizers are actively searching for vendors for upcoming markets, community events, pop-ups, food truck nights, tournaments, and seasonal experiences.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-[#0D1A33] to-[#0F1F3D] rounded-2xl p-6 border border-[#1A2F4D] hover:border-[#D4A849]/50 transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <stat.icon className="w-10 h-10 text-[#D4A849] mb-4" />
                <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}