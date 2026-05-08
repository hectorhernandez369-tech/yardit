import { Card, CardContent } from "@/components/ui/card";

const exampleRows = [
  ["Field 1", "8U Lindsay vs Strathmore", "12:00 PM", "Game 1"],
  ["Field 1", "10U Lindsay vs Strathmore", "1:30 PM", "Game 2"],
  ["Main Stage", "Dance Show", "2:00 PM", "Performance"],
];

export default function ScheduleFormatGuide() {
  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-2xl bg-[#FBFAF7] border-[#2C4F4E]/10">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="font-black text-[#2C4F4E] leading-snug">Use this format so Yardit can recognize your schedule.</p>
          <p className="text-sm text-slate-600 leading-snug">Required columns: Field, Activity, Start Time, Notes. Optional: End Time, Date.</p>
        </div>
        <div className="w-full overflow-x-auto rounded-xl border bg-white">
          <table className="w-full table-fixed text-xs sm:text-sm">
            <thead className="bg-[#E7D7B8] text-[#2C4F4E]"><tr>{["Field", "Activity", "Start Time", "Notes"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead>
            <tbody>{exampleRows.map((row, index) => <tr key={index} className="border-t">{row.map((cell) => <td key={cell} className="break-words p-2 text-slate-700">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}