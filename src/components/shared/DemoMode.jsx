import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { FlaskConical } from "lucide-react";

const DEMO_KEY = "yardit_demo_mode";

export function isDemoMode() {
  try {
    return localStorage.getItem(DEMO_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDemoMode(value) {
  try {
    localStorage.setItem(DEMO_KEY, value ? "true" : "false");
  } catch {}
}

export default function DemoModeToggle() {
  const [enabled, setEnabled] = useState(isDemoMode());

  const handleToggle = (checked) => {
    setEnabled(checked);
    setDemoMode(checked);
    window.dispatchEvent(new Event("demo-mode-change"));
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 border border-purple-300">
      <FlaskConical className="w-4 h-4 text-purple-600" />
      <span className="text-xs font-semibold text-purple-700">Demo</span>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        className="scale-75"
      />
    </div>
  );
}