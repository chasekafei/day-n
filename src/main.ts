import './styles.css';
import { EVENT_DATA } from './data.ts';
import { countdownToMonthDay, dateDifference, displayDate, eventsForFocus, focusLabels, nextMilestone, statsSince, titleForDays, todayString, typeLabels, yearsForFocus, daysSince, type Focus, type Mode, type TemplateId, type EventItem } from './domain.ts';
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
let customLabel = '';
let customOpen = false;
let relationA: EventItem = EVENT_DATA.items.find(item => item.date === '2024-07-30') || EVENT_DATA.items[0];
let relationB: EventItem = EVENT_DATA.items.find(item => item.date === '2025-05-24') || EVENT_DATA.items[1];
let targetDate = today;

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
  return { focus, startDate, eventTitle: approx ? `约 ${eventTitle}` : eventTitle, days, ...title, ...stats, nickname: '' };
}

function saveCurrent(): void {
  if (!result) return;
  const record: CalendarRecord = { focus, startDate: result.startDate, startEventId: selected?.id || null, approx: result.eventTitle.startsWith('约 '), dayZero: false, template, nickname: result.nickname, lastOpen: today };
  writeRecord(record);
}

function cardPreview(card: CardResult): string {
  return `<div class="card-preview ${template}">
    <div class="preview-top"><span>乒乓历</span><span>${focusLabels[card.focus]}</span></div>
    <div class="preview-kicker">${card.eventTitle}</div>
    <div class="preview-days"><strong>${card.days}</strong><span>天</span></div>
    <div class="preview-title">${card.title}</div>
    <div class="preview-subtitle">${card.subtitle}</div>
    <div class="preview-rule"></div>
    <div class="preview-meta"><span>入坑日 ${displayDate(card.startDate)}</span><span>见证 ${card.total} 冠</span></div>
    <div class="preview-footer">混双 ${card.mixed} · 单打 ${card.singles} · 团体 ${card.team}</div>
  </div>`;
}

function shell(content: string, active: string): string {
  return `<main class="app-shell"><header class="topbar"><button class="brand-button" data-action="home"><span class="brand-mark">乒</span><span><b>乒乓历</b><small>重要日期，值得记住</small></span></button><button class="icon-button" data-action="about" aria-label="打开说明">?</button></header>${content}<nav class="bottom-nav"><button class="${active === 'home' ? 'active' : ''}" data-action="home"><span>⌂</span>首页</button><button class="${active === 'relations' ? 'active' : ''}" data-action="relations"><span>⌁</span>日期关系</button><button class="${active === 'events' ? 'active' : ''}" data-action="events"><span>▤</span>事件库</button><button class="${active === 'about' ? 'active' : ''}" data-action="about"><span>⋯</span>更多</button></nav></main>`;
}

function homeView(): string {
  const recent = eventsForFocus(focus).slice(0, 4);
  const record = readRecord();
  const savedHint = record ? `<button class="saved-banner" data-action="resume"><span>继续上次记录</span><strong>${displayDate(record.startDate)} · ${focusLabels[record.focus]}</strong><span>›</span></button>` : '';
  return shell(`<section class="home-content">
    <div class="hero-copy"><p class="eyebrow">TABLE TENNIS / DATE RECORD</p><h1>重要日期，<br><em>值得记住。</em></h1><p>从入坑日到下一次见证，<br>把乒乓球迷的时间写成一张卡。</p></div>
    ${savedHint}
    <section class="record-card"><div class="record-card-label">我想记录</div><h2>${mode === 'entry' ? '从哪一天开始喜欢上他们？' : '两个重要事件，相隔多少天？'}</h2><p>选择对象，再从事件库里找到那个瞬间。</p><button class="primary-button" data-action="events">选择入坑事件 <span>→</span></button></section>
    <section class="focus-section"><div class="section-heading"><h2>我的关注对象</h2><span>切换后展示对应事件</span></div><div class="focus-grid">${(Object.keys(focusLabels) as Focus[]).map(key => `<button class="focus-card ${focus === key ? 'selected' : ''}" data-focus="${key}"><span class="focus-dot ${key}"></span><b>${focusLabels[key]}</b><small>${key === 'shatou' ? '共同事件与混双冠军' : key === 'custom' ? '填写自己的日期' : '个人与相关赛事'}</small></button>`).join('')}</div></section>
    <section class="recent-section"><div class="section-heading"><h2>近期事件</h2><button data-action="events">全部事件 ›</button></div><div class="event-list">${recent.map(eventRow).join('')}</div></section>
  </section>`, 'home');
}

