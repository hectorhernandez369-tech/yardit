import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Redirect from old /CaseManagement route to the unified Admin page with cases tab.
 * Preserves the openCaseId query param if present.
 */
export default function CaseManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openCaseId = params.get("openCaseId");
    const target = createPageUrl("AdminLite") + "?tab=cases" + (openCaseId ? `&openCaseId=${openCaseId}` : "");
    navigate(target, { replace: true });
  }, [location.search]);

  return null;
}