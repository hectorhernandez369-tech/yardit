import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Bot, Loader2, Mail, RefreshCw, ShieldAlert, LifeBuoy } from "lucide-react";
import { toast } from "sonner";

const CRITICAL_SAFETY_CODES = new Set(["SAFETY_WEAPONS", "SAFETY_THREAT"]);
const HIGH_SAFETY_CODES = new Set([
  "SAFETY_DRUGS",
  "SAFETY_STOLEN_GOODS",
  "SAFETY_HARASSMENT_HATE",
]);

const OPEN_TICKET_STATUSES = new Set([
  "open",
  "in_review",
  "waiting_for_user",
  "supervisor_review",
  "master_review",
]);

function priorityRank(priority) {
  return { critical: 4, high: 3, normal: 2, low: 1 }[priority] || 0;
}

function deterministicReportPriority(report) {
  if (CRITICAL_SAFETY_CODES.has(report.reason_code)) return "critical";
  if (HIGH_SAFETY_CODES.has(report.reason_code)) return "high";
  if (String(report.reason_code || "").startsWith("SAFETY_")) return "high";
  if (String(report.reason_code || "").startsWith("FRAUD_")) return "high";
  return "normal";
}

async function upsertTriage(record) {
  const existing = await base44.entities.SupportAITriage.filter({
    source_type: record.source_type,
    source_id: record.source_id,
  }, "-created_date");

  if (existing?.[0]) {
    await base44.entities.SupportAITriage.update(existing[0].id, record);
    return { ...existing[0], ...record };
  }
  return base44.entities.SupportAITriage.create(record);
}

