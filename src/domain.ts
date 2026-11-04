import { EVENT_DATA } from './data.ts';

export type Focus = 'sun-yingsha' | 'wang-chuqin' | 'shatou' | 'custom';
export type Mode = 'entry' | 'between' | 'target' | 'special';
export type TemplateId = 'birthday' | 'ticket' | 'scoreboard' | 'badge' | 'table';
export type EventItem = (typeof EVENT_DATA.items)[number];

export const PRODUCT_NAME = '入坑日第 N 天';

export const focusLabels: Record<Focus, string> = {
  'sun-yingsha': '孙颖莎',
  'wang-chuqin': '王楚钦',
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
  '综艺': '电视节目',
  '单打·奖牌': '奖牌',
  '混双·奖牌': '奖牌',
};

const TYPE_ORDER = [
  '单打·奖牌',
  '混双·奖牌',
  '单打·冠军',
  '双打·冠军',
  '混双·冠军',
  '团体·冠军',
  '混团·冠军',
  '名场面',
  '里程碑',
  '奖项',
  '活动',
  '杂志',
  '综艺',
  '代言',
];

export function eventTypeLabel(type: string): string {
  return typeLabels[type] || type;
}

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
  const overrides: Record<string, string> = {
    A014: '亚锦赛（日惹）混双亚军',
    A075: '休斯敦世乒赛混双夺冠后拥抱（第 1 次拥抱）',
    A085: '德班世乒赛混双卫冕后互动（第 2 次拥抱）',
    A099: '巴黎奥运混双夺冠后拥抱（第 4 次拥抱）',
    A129: '多哈世乒赛混双夺冠后拥抱（第 3 次拥抱）',
    A053: '国乒男队队长交接',
    A077: '休斯敦世乒赛女双卫冕',
    A160: '第十三届全运会男单半决赛',
  };
  if (overrides[event.id]) return overrides[event.id];
  let title = event.event.trim();
  title = title.replace(/[（(][^）)]*(?:\d+\s*[:：]\s*\d+|与|对阵|胜|负|\/|出场|带伤|同批|任副队长)[^）)]*[）)]/g, '').trim();
  title = title.replace(/[：—；].*$/, '').trim();
  // Keep score notation such as 4:0 out of public event names while preserving location parentheses.
  title = title.replace(/\s{2,}/g, ' ').replace(/[：，；]+$/g, '').trim();
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
    if (type !== 'all' && eventTypeLabel(item.type) !== type) return false;
    if (normalized && !(`${item.event} ${item.source}`.toLowerCase().includes(normalized))) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function typesForFocus(focus: Focus): string[] {
  const present = new Set<string>(eventsForFocus(focus).map(item => item.type));
  const labels: string[] = [];
  for (const type of [...TYPE_ORDER, ...present]) {
    if (!present.has(type)) continue;
    const label = eventTypeLabel(type);
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
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
