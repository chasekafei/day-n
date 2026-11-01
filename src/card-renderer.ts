import { type Focus, type TemplateId, displayDate, focusLabels } from './domain.ts';

export type CardResult = {
  focus: Focus;
  startDate: string;
  eventTitle: string;
  days: number;
  title: string;
  subtitle: string;
  total: number;
  mixed: number;
  singles: number;
  team: number;
  nickname: string;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function font(ctx: CanvasRenderingContext2D, weight: number, size: number): void { ctx.font = `${weight} ${size}px Arial, "PingFang SC", "Microsoft YaHei", sans-serif`; }

export function renderCard(result: CardResult, template: TemplateId, width = 1080, height = 1440): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) return canvas;
  const scale = width / 1080; ctx.scale(scale, scale); const w = 1080; const h = height / scale;
  ctx.fillStyle = '#FFFBF0'; ctx.fillRect(0, 0, w, h);
  const dark = '#3D2B1F', red = '#B5451B', green = '#174F43', yellow = '#F5C842', muted = '#8A7761';
  if (template === 'scoreboard') return renderScoreboard(canvas, result, width, height);
  if (template === 'calendar') return renderCalendar(canvas, result, width, height);
  if (template === 'table') return renderTable(canvas, result, width, height);

  ctx.fillStyle = '#F0E4CC'; ctx.fillRect(42, 56, w - 84, h - 112);
  ctx.strokeStyle = '#D6B47A'; ctx.lineWidth = 3; roundRect(ctx, 42, 56, w - 84, h - 112, 24); ctx.stroke();
  ctx.setLineDash([8, 12]); ctx.beginPath(); ctx.moveTo(820, 78); ctx.lineTo(820, h - 78); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = green; ctx.fillRect(42, 56, 18, h - 112);
  font(ctx, 700, 24); ctx.fillStyle = muted; ctx.fillText('PINGPONG CALENDAR', 88, 108);
  font(ctx, 900, 50); ctx.fillStyle = dark; ctx.fillText('乒乓历', 88, 170);
  font(ctx, 600, 22); ctx.fillStyle = muted; ctx.fillText('ENTRY DAY / DATE RELATION', 90, 208);
  font(ctx, 700, 24); ctx.fillStyle = red; ctx.fillText('乒乓历', 880, 108);
  font(ctx, 900, 30); ctx.fillStyle = dark; ctx.fillText('入坑第', 92, 310);
  font(ctx, 900, 210); ctx.fillStyle = red; ctx.fillText(String(result.days), 88, 520);
  font(ctx, 900, 54); ctx.fillStyle = dark; ctx.fillText('天', 530, 510);
  font(ctx, 900, 44); ctx.fillStyle = dark; ctx.fillText(result.title, 92, 620);
  font(ctx, 600, 25); ctx.fillStyle = muted; ctx.fillText(result.subtitle, 94, 665);
  ctx.strokeStyle = '#C9AE7F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(92, 712); ctx.lineTo(760, 712); ctx.stroke();
  font(ctx, 700, 24); ctx.fillStyle = dark; ctx.fillText('入坑事件', 92, 770);
  font(ctx, 600, 28); ctx.fillText(result.eventTitle.slice(0, 24), 92, 818);
  font(ctx, 600, 23); ctx.fillStyle = muted; ctx.fillText(displayDate(result.startDate), 92, 862);
  font(ctx, 700, 23); ctx.fillStyle = dark; ctx.fillText(`${focusLabels[result.focus]} · 见证 ${result.total} 个重要冠军`, 92, 950);
  font(ctx, 600, 21); ctx.fillStyle = muted; ctx.fillText(`混双 ${result.mixed}  ·  单打 ${result.singles}  ·  团体 ${result.team}`, 92, 990);
  ctx.fillStyle = yellow; ctx.beginPath(); ctx.arc(946, 960, 52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(946, 960, 15, 0, Math.PI * 2); ctx.fill();
  font(ctx, 700, 22); ctx.fillStyle = muted; ctx.fillText('乒乓历 · 日期记录', 92, h - 106);
  if (result.nickname) { ctx.textAlign = 'right'; ctx.fillText(result.nickname, 988, h - 106); ctx.textAlign = 'left'; }
  return canvas;
}

