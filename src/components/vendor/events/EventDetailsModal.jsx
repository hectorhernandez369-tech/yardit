import { useState } from "react";
import { MapPin, Calendar, Users, DollarSign, Clock, X, Info, FileText, Map } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventDetailsModal({ event, isOpen, onClose, onRequestSpot }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription className="text-left">
            {event.organizer_name} • {event.event_type}
          </DialogDescription>
        </DialogHeader>

        {/* Banner Image */}
        <div className="relative h-64 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg overflow-hidden -mt-4">
          {event.cover_image ? (
            <img
              src={event.cover_image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-24 w-24 text-amber-300" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Date & Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {new Date(event.start_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {event.start_time && (
                    <p className="text-sm text-gray-600 mt-1">
                      {event.start_time} - {event.end_time || "TBD"}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{event.location}</p>
                  {event.distance && (
                    <p className="text-sm text-gray-600 mt-1">
                      {event.distance} miles from you
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" />
                    Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    ~{event.attendance_estimate || "TBD"} expected attendees
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {event.spots_available || 0} vendor spots remaining
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    Vendor Fees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {event.vendor_fee ? (
                    <p className="text-sm">
                      ${event.vendor_fee} - ${event.vendor_fee_max || event.vendor_fee}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">Contact organizer for pricing</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-500" />
                  About This Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {event.full_description || event.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Organizer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {event.organizer_name}
                  </p>
                  {event.organizer_contact && (
                    <p className="text-sm">
                      <span className="font-medium">Contact:</span> {event.organizer_contact}
                    </p>
                  )}
                  {event.organizer_bio && (
                    <p className="text-sm text-gray-600 mt-2">
                      {event.organizer_bio}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vendor Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.booth_sizes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Booth Sizes Available:</p>
                    <div className="flex flex-wrap gap-2">
                      {event.booth_sizes.map((size, idx) => (
                        <Badge key={idx} variant="secondary">{size}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {event.categories_allowed && (
                  <div>
                    <p className="text-sm font-medium mb-1">Allowed Categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {event.categories_allowed.map((cat, idx) => (
                        <Badge key={idx} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {event.vendor_rules && (
                  <div>
                    <p className="text-sm font-medium mb-1">Vendor Rules:</p>
                    <p className="text-sm text-gray-700">{event.vendor_rules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Map className="h-4 w-4 text-amber-500" />
                  Map & Setup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                  <MapPin className="h-8 w-8 text-gray-400" />
                </div>
                {event.setup_instructions && (
                  <p className="text-sm text-gray-700">{event.setup_instructions}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            {event.schedule && event.schedule.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Event Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {event.schedule.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{item.time}</p>
                          <p className="text-sm text-gray-700">{item.activity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Schedule not yet available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Spots Remaining:</span>
                  <Badge className={event.spots_available > 5 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                    {event.spots_available || 0} left
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Vendors:</span>
                  <span className="text-sm font-medium">{event.total_vendors || 0} / {event.total_spots || "∞"}</span>
                </div>
                {event.approved_vendors && event.approved_vendors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Approved Vendors:</p>
                    <div className="flex flex-wrap gap-2">
                      {event.approved_vendors.slice(0, 8).map((vendor, idx) => (
                        <Badge key={idx} variant="outline">{vendor}</Badge>
                      ))}
                      {event.approved_vendors.length > 8 && (
                        <Badge variant="outline">+{event.approved_vendors.length - 8} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              onRequestSpot(event);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Request Spot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}