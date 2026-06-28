import React from "react";
import LegalDocument from "@/components/legal/LegalDocument";
import { legalDocuments } from "@/lib/legalDocuments";

export default function TermsOfService() {
  return <LegalDocument document={legalDocuments.terms} />;
}