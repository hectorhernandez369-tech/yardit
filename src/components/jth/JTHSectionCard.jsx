import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function JTHSectionCard({ title, open, onToggle, children, action }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onToggle}
            className="h-auto p-0 hover:bg-transparent flex items-center gap-2 text-left"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <CardTitle>{title}</CardTitle>
          </Button>
          {action}
        </div>
      </CardHeader>
      {open ? <CardContent className="space-y-4">{children}</CardContent> : null}
    </Card>
  );
}