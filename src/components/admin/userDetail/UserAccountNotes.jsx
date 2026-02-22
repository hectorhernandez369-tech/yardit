import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function UserAccountNotes({ user, adminUser }) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

  // Get admin profile for employee_id
  const { data: adminProfile } = useQuery({
    queryKey: ["adminProfileForNotes", adminUser?.id],
    queryFn: async () => {
      if (!adminUser?.id) return null;
      const profiles = await base44.entities.AdminProfile.filter({ user_id: adminUser.id });
      return profiles[0] || null;
    },
    enabled: !!adminUser?.id,
  });

  const { data: notes, isLoading } = useQuery({
    queryKey: ["userAdminNotes", user.id],
    queryFn: () => base44.entities.UserAdminNote.filter({ user_id: user.id }, "-created_date"),
    initialData: [],
  });

  const addNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.UserAdminNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAdminNotes", user.id] });
      setNoteText("");
      toast.success("Note added.");
    },
  });

  const handleAdd = () => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate({
      user_id: user.id,
      admin_user_id: adminUser.id,
      admin_employee_id: adminProfile?.employee_id || "",
      note: noteText.trim(),
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Account Notes</h3>

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Add an internal note about this user..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="min-h-[60px]"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={addNoteMutation.isPending || !noteText.trim()}
          className="self-end gap-1"
        >
          {addNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add Note
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No notes yet.</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="border rounded-lg p-3 bg-gray-50 text-sm">
              <p className="whitespace-pre-wrap">{n.note}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{n.created_date ? format(new Date(n.created_date), "MMM d, yyyy h:mm a") : "—"}</span>
                <span>·</span>
                <span>{n.admin_employee_id || n.admin_user_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}