export default function AdminSupportAI({ user }) {
  const navigate = useNavigate();
  const [triage, setTriage] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingReplyId, setSendingReplyId] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  const load = async () => {
    const [rows, settings] = await Promise.all([
      base44.entities.SupportAITriage.list("-last_scanned_at"),
      base44.entities.AppSetting.list(),
    ]);
    setTriage(rows || []);
    setAlertEmail(settings?.find((s) => s.key === "support_safety_alert_email")?.value || "");
    setSupportEmail(settings?.find((s) => s.key === "support_public_email")?.value || "");
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const saveSetting = async (key, value) => {
    const rows = await base44.entities.AppSetting.filter({ key });
    if (rows?.[0]) await base44.entities.AppSetting.update(rows[0].id, { value });
    else await base44.entities.AppSetting.create({ key, value });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await Promise.all([
        saveSetting("support_safety_alert_email", alertEmail.trim()),
        saveSetting("support_public_email", supportEmail.trim()),
      ]);
      toast.success("Support email settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Could not save support email settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const triageTicket = async (ticket, now) => {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Astra, Yardit's INTERNAL customer-service triage assistant. This output is never customer-facing.\n\nReview this support ticket and return a concise internal triage. Safety always outranks convenience. Do not make refund approvals, account suspensions, listing removals, or other irreversible decisions. Those require human review.\n\nTicket number: ${ticket.ticket_number || ticket.id}\nSupport area: ${ticket.support_area || "unknown"}\nCurrent priority: ${ticket.priority || "normal"}\nDescription: ${ticket.description || ""}\n\nClassify priority as low, normal, high, or critical. Critical means credible immediate safety danger or an urgent situation requiring prompt human attention. If the customer merely has a billing/technical problem, do not label it critical. Draft a short customer reply that an admin could review and send.`,
      response_json_schema: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["low", "normal", "high", "critical"] },
          safety_flag: { type: "boolean" },
          safety_reason: { type: "string" },
          category: { type: "string" },
          summary: { type: "string" },
          suggested_action: { type: "string" },
          suggested_reply: { type: "string" },
        },
        required: ["priority", "safety_flag", "safety_reason", "category", "summary", "suggested_action", "suggested_reply"],
      },
    });
    const payload = result?.data && typeof result.data === "object" ? result.data : result;
    return upsertTriage({
      source_type: "support_ticket",
      source_id: ticket.id,
      source_number: ticket.ticket_number || "",
      priority: payload?.priority || ticket.priority || "normal",
      safety_flag: Boolean(payload?.safety_flag),
      safety_reason: String(payload?.safety_reason || ""),
      category: String(payload?.category || ticket.support_area || "support"),
      summary: String(payload?.summary || ticket.description || ""),
      suggested_action: String(payload?.suggested_action || "Review ticket"),
      suggested_reply: String(payload?.suggested_reply || ""),
      requires_human: true,
      status: "new",
      last_scanned_at: now,
      created_at: now,
    });
  };

  const triageReport = async (report, now) => {
    const floorPriority = deterministicReportPriority(report);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Astra, Yardit's INTERNAL safety triage assistant. Review this user report. A deterministic safety rule already set a minimum priority of ${floorPriority}. You may raise priority but NEVER lower it.\n\nReason code: ${report.reason_code || "unknown"}\nReason label: ${report.reason_label || report.reason || ""}\nDetails: ${report.details || ""}\nOther details: ${report.other_details || ""}\n\nReturn a short internal summary, safety reason, category, and suggested human next step. Do not make a final enforcement decision.`,
      response_json_schema: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["low", "normal", "high", "critical"] },
          safety_reason: { type: "string" },
          category: { type: "string" },
          summary: { type: "string" },
          suggested_action: { type: "string" },
        },
        required: ["priority", "safety_reason", "category", "summary", "suggested_action"],
      },
    });
    const payload = result?.data && typeof result.data === "object" ? result.data : result;
    const aiPriority = payload?.priority || floorPriority;
    const finalPriority = priorityRank(aiPriority) > priorityRank(floorPriority) ? aiPriority : floorPriority;
    const safetyFlag = String(report.reason_code || "").startsWith("SAFETY_") || finalPriority === "critical";

    const row = await upsertTriage({
      source_type: "report",
      source_id: report.id,
      source_number: report.id,
      priority: finalPriority,
      safety_flag: safetyFlag,
      safety_reason: String(payload?.safety_reason || report.reason_label || ""),
      category: String(payload?.category || report.reason_code || "report"),
      summary: String(payload?.summary || report.details || report.reason_label || ""),
      suggested_action: String(payload?.suggested_action || "Open report for human review"),
      suggested_reply: "",
      requires_human: true,
      status: "new",
      last_scanned_at: now,
      created_at: now,
    });

    const alreadyAlerted = Boolean(row.email_alert_sent);
    if (finalPriority === "critical" && alertEmail.trim() && !alreadyAlerted) {
      await base44.integrations.Core.SendEmail({
        to: alertEmail.trim(),
        subject: `[Yardit Safety] Critical report requires review`,
        body: `A critical Yardit safety report requires human review.\n\nReason: ${report.reason_label || report.reason_code || "Safety report"}\nSummary: ${row.summary || "No summary available"}\nSuggested action: ${row.suggested_action || "Review immediately"}\n\nOpen Yardit Admin > Case Management > Safety.\n\nThis alert was generated by Astra triage. No enforcement action was taken automatically.`,
      });
      await base44.entities.SupportAITriage.update(row.id, {
        email_alert_sent: true,
        email_alert_sent_at: new Date().toISOString(),
      });
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const [tickets, reports] = await Promise.all([
        base44.entities.SupportTicket.list("-created_date", 50),
        base44.entities.Report.list("-created_date", 50),
      ]);
      const openTickets = (tickets || []).filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status || "open"));
      const unresolvedReports = (reports || []).filter((report) => !report.resolved);
      const now = new Date().toISOString();

      // Safety reports first, then customer-service tickets.
      const sortedReports = [...unresolvedReports].sort((a, b) => priorityRank(deterministicReportPriority(b)) - priorityRank(deterministicReportPriority(a)));
      for (const report of sortedReports) await triageReport(report, now);
      for (const ticket of openTickets) await triageTicket(ticket, now);

      await load();
      toast.success(`Scanned ${sortedReports.length} reports and ${openTickets.length} support tickets`);
    } catch (error) {
      console.error("Astra support scan failed", error);
      toast.error("Support scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleSendDraftReply = async (item) => {
    if (item.source_type !== "support_ticket" || !item.suggested_reply) return;
    setSendingReplyId(item.id);
    try {
      const tickets = await base44.entities.SupportTicket.filter({ id: item.source_id });
      const ticket = tickets?.[0];
      if (!ticket?.email) throw new Error("Ticket email not found");

      await base44.integrations.Core.SendEmail({
        to: ticket.email,
        subject: `Yardit Support — ${ticket.ticket_number || "Your support request"}`,
        body: item.suggested_reply,
      });

      await base44.entities.TicketAction.create({
        ticket_id: ticket.id,
        admin_id: user?.id,
        action: "AI draft reply emailed",
        details: `Reply sent to ${ticket.email}`,
      });

      await base44.entities.SupportTicketComment.create({
        ticket_id: ticket.id,
        admin_id: user?.id,
        admin_name: user?.full_name || user?.email || "Admin",
        admin_email: user?.email || "",
        comment_text: `Email sent to customer:\n${item.suggested_reply}`,
        comment_type: "admin_note",
      });

      await base44.entities.SupportAITriage.update(item.id, { status: "actioned" });
      await load();
      toast.success(`Reply sent to ${ticket.email}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not send customer reply");
    } finally {
      setSendingReplyId("");
    }
  };

  const handleOpenTriageCase = async (item) => {
    if (item.source_type !== "report") return;
    try {
      const reports = await base44.entities.Report.filter({ id: item.source_id });
      const report = reports?.[0];
      if (!report?.listingId) {
        toast.error("This report is not linked to a case yet.");
        return;
      }
      const cases = await base44.entities.Case.filter({ listing_id: report.listingId });
      const matchingCase = [...(cases || [])].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))[0];
      if (!matchingCase) {
        toast.error("A case has not been created for this report yet.");
        return;
      }
      navigate(`/AdminLite?section=case_management&openCaseId=${matchingCase.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not open the linked case.");
    }
  };

  const sortedTriage = useMemo(() => [...triage].sort((a, b) => {
    const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDiff) return priorityDiff;
    return new Date(b.last_scanned_at || 0) - new Date(a.last_scanned_at || 0);
  }), [triage]);

  const criticalCount = sortedTriage.filter((item) => item.priority === "critical" && item.status === "new").length;
  const safetyCount = sortedTriage.filter((item) => item.safety_flag && item.status === "new").length;
  const safetyTriageItems = sortedTriage.filter((item) => item.source_type === "report" || item.safety_flag);
  const supportReviewItems = sortedTriage.filter((item) => item.source_type === "support_ticket");

  const renderTriageCard = (item) => (
    <div key={item.id} className={`rounded-xl border p-4 ${item.priority === "critical" ? "border-red-300 bg-red-50" : item.priority === "high" ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {item.priority === "critical" ? <ShieldAlert className="h-4 w-4 text-red-700" /> : item.safety_flag ? <AlertTriangle className="h-4 w-4 text-orange-700" /> : <Bot className="h-4 w-4 text-[#5DADA5]" />}
        <Badge variant="outline" className="uppercase">{item.priority}</Badge>
        <Badge variant="outline">{item.source_type === "report" ? "Safety Report" : "Support Ticket"}</Badge>
        {item.source_number ? <span className="text-xs text-slate-500">{item.source_number}</span> : null}
        {item.email_alert_sent ? <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Email alert sent</Badge> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{item.summary || "No summary"}</p>
      {item.safety_reason ? <p className="mt-1 text-xs text-slate-600"><strong>Safety:</strong> {item.safety_reason}</p> : null}
      <p className="mt-1 text-xs text-slate-600"><strong>Astra recommendation:</strong> {item.suggested_action || "Review"}</p>
      {item.source_type === "report" ? (
        <Button type="button" size="sm" className="mt-3" onClick={() => handleOpenTriageCase(item)}>
          Open Case
        </Button>
      ) : null}
      {item.suggested_reply ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <div><strong>Draft reply:</strong> {item.suggested_reply}</div>
          {item.source_type === "support_ticket" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleSendDraftReply(item)}
              disabled={sendingReplyId === item.id}
            >
              {sendingReplyId === item.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-2 h-3.5 w-3.5" />}
              Review & Send Draft
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#5DADA5]" /><h2 className="text-xl font-black text-slate-900">Astra Customer Service</h2></div>
          <p className="mt-1 text-sm text-slate-600">Internal AI triage for support tickets and safety reports. Safety reports are scanned first.</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="bg-[#2C4F4E] text-white">
          {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Scan Now
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Critical</p><p className="text-2xl font-black text-red-700">{criticalCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Safety flagged</p><p className="text-2xl font-black text-orange-700">{safetyCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Triage records</p><p className="text-2xl font-black text-slate-800">{sortedTriage.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4" /> Email settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Critical safety alert email</label><Input value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} placeholder="you@yardit.app" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Public support email</label><Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yardit.app" /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleSaveSettings} disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Email Settings</Button>
            <p className="text-xs text-slate-500">Critical alerts use Yardit’s current Base44 email sender. A connected mailbox can be added later for branded two-way support email.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="triage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[520px]">
          <TabsTrigger value="triage" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Triage ({safetyTriageItems.length})
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <LifeBuoy className="h-4 w-4" />
            Support Reviews ({supportReviewItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triage">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Triage — Priority & Safety</CardTitle>
              <p className="text-sm text-slate-500">Astra sends safety reports and priority issues here first for human review.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {safetyTriageItems.length === 0
                ? <p className="text-sm text-slate-500">No safety/priority triage yet.</p>
                : safetyTriageItems.slice(0, 30).map(renderTriageCard)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Support Tickets — Astra Reviews & Recommendations</CardTitle>
              <p className="text-sm text-slate-500">Review Astra’s ticket summaries, recommended next steps, and draft customer replies.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {supportReviewItems.length === 0
                ? <p className="text-sm text-slate-500">No support-ticket reviews yet.</p>
                : supportReviewItems.slice(0, 30).map(renderTriageCard)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
