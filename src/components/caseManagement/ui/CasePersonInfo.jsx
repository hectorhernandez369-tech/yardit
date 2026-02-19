import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Hash } from "lucide-react";

export default function CasePersonInfo({ title, icon, person, accountNumber, fallbackLabel }) {
  const Icon = icon || User;
  const name = person?.full_name;
  const email = person?.email;
  const phone = person?.phone;
  const acct = accountNumber || person?.account_number;

  const hasAnyInfo = name || email || phone || acct;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyInfo ? (
          <p className="text-sm text-gray-400 italic">{fallbackLabel || "Unknown"}</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            {name && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="font-medium text-gray-800">{name}</span>
              </div>
            )}
            {!name && <p className="text-xs text-gray-400 italic">{fallbackLabel || "Name unavailable"}</p>}
            {acct && (
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="font-mono text-xs text-gray-600">{acct}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href={`mailto:${email}`} className="text-blue-600 underline text-xs break-all">{email}</a>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-600">{phone}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}