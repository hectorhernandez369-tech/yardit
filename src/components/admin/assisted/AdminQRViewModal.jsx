import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const QR_CDN = "https://api.qrserver.com/v1/create-qr-code/";

function buildQrLabel(assistedRecord, listing, fallbackId) {
  if (assistedRecord?.assisted_sale_formatted_address) return assistedRecord.assisted_sale_formatted_address;
  if (assistedRecord?.assisted_sale_address && assistedRecord?.assisted_sale_city)
    return `${assistedRecord.assisted_sale_address}, ${assistedRecord.assisted_sale_city}`;
  if (listing?.addressText && listing?.city) return `${listing.addressText}, ${listing.city}`;
  if (listing?.display_address) return listing.display_address;
  if (listing?.address_text) return listing.address_text;
  if (listing?.title) return listing.title;
  return fallbackId || "Listing QR";
}

function buildFilename(label) {
  return label
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-") + ".png";
}

export default function AdminQRViewModal({ record, onClose, onRefreshed }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [liveRecord, setLiveRecord] = useState(record);
  const [listing, setListing] = useState(null);

  useEffect(() => {
    // Load the AssistedListing to get assisted_sale_formatted_address
    if (liveRecord.id) {
      base44.entities.AssistedListing.filter({ id: liveRecord.id })
        .then((results) => {
          if (results?.[0]) setLiveRecord(prev => ({ ...prev, ...results[0] }));
        })
        .catch(() => {});
    }
    // Also load the Listing as a final fallback
    if (liveRecord.listing_id) {
      base44.entities.Listing.filter({ id: liveRecord.listing_id })
        .then((results) => { if (results?.[0]) setListing(results[0]); })
        .catch(() => {});
    }
  }, []);

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

  const qrLabel = buildQrLabel(liveRecord, listing, liveRecord.listing_id);

  const handleCopyLink = () => {
    if (!approvalUrl) return;
    navigator.clipboard.writeText(approvalUrl);
    toast.success("Link copied to clipboard");
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${QR_CDN}?size=300x300&data=${encodeURIComponent(approvalUrl)}&ecc=M`;
    img.onload = () => {
      const padding = 16;
      const labelHeight = 28;
      const canvas = document.createElement("canvas");
      canvas.width = 300 + padding * 2;
      canvas.height = 300 + padding * 2 + labelHeight;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#111111";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(qrLabel, canvas.width / 2, padding + 18);

      ctx.drawImage(img, padding, padding + labelHeight, 300, 300);

      const link = document.createElement("a");
      link.download = buildFilename(qrLabel);
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.onerror = () => toast.error("Failed to download QR code.");
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
            QR Code
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
              {qrUrl && (
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800 mb-2">{qrLabel}</p>
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

              {approvalUrl && (
                <p className="text-xs text-gray-400 break-all bg-gray-50 rounded-lg p-2 border">
                  {approvalUrl}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={handleDownload} className="w-full gap-2 bg-[#2C4F4E] text-white hover:bg-[#1e3b3a]">
                  <Download className="w-4 h-4" /> Download QR Code
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