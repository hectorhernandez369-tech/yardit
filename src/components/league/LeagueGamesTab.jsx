import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import GamesImportPanel from "./GamesImportPanel";

export default function LeagueGamesTab({ account, games = [], onRefresh }) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Trophy className="h-5 w-5" /> Games</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">Upload an Excel, Google Sheets export, or CSV file to build the game schedule for {account?.business_name || "this organization"}.</p>
          <GamesImportPanel account={account} onImported={onRefresh} />
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-[#2C4F4E]">Imported Games</CardTitle></CardHeader>
        <CardContent>
          {games.length === 0 ? <p className="text-sm text-slate-500">No games imported yet.</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["Field", "Game", "Teams", "Date", "Start", "Notes"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{games.map((game) => <tr key={game.id} className="border-t"><td className="p-2">{game.field_name}</td><td className="p-2 font-semibold">{game.game_title}</td><td className="p-2">{[game.home_team, game.away_team].filter(Boolean).join(" vs ")}</td><td className="p-2">{game.game_date}</td><td className="p-2">{game.start_time ? new Date(game.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</td><td className="p-2">{game.notes}</td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}