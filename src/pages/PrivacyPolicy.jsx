import React from "react";
import LegalDocument from "@/components/legal/LegalDocument";
import { legalDocuments } from "@/lib/legalDocuments";

export default function PrivacyPolicy() {
  return <LegalDocument document={legalDocuments.privacy} />;
}