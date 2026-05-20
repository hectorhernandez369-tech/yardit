import React from "react";
import { motion } from "framer-motion";
import { UserPlus, Search, Calendar } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      icon: UserPlus,
      title: "Create Your Vendor Profile",
      description: "Set up your business profile in minutes",
    },
    {
      icon: Search,
      title: "Get Seen By Event Organizers",
      description: "Event organizers discover you through our network",
    },
    {
      icon: Calendar,
      title: "Join Local Events",
      description: "Get invited to participate in local events",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-800 hover:border-[#F4A849]/30 transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#F4A849] to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                    <step.icon className="w-8 h-8 text-gray-950" />
                  </div>
                  <div className="text-5xl font-black text-gray-800 absolute top-4 right-6">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}