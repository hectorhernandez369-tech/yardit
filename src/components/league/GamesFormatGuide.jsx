import { Card, CardContent } from "@/components/ui/card";

const rows = [
  ["Field", "Game", "Home Team", "Away Team", "Date", "Start Time", "End Time", "Notes"],
  ["Field 1", "8U Championship", "Lindsay", "Strathmore", "7/18/2026", "9:00 AM", "10:15 AM", "Game 1"],
  ["Field 2", "10U Pool Play", "Porterville", "Tulare", "7/18/2026", "1030 pm", "2230", "Game 2"],
];

export default function GamesFormatGuide() {
  return (
    <Card className="rounded-2xl border-[#2C4F4E]/10 bg-[#FBFAF7]">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-black text-[#2C4F4E]">Spreadsheet Format Example</p>
          <p className="text-sm text-slate-600">Upload an Excel or CSV file using these columns.</p>
          <p className="text-xs text-slate-600"><strong>Required:</strong> Game or Home Team + Away Team. <strong>Optional:</strong> Field, Date, Start Time, End Time, Notes.</p>
          <p className="text-xs text-slate-600">Dates can use American format like 7/18/2026. Times can be typed loosely, like 1030 pm, 10:30pm, or 2230.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-[780px] border-collapse text-xs"><tbody>{rows.map((row, index) => <tr key={index} className={index === 0 ? "bg-[#E7D7B8] font-bold text-[#2C4F4E]" : "text-slate-700"}>{row.map((cell) => <td key={cell} className="whitespace-nowrap border px-2 py-1">{cell}</td>)}</tr>)}</tbody></table>
        </div>
      </CardContent>
    </Card>
  );
}