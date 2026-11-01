import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { holidayFormData, holidayPayload } from '@/lib/holidayLights';

export default function useHolidayLightEditor(id) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState(() => holidayFormData());
  const record = useQuery({ queryKey: ['holidayLights', 'edit', id, user?.id], enabled: !!id && !!user?.id, queryFn: async () => {
    const page = await base44.entities.Location.filter({ id, type: 'holiday_lights', owner_user_id: user.id }, { limit: 1 });
    return page.items[0] || null;
  } });
  useEffect(() => { if (record.data) setForm(holidayFormData(record.data)); }, [record.data]);
  const save = useMutation({ mutationFn: async () => {
    if (!user) throw new Error('Please log in to post your display.');
    if (!form.title.trim() || !form.address.trim() || !Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) throw new Error('Add a display name and choose its map location.');
    const startYear = Number(form.start.slice(0, 4)) - (form.start.slice(5, 7) === '01' ? 1 : 0);
    if (!form.start || !form.end || form.start > form.end || form.start < `${startYear}-11-01` || form.end > `${startYear + 1}-01-02`) throw new Error('Choose nights within one November 1–January 2 season.');
    if (!form.viewing_start_time || !form.viewing_end_time || form.viewing_start_time >= form.viewing_end_time) throw new Error('Lights-off time must be after lights-on time on the same night.');
    const payload = holidayPayload(form, user.id);
    if (new Date(payload.end_date_time) <= new Date()) throw new Error('Choose a last night that has not ended.');
    return id ? base44.entities.Location.update(id, payload) : base44.entities.Location.create(payload);
  }, onSuccess: async (spot) => {
    await client.invalidateQueries({ queryKey: ['holidayLights'] });
    navigate(`/HolidayLightsDetail?id=${spot.id}`, { replace: true });
  } });
  return { user, form, setForm, record, save };
}