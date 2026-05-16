import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Copy, RefreshCw, Loader2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const QR_CDN = "https://api.qrserver.com/v1/create-qr-code/";

export default function AdminQRViewModal({ record, onClose, onRefreshed }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [liveRecord, setLiveRecord] = useState(record);

  const isDeclined = liveRecord.assisted_status === "assisted_declined";
  const isExpired =
    !isDeclined &&
    liveRecord.assisted_qr_token !== "__invalidated__" &&
    new Date(liveRecord.assisted_qr_expires_at) < new Date();

  const approvalUrl = liveRecord.assisted_qr_token && liveRecord.assisted_qr_token !== "__invalidated__"
    ? `${window.location.origin}/assisted-listing?token=${liveRecord.assisted_qr_token}`
    : null;

  const qrUrl = approvalUrl
    ? `${QR_CDN}?size=220x220&data=${encodeURIComponent(approvalUrl)}&ecc=M`
    : null;

  // Build a display address from the listing if available
  const displayAddress = liveRecord.seller_name || "Unnamed Seller";

  const handleCopyLink = () => {
    if (!approvalUrl) return;
    navigator.clipboard.writeText(approvalUrl);
    toast.success("Link copied to clipboard");
  };

  const handlePrint = () => {
    if (!approvalUrl) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Yardit QR Code</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        h2 { color: #2C4F4E; }
        p { color: #666; font-size: 14px; }
        img { margin: 20px auto; display: block; }
        .url { font-size: 11px; color: #999; word-break: break-all; max-width: 400px; margin: 0 auto; }
      </style>
      </head><body>
        <h2>Yardit – Your Yard Sale Is Listed!</h2>
        <p>Scan this QR code to approve your free listing</p>
        <img src="${qrUrl}" width="220" height="220" />
        <p class="url">${approvalUrl}</p>
        <p style="margin-top:24px;font-size:12px;color:#aaa;">QR code expires: ${new Date(liveRecord.assisted_qr_expires_at).toLocaleString()}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleRegenerate = async () => {
    if (isDeclined) return;
    setIsRegenerating(true);
    try {
      const response = await base44.functions.invoke("regenerateAssistedQR", {
        assisted_id: liveRecord.id,
      });
      if (response.data?.assisted) {
        setLiveRecord(response.data.assisted);
        onRefreshed?.(response.data.assisted);
        toast.success("New QR code generated — valid for 24 hours.");
      } else {
        toast.error(response.data?.error || "Could not regenerate QR code.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to regenerate QR code.");
    }
    setIsRegenerating(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2C4F4E]">
            QR Code — {displayAddress}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isDeclined ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Seller declined this promotional listing.</p>
                <p className="text-xs text-red-600 mt-1">A new QR code cannot be generated for a declined listing.</p>
              </div>
            </div>
          ) : isExpired ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">This QR code has expired.</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Expired: {new Date(liveRecord.assisted_qr_expires_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isRegenerating ? "Generating..." : "Generate New QR Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* QR Code */}
              {qrUrl && (
                <div className="text-center">
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    className="mx-auto rounded-xl border border-gray-200"
                    width={220}
                    height={220}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Expires: {new Date(liveRecord.assisted_qr_expires_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Approval URL */}
              {approvalUrl && (
                <p className="text-xs text-gray-400 break-all bg-gray-50 rounded-lg p-2 border">
                  {approvalUrl}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button onClick={handlePrint} className="w-full gap-2 bg-[#2C4F4E] text-white hover:bg-[#1e3b3a]">
                  <Printer className="w-4 h-4" /> Print QR Code
                </Button>
                <Button variant="outline" onClick={handleCopyLink} className="w-full gap-2 border-[#2C4F4E] text-[#2C4F4E]">
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}