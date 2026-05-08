import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CollapsiblePanel({ title, description, count, defaultOpen = false, children, className = "" }) {
  return (
    <Card className={`rounded-2xl bg-white border-[#2C4F4E]/15 ${className}`}>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-[#2C4F4E]">
              {title}{count !== undefined ? ` (${count})` : ""}
            </h3>
            {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-[#2C4F4E] transition-transform group-open:rotate-180" />
        </summary>
        <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          {children}
        </CardContent>
      </details>
    </Card>
  );
}