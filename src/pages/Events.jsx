import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Users, 
  Search, 
  ArrowRight, 
  Store, 
  TrendingUp, 
  Eye, 
  Award,
  Target,
  Sparkles,
  Ghost,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Mock event data
const mockEvents = [
  {
    id: "1",
    title: "Downtown Summer Market",
    city: "San Diego, CA",
    date: "2026-06-15",
    time: "9:00 AM - 4:00 PM",
    type: "Market",
    spotsAvailable: 12,
    isOpenToVendors: true,
    image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "Food Truck Festival",
    city: "Los Angeles, CA",
    date: "2026-06-22",
    time: "11:00 AM - 9:00 PM",
    type: "Food Truck",
    spotsAvailable: 5,
    isOpenToVendors: true,
    image: "https://images.unsplash.com/photo-1565126988422-b7a1a5866727?w=800&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "School Fundraiser Fair",
    city: "San Francisco, CA",
    date: "2026-07-10",
    time: "10:00 AM - 3:00 PM",
    type: "School Event",
    spotsAvailable: 8,
    isOpenToVendors: true,
    image: "https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&auto=format&fit=crop",
  },
  {
    id: "4",
    title: "Community Craft Fair",
    city: "Portland, OR",
    date: "2026-07-18",
    time: "8:00 AM - 5:00 PM",
    type: "Craft Fair",
    spotsAvailable: 15,
    isOpenToVendors: true,
    image: "https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=800&auto=format&fit=crop",
  },
];

const featuredEvent = {
  id: "featured-1",
  title: "The First Annual Yardit Haunted House Hunt",
  date: "October 2026",
  description: "A spooky community-wide treasure hunt featuring haunted houses, eerie challenges, and mysterious rewards. Vendors wanted for food, crafts, and entertainment.",
  image: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=1200&auto=format&fit=crop",
};

const benefits = [
  {
    icon: Eye,
    title: "Get Seen By Event Organizers",
    description: "Connect with organizers actively seeking vendors for their events",
  },
  {
    icon: Store,
    title: "Join Local Events",
    description: "Participate in markets, festivals, pop-ups, and community gatherings",
  },
  {
    icon: TrendingUp,
    title: "Promote Your Business",
    description: "Increase visibility and grow your customer base organically",
  },
  {
    icon: MapPin,
    title: "Appear On The Yardit Map",
    description: "Get discovered by thousands of active Yardit users in your area",
  },
  {
    icon: Target,
    title: "Participate In Community Hunts",
    description: "Join exclusive treasure hunts and community engagement activities",
  },
  {
    icon: Award,
    title: "Build Your Local Presence",
    description: "Establish your brand as a trusted local vendor",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Vendor Profile",
    description: "Set up your business profile in minutes",
  },
  {
    number: "02",
    title: "Find Or Join Events",
    description: "Discover and request spots at local events",
  },
  {
    number: "03",
    title: "Get Seen By Customers",
    description: "Connect with your community and grow",
  },
];

