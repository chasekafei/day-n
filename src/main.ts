import './styles.css';
import { EVENT_DATA } from './data.ts';
import { dateDifference, displayDate, eventsForFocus, focusLabels, PRODUCT_NAME, statsSince, titleForDays, todayString, typeLabels, yearsForFocus, daysSince, shortEventTitle, type Focus, type Mode, type TemplateId, type EventItem } from './domain.ts';
import { renderCard, type CardResult } from './card-renderer.ts';
import { readRecord, writeRecord, type CalendarRecord } from './records.ts';
import { saveImage, shareImage, isNative } from './platform.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const today = todayString();
let view: 'home' | 'events' | 'result' | 'relations' | 'about' = 'home';
let focus: Focus = 'shatou';
let mode: Mode = 'entry';
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
let targetDate = today;
let betweenMode: 'events' | 'dates' = 'events';
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

function entryGenerateButton(): string {
  return `<div class="entry-generate-wrap"><button class="entry-generate" data-action="generate-entry">生成入坑卡 <span>→</span></button></div>`;
}

function entrySelector(page: 'home' | 'events'): string {
  if (focus === 'custom') {
    return `<div class="custom-entry-panel"><p class="entry-panel-lead">写下你的入坑对象和日期，生成专属入坑卡。</p><label>入坑对象<input id="custom-person" value="${escapeHTML(customPerson)}" maxlength="24" placeholder="例如：我喜欢的运动员或组合"></label><label>入坑时间<input id="custom-date" type="date" value="${customDate}" max="${today}"></label></div>${entryGenerateButton()}`;
  }
  const list = eventsForFocus(focus, query, year, type);
  const years = yearsForFocus(focus).slice(0, 8);
  const types = [...new Set(eventsForFocus(focus).map(item => item.type))].filter(item => !item.includes('纪事')).slice(0, 8);
  const searchId = page === 'home' ? 'home-event-search' : 'event-search';
  const visibleList = page === 'home' ? list : list.slice(0, 60);
  const entryTabs = `<div class="entry-method-tabs"><button class="${entryMethod === 'event' ? 'active' : ''}" data-entry-method="event">通过事件选择日期</button><button class="${entryMethod === 'date' ? 'active' : ''}" data-entry-method="date">手动选择日期</button></div>`;
  const selectionNote = selected && entryMethod === 'event'
    ? `<div class="entry-selection-note"><span>从此入坑</span><strong>${displayDate(selected.date)} · ${escapeHTML(shortEventTitle(selected))}</strong></div>`
    : entryMethod === 'event'
      ? '<p class="entry-selection-hint">选择一个事件，就以这一天作为你的入坑时间。</p>'
      : '';
  const content = entryMethod === 'date'
    ? `<div class="manual-entry-panel"><label>入坑时间<input id="manual-date" type="date" value="${customDate}" max="${today}"></label><p>选定日期后，点击底部“生成”创建入坑卡。</p></div>`
    : `${selectionNote}<div class="home-search search-row"><input id="${searchId}" value="${escapeHTML(query)}" placeholder="搜索赛事、名场面或年份"></div><div class="filter-row"><button class="filter-chip ${year === 'all' ? 'active' : ''}" data-year="all">全部年份</button>${years.map(value => `<button class="filter-chip ${year === value ? 'active' : ''}" data-year="${value}">${value}</button>`).join('')}</div><div class="filter-row type-filters"><button class="filter-chip ${type === 'all' ? 'active' : ''}" data-type="all">全部类型</button>${types.map(value => `<button class="filter-chip ${type === value ? 'active' : ''}" data-type="${value}">${typeLabels[value] || value}</button>`).join('')}</div><div class="library-note">${page === 'home' ? '全部事件库' : '事件库'} · 已收录 ${visibleList.length} 条可选事件 · 数据截至 ${EVENT_DATA.data_as_of}</div><div class="event-list ${page === 'events' ? 'large' : 'home-library'}">${visibleList.length ? visibleList.map(eventRow).join('') : '<div class="empty-state">没有找到匹配事件</div>'}</div>`;
  return `${entryTabs}${content}${entryGenerateButton()}`;
}

