import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Calendar, MapPin, Edit, TrendingUp, ShoppingBag, Candy } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

export default function LocationCheckInStats({ location, checkIns, onEdit }) {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 6 - i));
      return {
        date: format(date, "MMM dd"),
        checkIns: 0,
        fullDate: date,
      };
    });

    checkIns.forEach((checkIn) => {
      const checkInDate = startOfDay(new Date(checkIn.created_date));
      const dayData = last7Days.find(
        (day) => day.fullDate.getTime() === checkInDate.getTime()
      );
      if (dayData) {
        dayData.checkIns++;
      }
    });

    return last7Days.map(({ date, checkIns }) => ({ date, checkIns }));
  }, [checkIns]);

  const totalCheckIns = checkIns.length;
  const todayCheckIns = checkIns.filter(
    (c) => format(new Date(c.created_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;

  return (
    <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              location.type === "yard_sale" ? "bg-orange-100" : "bg-purple-100"
            }`}>
              {location.type === "yard_sale" ? (
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              ) : (
                <Candy className="w-6 h-6 text-purple-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl mb-2">{location.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {location.address}
                </Badge>
                {location.date && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(location.date), "MMM d, yyyy")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="gap-2 whitespace-nowrap"
          >
            <Edit className="w-4 h-4" />
            Edit Details
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700 font-medium">Total Check-ins</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{totalCheckIns}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-700 font-medium">Today</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{todayCheckIns}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-purple-700 font-medium">Last 7 Days</p>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {checkIns.filter(c => new Date(c.created_date) > subDays(new Date(), 7)).length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-orange-700 font-medium">Daily Avg</p>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              {(totalCheckIns / 7).toFixed(1)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Check-in Trend (Last 7 Days)</h3>
          <div className="bg-white rounded-lg p-4 border">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="checkIns" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Check-ins"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Description */}
        {location.description && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">{location.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}