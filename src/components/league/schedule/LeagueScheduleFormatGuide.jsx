import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet } from "lucide-react";

export default function LeagueScheduleFormatGuide() {
  return (
    <Card className="rounded-2xl bg-white border-[#5DADA5]/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#5DADA5]/10 p-2 text-[#2C4F4E]"><FileSpreadsheet className="h-5 w-5" /></div>
          <div>
            <h3 className="font-black text-[#2C4F4E]">Excel Schedule Format</h3>
            <p className="text-sm text-slate-600">Use one sheet per week. Put the game date in the first cell, then repeat Time / Division / Home for each age group.</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] text-xs sm:text-sm">
            <thead className="bg-[#E7D7B8] text-[#2C4F4E]"><tr>{["Date", "Time", "8U", "Home", "Time", "10U", "Home", "Time", "12U", "Home"].map((heading) => <th key={heading} className="p-2 text-left font-black">{heading}</th>)}</tr></thead>
            <tbody>
              <tr className="border-t bg-white"><td className="p-2 font-semibold">08/15/2026</td><td className="p-2">1PM</td><td className="p-2">AFTERMATH</td><td className="p-2">BUCKEYES</td><td className="p-2">3PM</td><td className="p-2">AFTERMATH</td><td className="p-2">BUCKEYES</td><td className="p-2">5PM</td><td className="p-2">AFTERMATH</td><td className="p-2">BAK BUCKEYES</td></tr>
              <tr className="border-t bg-white"><td className="p-2"></td><td className="p-2">9AM</td><td className="p-2">CENTRAL GRIZZLIES</td><td className="p-2">CLOVIS REBELS</td><td className="p-2">11AM</td><td className="p-2">CENTRAL GRIZZLIES</td><td className="p-2">CLOVIS REBELS</td><td className="p-2">1PM</td><td className="p-2">CENTRAL GRIZZLIES</td><td className="p-2">CLOVIS REBELS</td></tr>
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600"><Badge variant="outline">Sheet names: Week 1, Week 2...</Badge><Badge variant="outline">Away team goes under 8U/10U/12U</Badge><Badge variant="outline">Home team goes under Home</Badge><Badge variant="outline">Times like 9AM, 1PM, 1030AM work</Badge></div>
      </CardContent>
    </Card>
  );
}