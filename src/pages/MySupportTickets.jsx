import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function MySupportTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          navigate(createPageUrl("Home"));
          return;
        }
        const userTickets = await base44.entities.SupportTicket.filter({ email: user.email }, "-created_date");
        setTickets(userTickets);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [navigate]);

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

  const formatStatus = (status) => {
    return status?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-[#F3E6CF]">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-[#2C4F4E]">
          &larr; Back
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-[#2C4F4E]">My Support Tickets</h1>
          <Button onClick={() => navigate(createPageUrl("ContactSupport"))} className="bg-[#5DADA5] hover:bg-[#4A9B93]">
            New Ticket
          </Button>
        </div>

        {loading ? (
          <div className="text-center p-8">Loading...</div>
        ) : tickets.length === 0 ? (
          <Card className="bg-[#E7D7B8] border-[#2C4F4E]">
            <CardContent className="p-8 text-center text-slate-600">
              You haven't created any support tickets yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <Card key={ticket.id} className="border border-[#2C4F4E]/20">
                <CardHeader className="bg-white pb-3 rounded-t-lg">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-[#2C4F4E]">{ticket.ticket_number}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">Created on {format(new Date(ticket.created_date), "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <Badge className={getStatusColor(ticket.status)} variant="outline">{formatStatus(ticket.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="bg-slate-50 pt-4 rounded-b-lg text-sm text-slate-700 whitespace-pre-wrap">
                  {ticket.description}
                  {ticket.photo_paths?.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto">
                      {ticket.photo_paths.map((p, i) => (
                        <a key={i} href={p} target="_blank" rel="noreferrer">
                          <img src={p} alt="evidence" className="h-20 w-auto rounded border object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}