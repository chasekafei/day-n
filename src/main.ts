import './styles.css';
import './paper.css';
import { EVENT_DATA } from './data.ts';
import { dateDifference, displayDate, eventsForFocus, focusLabels, PRODUCT_NAME, statsSince, titleForDays, todayString, typesForFocus, yearsForFocus, daysSince, shortEventTitle, type Focus, type TemplateId, type EventItem } from './domain.ts';
import { renderCard, type CardResult } from './card-renderer.ts';
import { writeRecord, type CalendarRecord } from './records.ts';
import { saveImage, shareImage, isNative } from './platform.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const today = todayString();
let view: 'home' | 'events' | 'result' | 'relations' | 'about' = 'home';
let focus: Focus = 'shatou';
let selected: EventItem | null = null;
let result: CardResult | null = null;
let template: TemplateId = 'ticket';
let query = '';
let year = 'all';
let type = 'all';
let customDate = today;
let customPerson = '';
let userNickname = '';
let userRegion = '';
let entryMethod: 'event' | 'date' = 'event';
let relationA: EventItem = EVENT_DATA.items.find(item => item.date === '2024-07-30') || EVENT_DATA.items[0];
let relationB: EventItem = EVENT_DATA.items.find(item => item.date === '2025-05-24') || EVENT_DATA.items[1];
let relationStartKind: 'event' | 'date' = 'event';
let relationEndKind: 'event' | 'date' = 'event';
let relationDateA: string = relationA.date;
let relationDateB: string = relationB.date;

const PRESET_INTERVALS = [
  { a: 'A096', b: 'A168', label: '114 天', note: '从澳门世界杯，到巴黎复盘' },
  { a: 'A075', b: 'A084', label: '511 天', note: '从休斯敦，到澳门冠军赛' },
  { a: 'A070', b: 'A081', label: '1104 天', note: '两个冠军日之间的日期巧合' },
  { a: 'A019', b: 'A042', label: '1105 天', note: '从第一个世界冠军，到成都卫冕' },
  { a: 'A079', b: 'A082', label: '5 个月 11 天', note: '团体冠军，到新加坡女单冠军' },
  { a: 'A032', b: 'A096', label: '4 个月 11 天', note: '混团世界杯，到澳门世界杯' },
  { a: 'A088', b: 'A163', label: '11 个月 4 天', note: '杭州亚运，到港澳行' },
  { a: 'A088', b: 'A164', label: '11 个月 5 天', note: '杭州亚运，到那句熟悉的话' },
];

const SPECIAL_NUMBERS = [114, 365, 511, 1000, 1104, 2000, 3650, 5114];

const escapeHTML = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

function toast(message: string): void {
  const element = document.querySelector<HTMLDivElement>('#toast');
  if (!element) return;
  element.textContent = message; element.classList.add('show');
  window.setTimeout(() => element.classList.remove('show'), 2600);
}

function selectedResult(startDate: string, eventTitle: string, approx = false): CardResult {
  const days = daysSince(startDate, today, true) || 1;
  const title = titleForDays(days);
  const stats = statsSince(startDate, today, focus);
  return { focus, startDate, eventTitle: approx ? `约 ${eventTitle}` : eventTitle, days, ...title, ...stats, nickname: focus === 'custom' ? customPerson : '', profileNickname: userNickname, region: userRegion };
}

function focusDisplayName(currentFocus: Focus, nickname = ''): string {
  return currentFocus === 'custom' && nickname.trim() ? nickname.trim() : focusLabels[currentFocus];
}

const SHARE_TEMPLATES: TemplateId[] = ['ticket', 'badge', 'scoreboard'];
const TEMPLATE_LABELS: Record<TemplateId, string> = { ticket: '票据', badge: '工作证', scoreboard: '记分牌', table: '球台' };

