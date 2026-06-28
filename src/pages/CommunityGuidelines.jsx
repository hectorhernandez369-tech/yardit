import React from "react";
import LegalDocument from "@/components/legal/LegalDocument";
import { legalDocuments } from "@/lib/legalDocuments";

export default function CommunityGuidelines() {
  return <LegalDocument document={legalDocuments.community} />;
}