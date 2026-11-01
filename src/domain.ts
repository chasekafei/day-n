import { EVENT_DATA } from './data.ts';

export type Focus = 'wang-chuqin' | 'sun-yingsha' | 'shatou' | 'custom';
export type Mode = 'entry' | 'between' | 'target' | 'special';
export type TemplateId = 'ticket' | 'scoreboard' | 'calendar' | 'table';
export type EventItem = (typeof EVENT_DATA.items)[number];

export const focusLabels: Record<Focus, string> = {
  'wang-chuqin': '王楚钦',
  'sun-yingsha': '孙颖莎',
  shatou: '莎头',
  custom: '自定义',
};

export const typeLabels: Record<string, string> = {
  '单打·冠军': '单打冠军',
  '混双·冠军': '混双冠军',
  '双打·冠军': '双打冠军',
  '团体·冠军': '团体冠军',
  '混团·冠军': '混团冠军',
  '名场面': '名场面',
  '里程碑': '里程碑',
  '活动': '活动',
  '杂志': '活动',
  '单打·奖牌': '奖牌',
  '混双·奖牌': '奖牌',
};

function parseDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function todayString(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

export function dateDifference(start: string, end: string): number | null {
  const a = parseDate(start), b = parseDate(end);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}

export function daysSince(start: string, target = todayString(), includeStart = true): number | null {
  const difference = dateDifference(start, target);
  if (difference === null) return null;
  return difference + (includeStart ? 1 : 0);
}

export function displayDate(date: string): string {
  return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3');
}

export function eventMatchesFocus(event: EventItem, focus: Focus): boolean {
  if (!event.selectable || event.date.length !== 10 || event.type.indexOf('纪事') >= 0) return false;
  if (focus === 'custom') return true;
  if (focus === 'shatou') return event.who === '双人';
  return event.who === focusLabels[focus] || event.who === '双人';
}

export function shortEventTitle(event: EventItem): string {
  const title = event.event.replace(/[：:—].*$/, '').trim();
  return title.length > 24 ? title.slice(0, 24) + '…' : title;
}

export function yearsForFocus(focus: Focus): string[] {
  return [...new Set(EVENT_DATA.items.filter(item => eventMatchesFocus(item, focus)).map(item => item.date.slice(0, 4)))].sort((a, b) => Number(b) - Number(a));
}

export function eventsForFocus(focus: Focus, query = '', year = 'all', type = 'all'): EventItem[] {
  const normalized = query.trim().toLowerCase();
  return EVENT_DATA.items.filter(item => {
    if (!eventMatchesFocus(item, focus)) return false;
    if (year !== 'all' && !item.date.startsWith(year)) return false;
    if (type !== 'all' && item.type !== type) return false;
    if (normalized && !(`${item.event} ${item.source}`.toLowerCase().includes(normalized))) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function statsSince(start: string, target: string, focus: Focus): { total: number; mixed: number; singles: number; team: number } {
  const events = EVENT_DATA.items.filter(item => item.is_title && item.date.length === 10 && item.date >= start && item.date <= target && eventMatchesFocus(item, focus));
  const scoped = focus === 'shatou' ? events.filter(item => item.who === '双人') : events;
  return {
    total: scoped.length,
    mixed: scoped.filter(item => item.type.indexOf('混双') >= 0).length,
    singles: scoped.filter(item => item.type.indexOf('单打') >= 0).length,
    team: scoped.filter(item => item.type.indexOf('团') >= 0).length,
  };
}

export function titleForDays(days: number): { title: string; subtitle: string } {
  if (days === 5114) return { title: '5114 传说', subtitle: '把时间也变成了纪念章' };
  if (days >= 3650) return { title: '十年球迷', subtitle: '十年，一直在' };
  if (days >= 2000) return { title: '大满贯级老粉', subtitle: '见过高光，也见过低谷' };
  if (days >= 1104) return { title: '1104 元老', subtitle: '时间把喜欢写成了日期' };
  if (days >= 1000) return { title: '千日见证者', subtitle: '一起打过很多局' };
  if (days >= 511) return { title: '511 资深观众', subtitle: '第 511 天，解锁新的记忆' };
  if (days >= 365) return { title: '一周年老球迷', subtitle: '陪过一整个赛季' };
  if (days >= 100) return { title: '相持中', subtitle: '已经能看懂发球抢攻了' };
  return { title: '发球局新人', subtitle: '刚刚开局，好戏在后头' };
}

export function nextMilestone(days: number): { label: string; remaining: number } {
  const marks = [100, 200, 365, 511, 1000, 1104, 2000, 3650, 5114];
  const mark = marks.find(value => value > days) || Math.ceil((days + 1) / 365) * 365;
  return { label: `${mark} 天`, remaining: mark - days };
}

export function countdownToMonthDay(month: number, day: number, from = todayString()): number {
  const year = Number(from.slice(0, 4));
  let target = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if ((dateDifference(from, target) || 0) < 0) target = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return dateDifference(from, target) || 0;
}

export function countSpecialNumbers(start: string, end: string): number[] {
  const value = dateDifference(start, end);
  if (value === null) return [];
  return [114, 365, 511, 1000, 1104, 2000, 3650, 5114].filter(number => number === value);
}
