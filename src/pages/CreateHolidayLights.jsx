import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import HolidayLightsHeader from '@/components/holiday-lights/HolidayLightsHeader';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { hasVerifiedPrimaryAddress } from '@/lib/trustActions';
import useHolidayLightEditor from '@/hooks/useHolidayLightEditor';
import HolidayLightsFields from '@/components/holiday-lights/HolidayLightsFields';
import HolidayLightsLocation from '@/components/holiday-lights/HolidayLightsLocation';
import HolidayLightsNotFound from '@/components/holiday-lights/HolidayLightsNotFound';

export default function CreateHolidayLights() {
  const id = new URLSearchParams(window.location.search).get('id');
  const { user, form, setForm, record, save } = useHolidayLightEditor(id);
  if (!user) return <div className="mx-auto max-w-lg p-8 text-center"><h1 className="text-2xl font-bold">Sign in to post Holiday Lights</h1><p>Christmas displays are free to list with a verified home address.</p><button type="button" onClick={() => base44.auth.redirectToLogin(window.location.href)} className="mt-3 rounded-lg bg-[#123f30] px-4 py-2 font-bold text-white">Sign in or create account</button></div>;
  if (!hasVerifiedPrimaryAddress(user)) return <div className="mx-auto max-w-lg space-y-4 p-8 text-center"><h1 className="text-2xl font-bold">Verify your address first</h1><p>Complete your primary address verification before posting a display.</p><Button asChild><Link to="/Profile">Complete my profile</Link></Button></div>;
  if (id && record.isPending) return <p className="p-8 text-center">Loading display…</p>;
  if (id && record.isError) return <p role="alert" className="p-8 text-center text-destructive">Could not load this display. <button onClick={() => record.refetch()} className="underline">Retry</button></p>;
  if (id && record.data === null) return <HolidayLightsNotFound />;
  return <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
    <Link to="/CreateListing" className="text-sm underline">Back to listing types</Link>
    <HolidayLightsHeader editing={Boolean(id)} />
    <form className="space-y-6 rounded-2xl border bg-card p-5 text-card-foreground" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
      <HolidayLightsFields form={form} setForm={setForm} />
      <HolidayLightsLocation form={form} />
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      <p className="text-xs text-muted-foreground">By posting, you confirm you own this display or have permission to list it.</p>
      <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{save.isPending ? 'Saving…' : id ? 'Save display' : 'Publish Holiday Lights'}</Button>
    </form>
  </div>;
}