function saveCurrent(): void {
  if (!result) return;
  const record: CalendarRecord = { focus, startDate: result.startDate, startEventId: selected?.id || null, approx: result.eventTitle.startsWith('约 '), dayZero: false, template, nickname: result.nickname, profileNickname: result.profileNickname, region: result.region, lastOpen: today };
  writeRecord(record);
}

function cardPreview(card: CardResult): string {
  if (template === 'badge') return '<img id="share-card" class="share-card" alt="球迷证">';
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

function shell(content: string, active: string): string {
  return `<main class="app-shell"><header class="topbar"><button class="brand-button" data-action="home"><span class="brand-mark">日</span><span><b>${PRODUCT_NAME}</b><small>从那天起，到今天</small></span></button><button class="icon-button" data-action="about" aria-label="打开说明">?</button></header>${content}<nav class="bottom-nav"><button class="${active === 'home' ? 'active' : ''}" data-action="home"><span>⌂</span>首页</button><button class="${active === 'relations' ? 'active' : ''}" data-action="relations"><span>⌁</span>日期间隔</button><button class="${active === 'events' ? 'active' : ''}" data-action="events"><span>▤</span>事件库</button></nav></main>`;
}

function homeView(): string {
  const record = readRecord();
  const savedHint = record ? `<button class="saved-banner" data-action="resume"><span>继续上次记录</span><strong>${displayDate(record.startDate)} · ${escapeHTML(focusDisplayName(record.focus, record.nickname))}</strong><span>›</span></button>` : '';
  return shell(`<section class="home-content">
    <div class="hero-copy"><p class="eyebrow">TABLE TENNIS / DATE RECORD</p><h1>重要日期，<br><em>值得记住。</em></h1><p>从入坑日到下一次见证，<br>把乒乓球迷的时间写成一张卡。</p></div>
    ${savedHint}
    <section class="entry-library"><div class="section-heading"><h2>我从这天入坑</h2><span>先选关注对象</span></div><div class="focus-grid">${(Object.keys(focusLabels) as Focus[]).map(key => `<button class="focus-card ${focus === key ? 'selected' : ''}" data-focus="${key}"><span class="focus-dot ${key}"></span><b>${focusLabels[key]}</b><small>${key === 'shatou' ? '共同事件与混双冠军' : key === 'custom' ? '填写自己的日期' : '个人与相关赛事'}</small></button>`).join('')}</div>${entrySelector('home')}</section>
  </section>`, 'home');
}

function eventRow(item: EventItem): string {
  const color = item.type.indexOf('冠军') >= 0 ? 'red' : item.type.indexOf('名场面') >= 0 ? 'yellow' : 'green';
  return `<button class="event-row ${selected?.id === item.id ? 'selected' : ''}" data-event="${item.id}" aria-pressed="${selected?.id === item.id}"><time>${item.date.slice(0, 4)}<b>${item.date.slice(5).replace('-', '.')}</b></time><span class="event-dot ${color}"></span><span class="event-info"><b>${escapeHTML(shortEventTitle(item))}</b><small>${typeLabels[item.type] || item.type} · ${item.who}</small></span><span class="chevron">${selected?.id === item.id ? '✓' : '›'}</span></button>`;
}

function eventsView(): string {
  return shell(`<section class="events-content"><div class="page-heading"><button class="back-button" data-action="home">‹</button><div><p class="eyebrow">ENTRY DATE</p><h1>选择你的入坑时刻</h1></div></div><div class="focus-strip">${(Object.keys(focusLabels) as Focus[]).map(key => `<button class="${focus === key ? 'active' : ''}" data-focus="${key}">${focusLabels[key]}</button>`).join('')}</div>${entrySelector('events')}</section>`, 'events');
}

function resultView(): string {
  if (!result) return homeView();
  return shell(`<section class="result-content"><div class="result-heading"><button class="back-button" data-action="home">‹</button><div><p class="eyebrow">YOUR DATE CARD</p><h1>这一天，记下来了。</h1></div><button class="text-button" data-action="home">重新选择</button></div><div class="card-stage">${cardPreview(result)}</div>${template === 'badge' ? `<div class="badge-fields"><label>姓名<input id="card-nickname" value="${escapeHTML(userNickname)}" maxlength="16" placeholder="例如：MouT.me"></label><label>地区<input id="card-region" value="${escapeHTML(userRegion)}" maxlength="16" placeholder="例如：广东 广州"></label></div>` : `<label class="card-profile-field">我的昵称（可选）<input id="card-nickname" value="${escapeHTML(userNickname)}" maxlength="24" placeholder="例如：小王的第 N 天"></label>`}<div class="template-tabs">${(['ticket', 'scoreboard', 'badge', 'table'] as TemplateId[]).map(id => `<button class="${template === id ? 'active' : ''}" data-template="${id}">${({ ticket: '票据', scoreboard: '记分牌', badge: '工作证', table: '球台' } as Record<TemplateId, string>)[id]}</button>`).join('')}</div><div class="result-actions"><button class="result-action-button" data-action="save">保存到相册 <span>↓</span></button><button class="result-action-button" data-action="share">发布图文 <span>↗</span></button><button class="result-action-button" data-action="comment">带图评论 <span>✎</span></button></div><p class="data-note">统计按${PRODUCT_NAME}收录的重大事件计算 · 数据截至 ${EVENT_DATA.data_as_of}</p></section>`, 'home');
}

function presetIntervalCard(preset: (typeof PRESET_INTERVALS)[number]): string {
  const left = EVENT_DATA.items.find(item => item.id === preset.a);
  const right = EVENT_DATA.items.find(item => item.id === preset.b);
  if (!left || !right) return '';
  return `<article class="interval-card"><div class="interval-card-head"><span>日期看板</span><strong>${preset.label}</strong></div><p>${preset.note}</p><div class="interval-event"><span class="interval-event-label">起点事件</span><time>${displayDate(left.date)}</time><b>${escapeHTML(shortEventTitle(left))}</b></div><div class="interval-connector"><span></span><small>相隔</small><span></span></div><div class="interval-event"><span class="interval-event-label">终点事件</span><time>${displayDate(right.date)}</time><b>${escapeHTML(shortEventTitle(right))}</b></div></article>`;
}

function intervalBoard(): string {
  return `<section class="interval-board"><div class="section-heading"><h2>日期间隔看板</h2><span>提前发现有趣的数字</span></div><div class="interval-grid">${PRESET_INTERVALS.map(presetIntervalCard).join('')}</div></section>`;
}

function relationsView(): string {
  const startValue = betweenMode === 'events' ? relationA.date : relationDateA;
  const endValue = betweenMode === 'events' ? relationB.date : relationDateB;
  const difference = dateDifference(startValue, endValue);
  const special = difference === null ? [] : SPECIAL_NUMBERS.filter(number => number === difference);
  const options = EVENT_DATA.items.filter(item => item.selectable && item.date.length === 10).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 120);
  const optionHTML = (value: EventItem) => `<option value="${value.id}">${displayDate(value.date)} · ${escapeHTML(shortEventTitle(value))}</option>`;
  const relationTabs = `<div class="relation-tabs"><button class="${mode === 'between' ? 'active' : ''}" data-relmode="between">事件之间</button><button class="${mode === 'target' ? 'active' : ''}" data-relmode="target">指定日期</button><button class="${mode === 'special' ? 'active' : ''}" data-relmode="special">日期探秘</button></div>`;
  if (mode === 'target') {
    const targetDifference = dateDifference(relationA.date, targetDate);
    const targetSpecial = targetDifference === null ? [] : SPECIAL_NUMBERS.filter(number => number === targetDifference);
    return shell(`<section class="relations-content"><div class="page-heading"><div><p class="eyebrow">DATE RELATION</p><h1>指定日期</h1></div></div><p class="page-lead">看看一个事件距离指定日期是多少天。</p>${relationTabs}<div class="relation-form"><label>事件<select id="relation-a">${options.map(optionHTML).join('')}</select></label><label>指定日期<input id="target-date" type="date" value="${targetDate}" max="${today}"></label></div><div class="relation-result"><span>从事件到指定日期</span><strong>${targetDifference === null ? '—' : targetDifference}</strong><b>天</b>${targetSpecial.length ? `<p>命中特殊数字：${targetSpecial.join(' / ')}</p>` : '<p>可以试试 0511、1104 或 511 天。</p>'}</div><button class="primary-button" data-action="events">去事件库选择日期 <span>→</span></button>${intervalBoard()}</section>`, 'relations');
  }
  const heading = mode === 'special' ? '日期探秘' : '两个事件之间';
  const lead = mode === 'special' ? '看看两个重要瞬间之间，是否藏着特殊数字。' : '把两个重要瞬间放在一起，看看它们相隔多少天。';
  const betweenSource = `<div class="between-source"><button class="${betweenMode === 'events' ? 'active' : ''}" data-between-source="events">选择事件</button><button class="${betweenMode === 'dates' ? 'active' : ''}" data-between-source="dates">输入日期</button></div>`;
  const form = betweenMode === 'events'
    ? `<div class="relation-form"><label>起点事件<select id="relation-a">${options.map(optionHTML).join('')}</select></label><div class="relation-line">相隔</div><label>终点事件<select id="relation-b">${options.map(optionHTML).join('')}</select></label></div>`
    : `<div class="relation-form date-form"><label>起始日期<input id="relation-date-a" type="date" value="${relationDateA}" max="${today}"></label><div class="relation-line">相隔</div><label>结束日期<input id="relation-date-b" type="date" value="${relationDateB}" max="${today}"></label></div>`;
  return shell(`<section class="relations-content"><div class="page-heading"><div><p class="eyebrow">DATE RELATION</p><h1>${heading}</h1></div></div><p class="page-lead">${lead}</p>${relationTabs}${betweenSource}${form}<div class="relation-result"><span>${betweenMode === 'events' ? '两个事件之间' : '两个日期之间'}</span><strong>${difference === null ? '—' : difference}</strong><b>天</b>${special.length ? `<p>命中特殊数字：${special.join(' / ')}</p>` : '<p>还没有命中特殊数字，换一组事件试试。</p>'}</div><button class="primary-button" data-action="events">去事件库选择日期 <span>→</span></button>${intervalBoard()}</section>`, 'relations');
}

