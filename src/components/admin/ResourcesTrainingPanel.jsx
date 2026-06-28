import React from "react";
import { BookOpen, ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ResourcesTrainingPanel() {
  const resources = [
    { title: "Launch Checklist", description: "Review launch readiness and QA guidance.", icon: ClipboardList, href: "/LaunchChecklist" },
    { title: "Printable Checklist", description: "Open a printable operations checklist.", icon: FileText, href: "/PrintableChecklist" },
    { title: "Support Playbooks", description: "Use Case Management for reports, tickets, and escalation workflows.", icon: BookOpen, href: null },
  ];

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {resources.map((resource) => {
        const Icon = resource.icon;
        return (
          <Card key={resource.title}>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-[#2C4F4E]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-bold text-slate-900">{resource.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
              {resource.href && (
                <Button asChild variant="outline" className="mt-4 w-full">
                  <a href={resource.href}>Open</a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}