function renderScoreboard(canvas: HTMLCanvasElement, result: CardResult, width: number, height: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!; const s = width / 1080; ctx.save(); ctx.scale(s, s); const h = height / s;
  ctx.fillStyle = '#101B1A'; ctx.fillRect(0, 0, 1080, h);
  ctx.strokeStyle = '#D5A632'; ctx.lineWidth = 4; roundRect(ctx, 40, 40, 1000, h - 80, 24); ctx.stroke();
  font(ctx, 700, 26); ctx.fillStyle = '#F5C842'; ctx.fillText('PINGPONG / DATE SCOREBOARD', 80, 110);
  font(ctx, 900, 190); ctx.fillStyle = '#F5C842'; ctx.fillText(String(result.days), 80, 390);
  font(ctx, 900, 48); ctx.fillStyle = '#F5C842'; ctx.fillText('DAYS', 90, 452);
  font(ctx, 800, 44); ctx.fillStyle = '#FFFFFF'; ctx.fillText(result.title, 86, 560);
  ctx.strokeStyle = '#B5451B'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(90, 620); ctx.lineTo(990, 620); ctx.stroke();
  font(ctx, 700, 30); ctx.fillStyle = '#FFFFFF'; ctx.fillText(`${focusLabels[result.focus]}  /  ${result.eventTitle.slice(0, 20)}`, 90, 710);
  font(ctx, 600, 28); ctx.fillStyle = '#B6C5C0'; ctx.fillText(`MIXED ${result.mixed}    SINGLES ${result.singles}    TEAM ${result.team}`, 90, 780);
  font(ctx, 600, 24); ctx.fillStyle = '#F5C842'; ctx.fillText(`${displayDate(result.startDate)}  ·  乒乓历`, 90, h - 100); ctx.restore(); return canvas;
}

function renderCalendar(canvas: HTMLCanvasElement, result: CardResult, width: number, height: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!; const s = width / 1080; ctx.save(); ctx.scale(s, s); const h = height / s;
  ctx.fillStyle = '#F7F0DE'; ctx.fillRect(0, 0, 1080, h); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(68, 96, 944, h - 180);
  ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 4; ctx.strokeRect(68, 96, 944, h - 180);
  font(ctx, 900, 38); ctx.fillStyle = '#B5451B'; ctx.fillText('MY PINGPONG DAY', 110, 170);
  font(ctx, 900, 230); ctx.fillStyle = '#3D2B1F'; ctx.fillText(String(result.days), 100, 480);
  font(ctx, 800, 44); ctx.fillText('天', 720, 470);
  font(ctx, 900, 46); ctx.fillStyle = '#B5451B'; ctx.fillText(result.title, 110, 610);
  font(ctx, 600, 28); ctx.fillStyle = '#7B6958'; ctx.fillText(result.eventTitle.slice(0, 22), 110, 690); ctx.fillText(displayDate(result.startDate), 110, 740);
  ctx.strokeStyle = '#F5C842'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(110, 830); ctx.lineTo(890, 830); ctx.stroke();
  font(ctx, 700, 28); ctx.fillStyle = '#3D2B1F'; ctx.fillText(`见证 ${result.total} 个重要冠军`, 110, 900); ctx.restore(); return canvas;
}

function renderTable(canvas: HTMLCanvasElement, result: CardResult, width: number, height: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!; const s = width / 1080; ctx.save(); ctx.scale(s, s); const h = height / s;
  ctx.fillStyle = '#DDEFF1'; ctx.fillRect(0, 0, 1080, h); ctx.fillStyle = '#126579'; ctx.fillRect(60, 80, 960, h - 160);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(540, 80, 7, h - 160);
  font(ctx, 700, 27); ctx.fillStyle = '#DDEFF1'; ctx.fillText('入坑那天', 110, 160); ctx.fillText('今天', 720, 160);
  font(ctx, 900, 160); ctx.fillStyle = '#FFFFFF'; ctx.fillText(displayDate(result.startDate).slice(5).replace('.', '/'), 90, 390); ctx.fillText(String(result.days), 650, 390);
  font(ctx, 900, 34); ctx.fillText('START', 110, 460); ctx.fillText('DAYS', 730, 460);
  font(ctx, 800, 42); ctx.fillStyle = '#F5C842'; ctx.fillText(result.title, 110, 620);
  font(ctx, 600, 28); ctx.fillStyle = '#DDEFF1'; ctx.fillText(result.eventTitle.slice(0, 22), 110, 700); ctx.fillText(`乒乓历 · ${focusLabels[result.focus]}`, 110, 770); ctx.restore(); return canvas;
}

