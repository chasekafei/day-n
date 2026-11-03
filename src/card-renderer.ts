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
};

const ARTWORK_PATHS: Record<TemplateId, string> = {
  ticket: './artwork/ticket-base-01.jpg',
  scoreboard: './artwork/scoreboard-base-01.jpg',
  badge: './artwork/badge-base-01.png',
  table: './artwork/table-base-v3-01.jpg',
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

function loadArtwork(template: TemplateId): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`卡片底图加载失败：${template}`));
    image.src = ARTWORK_PATHS[template];
  });
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

function renderBadge(ctx: CanvasRenderingContext2D, result: CardResult): void {
  const cream = '#f7e6ca', gold = '#f1c88e', muted = '#f5d9ba', burgundy = '#5c0f2e';
  ctx.fillStyle = 'rgba(18, 3, 12, .16)'; ctx.fillRect(92, 330, 296, 430);
  ctx.fillStyle = 'rgba(247, 230, 202, .92)'; ctx.fillRect(112, 350, 256, 390);
  ctx.fillStyle = burgundy; ctx.beginPath(); ctx.arc(240, 490, 68, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(240, 467, 30, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(200, 515, 80, 100);
  drawText(ctx, PRODUCT_NAME, 100, 175, 26, cream, 500, 800);
  drawText(ctx, `距离我成为${focusName(result)}的球迷已经`, 438, 395, 26, cream, 500, 700);
  drawText(ctx, `${result.days} 天了`, 438, 500, 104, gold, 480, 900);
  drawText(ctx, result.title, 438, 555, 30, cream, 500, 800);
  drawText(ctx, result.subtitle, 438, 600, 22, muted, 500, 600);
  drawText(ctx, '昵称 / NICKNAME', 438, 700, 18, muted, 500, 700);
  drawText(ctx, result.profileNickname || 'MY ENTRY', 438, 740, 28, cream, 500, 800);
  drawText(ctx, '入坑事件', 438, 875, 18, muted, 500, 700);
  drawText(ctx, result.eventTitle, 438, 920, 24, cream, 500, 700);
  drawText(ctx, `入坑日 ${displayDate(result.startDate)}`, 438, 970, 22, muted, 500, 600);
  drawText(ctx, `NO. ${result.focus === 'wang-chuqin' ? '20000511' : result.focus === 'sun-yingsha' ? '20001104' : result.focus === 'shatou' ? '20005114' : 'CUSTOM'}`, 100, 1250, 32, cream, 600, 900);
  drawText(ctx, `${focusName(result)} · ${PRODUCT_NAME}`, 100, 1340, 21, muted, 700, 700);
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
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) return canvas;
  try {
    const artwork = await loadArtwork(template);
    ctx.drawImage(artwork, 0, 0, width, height);
  } catch {
    drawFallback(ctx, template, width, height);
  }
  if (template === 'ticket') renderTicket(ctx, result);
  else if (template === 'scoreboard') renderScoreboard(ctx, result);
  else if (template === 'badge') renderBadge(ctx, result);
  else renderTable(ctx, result);
  return canvas;
}