export default function EventsPage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState("50");
  const [eventType, setEventType] = useState("all");
  const [openToVendorsOnly, setOpenToVendorsOnly] = useState(true);
  const [sortBy, setSortBy] = useState("closest");

  const handleBecomeVendor = () => {
    navigate("/VendorSignup");
  };

  const handleSearchEvents = () => {
    navigate("/VendorEvents");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background with subtle visuals */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-orange-950/20 to-gray-950" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border-2 border-orange-500 rounded-full blur-xl" />
          <div className="absolute bottom-40 right-20 w-48 h-48 border-2 border-orange-400 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border border-orange-600 rounded-full blur-lg" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Promo Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">
                FOUNDING30 — 30 Days Free Pro Vendor Access
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Event Organizers Are{" "}
              <span className="text-orange-400">Looking For Vendors</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Get discovered for local markets, pop-ups, food truck nights, tournaments, 
              community hunts, haunted house events, and more.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={handleBecomeVendor}
                className="w-full sm:w-auto px-8 py-6 text-lg bg-orange-500 hover:bg-orange-600 text-white border-0 rounded-lg font-semibold transition-all hover:scale-105"
              >
                Become A Vendor
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                onClick={handleSearchEvents}
                variant="outline"
                className="w-full sm:w-auto px-8 py-6 text-lg border-2 border-white/30 hover:border-orange-400 hover:bg-orange-500/10 text-white rounded-lg font-semibold transition-all"
              >
                Search Local Events
              </Button>
            </div>
          </motion.div>

          {/* Subtle background hints */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto opacity-30"
          >
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-orange-400" />
              <p className="text-xs text-gray-400">Local Events</p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-orange-400" />
              <p className="text-xs text-gray-400">Vendor Booths</p>
            </div>
            <div className="text-center">
              <Store className="w-8 h-8 mx-auto mb-2 text-orange-400" />
              <p className="text-xs text-gray-400">Community Energy</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search Events Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Find Local Vendor Events
            </h2>
            <p className="text-gray-400 text-lg">
              Discover opportunities in your area
            </p>
          </motion.div>

          {/* Search Filters */}
          <Card className="bg-gray-800/50 border-gray-700 mb-12">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Location Search */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search by city or ZIP"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 h-12"
                    />
                  </div>
                </div>

                {/* Distance */}
                <Select value={distance} onValueChange={setDistance}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-12">
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                    <SelectItem value="100">100 miles</SelectItem>
                    <SelectItem value="250">250 miles</SelectItem>
                  </SelectContent>
                </Select>

                {/* Event Type */}
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-12">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="market">Markets</SelectItem>
                    <SelectItem value="food-truck">Food Truck Events</SelectItem>
                    <SelectItem value="school">School Events</SelectItem>
                    <SelectItem value="festival">Festivals</SelectItem>
                    <SelectItem value="sports">Sports Events</SelectItem>
                    <SelectItem value="community">Community Events</SelectItem>
                    <SelectItem value="popup">Pop-Ups</SelectItem>
                    <SelectItem value="craft">Craft Fairs</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-12">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closest">Closest</SelectItem>
                    <SelectItem value="soonest">Starting Soonest</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openToVendorsOnly}
                    onChange={(e) => setOpenToVendorsOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Open to Vendors Only</span>
                </label>
                <Button
                  onClick={handleSearchEvents}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  View All Events
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="bg-gray-800 border-gray-700 overflow-hidden hover:border-orange-500/50 transition-all group">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {event.isOpenToVendors && (
                      <Badge className="absolute top-3 right-3 bg-orange-500 text-white">
                        Open to Vendors
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-1">{event.title}</h3>
                    <div className="space-y-1 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{event.spotsAvailable} spots available</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-gray-600 hover:border-orange-400 hover:bg-orange-500/10 text-white text-xs"
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                      >
                        Request to Join
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Join Yardit Events?
            </h2>
            <p className="text-gray-400 text-lg">
              Everything you need to grow your local presence
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="bg-gray-800/50 border-gray-700 p-6 hover:border-orange-500/30 transition-all">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg">
              Get started in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full text-2xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="font-bold text-xl mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Event Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-64 md:h-auto">
                  <img
                    src={featuredEvent.image}
                    alt={featuredEvent.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-900" />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <Badge className="w-fit bg-orange-500 text-white mb-4">
                    <Ghost className="w-3 h-3 mr-1" />
                    Featured Event
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    {featuredEvent.title}
                  </h2>
                  <p className="text-gray-400 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {featuredEvent.date}
                  </p>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {featuredEvent.description}
                  </p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white w-fit">
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready To Get Seen?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Join the fastest-growing vendor community
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                onClick={handleBecomeVendor}
                className="w-full sm:w-auto px-8 py-6 text-lg bg-orange-500 hover:bg-orange-600 text-white border-0 rounded-lg font-semibold"
              >
                Become A Vendor
              </Button>
              <Button
                onClick={handleSearchEvents}
                variant="outline"
                className="w-full sm:w-auto px-8 py-6 text-lg border-2 border-white/30 hover:border-orange-400 hover:bg-orange-500/10 text-white rounded-lg font-semibold"
              >
                Explore Events
              </Button>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">
                Use code FOUNDING30 for 30 days free Pro access
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4 text-orange-400">Yardit</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
                <li><Link to="/VendorSignup" className="hover:text-white transition-colors">Vendors</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Community Hunts</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-orange-400">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-orange-400">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-orange-400">Connect</h3>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>&copy; 2026 Yardit. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}