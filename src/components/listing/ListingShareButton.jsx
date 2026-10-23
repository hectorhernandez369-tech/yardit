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
import { getShareMessage, getShareTitle } from "@/lib/socialShareMessage";
import SocialShareMessageDialog from "@/components/listing/SocialShareMessageDialog";

export default function ListingShareButton({ listing, listingUrl, mainImage, className, buttonLabel = "Share Listing" }) {
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const [shareApp, setShareApp] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shareTitle = getShareTitle(listing);
  const shareText = getShareMessage(listing);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(listingUrl);
    toast.success("Link copied");
  };

  const handleCopyForApp = (appName) => {
    setFallbackOpen(false);
    setShareApp(appName);
  };

  const handleShare = async (message = shareText) => {
    if (!navigator.share) {
      setFallbackOpen(true);
      return;
    }
    setSharing(true);
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
        text: fileToShare ? `${message}\n\n${listingUrl}` : message,
      };
      if (fileToShare) {
        shareData.files = [fileToShare];
      } else {
        shareData.url = listingUrl;
      }
      await navigator.share(shareData);
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error("Sharing isn't available. Copy the message and paste it into your post.");
      setShareApp("your social app");
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
    <DropdownMenu open={fallbackOpen} onOpenChange={setFallbackOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={sharing}
          className={className || "flex-1 gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 h-12 text-base font-semibold shadow-sm"}
        >
          <Share2 className="w-4 h-4" />
          {sharing ? "Preparing share…" : buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 rounded-xl p-2">
        {typeof navigator.share === "function" && <DropdownMenuItem onClick={() => handleShare()} className="cursor-pointer py-2.5"><Share2 className="w-4 h-4 mr-3" />Share via apps</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => handleCopyForApp("your social app")} className="cursor-pointer py-2.5"><Link className="w-4 h-4 mr-3" />Copy share message</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="flex items-center cursor-pointer py-2.5">
          <Link className="w-4 h-4 mr-3 text-slate-600" />
          <span className="font-medium text-slate-700">Copy Link</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCopyForApp("Facebook")}
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
    {shareApp && <SocialShareMessageDialog key={shareApp} appName={shareApp} message={shareText} url={listingUrl} onClose={() => setShareApp(null)} onShare={handleShare} />}
    </>
  );
}