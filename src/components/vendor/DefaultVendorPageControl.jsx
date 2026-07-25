import { Button } from "@/components/ui/button";

export default function DefaultVendorPageControl({ canManage, isDefault, onMakeDefault, className = "" }) {
  if (!canManage) return null;

  if (isDefault) {
    return (
      <div className={`inline-flex items-center justify-center rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold text-white ${className}`}>
        Default Page
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={onMakeDefault}
      className={`rounded-full border border-white/40 bg-white text-[#2C4F4E] hover:bg-white/90 ${className}`}
    >
      Make Default Page
    </Button>
  );
}