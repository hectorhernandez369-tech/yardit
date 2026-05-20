import { TrendingUp, Clock, CheckCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function EventStats({ events }) {
  const stats = {
    eventsNearYou: events?.length || 0,
    pendingRequests: events?.filter((e) => e.vendor_request_status === "pending").length || 0,
    approvedEvents: events?.filter((e) => e.vendor_request_status === "approved").length || 0,
    upcomingEvents: events?.filter((e) => new Date(e.start_date) > new Date()).length || 0,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-full">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Events Near You</p>
              <p className="text-2xl font-bold text-gray-900">{stats.eventsNearYou}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approvedEvents}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}