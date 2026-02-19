import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ReportsQueue() {
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.filter({ resolved: false }, "-created_date"),
    initialData: [],
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, userId }) => {
      await base44.entities.Report.update(reportId, {
        resolved: true,
        resolvedByUserId: userId,
        resolvedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Report resolved");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const handleResolve = async (reportId) => {
    try {
      const user = await base44.auth.me();
      resolveMutation.mutate({ reportId, userId: user.id });
    } catch (error) {
      toast.error("Failed to resolve report");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-4 mt-6">
      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No unresolved reports</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <Badge className="mb-2">{report.reason.replace("_", " ").toUpperCase()}</Badge>
                  <p className="text-sm text-slate-600 break-all">
                    Listing ID: {report.listingId}
                  </p>
                  <p className="text-xs text-slate-500">
                    Reported: {format(new Date(report.created_date), "PPp")}
                  </p>
                </div>
                <Button
                  onClick={() => handleResolve(report.id)}
                  disabled={resolveMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Resolve
                </Button>
              </div>
              {report.details && (
                <p className="text-sm text-slate-700 mt-2">{report.details}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}