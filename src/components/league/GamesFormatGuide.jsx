import { Card, CardContent } from "@/components/ui/card";

const rows = [
  ["Field", "Game", "Home Team", "Away Team", "Date", "Start Time", "End Time", "Notes"],
  ["Field 1", "8U Championship", "Lindsay", "Strathmore", "2026-07-18", "9:00 AM", "10:15 AM", "Game 1"],
  ["Field 2", "10U Pool Play", "Porterville", "Tulare", "2026-07-18", "10:30 AM", "11:45 AM", "Game 2"],
];

export default function GamesFormatGuide() {
  return (
    <Card className="rounded-2xl border-[#2C4F4E]/10 bg-[#FBFAF7]">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-black text-[#2C4F4E]">Spreadsheet Format Example</p>
          <p className="text-sm text-slate-600">Upload an Excel or CSV file using these columns.</p>
          <p className="text-xs text-slate-600"><strong>Required:</strong> Game or Home Team + Away Team. <strong>Optional:</strong> Field, Date, Start Time, End Time, Notes.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-[780px] border-collapse text-xs"><tbody>{rows.map((row, index) => <tr key={index} className={index === 0 ? "bg-[#E7D7B8] font-bold text-[#2C4F4E]" : "text-slate-700"}>{row.map((cell) => <td key={cell} className="whitespace-nowrap border px-2 py-1">{cell}</td>)}</tr>)}</tbody></table>
        </div>
      </CardContent>
    </Card>
  );
}