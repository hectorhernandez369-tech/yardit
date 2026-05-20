import { MapPin, Calendar, Users, DollarSign, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function EventCard({ event, onViewEvent, onRequestSpot }) {
  const getStatusBadge = () => {
    if (event.status === "full") {
      return <Badge className="bg-red-100 text-red-700 border-red-300">Full</Badge>;
    }
    if (event.status === "waitlist") {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Waitlist</Badge>;
    }
    if (event.status === "invite_only") {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Invite Only</Badge>;
    }
    if (event.open_to_vendors) {
      return <Badge className="bg-green-100 text-green-700 border-green-300">Open to Vendors</Badge>;
    }
    return <Badge variant="outline">Closed</Badge>;
  };

  const getRequestStatus = () => {
    if (event.vendor_request_status === "approved") {
      return { text: "Approved", className: "bg-green-600 hover:bg-green-700" };
    }
    if (event.vendor_request_status === "pending") {
      return { text: "Request Pending", className: "bg-yellow-500 hover:bg-yellow-600" };
    }
    if (event.vendor_request_status === "denied") {
      return { text: "Denied", className: "bg-gray-400" };
    }
    return null;
  };

  const requestStatus = getRequestStatus();

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 border-0 bg-white">
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-amber-100 to-orange-100">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-16 w-16 text-amber-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>
        {event.featured && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-amber-500 text-white border-amber-600">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Event Type Badge */}
        <Badge variant="secondary" className="mb-2 text-xs">
          {event.event_type}
        </Badge>

        {/* Event Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {event.title}
        </h3>

        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span>
            {new Date(event.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {event.end_date && (
            <>
              <span>•</span>
              <span>
                {new Date(event.end_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin className="h-4 w-4 text-amber-500" />
          <span className="line-clamp-1">{event.location}</span>
        </div>

        {/* Distance */}
        {event.distance && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>{event.distance} miles away</span>
          </div>
        )}

        {/* Organizer */}
        <div className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Organizer:</span> {event.organizer_name}
        </div>

        {/* Vendor Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-amber-500" />
            <span>{event.spots_available || 0} spots left</span>
          </div>
          {event.attendance_estimate && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span>~{event.attendance_estimate} attendees</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => onViewEvent(event)}
            variant="outline"
            className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
          >
            View Event
          </Button>
          {requestStatus ? (
            <Button
              disabled
              className={`flex-1 ${requestStatus.className}`}
            >
              {requestStatus.text}
            </Button>
          ) : event.status === "full" ? (
            <Button
              onClick={() => onRequestSpot(event)}
              className="flex-1 bg-gray-600 hover:bg-gray-700"
            >
              Join Waitlist
            </Button>
          ) : (
            <Button
              onClick={() => onRequestSpot(event)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              Request Spot
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}