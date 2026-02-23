import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, X } from "lucide-react";
import { toast } from "sonner";

const ADMIN_SESSION_KEY = "admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export function getAdminSession() {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (new Date(session.expires_at) < new Date()) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export default function AdminLoginModal({ open, onClose, onSuccess }) {
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId.trim() || !pin.trim()) {
      toast.error("Enter both Employee ID and PIN.");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke("adminVerifyPin", {
        employee_id: employeeId.trim(),
        pin: pin.trim(),
      });
      const data = response.data;

      if (data.ok) {
        const session = {
          employee_id: data.employee_id,
          user_id: data.user_id,
          expires_at: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
        };
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        toast.success("Admin Mode activated.");
        setEmployeeId("");
        setPin("");
        onSuccess(session);
      } else {
        if (data.reason === "locked") {
          const until = data.locked_until ? new Date(data.locked_until).toLocaleTimeString() : "later";
          toast.error(`Account locked. Try again after ${until}.`);
        } else if (data.reason === "missing_credentials") {
          toast.error("Enter both Employee ID and PIN.");
        } else {
          toast.error("Invalid Employee ID or PIN.");
        }
      }
    } catch (err) {
      console.error("Admin login error:", err);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onMouseDown={onBackdropMouseDown}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#5DADA5]" />
            <h2 className="text-lg font-bold text-[#2C4F4E]">Admin Login</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Employee ID</label>
            <Input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. MasterAB12"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Admin PIN</label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            Verify & Enter Admin Mode
          </Button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          5 failed attempts will lock access for 10 minutes.
        </p>
      </div>
    </div>,
    document.body
  );
}