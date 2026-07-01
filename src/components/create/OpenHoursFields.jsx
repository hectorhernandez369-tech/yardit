import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function OpenHoursFields({ formData, setFormData, onFieldChange }) {
  const isFreeTier = formData?.tier === "free";
  const updateField = (field, value) => {
    if (onFieldChange) {
      onFieldChange(field, value);
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rounded-xl border border-[#2C4F4E]/20 bg-white/70 p-4 space-y-3">
      <div>
        <h4 className="font-semibold text-[#2C4F4E]">Open Hours</h4>
        <p className="text-sm text-[#1F2937]/70">Your pin will appear on the map during these open hours.</p>
        {isFreeTier && (
          <p className="text-xs text-[#2C4F4E]/80 mt-1">Free listings are limited to Friday–Sunday between 5:00 AM and 10:00 PM.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-[#2C4F4E]">Open Time *</Label>
          <Input
            type="time"
            min="05:00"
            max="22:00"
            value={formData.openTime || ""}
            onChange={(e) => updateField("openTime", e.target.value)}
            className="bg-[#F3E6CF] border-[#2C4F4E]"
            required
          />
        </div>
        <div>
          <Label className="text-[#2C4F4E]">Close Time *</Label>
          <Input
            type="time"
            min="05:00"
            max="22:00"
            value={formData.closeTime || ""}
            onChange={(e) => updateField("closeTime", e.target.value)}
            className="bg-[#F3E6CF] border-[#2C4F4E]"
            required
          />
        </div>
      </div>
    </div>
  );
}