function canGenerateEntry(): boolean {
  const dateReady = /^\d{4}-\d{2}-\d{2}$/.test(customDate) && customDate <= today;
  if (focus === 'custom') return Boolean(customPerson.trim()) && dateReady;
  if (entryMethod === 'date') return dateReady;
  return Boolean(selected);
}

function arrowIcon(): string {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg>`;
}

function refreshGenerateReady(): void {
  app.querySelector('.entry-generate')?.classList.toggle('is-ready', canGenerateEntry());
}

function activeTemplate(): TemplateId {
  if (!SHARE_TEMPLATES.includes(template)) template = 'ticket';
  return template;
}

function syncCard(): void {
  if (!result) return;
  saveCurrent();
  void paintShareCard();
}

function entryGenerateButton(): string {
  return `<div class="entry-generate-wrap"><button class="entry-generate${canGenerateEntry() ? ' is-ready' : ''}" data-action="generate-entry"><span>生成入坑卡</span>${arrowIcon()}</button></div>`;
}

function entrySelector(page: 'home' | 'events', hideTabs = false): string {
  if (focus === 'custom') {
    return `<div class="custom-entry-panel"><p class="entry-panel-lead">写下你的入坑对象和日期，生成专属入坑卡。</p><label>入坑对象<input id="custom-person" value="${escapeHTML(customPerson)}" maxlength="24" placeholder="例如：我喜欢的运动员或组合"></label><label>入坑时间<input id="custom-date" type="date" value="${customDate}" max="${today}"></label></div>${entryGenerateButton()}`;
  }
  const list = eventsForFocus(focus, query, year, type);
  const years = yearsForFocus(focus).slice(0, 8);
  const types = typesForFocus(focus);
  const searchId = page === 'home' ? 'home-event-search' : 'event-search';
  const visibleList = page === 'home' ? list : list.slice(0, 60);
  const entryTabs = `<div class="entry-method-tabs"><button class="${entryMethod === 'event' ? 'active' : ''}" data-entry-method="event">通过事件选择日期</button><button class="${entryMethod === 'date' ? 'active' : ''}" data-entry-method="date">手动选择日期</button></div>`;
  const selectionNote = entryMethod === 'event' && !selected ? '<p class="entry-selection-hint">选择一个事件，就以这一天作为你的入坑时间。</p>' : '';
  const content = entryMethod === 'date'
    ? `<div class="manual-entry-panel"><label>入坑时间<input id="manual-date" type="date" value="${customDate}" max="${today}"></label><p>选定日期后，点击底部“生成”创建入坑卡。</p></div>`
    : `${selectionNote}<div class="home-search search-row"><input id="${searchId}" value="${escapeHTML(query)}" placeholder="搜索赛事、名场面或年份"></div><div class="filter-row"><button class="filter-chip ${year === 'all' ? 'active' : ''}" data-year="all">全部年份</button>${years.map(value => `<button class="filter-chip ${year === value ? 'active' : ''}" data-year="${value}">${value}</button>`).join('')}</div><div class="filter-row type-filters"><button class="filter-chip ${type === 'all' ? 'active' : ''}" data-type="all">全部类型</button>${types.map(value => `<button class="filter-chip ${type === value ? 'active' : ''}" data-type="${value}">${escapeHTML(value)}</button>`).join('')}</div><div class="library-note">${page === 'home' ? '全部事件库' : '事件库'} · 已收录 ${visibleList.length} 条可选事件 · 数据截至 ${EVENT_DATA.data_as_of}</div><div class="event-list ${page === 'events' ? 'large' : 'home-library'}">${visibleList.length ? visibleList.map(eventRow).join('') : '<div class="empty-state">没有找到匹配事件</div>'}</div>`;
  return `${hideTabs ? '' : entryTabs}${content}${entryGenerateButton()}`;
}

function saveCurrent(): void {
  if (!result) return;
  const record: CalendarRecord = { focus, startDate: result.startDate, startEventId: selected?.id || null, approx: result.eventTitle.startsWith('约 '), dayZero: false, template, nickname: result.nickname, profileNickname: result.profileNickname, region: result.region, eventTitle: result.eventTitle, days: result.days, lastOpen: today };
  writeRecord(record);
}

function usesPhotoCard(current: TemplateId = template): boolean {
  return current === 'badge' || current === 'scoreboard' || current === 'ticket';
}

function cardPreview(card: CardResult): string {
  if (usesPhotoCard()) return `<img id="share-card" class="share-card" alt="${({ ticket: '票据', scoreboard: '记分牌', badge: '球迷证' } as Record<string, string>)[template] || '分享卡'}">`;
  const artwork = `./artwork/${template === 'table' ? 'table-base-v3-01.png' : `${template}-base-01.png`}`;
  return `<div class="card-preview ${template} with-art" style="background-image:url('${artwork}')">
    <div class="preview-top"><span>${PRODUCT_NAME}</span><span>${escapeHTML(focusDisplayName(card.focus, card.nickname))}</span></div>
    <div class="preview-kicker">${escapeHTML(card.eventTitle)}</div>
    <div class="preview-days"><strong>${card.days}</strong><span>天</span></div>
    <div class="preview-title">${card.title}</div>
    <div class="preview-subtitle">${card.subtitle}</div>
    <div class="preview-rule"></div>
    <div class="preview-meta"><span>入坑日 ${displayDate(card.startDate)}</span><span>见证 ${card.total} 冠</span></div>
    <div class="preview-footer">混双 ${card.mixed} · 单打 ${card.singles} · 团体 ${card.team}</div>
  </div>`;
}

function shell(content: string, active: string, page = active): string {
  return `<main class="app-shell page-${page}"><header class="topbar"><button class="brand-button" data-action="home"><span class="brand-mark">日</span><span><b>${PRODUCT_NAME}</b><small>从这一场，开始热爱</small></span></button><button class="icon-button" data-action="about" aria-label="打开说明">?</button></header>${content}<nav class="bottom-nav"><button class="${active === 'home' ? 'active' : ''}" data-action="home"><span>⌂</span>首页</button><button class="${active === 'relations' ? 'active' : ''}" data-action="relations"><span>⌁</span>日期间隔</button><button class="${active === 'events' ? 'active' : ''}" data-action="events"><span>▤</span>事件库</button></nav></main>`;
}

function focusPicks(): string {
  return `<div class="focus-picks">${(Object.keys(focusLabels) as Focus[]).map(key => `<button class="focus-pick${focus === key ? ' on' : ''}" data-focus="${key}" aria-pressed="${focus === key}">${focusLabels[key]}</button>`).join('')}</div>`;
}

function methodTabs(): string {
  if (focus === 'custom') return '';
  return `<div class="method-tabs"><button class="method-tab${entryMethod === 'event' ? ' on' : ''}" data-entry-method="event">通过事件选择日期</button><button class="method-tab${entryMethod === 'date' ? ' on' : ''}" data-entry-method="date">手动选择日期</button></div>`;
}

function homeView(): string {
  const hits = `<div class="poster"><img class="poster-art" src="./artwork/paper/home-top.png" alt="入坑日第 N 天，从这一场，开始热爱"></div>`;
  return shell(`<section class="home-content poster-page">${hits}<div class="poster-body">${focusPicks()}${methodTabs()}${entrySelector('home', true)}</div></section>`, 'home');
}

function eventRow(item: EventItem): string {
  const picked = selected?.id === item.id;
  const mark = picked ? '<span class="entry-mark">从此入坑</span>' : '<span class="entry-choice">选择</span>';
  return `<button class="event-row${picked ? ' selected' : ''}" data-event="${item.id}" aria-pressed="${picked}"><span class="entry-radio" aria-hidden="true"></span><span class="event-copy"><b>${escapeHTML(shortEventTitle(item))}</b><time>${displayDate(item.date)}</time></span>${mark}</button>`;
}

function eventsView(): string {
  return shell(`<section class="events-content"><div class="page-heading"><button class="back-button" data-action="home" aria-label="返回">‹</button><div><h1>入坑日第 N 天</h1><p>从这一场，开始热爱</p></div></div><div class="focus-strip">${(Object.keys(focusLabels) as Focus[]).map(key => `<button class="${focus === key ? 'active' : ''}" data-focus="${key}">${focusLabels[key]}</button>`).join('')}</div>${entrySelector('events')}</section>`, 'events');
}

function cardFields(): string {
  if (!result) return '';
  const current = activeTemplate();
  const name = `<label>${current === 'ticket' ? '观赛人' : '姓名'}<input id="card-nickname" value="${escapeHTML(userNickname)}" maxlength="16" placeholder="例如：小王"></label>`;
  const date = `<label>入坑时间<input id="card-date" type="date" value="${result.startDate}" max="${today}"></label>`;
  const days = `<label>入坑天数<input id="card-days" type="number" min="1" max="9999" inputmode="numeric" value="${result.days}"></label>`;
  if (current === 'ticket') return `<div class="card-fields">${name.replace('<label>', '<label class="wide">')}${date}${days}<label class="wide">入坑节点<input id="card-event" value="${escapeHTML(result.eventTitle)}" maxlength="40"></label></div>`;
  return `<div class="card-fields">${name}<label>地区<input id="card-region" value="${escapeHTML(userRegion)}" maxlength="16" placeholder="例如：广东 广州"></label>${date}${days}</div>`;
}

function shareTabIcon(id: TemplateId): string {
  if (id === 'ticket') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.2A2.2 2.2 0 0 1 7.2 6h9.6A2.2 2.2 0 0 1 19 8.2v1.6a1.6 1.6 0 0 0 0 3.2v1.8A2.2 2.2 0 0 1 16.8 17H7.2A2.2 2.2 0 0 1 5 14.8v-1.8a1.6 1.6 0 0 0 0-3.2V8.2Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 10h6M9 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  if (id === 'badge') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 16h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="7" width="17" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
}

function resultView(): string {
  if (!result) return homeView();
  activeTemplate();
  const tabs = `<div class="share-tabs">${SHARE_TEMPLATES.map(id => `<button class="share-tab${template === id ? ' on' : ''}" data-template="${id}">${shareTabIcon(id)}<span>${TEMPLATE_LABELS[id]}</span></button>`).join('')}</div>`;
  const actions = `<div class="share-actions"><button data-action="save"><img src="./artwork/paper/action-save.png" alt="保存到相册"></button><button data-action="share"><img src="./artwork/paper/action-share.png" alt="发布图文"></button><button data-action="comment"><img src="./artwork/paper/action-comment.png" alt="带图评论"></button></div>`;
  return shell(`<section class="result-content"><div class="share-head"><img src="./artwork/paper/share-title.png" alt="入坑日分享图"><button class="share-back" data-action="home" aria-label="返回"></button></div>${tabs}<div class="card-stage">${cardPreview(result)}</div>${cardFields()}${actions}<p class="data-note">统计按${PRODUCT_NAME}收录的重大事件计算 · 数据截至 ${EVENT_DATA.data_as_of}</p></section>`, 'home', 'result');
}

function presetIntervalCard(preset: (typeof PRESET_INTERVALS)[number]): string {
  const left = EVENT_DATA.items.find(item => item.id === preset.a);
  const right = EVENT_DATA.items.find(item => item.id === preset.b);
  if (!left || !right) return '';
  return `<article class="interval-card"><div class="interval-card-head"><span>日期看板</span><strong>${preset.label}</strong></div><p>${preset.note}</p><div class="interval-event"><span class="interval-event-label">起点事件</span><time>${displayDate(left.date)}</time><b>${escapeHTML(shortEventTitle(left))}</b></div><div class="interval-event"><span class="interval-event-label">终点事件</span><time>${displayDate(right.date)}</time><b>${escapeHTML(shortEventTitle(right))}</b></div></article>`;
}

function intervalBoard(): string {
  return `<section class="interval-board"><div class="section-heading"><h2>日期间隔看板</h2><span>提前发现有趣的数字</span></div><div class="interval-grid">${PRESET_INTERVALS.map(presetIntervalCard).join('')}</div></section>`;
}

function relationEndpoint(side: 'start' | 'end', options: string): string {
  const kind = side === 'start' ? relationStartKind : relationEndKind;
  const eventLabel = side === 'start' ? '起点事件' : '终点事件';
  const dateLabel = side === 'start' ? '起点时间' : '终点时间';
  const control = kind === 'event'
    ? `<select id="relation-${side === 'start' ? 'a' : 'b'}">${options}</select>`
    : `<input id="relation-date-${side === 'start' ? 'a' : 'b'}" type="date" value="${side === 'start' ? relationDateA : relationDateB}" max="${today}">`;
  return `<div class="relation-field"><div class="relation-kind"><button class="${kind === 'event' ? 'on' : ''}" data-relation-side="${side}" data-relation-kind="event">${eventLabel}</button><button class="${kind === 'date' ? 'on' : ''}" data-relation-side="${side}" data-relation-kind="date">${dateLabel}</button></div>${control}</div>`;
}

function relationsView(): string {
  const startValue = relationStartKind === 'event' ? relationA.date : relationDateA;
  const endValue = relationEndKind === 'event' ? relationB.date : relationDateB;
  const difference = dateDifference(startValue, endValue);
  const special = difference === null ? [] : SPECIAL_NUMBERS.filter(number => number === difference);
  const options = EVENT_DATA.items.filter(item => item.selectable && item.date.length === 10).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 120);
  const optionHTML = options.map(value => `<option value="${value.id}">${displayDate(value.date)} · ${escapeHTML(shortEventTitle(value))}</option>`).join('');
  const form = `<div class="relation-form">${relationEndpoint('start', optionHTML)}${relationEndpoint('end', optionHTML)}</div>`;
  const hit = special.length ? `<p>命中特殊数字：${special.join(' / ')}</p>` : '';
  return shell(`<section class="relations-content"><div class="page-heading"><div><h1>日期间隔</h1></div></div><p class="page-lead">把两个重要瞬间放在一起，看看它们相隔多少天。</p>${form}<div class="relation-result"><span>相差</span><strong>${difference === null ? '—' : difference}</strong><b>天</b>${hit}</div><button class="primary-button" data-action="events">去事件库选择日期</button>${intervalBoard()}</section>`, 'relations');
}

function aboutView(): string {
  return shell(`<section class="about-content"><div class="page-heading"><div><h1>关于${PRODUCT_NAME}</h1></div></div><div class="about-block"><h2>记录日期，不定义喜欢。</h2><p>${PRODUCT_NAME}把赛事、入坑日和球迷自己的重要日期放在一起，帮你看见时间之间的距离。</p></div><div class="about-block"><h2>统计口径</h2><p>冠军和事件统计来自本工具收录的数据，不代表完整官方生涯统计。日期统一按北京时间自然日处理。</p></div><div class="about-block"><h2>数据截至</h2><p>${EVENT_DATA.data_as_of} · 事件库 ${EVENT_DATA.count} 条</p></div><button class="primary-button" data-action="home">回到首页</button></section>`, 'about');
}

function render(): void {
  app.innerHTML = view === 'home' ? homeView() : view === 'events' ? eventsView() : view === 'result' ? resultView() : view === 'relations' ? relationsView() : aboutView();
  bindEvents();
  void paintShareCard();
}

let paintToken = 0;
async function paintShareCard(): Promise<void> {
  const image = app.querySelector<HTMLImageElement>('#share-card');
  if (!image || !result || !usesPhotoCard()) return;
  const token = ++paintToken;
  const canvas = await renderCard(result, template);
  if (token !== paintToken || !image.isConnected) return;
  image.src = canvas.toDataURL('image/png');
}

function openResult(item: EventItem, approximate = false): void {
  selected = item; customDate = item.date; result = selectedResult(item.date, shortEventTitle(item), approximate); view = 'result'; saveCurrent(); render();
}

function openCustom(): void {
  const date = customDate <= today ? customDate : today;
  selected = null;
  const eventTitle = focus === 'custom' ? `${customPerson.trim()} 的入坑日` : '手动选择的入坑日';
  result = selectedResult(date, eventTitle);
  view = 'result'; saveCurrent(); render();
}

async function buildExport(): Promise<string> {
  if (!result) return '';
  return (await renderCard(result, template, 1080, 1440)).toDataURL('image/png');
}

async function doSave(): Promise<void> {
  try { await saveImage(await buildExport()); toast(isNative() ? '已保存到相册' : '图片已开始下载'); } catch (error) { toast(error instanceof Error ? error.message : '保存失败，请稍后重试'); }
}

async function doShare(kind: 'note' | 'comment'): Promise<void> {
  try { await shareImage(await buildExport(), kind, result ? { d: result.startDate, n: result.days, f: result.focus, t: template } : undefined); toast(kind === 'comment' ? '已打开评论编辑器' : '已打开发布页'); } catch (error) { toast(error instanceof Error ? error.message : '分享失败，请先保存图片'); }
}

function bindEvents(): void {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach(element => element.addEventListener('click', () => {
    const action = element.dataset.action;
    if (action === 'home') { view = 'home'; render(); }
    else if (action === 'events') { view = 'events'; render(); }
    else if (action === 'relations') { view = 'relations'; render(); }
    else if (action === 'about') { view = 'about'; render(); }
    else if (action === 'generate-entry') {
      if (focus === 'custom') {
        customPerson = app.querySelector<HTMLInputElement>('#custom-person')?.value.trim() || customPerson.trim();
        customDate = app.querySelector<HTMLInputElement>('#custom-date')?.value || customDate;
        if (!customPerson) toast('请先填写入坑对象');
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate) || customDate > today) toast('请选择今天或更早的日期');
        else openCustom();
      } else if (entryMethod === 'event') {
        if (selected) openResult(selected);
        else toast('请先选择一个事件作为入坑时间');
      } else {
        customDate = app.querySelector<HTMLInputElement>('#manual-date')?.value || customDate;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate) || customDate > today) toast('请选择今天或更早的日期');
        else openCustom();
      }
    }
    else if (action === 'save') void doSave();
    else if (action === 'share') void doShare('note');
    else if (action === 'comment') void doShare('comment');
  }));
  app.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button => button.addEventListener('click', () => { focus = button.dataset.focus as Focus; query = ''; year = 'all'; type = 'all'; selected = null; entryMethod = 'event'; customPerson = ''; userNickname = ''; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-event]').forEach(button => button.addEventListener('click', () => { const item = EVENT_DATA.items.find(value => value.id === button.dataset.event); if (item) { selected = item; customDate = item.date; entryMethod = 'event'; render(); } }));
  app.querySelectorAll<HTMLButtonElement>('[data-year]').forEach(button => button.addEventListener('click', () => { year = button.dataset.year || 'all'; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(button => button.addEventListener('click', () => { type = button.dataset.type || 'all'; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(button => button.addEventListener('click', () => { template = button.dataset.template as TemplateId; saveCurrent(); render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-relation-kind]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.relationKind === 'date' ? 'date' : 'event';
    if (button.dataset.relationSide === 'start') relationStartKind = kind;
    else relationEndKind = kind;
    render();
  }));
  app.querySelectorAll<HTMLButtonElement>('[data-entry-method]').forEach(button => button.addEventListener('click', () => { entryMethod = button.dataset.entryMethod as 'event' | 'date'; render(); }));
  app.querySelectorAll<HTMLInputElement>('#event-search, #home-event-search').forEach(search => search.addEventListener('input', () => {
    query = search.value;
    const searchId = search.id;
    window.requestAnimationFrame(() => {
      render();
      const nextSearch = app.querySelector<HTMLInputElement>(`#${searchId}`);
      if (nextSearch) { nextSearch.focus(); nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length); }
    });
  }));
  const relationASelect = app.querySelector<HTMLSelectElement>('#relation-a'); if (relationASelect) { if (relationA) relationASelect.value = relationA.id; relationASelect.addEventListener('change', () => { relationA = EVENT_DATA.items.find(item => item.id === relationASelect.value) || relationA; render(); }); }
  const relationBSelect = app.querySelector<HTMLSelectElement>('#relation-b'); if (relationBSelect) { if (relationB) relationBSelect.value = relationB.id; relationBSelect.addEventListener('change', () => { relationB = EVENT_DATA.items.find(item => item.id === relationBSelect.value) || relationB; render(); }); }
  const relationDateAInput = app.querySelector<HTMLInputElement>('#relation-date-a'); if (relationDateAInput) relationDateAInput.addEventListener('change', () => { relationDateA = relationDateAInput.value || relationDateA; render(); });
  const relationDateBInput = app.querySelector<HTMLInputElement>('#relation-date-b'); if (relationDateBInput) relationDateBInput.addEventListener('change', () => { relationDateB = relationDateBInput.value || relationDateB; render(); });
  const customDateInput = app.querySelector<HTMLInputElement>('#custom-date'); if (customDateInput) customDateInput.addEventListener('change', () => { customDate = customDateInput.value || customDate; refreshGenerateReady(); });
  const customPersonInput = app.querySelector<HTMLInputElement>('#custom-person'); if (customPersonInput) customPersonInput.addEventListener('input', () => { customPerson = customPersonInput.value; refreshGenerateReady(); });
  const manualDateInput = app.querySelector<HTMLInputElement>('#manual-date'); if (manualDateInput) manualDateInput.addEventListener('change', () => { customDate = manualDateInput.value || customDate; refreshGenerateReady(); });
  const cardNicknameInput = app.querySelector<HTMLInputElement>('#card-nickname'); if (cardNicknameInput) cardNicknameInput.addEventListener('input', () => { userNickname = cardNicknameInput.value.trim(); if (result) result.profileNickname = userNickname; syncCard(); });
  const cardRegionInput = app.querySelector<HTMLInputElement>('#card-region'); if (cardRegionInput) cardRegionInput.addEventListener('input', () => { userRegion = cardRegionInput.value.trim(); if (result) result.region = userRegion; syncCard(); });
  const cardDateInput = app.querySelector<HTMLInputElement>('#card-date'); if (cardDateInput) cardDateInput.addEventListener('change', () => {
    const value = cardDateInput.value;
    if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return;
    result.startDate = value;
    customDate = value;
    result.days = daysSince(value, today, true) || 1;
    const daysInput = app.querySelector<HTMLInputElement>('#card-days');
    if (daysInput) daysInput.value = String(result.days);
    syncCard();
  });
  const cardDaysInput = app.querySelector<HTMLInputElement>('#card-days'); if (cardDaysInput) cardDaysInput.addEventListener('input', () => {
    const value = Math.floor(Number(cardDaysInput.value));
    if (!result || !Number.isFinite(value) || value < 1) return;
    result.days = Math.min(9999, value);
    syncCard();
  });
  const cardEventInput = app.querySelector<HTMLInputElement>('#card-event'); if (cardEventInput) cardEventInput.addEventListener('input', () => { if (result) result.eventTitle = cardEventInput.value; syncCard(); });
}

render();