function eventRow(item: EventItem): string {
  const color = item.type.indexOf('冠军') >= 0 ? 'red' : item.type.indexOf('名场面') >= 0 ? 'yellow' : 'green';
  return `<button class="event-row" data-event="${item.id}"><time>${item.date.slice(0, 4)}<b>${item.date.slice(5).replace('-', '.')}</b></time><span class="event-dot ${color}"></span><span class="event-info"><b>${escapeHTML(item.event.slice(0, 34))}${item.event.length > 34 ? '…' : ''}</b><small>${typeLabels[item.type] || item.type} · ${item.who}</small></span><span class="chevron">›</span></button>`;
}

function eventsView(): string {
  const list = eventsForFocus(focus, query, year, type).slice(0, 60);
  const years = yearsForFocus(focus).slice(0, 8);
  const types = [...new Set(eventsForFocus(focus).map(item => item.type))].filter(item => !item.includes('纪事')).slice(0, 8);
  return shell(`<section class="events-content"><div class="page-heading"><button class="back-button" data-action="home">‹</button><div><p class="eyebrow">EVENT LIBRARY</p><h1>选择你的入坑时刻</h1></div></div><div class="focus-strip">${(Object.keys(focusLabels) as Focus[]).map(key => `<button class="${focus === key ? 'active' : ''}" data-focus="${key}">${focusLabels[key]}</button>`).join('')}</div><div class="search-row"><input id="event-search" value="${escapeHTML(query)}" placeholder="搜索赛事、名场面或年份"><button class="custom-date-button" data-action="custom">自定义日期</button></div>${customOpen ? `<div class="custom-panel"><label>你的日期<input id="custom-date" type="date" value="${customDate}" max="${today}"></label><label>给这一天写个备注（可选）<input id="custom-label" value="${escapeHTML(customLabel)}" maxlength="30" placeholder="例如：巴黎混双入坑"></label><button class="primary-button" data-action="confirm-custom">生成日期卡 <span>→</span></button></div>` : ''}<div class="filter-row"><button class="filter-chip ${year === 'all' ? 'active' : ''}" data-year="all">全部年份</button>${years.map(value => `<button class="filter-chip ${year === value ? 'active' : ''}" data-year="${value}">${value}</button>`).join('')}</div><div class="filter-row type-filters"><button class="filter-chip ${type === 'all' ? 'active' : ''}" data-type="all">全部类型</button>${types.map(value => `<button class="filter-chip ${type === value ? 'active' : ''}" data-type="${value}">${typeLabels[value] || value}</button>`).join('')}</div><div class="library-note">已收录 ${list.length} 条可选事件 · 数据截至 ${EVENT_DATA.data_as_of}</div><div class="event-list large">${list.length ? list.map(eventRow).join('') : '<div class="empty-state">没有找到匹配事件<br><button data-action="custom">改用自定义日期</button></div>'}</div></section>`, 'events');
}

function resultView(): string {
  if (!result) return homeView();
  const milestone = nextMilestone(result.days);
  const may = countdownToMonthDay(5, 11), nov = countdownToMonthDay(11, 4);
  return shell(`<section class="result-content"><div class="result-heading"><button class="back-button" data-action="events">‹</button><div><p class="eyebrow">YOUR DATE CARD</p><h1>这一天，记下来了。</h1></div><button class="text-button" data-action="events">重新选择</button></div><div class="card-stage">${cardPreview(result)}</div><div class="template-tabs">${(['ticket', 'scoreboard', 'calendar', 'table'] as TemplateId[]).map(id => `<button class="${template === id ? 'active' : ''}" data-template="${id}">${({ ticket: '票根', scoreboard: '记分牌', calendar: '日历', table: '球台' } as Record<TemplateId, string>)[id]}</button>`).join('')}</div><section class="result-facts"><div><b>${milestone.remaining}</b><span>天后 · ${milestone.label}</span></div><div><b>${may}</b><span>天后 · 0511</span></div><div><b>${nov}</b><span>天后 · 1104</span></div></section><div class="result-actions"><button class="primary-button" data-action="save">保存到相册 <span>↓</span></button><button class="secondary-button" data-action="share">发布图文</button><button class="quiet-button" data-action="comment">带图评论</button></div><p class="data-note">统计按乒乓历收录的重大事件计算 · 数据截至 ${EVENT_DATA.data_as_of}</p></section>`, 'home');
}

