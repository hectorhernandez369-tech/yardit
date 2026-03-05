import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Reply, Clock } from "lucide-react";
import { toast } from "sonner";

export default function SupportTicketQueue() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await base44.entities.SupportTicket.update(ticketId, { status: newStatus });
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      toast.success("Status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const formatStatus = (status) => {
    return status?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-amber-100 text-amber-800";
      case "waiting_for_user": return "bg-purple-100 text-purple-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-slate-200 text-slate-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#2C4F4E] mb-4">Support Ticket Queue</h2>
      
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border rounded-lg bg-white">No support tickets found.</div>
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
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between">
              <span>Ticket {selectedTicket?.ticket_number}</span>
              {selectedTicket && (
                <Badge className={getStatusColor(selectedTicket.status)} variant="outline">
                  {formatStatus(selectedTicket.status)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-6 mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border">
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">User Name</span>
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
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
                <div className="bg-white border rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap min-h-[100px]">
                  {selectedTicket.description}
                </div>
              </div>

              {selectedTicket.photo_paths?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Photos</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {selectedTicket.photo_paths.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 block">
                        <img src={url} alt={`Evidence ${i+1}`} className="h-32 w-auto object-cover rounded border hover:opacity-90 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">Update Status:</span>
                  <Select 
                    value={selectedTicket.status} 
                    onValueChange={(val) => handleStatusChange(selectedTicket.id, val)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_for_user">Waiting For User</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1" />

                <Button 
                  onClick={() => {
                    const subject = encodeURIComponent(`Re: Ticket ${selectedTicket.ticket_number}`);
                    window.location.href = `mailto:${selectedTicket.email}?subject=${subject}`;
                  }}
                  className="gap-2 bg-[#5DADA5] hover:bg-[#4A9B93]"
                >
                  <Reply className="w-4 h-4" />
                  Reply via Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}