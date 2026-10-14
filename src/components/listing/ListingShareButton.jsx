import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Link, Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";
import { getYarditShareCopy } from "@/lib/shareText";

export default function ListingShareButton({ listing, listingUrl, mainImage, className, buttonLabel = "Share Listing" }) {
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const shareCopy = getYarditShareCopy(listing, listingUrl);
  const shareTitle = shareCopy.title;
  const shareText = shareCopy.fullText;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareCopy.fullText);
    toast.success("Share text and link copied");
  };

  const handleCopyForApp = async (appName) => {
    await navigator.clipboard.writeText(shareText);
    toast.success(`${appName} text copied`);
  };

  const handleShare = async () => {
    if (!navigator.share) {
      setFallbackOpen(true);
      return;
    }
    try {
      let fileToShare = null;
      if (mainImage) {
        try {
          const response = await fetch(mainImage, { mode: "cors" });
          const blob = await response.blob();
          const file = new File([blob], "listing_flyer.jpg", { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            fileToShare = file;
          }
        } catch (e) {
          console.error("Could not load image for sharing:", e);
        }
      }
      const shareData = {
        title: shareTitle,
        text: shareCopy.message,
      };
      if (fileToShare) {
        shareData.files = [fileToShare];
        shareData.text = shareCopy.fullText;
      } else {
        shareData.url = listingUrl;
      }
      await navigator.share(shareData);
    } catch (error) {
      if (error?.name === "NotAllowedError" || error?.name === "AbortError") {
        setFallbackOpen(true);
        return;
      }
      throw error;
    }
  };

  return (
    <DropdownMenu open={fallbackOpen} onOpenChange={setFallbackOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          onClick={handleShare}
          className={className || "flex-1 gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 h-12 text-base font-semibold shadow-sm"}
        >
          <Share2 className="w-4 h-4" />
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 rounded-xl p-2">
        <DropdownMenuItem onClick={handleCopyLink} className="flex items-center cursor-pointer py-2.5">
          <Link className="w-4 h-4 mr-3 text-slate-600" />
          <span className="font-medium text-slate-700">Copy Share Text + Link</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`, "_blank")}
          className="flex items-center cursor-pointer py-2.5"
        >
          <Facebook className="w-4 h-4 mr-3 text-[#1877F2]" />
          <span className="font-medium text-slate-700">Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopyForApp("Instagram")} className="flex items-center cursor-pointer py-2.5">
          <Instagram className="w-4 h-4 mr-3 text-[#E4405F]" />
          <span className="font-medium text-slate-700">Instagram</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopyForApp("Snapchat")} className="flex items-center cursor-pointer py-2.5">
          <svg className="w-4 h-4 mr-3 text-[#FFFC00]" viewBox="0 0 24 24" fill="currentColor" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8 2 6 5.5 6 9c0 1 .5 2.5 1.5 3-1 0-2 .5-2 1.5 0 .5.5 1 1 1 0 1.5 2 3 5.5 3s5.5-1.5 5.5-3c.5 0 1-.5 1-1.5 0-1-1-1.5-2-1.5 1-.5 1.5-2 1.5-3 0-3.5-2-7-6-7z" />
          </svg>
          <span className="font-medium text-slate-700">Snapchat</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopyForApp("TikTok")} className="flex items-center cursor-pointer py-2.5">
          <svg className="w-4 h-4 mr-3 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
          </svg>
          <span className="font-medium text-slate-700">TikTok</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}