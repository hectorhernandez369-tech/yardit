import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reply, Clock, History } from "lucide-react";
import { toast } from "sonner";

export default function SupportTicketQueue({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterTab, setFilterTab] = useState("open");

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  
  const [refundData, setRefundData] = useState({ amount: "", reason: "", internal_notes: "" });
  const [promoData, setPromoData] = useState({ type: "", value: "", reason: "", internal_notes: "" });
  
  const [ticketActions, setTicketActions] = useState([]);

  const fetchTickets = async () => {
    try {
      const data = await base44.entities.SupportTicket.list("-created_date");
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      base44.entities.TicketAction.filter({ ticket_id: selectedTicket.id }, "created_date")
        .then(setTicketActions)
        .catch(console.error);
    } else {
      setTicketActions([]);
    }
  }, [selectedTicket]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filterTab === "open") return ["open", "in_review", "waiting_for_user"].includes(t.status);
      if (filterTab === "needs_supervisor") return t.status === "supervisor_review";
      if (filterTab === "needs_master") return t.status === "master_review";
      if (filterTab === "resolved_closed") return ["resolved", "closed"].includes(t.status);
      return true;
    });
  }, [tickets, filterTab]);

  const logAction = async (ticketId, actionStr, detailsStr = "") => {
    try {
      const action = await base44.entities.TicketAction.create({
        ticket_id: ticketId,
        admin_id: user?.id,
        action: actionStr,
        details: detailsStr
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setTicketActions(prev => [...prev, action]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateField = async (field, value) => {
    if (!selectedTicket) return;
    try {
      await base44.entities.SupportTicket.update(selectedTicket.id, { [field]: value });
      const updated = { ...selectedTicket, [field]: value };
      setSelectedTicket(updated);
      setTickets(tickets.map(t => t.id === updated.id ? updated : t));
      logAction(selectedTicket.id, "Field updated", `Updated ${field}`);
      toast.success("Saved");
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    if (["resolved", "closed"].includes(newStatus)) {
      if (!selectedTicket.disposition) {
        toast.error("Disposition is required before resolving or closing a ticket.");
        return;
      }
      if (selectedTicket.disposition === "other" && !selectedTicket.disposition_notes) {
        toast.error("Disposition notes are required when disposition is Other.");
        return;
      }
    }

    try {
      await base44.entities.SupportTicket.update(ticketId, { 
        status: newStatus, 
        closed_at: newStatus === 'closed' ? new Date().toISOString() : selectedTicket.closed_at 
      });
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      toast.success("Status updated");
      logAction(ticketId, "Status changed", `Status changed to ${formatStatus(newStatus)}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleRequestRefund = async () => {
    if (!refundData.amount || !refundData.reason) {
      toast.error("Amount and Reason are required");
      return;
    }
    try {
      const updates = {
        refund_requested: true,
        refund_amount: Number(refundData.amount),
        refund_reason: refundData.reason,
        status: "supervisor_review",
        internal_notes: refundData.internal_notes ? (selectedTicket.internal_notes || "") + "\nRefund Notes: " + refundData.internal_notes : selectedTicket.internal_notes
      };
      await base44.entities.SupportTicket.update(selectedTicket.id, updates);
      
      const updated = { ...selectedTicket, ...updates };
      setSelectedTicket(updated);
      setTickets(tickets.map(t => t.id === updated.id ? updated : t));
      logAction(selectedTicket.id, "Refund requested", `Amount: ${refundData.amount}, Reason: ${refundData.reason}`);
      setRefundModalOpen(false);
      setRefundData({ amount: "", reason: "", internal_notes: "" });
      toast.success("Refund requested");
    } catch (e) {
      toast.error("Error requesting refund");
    }
  };

  const handleRequestPromo = async () => {
    if (!promoData.type || !promoData.value || !promoData.reason) {
      toast.error("Type, Value, and Reason are required");
      return;
    }
    try {
      const updates = {
        promo_requested: true,
        promo_type: promoData.type,
        promo_value: promoData.value,
        promo_reason: promoData.reason,
        status: "supervisor_review",
        internal_notes: promoData.internal_notes ? (selectedTicket.internal_notes || "") + "\nPromo Notes: " + promoData.internal_notes : selectedTicket.internal_notes
      };
      await base44.entities.SupportTicket.update(selectedTicket.id, updates);
      
      const updated = { ...selectedTicket, ...updates };
      setSelectedTicket(updated);
      setTickets(tickets.map(t => t.id === updated.id ? updated : t));
      logAction(selectedTicket.id, "Promo requested", `Type: ${formatStatus(promoData.type)}, Value: ${promoData.value}`);
      setPromoModalOpen(false);
      setPromoData({ type: "", value: "", reason: "", internal_notes: "" });
      toast.success("Promo requested");
    } catch (e) {
      toast.error("Error requesting promo");
    }
  };

  const handleSubmitToSupervisor = async () => {
    try {
      await base44.entities.SupportTicket.update(selectedTicket.id, { status: "supervisor_review" });
      const updated = { ...selectedTicket, status: "supervisor_review" };
      setSelectedTicket(updated);
      setTickets(tickets.map(t => t.id === updated.id ? updated : t));
      logAction(selectedTicket.id, "Submitted to Supervisor");
      toast.success("Submitted to Supervisor");
    } catch (e) {
      toast.error("Error");
    }
  };

  const handleSupervisorAction = async (approved) => {
    try {
      if (approved) {
        const updates = {
          supervisor_approved: true,
          supervisor_approved_by: user?.id,
          supervisor_approved_at: new Date().toISOString(),
          status: "master_review"
        };
        await base44.entities.SupportTicket.update(selectedTicket.id, updates);
        const updated = { ...selectedTicket, ...updates };
        setSelectedTicket(updated);
        setTickets(tickets.map(t => t.id === updated.id ? updated : t));
        logAction(selectedTicket.id, "Supervisor approved", "Sent to Master");
        toast.success("Approved by Supervisor");
      } else {
        await base44.entities.SupportTicket.update(selectedTicket.id, { status: "in_review", supervisor_approved: false });
        const updated = { ...selectedTicket, status: "in_review", supervisor_approved: false };
        setSelectedTicket(updated);
        setTickets(tickets.map(t => t.id === updated.id ? updated : t));
        logAction(selectedTicket.id, "Supervisor rejected", "Returned to In Review");
        toast.success("Rejected by Supervisor");
      }
    } catch (e) {
      toast.error("Error");
    }
  };

  const handleMasterAction = async (approved) => {
    try {
      if (approved) {
        const updates = {
          master_approved: true,
          master_approved_by: user?.id,
          master_approved_at: new Date().toISOString(),
          status: "resolved"
        };
        await base44.entities.SupportTicket.update(selectedTicket.id, updates);
        const updated = { ...selectedTicket, ...updates };
        setSelectedTicket(updated);
        setTickets(tickets.map(t => t.id === updated.id ? updated : t));
        logAction(selectedTicket.id, "Master approved", "Resolved");
        toast.success("Final Approved by Master");
      } else {
        await base44.entities.SupportTicket.update(selectedTicket.id, { status: "in_review", master_approved: false });
        const updated = { ...selectedTicket, status: "in_review", master_approved: false };
        setSelectedTicket(updated);
        setTickets(tickets.map(t => t.id === updated.id ? updated : t));
        logAction(selectedTicket.id, "Master rejected", "Returned to In Review");
        toast.success("Rejected by Master");
      }
    } catch (e) {
      toast.error("Error");
    }
  };

  const formatStatus = (status) => {
    if (!status) return "";
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "in_review": return "bg-indigo-100 text-indigo-800";
      case "supervisor_review": return "bg-orange-100 text-orange-800";
      case "master_review": return "bg-red-100 text-red-800";
      case "in_progress": return "bg-amber-100 text-amber-800";
      case "waiting_for_user": return "bg-purple-100 text-purple-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-slate-200 text-slate-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-[#2C4F4E]">Support Ticket Queue</h2>
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="needs_supervisor">Needs Supervisor</TabsTrigger>
            <TabsTrigger value="needs_master">Needs Master</TabsTrigger>
            <TabsTrigger value="resolved_closed">Resolved/Closed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border rounded-lg bg-white">No support tickets found in this view.</div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Ticket Number</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Date Created</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Badges</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="border-b hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="px-4 py-3 font-medium text-[#2C4F4E]">{ticket.ticket_number}</td>
                    <td className="px-4 py-3">{ticket.name || "-"}</td>
                    <td className="px-4 py-3">{ticket.email}</td>
                    <td className="px-4 py-3">{format(new Date(ticket.created_date), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(ticket.status)} variant="outline">
                        {formatStatus(ticket.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {ticket.refund_requested && <Badge className="bg-red-500 text-white text-[10px]">Refund</Badge>}
                        {ticket.promo_requested && <Badge className="bg-purple-500 text-white text-[10px]">Promo</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TICKET DETAIL DIALOG */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between border-b pb-4">
              <span>Ticket {selectedTicket?.ticket_number}</span>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedTicket?.status)} variant="outline">
                  {formatStatus(selectedTicket?.status)}
                </Badge>
                {selectedTicket?.priority && (
                  <Badge variant="outline" className="uppercase text-xs">{selectedTicket.priority}</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {/* Left Column: Details */}
              <div className="md:col-span-2 space-y-6">
                
                {/* User Info */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-slate-100 border-b"><CardTitle className="text-base">User Information</CardTitle></CardHeader>
                  <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Name</span>
                      <span className="text-slate-800">{selectedTicket.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Email</span>
                      <span className="text-slate-800">{selectedTicket.email}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Phone</span>
                      <span className="text-slate-800">{selectedTicket.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Created At</span>
                      <span className="text-slate-800">{format(new Date(selectedTicket.created_date), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    {selectedTicket.address && (
                      <div className="col-span-2">
                        <span className="font-semibold text-slate-500 block mb-1">Physical Address</span>
                        <span className="text-slate-800">{selectedTicket.address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Description & Photos */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-slate-100 border-b"><CardTitle className="text-base">Issue Description</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {selectedTicket.description}
                    </div>
                    {selectedTicket.photo_paths?.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold text-slate-800 mb-2 text-sm">Attached Photos</h4>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {selectedTicket.photo_paths.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 block">
                              <img src={url} alt={`Evidence ${i+1}`} className="h-24 w-auto object-cover rounded border hover:opacity-90 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Approvals Info */}
                {(selectedTicket.refund_requested || selectedTicket.promo_requested) && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="py-3 px-4 border-b border-orange-200"><CardTitle className="text-base text-orange-800">Requests & Approvals</CardTitle></CardHeader>
                    <CardContent className="p-4 space-y-4 text-sm">
                      {selectedTicket.refund_requested && (
                        <div className="flex gap-4 items-start">
                          <Badge className="bg-red-500 shrink-0">Refund</Badge>
                          <div>
                            <p><strong>Amount:</strong> ${selectedTicket.refund_amount}</p>
                            <p><strong>Reason:</strong> {selectedTicket.refund_reason}</p>
                          </div>
                        </div>
                      )}
                      {selectedTicket.promo_requested && (
                        <div className="flex gap-4 items-start">
                          <Badge className="bg-purple-500 shrink-0">Promo</Badge>
                          <div>
                            <p><strong>Type:</strong> {formatStatus(selectedTicket.promo_type)}</p>
                            <p><strong>Value:</strong> {selectedTicket.promo_value}</p>
                            <p><strong>Reason:</strong> {selectedTicket.promo_reason}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t border-orange-200 pt-3 mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <strong>Supervisor Approval:</strong> {selectedTicket.supervisor_approved ? <span className="text-green-600 font-bold">Yes</span> : "Pending"}
                        </div>
                        <div>
                          <strong>Master Approval:</strong> {selectedTicket.master_approved ? <span className="text-green-600 font-bold">Yes</span> : "Pending"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Timeline */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-slate-100 border-b flex flex-row items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    <CardTitle className="text-base">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 max-h-60 overflow-y-auto">
                    {ticketActions.length === 0 ? (
                      <p className="text-sm text-slate-500">No actions recorded.</p>
                    ) : (
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                        {ticketActions.map(action => (
                          <div key={action.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-300 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 bg-white shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-bold text-slate-900 text-sm">{action.action}</div>
                                <time className="text-xs font-medium text-slate-500">{format(new Date(action.created_date), "MMM d, h:mm a")}</time>
                              </div>
                              {action.details && <div className="text-xs text-slate-600">{action.details}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Actions & Meta */}
              <div className="space-y-6">
                
                {/* Admin Actions */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-slate-100 border-b"><CardTitle className="text-base">Admin Actions</CardTitle></CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left" 
                      onClick={() => setRefundModalOpen(true)}
                    >
                      Request Refund
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left" 
                      onClick={() => setPromoModalOpen(true)}
                    >
                      Request Promo
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left"
                      onClick={handleSubmitToSupervisor}
                    >
                      Submit to Supervisor
                    </Button>
                    <Button 
                      className="w-full justify-start text-left gap-2 bg-[#5DADA5] hover:bg-[#4A9B93]"
                      onClick={() => {
                        const subject = encodeURIComponent(`Re: Ticket ${selectedTicket.ticket_number}`);
                        window.location.href = `mailto:${selectedTicket.email}?subject=${subject}`;
                      }}
                    >
                      <Reply className="w-4 h-4" /> Reply via Email
                    </Button>
                  </CardContent>
                </Card>

                {/* Supervisor & Master Approvals */}
                {selectedTicket.status === "supervisor_review" && user?.role === "supervisor" && (
                  <Card className="border-orange-300">
                    <CardHeader className="py-3 px-4 bg-orange-100 border-b border-orange-300"><CardTitle className="text-base text-orange-800">Supervisor Approval</CardTitle></CardHeader>
                    <CardContent className="p-4 flex gap-2">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleSupervisorAction(true)}>Approve</Button>
                      <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleSupervisorAction(false)}>Reject</Button>
                    </CardContent>
                  </Card>
                )}

                {selectedTicket.status === "master_review" && user?.role === "master" && (
                  <Card className="border-red-300">
                    <CardHeader className="py-3 px-4 bg-red-100 border-b border-red-300"><CardTitle className="text-base text-red-800">Master Approval</CardTitle></CardHeader>
                    <CardContent className="p-4 flex gap-2">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleMasterAction(true)}>Final Approve</Button>
                      <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleMasterAction(false)}>Reject</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Status & Disposition */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-slate-100 border-b"><CardTitle className="text-base">Resolution</CardTitle></CardHeader>
                  <CardContent className="p-4 space-y-4">
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500 font-semibold">Disposition (Required for Resolve/Close)</Label>
                      <Select 
                        value={selectedTicket.disposition || ""} 
                        onValueChange={(val) => handleUpdateField('disposition', val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select disposition..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_action_needed">No Action Needed</SelectItem>
                          <SelectItem value="user_education">User Education</SelectItem>
                          <SelectItem value="listing_adjustment">Listing Adjustment</SelectItem>
                          <SelectItem value="refund_approved">Refund Approved</SelectItem>
                          <SelectItem value="promo_issued">Promo Issued</SelectItem>
                          <SelectItem value="policy_violation">Policy Violation</SelectItem>
                          <SelectItem value="account_warning">Account Warning</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTicket.disposition === "other" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 font-semibold">Disposition Notes</Label>
                        <Textarea 
                          placeholder="Why 'Other'?"
                          value={selectedTicket.disposition_notes || ""}
                          onChange={(e) => setSelectedTicket({...selectedTicket, disposition_notes: e.target.value})}
                          onBlur={(e) => handleUpdateField('disposition_notes', e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs text-slate-500 font-semibold">Update Status</Label>
                      <Select 
                        value={selectedTicket.status} 
                        onValueChange={(val) => handleStatusChange(selectedTicket.id, val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="waiting_for_user">Waiting For User</SelectItem>
                          <SelectItem value="supervisor_review">Supervisor Review</SelectItem>
                          <SelectItem value="master_review">Master Review</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  </CardContent>
                </Card>

                {/* Internal Notes */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-slate-100 border-b"><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <Textarea 
                      placeholder="Add internal notes..."
                      value={selectedTicket.internal_notes || ""}
                      onChange={(e) => setSelectedTicket({...selectedTicket, internal_notes: e.target.value})}
                      onBlur={(e) => handleUpdateField('internal_notes', e.target.value)}
                      className="min-h-[100px]"
                    />
                  </CardContent>
                </Card>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Refund Amount ($)</Label>
              <Input type="number" step="0.01" value={refundData.amount} onChange={e => setRefundData({...refundData, amount: e.target.value})} placeholder="e.g. 5.99" />
            </div>
            <div className="space-y-2">
              <Label>Refund Reason</Label>
              <Input value={refundData.reason} onChange={e => setRefundData({...refundData, reason: e.target.value})} placeholder="Why is a refund requested?" />
            </div>
            <div className="space-y-2">
              <Label>Additional Internal Notes (Optional)</Label>
              <Textarea value={refundData.internal_notes} onChange={e => setRefundData({...refundData, internal_notes: e.target.value})} placeholder="Context for the supervisor..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestRefund} className="bg-amber-600 hover:bg-amber-700">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promo Modal */}
      <Dialog open={promoModalOpen} onOpenChange={setPromoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Promo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Promo Type</Label>
              <Select value={promoData.type} onValueChange={val => setPromoData({...promoData, type: val})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_featured_upgrade">Free Featured Upgrade</SelectItem>
                  <SelectItem value="free_premium_upgrade">Free Premium Upgrade</SelectItem>
                  <SelectItem value="coupon_code">Coupon Code</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Promo Value</Label>
              <Input value={promoData.value} onChange={e => setPromoData({...promoData, value: e.target.value})} placeholder="e.g. Free Premium 1x, 10% off code" />
            </div>
            <div className="space-y-2">
              <Label>Promo Reason</Label>
              <Input value={promoData.reason} onChange={e => setPromoData({...promoData, reason: e.target.value})} placeholder="Why give a promo?" />
            </div>
            <div className="space-y-2">
              <Label>Additional Internal Notes (Optional)</Label>
              <Textarea value={promoData.internal_notes} onChange={e => setPromoData({...promoData, internal_notes: e.target.value})} placeholder="Context for the supervisor..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestPromo} className="bg-purple-600 hover:bg-purple-700 text-white">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}