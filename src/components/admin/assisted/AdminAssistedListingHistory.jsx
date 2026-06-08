import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, RefreshCw } from "lucide-react";
import AdminQRViewModal from "@/components/admin/assisted/AdminQRViewModal";

const QR_CDN = "https://api.qrserver.com/v1/create-qr-code/";

const STATUS_LABELS = {
  pending_seller_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-800" },
  assisted_active_unclaimed: { label: "Active – Unclaimed", color: "bg-blue-100 text-blue-800" },
  assisted_active_claim_pending: { label: "Claim Pending", color: "bg-purple-100 text-purple-800" },
  claimed_active: { label: "Claimed", color: "bg-green-100 text-green-800" },
  assisted_declined: { label: "Declined", color: "bg-red-100 text-red-800" },
  assisted_expired: { label: "Expired", color: "bg-gray-100 text-gray-600" },
};

export default function AdminAssistedListingHistory({ adminUser }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [qrModalRecord, setQrModalRecord] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AssistedListing.filter(
        { admin_creator_id: adminUser?.id },
        "-created_date",
        50
      );
      setRecords(all || []);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [adminUser?.id]);

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (!records.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <QrCode className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p>No assisted listings created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-gray-500">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
      {qrModalRecord && (
        <AdminQRViewModal
          record={qrModalRecord}
          onClose={() => setQrModalRecord(null)}
          onRefreshed={(updated) => {
            setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
            setQrModalRecord(updated);
          }}
        />
      )}

      {records.map((rec) => {
        const token = rec.assisted_qr_token;
        const fallbackApprovalUrl = token && token !== "__invalidated__" ? `${window.location.origin}/assisted-listing?token=${token}` : null;
        const approvalUrl = token && token !== "__invalidated__" && rec.approval_url?.includes(token) ? rec.approval_url : fallbackApprovalUrl;
        const qrUrl = approvalUrl ? `${QR_CDN}?size=120x120&data=${encodeURIComponent(approvalUrl)}&ecc=M` : null;
        const expired = new Date(rec.assisted_qr_expires_at) < new Date();
        const statusInfo = STATUS_LABELS[rec.assisted_status] || { label: rec.assisted_status, color: "bg-gray-100 text-gray-600" };
        const isExpanded = expandedId === rec.id;

        return (
          <div key={rec.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div
              className="w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : rec.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#2C4F4E] text-sm">{rec.listing_number || "N/A"}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                  {expired && rec.assisted_status === "pending_seller_approval" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">QR Expired</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {rec.seller_name || "Unnamed Seller"} · Created {new Date(rec.created_date || rec.assisted_qr_created_at).toLocaleDateString()} · Scans: {rec.qr_scan_count || 0}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={(e) => { e.stopPropagation(); setQrModalRecord(rec); }}
              >
                <QrCode className="w-3.5 h-3.5" /> View QR
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 flex gap-4 flex-wrap items-start">
                {qrUrl && (
                  <div className="text-center">
                    <img src={qrUrl} alt="QR" className="rounded-lg border border-gray-200" width={120} height={120} />
                    <p className="text-xs text-gray-400 mt-1">{expired ? "Expired" : "Active"}</p>
                  </div>
                )}
                <div className="text-sm space-y-1 flex-1 min-w-0">
                  {rec.seller_phone && <p><span className="text-gray-400">Phone:</span> {rec.seller_phone}</p>}
                  {rec.seller_email && <p><span className="text-gray-400">Email:</span> {rec.seller_email}</p>}
                  {rec.admin_notes && <p><span className="text-gray-400">Notes:</span> {rec.admin_notes}</p>}
                  <p><span className="text-gray-400">Expires:</span> {new Date(rec.assisted_qr_expires_at).toLocaleString()}</p>
                  {rec.seller_approved_at && <p><span className="text-gray-400">Approved:</span> {new Date(rec.seller_approved_at).toLocaleString()}</p>}
                  {rec.claimed_at && <p><span className="text-gray-400">Claimed:</span> {new Date(rec.claimed_at).toLocaleString()}</p>}
                  <p className="text-xs text-gray-300 break-all mt-2">{approvalUrl}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}