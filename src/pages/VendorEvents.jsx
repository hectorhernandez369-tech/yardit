import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Calendar, Users, TrendingUp, Search, Filter, Map as MapIcon, Grid3X3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import EventCard from "@/components/vendor/events/EventCard";
import EventFilterBar from "@/components/vendor/events/EventFilterBar";
import EventStats from "@/components/vendor/events/EventStats";
import EventMapView from "@/components/vendor/events/EventMapView";
import EventDetailsModal from "@/components/vendor/events/EventDetailsModal";
import RequestSpotModal from "@/components/vendor/events/RequestSpotModal";
import BusinessSelectorBar from "@/components/vendor/BusinessSelectorBar";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";

export default function VendorEventsPage() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [viewMode, setViewMode] = useState("card"); // 'card' or 'map'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [requestSpotEvent, setRequestSpotEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("current");
  const [distance, setDistance] = useState("100");
  const [eventType, setEventType] = useState("all");
  const [openToVendorsOnly, setOpenToVendorsOnly] = useState(true);
  const [dateFilter, setDateFilter] = useState("this_month");
  const [sortBy, setSortBy] = useState("starting_soonest");

  // Fetch user and accounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const userAccounts = await getUserVendorAccounts(currentUser);
        setAccounts(userAccounts);
        if (userAccounts.length > 0) {
          setActiveAccount(userAccounts[0]);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch events (placeholder - will be replaced with actual API call)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["vendorEvents", activeAccount?.id, searchQuery, distance, eventType, dateFilter],
    queryFn: async () => {
      // TODO: Replace with actual backend function call
      // For now, return mock data
      return [];
    },
    enabled: !!activeAccount?.id,
  });

  const handleSelectBusiness = (acc) => {
    setActiveAccount(acc);
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleRequestSpot = (event) => {
    setRequestSpotEvent(event);
  };

  const handleCloseDetails = () => {
    setSelectedEvent(null);
  };

  const handleCloseRequest = () => {
    setRequestSpotEvent(null);
  };

  if (!user || !activeAccount) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FBFAF7]">
      {/* Business Selector Bar */}
      <BusinessSelectorBar
        accounts={accounts}
        activeAccount={activeAccount}
        onSelect={handleSelectBusiness}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Vendor Events</h1>
              <p className="text-amber-100">Find local events looking for vendors.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => {}}
              >
                My Event Requests
              </Button>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => {}}
              >
                My Active Events
              </Button>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => {}}
              >
                Event History
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <EventStats events={events} />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search events, organizers, cities…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="card" className="gap-1">
                      <Grid3X3 className="h-4 w-4" />
                      Cards
                    </TabsTrigger>
                    <TabsTrigger value="map" className="gap-1">
                      <MapIcon className="h-4 w-4" />
                      Map
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Collapsible Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <EventFilterBar
                    location={location}
                    setLocation={setLocation}
                    distance={distance}
                    setDistance={setDistance}
                    eventType={eventType}
                    setEventType={setEventType}
                    openToVendorsOnly={openToVendorsOnly}
                    setOpenToVendorsOnly={setOpenToVendorsOnly}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Events List or Map */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" />
          </div>
        ) : viewMode === "map" ? (
          <EventMapView
            events={events}
            onViewEvent={handleViewEvent}
          />
        ) : events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No events found in this area yet.</h3>
              <p className="text-gray-500 mb-4">Try expanding your search radius or adjusting your filters.</p>
              <Button
                onClick={() => setDistance("250")}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Expand search radius
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onViewEvent={handleViewEvent}
                onRequestSpot={handleRequestSpot}
              />
            ))}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={true}
          onClose={handleCloseDetails}
          onRequestSpot={handleRequestSpot}
        />
      )}

      {/* Request Spot Modal */}
      {requestSpotEvent && (
        <RequestSpotModal
          event={requestSpotEvent}
          account={activeAccount}
          isOpen={true}
          onClose={handleCloseRequest}
        />
      )}
    </div>
  );
}