function aboutView(): string {
  return shell(`<section class="about-content"><div class="page-heading"><div><p class="eyebrow">ABOUT THE CALENDAR</p><h1>关于${PRODUCT_NAME}</h1></div></div><div class="about-block"><h2>记录日期，不定义喜欢。</h2><p>${PRODUCT_NAME}把赛事、入坑日和球迷自己的重要日期放在一起，帮你看见时间之间的距离。</p></div><div class="about-block"><h2>统计口径</h2><p>冠军和事件统计来自本工具收录的数据，不代表完整官方生涯统计。日期统一按北京时间自然日处理。</p></div><div class="about-block"><h2>数据截至</h2><p>${EVENT_DATA.data_as_of} · 事件库 ${EVENT_DATA.count} 条</p></div><button class="primary-button" data-action="home">回到首页 <span>→</span></button></section>`, 'about');
}

function render(): void {
  app.innerHTML = view === 'home' ? homeView() : view === 'events' ? eventsView() : view === 'result' ? resultView() : view === 'relations' ? relationsView() : aboutView();
  bindEvents();
  void paintShareCard();
}

let paintToken = 0;
async function paintShareCard(): Promise<void> {
  const image = app.querySelector<HTMLImageElement>('#share-card');
  if (!image || !result || template !== 'badge') return;
  const token = ++paintToken;
  const canvas = await renderCard(result, 'badge');
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
    else if (action === 'resume') { const record = readRecord(); if (record) { focus = record.focus; customPerson = record.nickname || ''; userNickname = record.profileNickname || ''; userRegion = record.region || ''; template = record.template; customDate = record.startDate; selected = record.startEventId ? EVENT_DATA.items.find(item => item.id === record.startEventId) || null : null; result = selectedResult(record.startDate, selected ? shortEventTitle(selected) : (record.focus === 'custom' ? `${customPerson || '自定义对象'} 的入坑日` : '手动选择的入坑日'), record.approx); view = 'result'; render(); } }
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
  app.querySelectorAll<HTMLButtonElement>('[data-relmode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.relmode as Mode; render(); }));
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
  app.querySelectorAll<HTMLButtonElement>('[data-between-source]').forEach(button => button.addEventListener('click', () => { betweenMode = button.dataset.betweenSource as 'events' | 'dates'; render(); }));
  const relationASelect = app.querySelector<HTMLSelectElement>('#relation-a'); if (relationASelect) { if (relationA) relationASelect.value = relationA.id; relationASelect.addEventListener('change', () => { relationA = EVENT_DATA.items.find(item => item.id === relationASelect.value) || relationA; render(); }); }
  const relationBSelect = app.querySelector<HTMLSelectElement>('#relation-b'); if (relationBSelect) { if (relationB) relationBSelect.value = relationB.id; relationBSelect.addEventListener('change', () => { relationB = EVENT_DATA.items.find(item => item.id === relationBSelect.value) || relationB; render(); }); }
  const targetInput = app.querySelector<HTMLInputElement>('#target-date'); if (targetInput) targetInput.addEventListener('change', () => { targetDate = targetInput.value || today; render(); });
  const relationDateAInput = app.querySelector<HTMLInputElement>('#relation-date-a'); if (relationDateAInput) relationDateAInput.addEventListener('change', () => { relationDateA = relationDateAInput.value || relationDateA; render(); });
  const relationDateBInput = app.querySelector<HTMLInputElement>('#relation-date-b'); if (relationDateBInput) relationDateBInput.addEventListener('change', () => { relationDateB = relationDateBInput.value || relationDateB; render(); });
  const customDateInput = app.querySelector<HTMLInputElement>('#custom-date'); if (customDateInput) customDateInput.addEventListener('change', () => { customDate = customDateInput.value || customDate; });
  const customPersonInput = app.querySelector<HTMLInputElement>('#custom-person'); if (customPersonInput) customPersonInput.addEventListener('input', () => { customPerson = customPersonInput.value; });
  const manualDateInput = app.querySelector<HTMLInputElement>('#manual-date'); if (manualDateInput) manualDateInput.addEventListener('change', () => { customDate = manualDateInput.value || customDate; });
  const cardNicknameInput = app.querySelector<HTMLInputElement>('#card-nickname'); if (cardNicknameInput) cardNicknameInput.addEventListener('input', () => { userNickname = cardNicknameInput.value.trim(); if (result) { result.profileNickname = userNickname; saveCurrent(); } void paintShareCard(); });
  const cardRegionInput = app.querySelector<HTMLInputElement>('#card-region'); if (cardRegionInput) cardRegionInput.addEventListener('input', () => { userRegion = cardRegionInput.value.trim(); if (result) { result.region = userRegion; saveCurrent(); } void paintShareCard(); });
}

render();
