import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/components/admin/AdminLoginModal";
import PaymentAuditDashboard from "@/components/admin/payments/PaymentAuditDashboard";

export default function PaymentAudit() {
  const adminSession = getAdminSession();

  if (!adminSession) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-slate-50 px-4 py-12 text-center">
        <h1 className="mb-2 text-2xl font-black text-[#2C4F4E]">Admin Mode Required</h1>
        <p className="mb-6 text-slate-600">Open Payment Audit from the Admin area after entering your Employee ID and PIN.</p>
        <Button asChild><Link to="/AdminLite?section=payments">Go to Admin</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PaymentAuditDashboard />
      </div>
    </div>
  );
}