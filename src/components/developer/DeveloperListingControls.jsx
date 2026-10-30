import React from "react";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function DeveloperListingControls({ enabled, onEnabledChange, step, labels, onJump, busy }) {
  return (
    <section className="mb-6 space-y-3 rounded-xl border border-primary/30 bg-card p-4 text-card-foreground" aria-label="Developer listing controls">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="developer-listing-mode" className="flex items-center gap-2 text-sm font-semibold">
          <Code2 className="h-4 w-4" /> Developer access
        </label>
        <Switch id="developer-listing-mode" checked={enabled} onCheckedChange={onEnabledChange} disabled={busy} />
      </div>
      <p className="text-xs text-muted-foreground">
        {enabled ? "Only your account: no payment, profile/address verification, duplicate checks, or tier schedule limits. Publishing creates a normal listing, not a demo." : "Standard listing requirements are active. Turn this on to use developer bypasses."}
      </p>
      {enabled && <>
        <p className="text-xs text-muted-foreground">Jump to any step without completing earlier steps. Publishing still needs a title, map location, and valid dates and times.</p>
        <div className="flex flex-wrap gap-2" aria-label="Jump to creation step">
          {labels.map((label, index) => (
            <Button key={label} type="button" size="sm" variant={step === index + 1 ? "default" : "outline"} disabled={busy} aria-current={step === index + 1 ? "step" : undefined} onClick={() => onJump(index + 1)} className="h-auto whitespace-normal px-3 py-2 text-left text-xs">
              {index + 1}. {label}
            </Button>
          ))}
        </div>
      </>}
    </section>
  );
}