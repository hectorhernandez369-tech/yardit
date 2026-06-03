import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";

const displayName = (user) => user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Yardit user";

export default function NeighborhoodCoHostSelector({ formData, setFormData, currentUser }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.entities.User.list()
      .then((rows) => {
        if (!active) return;
        setUsers(Array.isArray(rows) ? rows : []);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedName = formData.co_host_invite_name || formData.co_host_invite_email || "";

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((candidate) => candidate?.id && candidate.id !== currentUser?.id)
      .filter((candidate) => {
        const haystack = [displayName(candidate), candidate.email, candidate.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [currentUser?.id, query, users]);

  const selectCoHost = (candidate) => {
    setFormData((prev) => ({
      ...prev,
      co_host_user_id: candidate.id,
      co_host_status: "pending",
      co_host_invite_email: candidate.email || "",
      co_host_invite_name: displayName(candidate),
    }));
    setQuery("");
    toast.success("Co-host selected. The invite will send after the sale is created.");
  };

  const clearCoHost = () => {
    setFormData((prev) => ({
      ...prev,
      co_host_user_id: "",
      co_host_status: "",
      co_host_invite_email: "",
      co_host_invite_name: "",
    }));
  };

  return (
    <div className="rounded-xl border-2 border-[#2C4F4E]/70 bg-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#e6f3f4] p-2 text-[#006168]">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <Label className="font-semibold text-[#2C4F4E]">Optional Co-Host</Label>
          <p className="mt-1 text-sm text-slate-600">
            Invite another Yardit user to help manage this Neighborhood Sale. They do not replace the required in-radius host address.
          </p>
        </div>
      </div>

      {selectedName ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#5DADA5]/30 bg-[#F3E6CF] p-3">
          <div>
            <p className="text-sm font-semibold text-[#2C4F4E]">{selectedName}</p>
            {formData.co_host_invite_email && <p className="text-xs text-slate-600">{formData.co_host_invite_email}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={clearCoHost} className="h-8 w-8 text-slate-500">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or phone"
            className="bg-[#F3E6CF] border-[#2C4F4E]"
          />
          {loading && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading users...
            </p>
          )}
          {loadFailed && <p className="text-xs text-amber-700">Co-hosts can also be added from My Listings after the sale is created.</p>}
          {filteredUsers.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {filteredUsers.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => selectCoHost(candidate)}
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-[#e6f3f4] last:border-b-0"
                >
                  <span className="font-semibold text-slate-800">{displayName(candidate)}</span>
                  {candidate.email && <span className="block text-xs text-slate-500">{candidate.email}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}