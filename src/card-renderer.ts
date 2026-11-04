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

const ARTWORK_PATHS: Record<Exclude<TemplateId, 'badge' | 'scoreboard' | 'ticket' | 'birthday'>, string> = {
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
    birthday: ['#f7c5de', '#e23b8c'], ticket: ['#f1e4cc', '#174f43'], scoreboard: ['#0c211c', '#f5c842'], badge: ['#5c0f2e', '#f3d6aa'], table: ['#0d8793', '#f5c842'],
  };
  const [background, accent] = colors[template];
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent; ctx.lineWidth = Math.max(3, width / 260); ctx.strokeRect(40, 40, width - 80, height - 80);
}

const TICKET_ARTWORK = './artwork/ticket-card.png';
const TICKET_WIDTH = 1086;
const TICKET_ANGLE = -6.9 * Math.PI / 180;
const TICKET_SLOTS = {
  name: { x: 354, y: 794, size: 48, width: 400 },
  date: { x: 368, y: 934, size: 46, width: 250 },
  days: { x: 725, y: 891, size: 46, width: 160 },
  unit: { size: 30, gap: 10 },
  event: { x: 385, y: 1074, size: 32, width: 450 },
};

function drawTicketLine(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, width: number, scale: number, weight = 800): void {
  const text = value.trim();
  if (!text) return;
  ctx.save();
  ctx.translate(x * scale, y * scale);
  ctx.rotate(TICKET_ANGLE);
  ctx.fillStyle = '#141414';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let drawSize = size * scale;
  font(ctx, weight, drawSize);
  const minSize = Math.max(16, 18 * scale);
  while (drawSize > minSize && ctx.measureText(text).width > width * scale) {
    drawSize -= 2;
    font(ctx, weight, drawSize);
  }
  ctx.fillText(fitText(ctx, text, width * scale, drawSize, weight), 0, 0);
  ctx.restore();
}

function drawTicketDays(ctx: CanvasRenderingContext2D, days: number, scale: number): void {
  const text = String(Math.max(0, days));
  ctx.save();
  ctx.translate(TICKET_SLOTS.days.x * scale, TICKET_SLOTS.days.y * scale);
  ctx.rotate(TICKET_ANGLE);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#141414';
  let size = TICKET_SLOTS.days.size * scale;
  font(ctx, 800, size);
  const minSize = Math.max(16, 18 * scale);
  while (size > minSize && ctx.measureText(text).width > TICKET_SLOTS.days.width * scale) {
    size -= 2;
    font(ctx, 800, size);
  }
  ctx.fillText(text, 0, 0);
  const numberWidth = ctx.measureText(text).width;
  const unitScale = size / (TICKET_SLOTS.days.size * scale);
  ctx.fillStyle = '#59536e';
  font(ctx, 700, TICKET_SLOTS.unit.size * scale * unitScale);
  ctx.fillText('天', numberWidth + TICKET_SLOTS.unit.gap * scale, 0);
  ctx.restore();
}

async function renderTicket(result: CardResult): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const artwork = await loadImage(TICKET_ARTWORK);
  canvas.width = artwork.naturalWidth;
  canvas.height = artwork.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(artwork, 0, 0);
  const scale = artwork.naturalWidth / TICKET_WIDTH;
  drawTicketLine(ctx, result.profileNickname, TICKET_SLOTS.name.x, TICKET_SLOTS.name.y, TICKET_SLOTS.name.size, TICKET_SLOTS.name.width, scale);
  drawTicketLine(ctx, result.startDate, TICKET_SLOTS.date.x, TICKET_SLOTS.date.y, TICKET_SLOTS.date.size, TICKET_SLOTS.date.width, scale);
  drawTicketDays(ctx, result.days, scale);
  drawTicketLine(ctx, result.eventTitle, TICKET_SLOTS.event.x, TICKET_SLOTS.event.y, TICKET_SLOTS.event.size, TICKET_SLOTS.event.width, scale);
  return canvas;
}

const SCOREBOARD_ARTWORK = './artwork/scoreboard-card.png';
const SCOREBOARD_WIDTH = 1254;
const SCOREBOARD_DIGITS = {
  centers: [164, 308, 445, 581],
  // 蓝格视觉中心。按笔画外框居中，而不是 textBaseline=middle。
  // 小红书里没有 Arial Black，middle 基线会把数字往下拉出牌面。
  y: 776,
  size: 168,
  stretch: 1.44,
  maxWidth: 108,
  maxHeight: 196,
};
const SCOREBOARD_DIGIT_FONT = '"Arial Black", Impact, Arial, sans-serif';

type DigitStamp = {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  advance: number;
  origin: number;
};

