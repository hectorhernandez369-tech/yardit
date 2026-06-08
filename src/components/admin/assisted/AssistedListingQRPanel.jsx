import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Printer, Download, Plus } from "lucide-react";

const QR_CDN = "https://api.qrserver.com/v1/create-qr-code/";

export default function AssistedListingQRPanel({ created, onCreateAnother }) {
  const approvalUrl = `${window.location.origin}/assisted-listing?token=${created.token}`;
  const qrUrl = `${QR_CDN}?size=220x220&data=${encodeURIComponent(approvalUrl)}&ecc=M`;

  const qrLabel = created.saleAddress || created.address || created.display_address || created.title || "Listing QR";

  const buildFilename = () => {
    return qrLabel
      .toLowerCase()
      .replace(/,/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join("-") + ".png";
  };

  const handleDownload = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${QR_CDN}?size=300x300&data=${encodeURIComponent(approvalUrl)}&ecc=M`;
    img.onload = () => {
      const label = qrLabel;
      const padding = 16;
      const labelHeight = 28;
      const canvas = document.createElement("canvas");
      canvas.width = 300 + padding * 2;
      canvas.height = 300 + padding * 2 + labelHeight;
      const ctx = canvas.getContext("2d");

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Address label
      ctx.fillStyle = "#111111";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, canvas.width / 2, padding + 18);

      // QR image
      ctx.drawImage(img, padding, padding + labelHeight, 300, 300);

      const link = document.createElement("a");
      link.download = buildFilename();
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  const handlePrint = () => {
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
        <p>Scan this QR code to approve your free listing:<br/><strong>${created.title}</strong></p>
        <p style="color:#888;font-size:12px;">${created.address}</p>
        <img src="${qrUrl}" width="220" height="220" />
        <p class="url">${approvalUrl}</p>
        <p style="margin-top:24px;font-size:12px;color:#aaa;">QR code expires in 24 hours</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-4">
      <div className="flex items-center justify-center gap-2 text-green-700">
        <CheckCircle className="w-6 h-6" />
        <h3 className="text-lg font-bold">Listing Created!</h3>
      </div>

      <div className="bg-white border-2 border-[#2C4F4E] rounded-2xl p-6 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-3">{qrLabel}</p>
        <img
          src={qrUrl}
          alt="QR Code"
          className="mx-auto rounded-xl border border-gray-200"
          width={220}
          height={220}
        />
        <p className="text-xs text-gray-400 mt-3">
          Expires: {new Date(created.expiresAt).toLocaleString()}
        </p>
      </div>

      <p className="text-sm text-gray-600">
        Show or print this QR code for the seller to scan and approve their listing.
      </p>

      <div className="flex flex-col gap-3">
        <Button onClick={handleDownload} className="w-full gap-2 bg-[#2C4F4E] text-white hover:bg-[#1e3b3a]">
          <Download className="w-4 h-4" /> Download QR Image
        </Button>
        <Button onClick={handlePrint} variant="outline" className="w-full gap-2 border-[#2C4F4E] text-[#2C4F4E]">
          <Printer className="w-4 h-4" /> Print QR Code
        </Button>
        <Button variant="ghost" onClick={onCreateAnother} className="w-full gap-2 text-[#2C4F4E]">
          <Plus className="w-4 h-4" /> Create Another Listing
        </Button>
      </div>
    </div>
  );
}