import { type Focus, type TemplateId } from './domain.ts';

export type CalendarRecord = {
  focus: Focus;
  startDate: string;
  startEventId: string | null;
  approx: boolean;
  dayZero: boolean;
  template: TemplateId;
  nickname: string;
  profileNickname: string;
  lastOpen: string;
};

const KEY = 'ttcalendar.v1';

export function readRecord(): CalendarRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CalendarRecord>;
    if (!value.startDate || !value.focus) return null;
    return {
      focus: value.focus,
      startDate: value.startDate,
      startEventId: value.startEventId || null,
      approx: Boolean(value.approx),
      dayZero: Boolean(value.dayZero),
      template: (value.template as string) === 'calendar' ? 'badge' : value.template || 'ticket',
      nickname: value.nickname || '',
      profileNickname: value.profileNickname || '',
      lastOpen: value.lastOpen || '',
    };
  } catch {
    return null;
  }
}

export function writeRecord(record: CalendarRecord): void {
  try { localStorage.setItem(KEY, JSON.stringify(record)); } catch { /* saving is best effort in browser preview */ }
}
