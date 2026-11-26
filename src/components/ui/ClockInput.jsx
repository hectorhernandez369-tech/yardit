import React from 'react';
import { cn } from '@/lib/utils';

const pad = n => String(n).padStart(2, '0');
const hours = Array.from({ length: 24 }, (_, i) => pad(i));
const minutes = Array.from({ length: 60 }, (_, i) => pad(i));

export default function ClockInput({ forwardedRef, type, value = '', onChange, className, id, name, min, max, required, disabled, ...rest }) {
  const dated = type === 'datetime-local';
  const [partialDate, setPartialDate] = React.useState('');
  const [day, clock] = dated ? String(value || '').split('T') : ['', value];
  const date = day || partialDate;
  const [hour = '', minute = ''] = String(clock || '').slice(0, 5).split(':');
  const lower = dated ? (date === min?.slice(0,10) ? min?.slice(11,16) : '') : min;
  const upper = dated ? (date === max?.slice(0,10) ? max?.slice(11,16) : '') : max;
  const allowed = (h, m) => (!lower || `${h}:${m}` >= lower) && (!upper || `${h}:${m}` <= upper);
  const emit = v => onChange?.({ target: { value: v, id, name, type }, currentTarget: { value: v, id, name, type } });
  const changeTime = (h, m) => {
    const next = h && `${h}:${allowed(h,m) ? m : minutes.find(n => allowed(h,n))}`;
    emit(next && dated ? `${date}T${next}` : next);
  };
  const styles = cn('min-w-0 rounded-md border border-input bg-background px-1 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50', className, 'w-full');
  return <div className="grid min-w-0 gap-1">
    {dated && <input {...rest} id={id} ref={forwardedRef} type="date" aria-label={rest['aria-label'] || 'Date'} className={styles} disabled={disabled} required={required} min={min?.slice(0,10)} max={max?.slice(0,10)} value={date} onChange={e => { const d = e.target.value; setPartialDate(d); emit(d && clock ? `${d}T${clock.slice(0,5)}` : ''); }} />}
    <div className="grid min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-1">
      <select id={dated ? undefined : id} ref={dated ? undefined : forwardedRef} aria-label="Hour and AM or PM" className={styles} required={required || Boolean(dated && date)} disabled={disabled || (dated && !date)} value={hour} onChange={e => changeTime(e.target.value, minute || '00')}>
        <option value="">Hour</option>{hours.map(h => <option key={h} value={h} disabled={!minutes.some(m => allowed(h,m))}>{Number(h)%12 || 12} {Number(h)<12 ? 'AM' : 'PM'}</option>)}
      </select>
      <select aria-label="Minutes" className={styles} disabled={disabled || !hour} value={minute} onChange={e => changeTime(hour, e.target.value)}>
        {!hour && <option value="">Min</option>}{minutes.map(m => <option key={m} value={m} disabled={!allowed(hour,m)}>{m}</option>)}
      </select>
    </div>{name && <input type="hidden" name={name} value={value || ''} disabled={disabled} />}
  </div>;
}