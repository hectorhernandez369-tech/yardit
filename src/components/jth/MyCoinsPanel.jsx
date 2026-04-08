import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MyCoinsPanel({ stats, history }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Coins</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border p-4 bg-amber-50"><p className="text-xs text-slate-500">Lifetime coins</p><p className="text-2xl font-bold">{stats?.lifetime_coins || 0}</p></div>
          <div className="rounded-xl border p-4 bg-blue-50"><p className="text-xs text-slate-500">Rolling 60-day coins</p><p className="text-2xl font-bold">{stats?.rolling_60_day_coins || 0}</p></div>
          <div className="rounded-xl border p-4 bg-emerald-50"><p className="text-xs text-slate-500">Current rank</p><p className="text-lg font-bold">{stats?.current_rank || "No rank yet"}</p></div>
          <div className="rounded-xl border p-4 bg-purple-50"><p className="text-xs text-slate-500">Highest rank achieved</p><p className="text-lg font-bold">{stats?.highest_rank_achieved || "No rank yet"}</p></div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Recent coin collection history</h3>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No JTH coin history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">Listing {item.listing_id}</p>
                    <p className="text-xs text-slate-500">Collected {item.collected_timestamp ? new Date(item.collected_timestamp).toLocaleString() : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.source_type}</Badge>
                    <Badge className="bg-amber-500 text-white">+{item.coin_value}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}