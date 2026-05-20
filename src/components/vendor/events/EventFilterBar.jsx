import { MapPin, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function EventFilterBar({
  location,
  setLocation,
  distance,
  setDistance,
  eventType,
  setEventType,
  openToVendorsOnly,
  setOpenToVendorsOnly,
  dateFilter,
  setDateFilter,
  sortBy,
  setSortBy,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
      {/* Location */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="City or ZIP"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Distance */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Distance</Label>
        <Select value={distance} onValueChange={setDistance}>
          <SelectTrigger>
            <SelectValue placeholder="Select distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 miles</SelectItem>
            <SelectItem value="25">25 miles</SelectItem>
            <SelectItem value="50">50 miles</SelectItem>
            <SelectItem value="100">100 miles</SelectItem>
            <SelectItem value="250">250 miles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event Type */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Event Type</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="markets">Markets</SelectItem>
            <SelectItem value="food_truck">Food Truck Events</SelectItem>
            <SelectItem value="school">School Events</SelectItem>
            <SelectItem value="festivals">Festivals</SelectItem>
            <SelectItem value="sports">Sports Events</SelectItem>
            <SelectItem value="community">Community Events</SelectItem>
            <SelectItem value="pop_up">Pop-Ups</SelectItem>
            <SelectItem value="craft_fair">Craft Fairs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Filter */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Date Range</Label>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Select dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_weekend">This Weekend</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="custom">Custom Dates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Open to Vendors Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="open-to-vendors"
          checked={openToVendorsOnly}
          onCheckedChange={setOpenToVendorsOnly}
        />
        <Label htmlFor="open-to-vendors" className="text-sm font-medium cursor-pointer">
          Open to Vendors Only
        </Label>
      </div>

      {/* Sort By */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Sort By</Label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="starting_soonest">Starting Soonest</SelectItem>
            <SelectItem value="closest">Closest</SelectItem>
            <SelectItem value="recently_added">Recently Added</SelectItem>
            <SelectItem value="most_popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}