import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function JTHMasterControls({ settings, hasPendingChanges, draftToggle, setDraftToggle, onSaveDraft, onPublish, onDiscard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Master Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl border p-4 bg-slate-50">
          <div>
            <p className="font-semibold text-slate-900">JTH Master Toggle</p>
            <p className="text-sm text-slate-600">Turning JTH off pauses the live system but keeps all saved rules and settings.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={!draftToggle ? "font-semibold text-slate-900" : "text-slate-500"}>Off</span>
            <Switch checked={draftToggle} onCheckedChange={setDraftToggle} />
            <span className={draftToggle ? "font-semibold text-emerald-700" : "text-slate-500"}>On</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onPublish} className="bg-emerald-600 hover:bg-emerald-700">Update JTH Now</Button>
          <Button onClick={onSaveDraft} variant="outline">Save Draft</Button>
          <Button onClick={onDiscard} variant="outline">Discard Draft Changes</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Badge variant="outline" className="justify-center py-2">{settings?.published_master_toggle ? "JTH Live" : "JTH Off"}</Badge>
          <Badge variant="outline" className="justify-center py-2">{hasPendingChanges ? "Draft Changes Pending" : "No Draft Changes"}</Badge>
          <Badge variant="outline" className="justify-center py-2">Last Published: {settings?.last_published_at ? new Date(settings.last_published_at).toLocaleString() : "Never"}</Badge>
          <Badge variant="outline" className="justify-center py-2">Last Updated By: {settings?.last_published_by || "—"}</Badge>
          <Badge variant="outline" className="justify-center py-2">Draft Saved: {settings?.last_draft_saved_at ? new Date(settings.last_draft_saved_at).toLocaleString() : "Never"}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}