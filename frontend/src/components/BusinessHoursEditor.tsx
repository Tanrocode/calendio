import React, { useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMES: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

export const fmtTime = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

type DayHours = { open: string; close: string } | null;
export type WeekHours = Record<string, DayHours>;

const DEFAULT: WeekHours = {
  Mon: { open: '09:00', close: '17:00' },
  Tue: { open: '09:00', close: '17:00' },
  Wed: { open: '09:00', close: '17:00' },
  Thu: { open: '09:00', close: '17:00' },
  Fri: { open: '09:00', close: '17:00' },
  Sat: null,
  Sun: null,
};

export const parseWeekHours = (raw: string | undefined): WeekHours => {
  if (!raw) return { ...DEFAULT };
  try { return JSON.parse(raw); } catch { return { ...DEFAULT }; }
};

const selectStyle: React.CSSProperties = {
  padding: '4px 6px', fontSize: 12, borderRadius: 6,
  border: '1px solid var(--lavender-dark)', background: 'var(--lavender-bg)',
  color: 'var(--text-dark)', fontFamily: 'var(--font-ui)', outline: 'none', cursor: 'pointer',
};

const BusinessHoursEditor: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [hours, setHours] = useState<WeekHours>(() => parseWeekHours(value));

  const update = (day: string, val: DayHours) => {
    const next = { ...hours, [day]: val };
    setHours(next);
    onChange(JSON.stringify(next));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {DAYS.map(day => {
        const h = hours[day];
        return (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', flexShrink: 0 }}>{day}</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={h !== null}
                onChange={e => update(day, e.target.checked ? { open: '09:00', close: '17:00' } : null)}
                style={{ accentColor: 'var(--plum)', width: 13, height: 13, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-soft)' }}>Open</span>
            </label>
            {h ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <select value={h.open} onChange={e => update(day, { ...h, open: e.target.value })} style={selectStyle}>
                  {TIMES.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>–</span>
                <select value={h.close} onChange={e => update(day, { ...h, close: e.target.value })} style={selectStyle}>
                  {TIMES.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-soft)', fontStyle: 'italic' }}>Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BusinessHoursEditor;