function relationsView(): string {
  const difference = dateDifference(relationA.date, relationB.date);
  const special = difference === null ? [] : [114, 365, 511, 1000, 1104, 2000, 3650, 5114].filter(number => number === difference);
  const options = EVENT_DATA.items.filter(item => item.selectable && item.date.length === 10).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 120);
  const optionHTML = (value: EventItem) => `<option value="${value.id}">${value.date} · ${escapeHTML(value.event.slice(0, 42))}</option>`;
  const relationTabs = `<div class="relation-tabs"><button class="${mode === 'between' ? 'active' : ''}" data-relmode="between">事件之间</button><button class="${mode === 'target' ? 'active' : ''}" data-relmode="target">指定日期</button><button class="${mode === 'special' ? 'active' : ''}" data-relmode="special">日期探秘</button></div>`;
  if (mode === 'target') {
    const targetDifference = dateDifference(relationA.date, targetDate);
    const targetSpecial = targetDifference === null ? [] : [114, 365, 511, 1000, 1104, 2000, 3650, 5114].filter(number => number === targetDifference);
    return shell(`<section class="relations-content"><div class="page-heading"><div><p class="eyebrow">DATE RELATION</p><h1>指定日期</h1></div></div><p class="page-lead">看看一个事件距离指定日期是多少天。</p>${relationTabs}<div class="relation-form"><label>事件<select id="relation-a">${options.map(optionHTML).join('')}</select></label><label>指定日期<input id="target-date" type="date" value="${targetDate}" max="${today}"></label></div><div class="relation-result"><span>从事件到指定日期</span><strong>${targetDifference === null ? '—' : targetDifference}</strong><b>天</b>${targetSpecial.length ? `<p>命中特殊数字：${targetSpecial.join(' / ')}</p>` : '<p>可以试试 0511、1104 或 511 天。</p>'}</div><button class="primary-button" data-action="events">去事件库选择日期 <span>→</span></button></section>`, 'relations');
  }
  const heading = mode === 'special' ? '日期探秘' : '两个事件之间';
  const lead = mode === 'special' ? '看看两个重要瞬间之间，是否藏着特殊数字。' : '把两个重要瞬间放在一起，看看它们相隔多少天。';
  return shell(`<section class="relations-content"><div class="page-heading"><div><p class="eyebrow">DATE RELATION</p><h1>${heading}</h1></div></div><p class="page-lead">${lead}</p>${relationTabs}<div class="relation-form"><label>起点事件<select id="relation-a">${options.map(optionHTML).join('')}</select></label><div class="relation-line">相隔</div><label>终点事件<select id="relation-b">${options.map(optionHTML).join('')}</select></label></div><div class="relation-result"><span>两个日期之间</span><strong>${difference === null ? '—' : difference}</strong><b>天</b>${special.length ? `<p>命中特殊数字：${special.join(' / ')}</p>` : '<p>还没有命中特殊数字，换一组事件试试。</p>'}</div><button class="primary-button" data-action="events">去事件库选择日期 <span>→</span></button></section>`, 'relations');
}

function aboutView(): string {
  return shell(`<section class="about-content"><div class="page-heading"><div><p class="eyebrow">ABOUT THE CALENDAR</p><h1>关于乒乓历</h1></div></div><div class="about-block"><h2>记录日期，不定义喜欢。</h2><p>乒乓历把赛事、入坑日和球迷自己的重要日期放在一起，帮你看见时间之间的距离。</p></div><div class="about-block"><h2>统计口径</h2><p>冠军和事件统计来自本工具收录的数据，不代表完整官方生涯统计。日期统一按北京时间自然日处理。</p></div><div class="about-block"><h2>数据截至</h2><p>${EVENT_DATA.data_as_of} · 事件库 ${EVENT_DATA.count} 条</p></div><button class="primary-button" data-action="home">回到首页 <span>→</span></button></section>`, 'about');
}

