import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import useFounderMembership, { founderKey } from '@/components/founder/useFounderMembership';
export default function FounderProfileControl({ userId }) {
  const { membership } = useFounderMembership(userId);
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!membership) return null;
  const setVisible = async (visible) => {
    setSaving(true); setError('');
    try {
      await base44.functions.invoke('setFounderBadgeVisibility', { visible });
      client.setQueryData(founderKey, rows => rows?.map(row => row.user_id === userId ? { ...row, badge_visible: visible } : row));
      await client.invalidateQueries({ queryKey: founderKey });
    } catch (err) { setError(err?.response?.data?.error || 'Could not save badge visibility. Please try again.'); }
    finally { setSaving(false); }
  };
  return <section className="rounded-xl border bg-card p-4 text-card-foreground space-y-3">
    <div><h2 className="font-semibold">Founder VIP</h2><p className="text-sm text-muted-foreground">All yard-sale and community-event tiers, upgrades, and add-ons are free for your account.</p></div>
    <div className="flex items-center justify-between gap-4"><label htmlFor="founder-visibility">Show Founder badge everywhere</label><Switch id="founder-visibility" checked={membership.badge_visible} disabled={saving} onCheckedChange={setVisible} /></div>
    <p className="text-xs text-muted-foreground">Turning this off hides your badge from every view, including your own. Your VIP benefits stay active.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}