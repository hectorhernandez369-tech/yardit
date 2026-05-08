import { Card, CardContent } from "@/components/ui/card";

const columns = ["A", "B", "C", "D", "E"];
const sheetRows = [
  ["Field", "Activity", "Start Time", "End Time", "Notes"],
  ["Field 1", "8U Lindsay vs Strathmore", "12:00 PM", "", "Game 1"],
  ["Field 1", "10U Lindsay vs Strathmore", "1:30 PM", "", "Game 2"],
  ["Main Stage", "Dance Show", "2:00 PM", "", "Performance"],
];

export default function ScheduleFormatGuide() {
  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-2xl bg-[#FBFAF7] border-[#2C4F4E]/10">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="font-black text-[#2C4F4E] leading-snug">Spreadsheet Format Example</p>
          <p className="text-sm text-slate-600 leading-snug">Your Excel or CSV file should look like this.</p>
          <p className="text-xs text-slate-600">Upload an Excel or CSV file using these columns.</p>
          <div className="grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
            <p><strong>Required:</strong> Field, Activity, Start Time</p>
            <p><strong>Optional:</strong> End Time, Notes, Date</p>
          </div>
        </div>
        <div className="w-full overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-[620px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="w-9 border border-slate-300 p-1"></th>
                {columns.map((column) => <th key={column} className="border border-slate-300 p-1 text-center font-bold">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {sheetRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-[#E7D7B8] font-bold text-[#2C4F4E]" : "bg-white text-slate-700"}>
                  <td className="border border-slate-300 bg-slate-100 p-1 text-center font-bold text-slate-500">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="whitespace-nowrap border border-slate-300 px-2 py-1">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}