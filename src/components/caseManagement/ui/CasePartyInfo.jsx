import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Hash } from "lucide-react";

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  );
}

export default function CasePartyInfo({ title, userData, accountNumber, fallbackLabel }) {
  const hasUser = userData && (userData.full_name || userData.email);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasUser ? (
          <>
            <InfoRow icon={User} label="Name" value={userData.full_name} />
            <InfoRow icon={Mail} label="Email" value={userData.email} />
            <InfoRow icon={Phone} label="Phone" value={userData.phone_number} />
            <InfoRow icon={Hash} label="Account" value={accountNumber || userData.id} />
          </>
        ) : (
          <div className="text-sm text-gray-500">
            <p>{fallbackLabel || "User info unavailable"}</p>
            {accountNumber && <InfoRow icon={Hash} label="Account" value={accountNumber} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}