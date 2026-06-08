import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditListingOpenHours({ openTime, setOpenTime, closeTime, setCloseTime }) {
  return (
    <div className="rounded-lg border border-[#2C4F4E]/20 bg-[#F3E6CF]/40 p-4 space-y-3">
      <div>
        <Label className="text-[#2C4F4E] font-semibold block">Open Hours</Label>
        <p className="text-xs text-slate-500 mt-1">Controls when this residential pin is publicly visible on active sale dates.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Open Time</Label>
          <Input
            type="time"
            min="05:00"
            max="22:00"
            value={openTime || ""}
            onChange={(e) => setOpenTime(e.target.value)}
            className="bg-[#F3E6CF] border-[#2C4F4E]"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Close Time</Label>
          <Input
            type="time"
            min="05:00"
            max="22:00"
            value={closeTime || ""}
            onChange={(e) => setCloseTime(e.target.value)}
            className="bg-[#F3E6CF] border-[#2C4F4E]"
          />
        </div>
      </div>
    </div>
  );
}