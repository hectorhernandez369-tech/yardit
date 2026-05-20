import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SignupSection() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    vendorName: "",
    businessName: "",
    businessType: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    promoCode: "FIRST50",
  });
  const [promoApplied, setPromoApplied] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Redirect to VendorSignup with promo code
      localStorage.setItem("yardit_events_promo", formData.promoCode);
      navigate(createPageUrl("VendorSignup"));
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (value) => {
    setFormData({
      ...formData,
      businessType: value,
    });
  };

  return (
    <section className="py-20 sm:py-28 bg-gray-950">
      <div className="max-w-2xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Start Your Journey
          </h2>
          <p className="text-lg text-gray-400">
            Join the Yardit Events network today
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vendorName" className="text-gray-300 mb-2 block">
                Your Name
              </Label>
              <Input
                id="vendorName"
                name="vendorName"
                value={formData.vendorName}
                onChange={handleChange}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="businessName" className="text-gray-300 mb-2 block">
                Business Name
              </Label>
              <Input
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
                placeholder="Your Business"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="businessType" className="text-gray-300 mb-2 block">
              Business Type
            </Label>
            <Select onValueChange={handleSelectChange} value={formData.businessType}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="food_truck">Food Truck</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="pop_up">Pop-Up</SelectItem>
                <SelectItem value="collectibles">Collectibles</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="event_organizer">Event Organizer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 block">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-300 mb-2 block">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="city" className="text-gray-300 mb-2 block">
              City
            </Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
              placeholder="Your City"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300 mb-2 block">
              Create Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <Label htmlFor="promoCode" className="text-gray-300 mb-2 block">
              Promo Code
            </Label>
            <div className="relative">
              <Input
                id="promoCode"
                name="promoCode"
                value={formData.promoCode}
                onChange={handleChange}
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-[#F4A849]"
                placeholder="Promo code"
              />
              {promoApplied && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Applied</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Promo code applied successfully
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#F4A849] hover:bg-[#E39635] text-gray-950 font-bold text-lg py-6 h-auto rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}