function stampDigit(char: string, size: number): DigitStamp | null {
  const origin = Math.ceil(size);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size * 3);
  canvas.height = Math.ceil(size * 3);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.font = `${size}px ${SCOREBOARD_DIGIT_FONT}`;
  ctx.fillStyle = '#f5f2f6';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(char, origin, origin + size);
  const advance = ctx.measureText(char).width;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { canvas, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, advance, origin };
}

function paintDigit(ctx: CanvasRenderingContext2D, stamp: DigitStamp, cx: number, cy: number): void {
  const destH = stamp.h * SCOREBOARD_DIGITS.stretch;
  const destX = cx - stamp.advance / 2 + (stamp.x - stamp.origin);
  ctx.drawImage(stamp.canvas, stamp.x, stamp.y, stamp.w, stamp.h, destX, cy - destH / 2, stamp.w, destH);
}
const SCOREBOARD_SLOTS = {
  name: { x: 795, y: 746, size: 36, width: 270 },
  region: { x: 788, y: 834, size: 36, width: 270 },
  date: { x: 780, y: 922, size: 38, width: 240 },
};

function drawScoreboardField(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, width: number, scale: number): void {
  const text = value.trim();
  if (!text) return;
  fittedSize(ctx, text, width * scale, size * scale, 800);
  ctx.fillStyle = '#12182b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x * scale, y * scale);
}

function drawScoreboardDays(ctx: CanvasRenderingContext2D, days: number, scale: number): void {
  const text = String(Math.max(0, days));
  const padded = text.length <= 4 ? text.padStart(4, '0') : text;
  if (padded.length === 4) {
    const measure = document.createElement('canvas').getContext('2d');
    if (!measure) return;
    let size = SCOREBOARD_DIGITS.size * scale;
    measure.font = `${size}px ${SCOREBOARD_DIGIT_FONT}`;
    const widest = Math.max(...padded.split('').map(char => measure.measureText(char).width));
    if (widest > SCOREBOARD_DIGITS.maxWidth * scale) size *= (SCOREBOARD_DIGITS.maxWidth * scale) / widest;
    let stamps = padded.split('').map(char => stampDigit(char, size));
    const tallest = Math.max(...stamps.map(stamp => stamp ? stamp.h * SCOREBOARD_DIGITS.stretch : 0));
    const limit = SCOREBOARD_DIGITS.maxHeight * scale;
    if (tallest > limit) {
      size *= limit / tallest;
      stamps = padded.split('').map(char => stampDigit(char, size));
    }
    stamps.forEach((stamp, index) => {
      if (!stamp) return;
      paintDigit(ctx, stamp, SCOREBOARD_DIGITS.centers[index] * scale, SCOREBOARD_DIGITS.y * scale);
    });
    return;
  }
  const left = SCOREBOARD_DIGITS.centers[0] * scale;
  const right = SCOREBOARD_DIGITS.centers[3] * scale;
  const size = fittedSize(ctx, padded, right - left, 120 * scale, 900);
  const stamp = stampDigit(padded, size);
  if (!stamp) return;
  paintDigit(ctx, stamp, (left + right) / 2, SCOREBOARD_DIGITS.y * scale);
}

async function renderScoreboard(result: CardResult): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const artwork = await loadImage(SCOREBOARD_ARTWORK);
  canvas.width = artwork.naturalWidth;
  canvas.height = artwork.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(artwork, 0, 0);
  const scale = artwork.naturalWidth / SCOREBOARD_WIDTH;
  drawScoreboardDays(ctx, result.days, scale);
  drawScoreboardField(ctx, result.profileNickname, SCOREBOARD_SLOTS.name.x, SCOREBOARD_SLOTS.name.y, SCOREBOARD_SLOTS.name.size, SCOREBOARD_SLOTS.name.width, scale);
  drawScoreboardField(ctx, result.region, SCOREBOARD_SLOTS.region.x, SCOREBOARD_SLOTS.region.y, SCOREBOARD_SLOTS.region.size, SCOREBOARD_SLOTS.region.width, scale);
  drawScoreboardField(ctx, displayDate(result.startDate), SCOREBOARD_SLOTS.date.x, SCOREBOARD_SLOTS.date.y, SCOREBOARD_SLOTS.date.size, SCOREBOARD_SLOTS.date.width, scale);
  return canvas;
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

const BIRTHDAY_ARTWORK = './artwork/birthday-card.png';
const BIRTHDAY_WIDTH = 1169;
const BIRTHDAY_ANGLE = -6.8 * Math.PI / 180;
const BIRTHDAY_INK = '#100e24';
const BIRTHDAY_PINK = '#f12e8e';
const BIRTHDAY_MARK = '#ffe56a';
const BIRTHDAY_SLOTS = {
  name: { x: 330, y: 574, size: 50, width: 230, stroke: 14 },
  event: { x: 338, y: 658, size: 42, width: 400, stroke: 14 },
  date: { x: 367, y: 756, size: 36, width: 330, stroke: 12 },
  days: { x: 545, y: 854, size: 76, width: 220 },
};

function birthdayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[1])} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, height / 2, Math.max(0, width) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  ctx.fill();
}

function prepareBirthdayText(ctx: CanvasRenderingContext2D, value: string, size: number, width: number, scale: number): { text: string; size: number; width: number } {
  const text = value.trim();
  let drawSize = size * scale;
  const minSize = Math.max(16, 18 * scale);
  font(ctx, 900, drawSize);
  while (drawSize > minSize && ctx.measureText(text).width > width * scale) {
    drawSize -= 2;
    font(ctx, 900, drawSize);
  }
  const shown = fitText(ctx, text, width * scale, drawSize, 900);
  return { text: shown, size: drawSize, width: ctx.measureText(shown).width };
}

function drawBirthdayText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, width: number, scale: number, color: string, stroke = 0, align: CanvasTextAlign = 'left'): number {
  const text = value.trim();
  if (!text) return 0;
  const prepared = prepareBirthdayText(ctx, text, size, width, scale);
  ctx.save();
  ctx.translate(x * scale, y * scale);
  ctx.rotate(BIRTHDAY_ANGLE);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  font(ctx, 900, prepared.size);
  if (stroke > 0) {
    ctx.lineWidth = stroke * scale;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(prepared.text, 0, 0);
  }
  ctx.fillStyle = color;
  ctx.fillText(prepared.text, 0, 0);
  ctx.restore();
  return prepared.width;
}

async function renderBirthday(result: CardResult): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const artwork = await loadImage(BIRTHDAY_ARTWORK);
  canvas.width = artwork.naturalWidth;
  canvas.height = artwork.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(artwork, 0, 0);
  const scale = artwork.naturalWidth / BIRTHDAY_WIDTH;
  drawBirthdayText(ctx, result.profileNickname, BIRTHDAY_SLOTS.name.x, BIRTHDAY_SLOTS.name.y, BIRTHDAY_SLOTS.name.size, BIRTHDAY_SLOTS.name.width, scale, BIRTHDAY_INK, BIRTHDAY_SLOTS.name.stroke);
  const event = result.eventTitle.trim();
  if (event) {
    const prepared = prepareBirthdayText(ctx, event, BIRTHDAY_SLOTS.event.size, BIRTHDAY_SLOTS.event.width, scale);
    ctx.save();
    ctx.translate(BIRTHDAY_SLOTS.event.x * scale, BIRTHDAY_SLOTS.event.y * scale);
    ctx.rotate(BIRTHDAY_ANGLE);
    ctx.fillStyle = BIRTHDAY_MARK;
    fillRoundRect(ctx, -5 * scale, -4 * scale, prepared.width + 28 * scale, 20 * scale, 8 * scale);
    ctx.restore();
  }
  drawBirthdayText(ctx, event, BIRTHDAY_SLOTS.event.x, BIRTHDAY_SLOTS.event.y, BIRTHDAY_SLOTS.event.size, BIRTHDAY_SLOTS.event.width, scale, BIRTHDAY_INK, BIRTHDAY_SLOTS.event.stroke);
  drawBirthdayText(ctx, birthdayDate(result.startDate), BIRTHDAY_SLOTS.date.x, BIRTHDAY_SLOTS.date.y, BIRTHDAY_SLOTS.date.size, BIRTHDAY_SLOTS.date.width, scale, BIRTHDAY_INK, BIRTHDAY_SLOTS.date.stroke);
  drawBirthdayText(ctx, String(Math.max(0, result.days)), BIRTHDAY_SLOTS.days.x, BIRTHDAY_SLOTS.days.y, BIRTHDAY_SLOTS.days.size, BIRTHDAY_SLOTS.days.width, scale, BIRTHDAY_PINK, 0, 'right');
  return canvas;
}

export async function renderCard(result: CardResult, template: TemplateId, width = 1080, height = 1440): Promise<HTMLCanvasElement> {
  if (template === 'birthday') return renderBirthday(result);
  if (template === 'badge') return renderBadge(result);
  if (template === 'scoreboard') return renderScoreboard(result);
  if (template === 'ticket') return renderTicket(result);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) return canvas;
  try {
    const artwork = await loadImage(ARTWORK_PATHS[template]);
    ctx.drawImage(artwork, 0, 0, width, height);
  } catch {
    drawFallback(ctx, template, width, height);
  }
  renderTable(ctx, result);
  return canvas;
}
