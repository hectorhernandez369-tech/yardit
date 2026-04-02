import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TESTER_ACCESS_CODE, setTesterBypass } from "@/lib/comingSoonMode";

export default function TesterLoginModal({ open, onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setTimeout(() => {
      if (code.trim() === TESTER_ACCESS_CODE) {
        setTesterBypass();
        toast.success("Early access granted! Welcome to Yardit.");
        setCode("");
        onSuccess();
        window.location.href = "/";
      } else {
        toast.error("Invalid access code. Please try again.");
      }
      setLoading(false);
    }, 500);
  };

  const onBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        className="bg-[#F3E6CF] border-2 border-[#2C4F4E] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-[#5DADA5]" />
            <h2 className="text-lg font-bold text-[#2C4F4E]">Early Access</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#2C4F4E]/70 mb-4">
          Enter your early access code to preview Yardit before launch.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter access code"
            autoFocus
            className="border-[#2C4F4E]/40"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white border-2 border-[#2C4F4E]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
            Enter Yardit
          </Button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Access is valid for 1 hour per session.
        </p>
      </div>
    </div>,
    document.body
  );
}