function render(): void {
  app.innerHTML = view === 'home' ? homeView() : view === 'events' ? eventsView() : view === 'result' ? resultView() : view === 'relations' ? relationsView() : aboutView();
  bindEvents();
}

function openResult(item: EventItem, approximate = false): void {
  selected = item; result = selectedResult(item.date, item.event, approximate); view = 'result'; saveCurrent(); render();
}

function openCustom(): void {
  const date = customDate <= today ? customDate : today;
  selected = null; result = selectedResult(date, customLabel.trim() || '自定义入坑日'); view = 'result'; saveCurrent(); render();
}

function buildExport(): string {
  if (!result) return '';
  return renderCard(result, template, 1080, 1440).toDataURL('image/png');
}

async function doSave(): Promise<void> {
  try { await saveImage(buildExport()); toast(isNative() ? '已保存到相册' : '图片已开始下载'); } catch (error) { toast(error instanceof Error ? error.message : '保存失败，请稍后重试'); }
}

async function doShare(kind: 'note' | 'comment'): Promise<void> {
  try { await shareImage(buildExport(), kind, result ? { d: result.startDate, n: result.days, f: result.focus, t: template } : undefined); toast(kind === 'comment' ? '已打开评论编辑器' : '已打开发布页'); } catch (error) { toast(error instanceof Error ? error.message : '分享失败，请先保存图片'); }
}

function bindEvents(): void {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach(element => element.addEventListener('click', () => {
    const action = element.dataset.action;
    if (action === 'home') { view = 'home'; render(); }
    else if (action === 'events') { view = 'events'; render(); }
    else if (action === 'relations') { view = 'relations'; render(); }
    else if (action === 'about') { view = 'about'; render(); }
    else if (action === 'resume') { const record = readRecord(); if (record) { focus = record.focus; template = record.template; result = selectedResult(record.startDate, record.startEventId ? (EVENT_DATA.items.find(item => item.id === record.startEventId)?.event || '已保存的入坑日') : '自定义入坑日', record.approx); selected = record.startEventId ? EVENT_DATA.items.find(item => item.id === record.startEventId) || null : null; view = 'result'; render(); } }
    else if (action === 'custom') { customOpen = true; view = 'events'; render(); }
    else if (action === 'confirm-custom') { const date = app.querySelector<HTMLInputElement>('#custom-date')?.value || ''; customLabel = app.querySelector<HTMLInputElement>('#custom-label')?.value || ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) toast('请选择今天或更早的日期'); else { customDate = date; customOpen = false; openCustom(); } }
    else if (action === 'save') void doSave();
    else if (action === 'share') void doShare('note');
    else if (action === 'comment') void doShare('comment');
  }));
  app.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button => button.addEventListener('click', () => { focus = button.dataset.focus as Focus; query = ''; year = 'all'; type = 'all'; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-event]').forEach(button => button.addEventListener('click', () => { const item = EVENT_DATA.items.find(value => value.id === button.dataset.event); if (item) openResult(item); }));
  app.querySelectorAll<HTMLButtonElement>('[data-year]').forEach(button => button.addEventListener('click', () => { year = button.dataset.year || 'all'; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(button => button.addEventListener('click', () => { type = button.dataset.type || 'all'; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(button => button.addEventListener('click', () => { template = button.dataset.template as TemplateId; saveCurrent(); render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-relmode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.relmode as Mode; render(); }));
  const search = app.querySelector<HTMLInputElement>('#event-search'); if (search) search.addEventListener('input', () => { query = search.value; window.requestAnimationFrame(render); });
  const relationASelect = app.querySelector<HTMLSelectElement>('#relation-a'); if (relationASelect) { if (relationA) relationASelect.value = relationA.id; relationASelect.addEventListener('change', () => { relationA = EVENT_DATA.items.find(item => item.id === relationASelect.value) || relationA; render(); }); }
  const relationBSelect = app.querySelector<HTMLSelectElement>('#relation-b'); if (relationBSelect) { if (relationB) relationBSelect.value = relationB.id; relationBSelect.addEventListener('change', () => { relationB = EVENT_DATA.items.find(item => item.id === relationBSelect.value) || relationB; render(); }); }
  const targetInput = app.querySelector<HTMLInputElement>('#target-date'); if (targetInput) targetInput.addEventListener('change', () => { targetDate = targetInput.value || today; render(); });
}

render();
