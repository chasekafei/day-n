import { type Focus, type TemplateId, displayDate, focusLabels, PRODUCT_NAME } from './domain.ts';

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
  profileNickname: string;
  region: string;
};

const ARTWORK_PATHS: Record<Exclude<TemplateId, 'badge'>, string> = {
  ticket: './artwork/ticket-base-01.png',
  scoreboard: './artwork/scoreboard-base-01.png',
  table: './artwork/table-base-v3-01.png',
};

const BADGE_ARTWORK: Record<Focus, string> = {
  'wang-chuqin': './artwork/badge-wang.png',
  'sun-yingsha': './artwork/badge-sun.png',
  shatou: './artwork/badge-shatou.png',
  custom: './artwork/badge-shatou.png',
};

const BADGE_SLOTS = {
  name: { x: 588, y: 570, size: 34, width: 270 },
  region: { x: 588, y: 664, size: 34, width: 270 },
  date: { x: 588, y: 748, size: 28, width: 250 },
  days: { right: 792, y: 920, size: 112, width: 220 },
};

function font(ctx: CanvasRenderingContext2D, weight: number, size: number): void {
  ctx.font = `${weight} ${size}px Arial, "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function focusName(result: CardResult): string {
  return result.focus === 'custom' && result.nickname.trim() ? result.nickname.trim() : focusLabels[result.focus];
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, size: number, weight = 600): string {
  font(ctx, weight, size);
  if (ctx.measureText(value).width <= maxWidth) return value;
  let output = value;
  while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) output = output.slice(0, -1);
  return `${output}…`;
}

function drawText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, maxWidth: number, weight = 600): void {
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitText(ctx, value, maxWidth, size, weight), x, y);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`卡片底图加载失败：${src}`));
    image.src = src;
  });
}

function fittedSize(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, size: number, weight: number): number {
  let current = size;
  while (current > 18) {
    font(ctx, weight, current);
    if (ctx.measureText(value).width <= maxWidth) return current;
    current -= 2;
  }
  return current;
}

function drawFallback(ctx: CanvasRenderingContext2D, template: TemplateId, width: number, height: number): void {
  const colors: Record<TemplateId, [string, string]> = {
    ticket: ['#f1e4cc', '#174f43'], scoreboard: ['#0c211c', '#f5c842'], badge: ['#5c0f2e', '#f3d6aa'], table: ['#0d8793', '#f5c842'],
  };
  const [background, accent] = colors[template];
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent; ctx.lineWidth = Math.max(3, width / 260); ctx.strokeRect(40, 40, width - 80, height - 80);
}

function renderTicket(ctx: CanvasRenderingContext2D, result: CardResult): void {
  const dark = '#3d2b1f', green = '#174f43', red = '#b5451b', muted = '#786a5a';
  drawText(ctx, PRODUCT_NAME, 88, 116, 24, green, 430, 800);
  drawText(ctx, focusName(result), 760, 116, 23, green, 230, 700);
  drawText(ctx, result.eventTitle, 90, 370, 25, muted, 720, 600);
  drawText(ctx, String(result.days), 88, 650, 190, red, 450, 900);
  drawText(ctx, '天', 500, 642, 54, dark, 90, 900);
  drawText(ctx, result.title, 90, 790, 48, dark, 760, 900);
  drawText(ctx, result.subtitle, 94, 840, 25, muted, 740, 600);
  drawText(ctx, `入坑日 ${displayDate(result.startDate)}`, 92, 1085, 24, dark, 350, 700);
  drawText(ctx, `${focusName(result)} · 见证 ${result.total} 个重要冠军`, 92, 1140, 24, dark, 760, 700);
  drawText(ctx, `混双 ${result.mixed}  ·  单打 ${result.singles}  ·  团体 ${result.team}`, 92, 1330, 22, muted, 760, 600);
  drawText(ctx, '日期记录', 92, 1380, 20, muted, 300, 700);
}

function renderScoreboard(ctx: CanvasRenderingContext2D, result: CardResult): void {
  const white = '#fffdf4', yellow = '#f5f000', muted = '#b9d0c5';
  drawText(ctx, PRODUCT_NAME, 82, 126, 24, yellow, 500, 800);
  drawText(ctx, result.eventTitle, 84, 430, 25, muted, 820, 600);
  drawText(ctx, String(result.days), 82, 730, 190, yellow, 500, 900);
  drawText(ctx, 'DAYS', 90, 790, 32, yellow, 180, 800);
  drawText(ctx, result.title, 86, 920, 48, white, 850, 900);
  drawText(ctx, result.subtitle, 90, 970, 25, muted, 820, 600);
  drawText(ctx, `${focusName(result)}  ·  ${displayDate(result.startDate)}`, 90, 1250, 27, white, 820, 700);
  drawText(ctx, `MIXED ${result.mixed}    SINGLES ${result.singles}    TEAM ${result.team}`, 90, 1320, 22, yellow, 820, 700);
  drawText(ctx, 'ENTRY SCOREBOARD', 90, 1380, 20, muted, 400, 700);
}

function drawBadgeField(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, width: number, scale: number): void {
  const text = value.trim();
  if (!text) return;
  fittedSize(ctx, text, width * scale, size * scale, 800);
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x * scale, y * scale);
}

async function renderBadge(result: CardResult): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const artwork = await loadImage(BADGE_ARTWORK[result.focus]);
  canvas.width = artwork.naturalWidth;
  canvas.height = artwork.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(artwork, 0, 0);
  const scale = artwork.naturalWidth / 1157;
  drawBadgeField(ctx, result.profileNickname, BADGE_SLOTS.name.x, BADGE_SLOTS.name.y, BADGE_SLOTS.name.size, BADGE_SLOTS.name.width, scale);
  drawBadgeField(ctx, result.region, BADGE_SLOTS.region.x, BADGE_SLOTS.region.y, BADGE_SLOTS.region.size, BADGE_SLOTS.region.width, scale);
  drawBadgeField(ctx, displayDate(result.startDate), BADGE_SLOTS.date.x, BADGE_SLOTS.date.y, BADGE_SLOTS.date.size, BADGE_SLOTS.date.width, scale);
  const days = String(result.days);
  const daysSize = fittedSize(ctx, days, BADGE_SLOTS.days.width * scale, BADGE_SLOTS.days.size * scale, 900);
  ctx.fillStyle = '#bf121c';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  font(ctx, 900, daysSize);
  ctx.fillText(days, BADGE_SLOTS.days.right * scale, BADGE_SLOTS.days.y * scale);
  return canvas;
}

function renderTable(ctx: CanvasRenderingContext2D, result: CardResult): void {
  const white = '#f7ffff', yellow = '#ffd12a', dark = '#073b45';
  ctx.fillStyle = dark; ctx.globalAlpha = 0.18; ctx.fillRect(70, 120, 930, 510); ctx.globalAlpha = 1;
  drawText(ctx, PRODUCT_NAME, 88, 150, 26, white, 520, 800);
  drawText(ctx, focusName(result), 760, 150, 24, yellow, 230, 700);
  drawText(ctx, String(result.days), 88, 390, 180, white, 450, 900);
  drawText(ctx, '天', 480, 382, 54, yellow, 90, 900);
  drawText(ctx, result.title, 92, 500, 46, yellow, 820, 900);
  drawText(ctx, result.subtitle, 96, 550, 24, white, 820, 600);
  drawText(ctx, result.eventTitle, 94, 1210, 25, white, 820, 600);
  drawText(ctx, `入坑日 ${displayDate(result.startDate)}`, 94, 1280, 25, yellow, 400, 700);
  drawText(ctx, `${focusName(result)} · 日期记录`, 94, 1360, 22, white, 700, 700);
}

export async function renderCard(result: CardResult, template: TemplateId, width = 1080, height = 1440): Promise<HTMLCanvasElement> {
  if (template === 'badge') return renderBadge(result);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) return canvas;
  try {
    const artwork = await loadImage(ARTWORK_PATHS[template]);
    ctx.drawImage(artwork, 0, 0, width, height);
  } catch {
    drawFallback(ctx, template, width, height);
  }
  if (template === 'ticket') renderTicket(ctx, result);
  else if (template === 'scoreboard') renderScoreboard(ctx, result);
  else renderTable(ctx, result);
  return canvas;
}
