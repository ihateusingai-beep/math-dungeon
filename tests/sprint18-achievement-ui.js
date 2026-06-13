#!/usr/bin/env node
/**
 * Sprint 18 — 成就 UI (Track B, dashboard 第 6 個 tab)
 *
 * Verifies (per spec §7.2, 12+ cases):
 *   1.  DASHBOARD_TABS include 'achievement'
 *   2.  hash #dashboard/achievement 切到正確 panel
 *   3.  render panel 出 summary (unlocked/total 數字)
 *   4.  render grid 數量 = ACHIEVEMENTS.length
 *   5.  filter chip click toggle 顯示
 *   6.  unlocked card 有 .ach-unlocked class
 *   7.  locked card 有 .ach-locked class + progress bar
 *   8.  empty state（0 解鎖時）
 *   9.  6 個 tab 順序排好（包括新加嘅 achievement）
 *  10.  filter chip set data-cat-active + active class
 *  11.  icon asset 存在 + size <= 10KB
 *  12.  renderAchievementPanel() 唔 throw 當 ACHIEVEMENTS 仲未 merge（Track A 未 commit）
 *  13.  panel render 出 tier border 顏色（CSS 數據屬性）
 *  14.  showDashboardScreen() render 6 panels 包括 achievement
 *
 * Usage: node tests/sprint18-achievement-ui.js
 */

'use strict';

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(INDEX, 'utf8');

let passes = 0, fails = 0;
function check(name, ok, detail) {
  if (ok) { passes++; console.log(`  ✅ ${name}`); }
  else { fails++; console.log(`  ❌ ${name} — ${detail || '(no detail)'}`); }
}
function section(t) { console.log(`\n══ ${t} ══`); }

// === 注入 mock ACHIEVEMENTS 嘅 stub（Track A 嘅 engine 仲未 merge） ===
// 用呢個 stub 模擬 22 個成就，category 分布跟 spec §2。
// Track A merge 完之後真嘅 ACHIEVEMENTS 會覆蓋呢個。
const STUB_ACHIEVEMENTS_CODE = `
window.ACHIEVEMENTS = [
  // battle (6)
  { id: 'first_battle',  category: 'battle',   title: '初戰告捷',  desc: '完成第一場戰鬥',  icon: '⚔️', tier: 'bronze',   rule: () => ({ progress: 1,  ctx: '' }) },
  { id: 'ten_battles',   category: 'battle',   title: '十場征戰',  desc: '完成 10 場戰鬥', icon: '⚔️', tier: 'silver',   rule: () => ({ progress: 0.3, ctx: '3/10 場' }) },
  { id: 'fifty_battles', category: 'battle',   title: '沙場老將',  desc: '完成 50 場戰鬥', icon: '⚔️', tier: 'gold',     rule: () => ({ progress: 0.2, ctx: '10/50 場' }) },
  { id: 'perfect_accuracy', category: 'battle', title: '神準無誤', desc: '任何一場達 100% 準確率', icon: '🎯', tier: 'silver', rule: () => ({ progress: 0, ctx: '' }) },
  { id: 'no_damage',     category: 'battle',   title: '銅牆鐵壁',  desc: '任何一場 3 星通關',  icon: '🛡️', tier: 'gold',     rule: () => ({ progress: 0, ctx: '' }) },
  { id: 'boss_slayer',   category: 'battle',   title: '魔王剋星',  desc: '通關 boss stage',  icon: '👑', tier: 'gold',     rule: () => ({ progress: 0, ctx: '' }) },
  // practice (5)
  { id: 'first_practice',      category: 'practice', title: '練習初體驗', desc: '完成第一次練習',  icon: '📚', tier: 'bronze', rule: () => ({ progress: 1, ctx: '' }) },
  { id: 'ten_practices',       category: 'practice', title: '練習達人',   desc: '完成 10 次練習',  icon: '📚', tier: 'silver', rule: () => ({ progress: 0.5, ctx: '5/10 次' }) },
  { id: 'practice_streak_5',   category: 'practice', title: '五日練習',   desc: '連續 5 日有練習', icon: '🔥', tier: 'silver', rule: () => ({ progress: 0.6, ctx: '3/5 日' }) },
  { id: 'practice_ace',        category: 'practice', title: '練習滿分',   desc: '任何一次練習滿分', icon: '💯', tier: 'silver', rule: () => ({ progress: 0, ctx: '' }) },
  { id: 'practice_volume_100', category: 'practice', title: '百題練習',   desc: '累計練習答題 ≥ 100', icon: '💯', tier: 'gold', rule: () => ({ progress: 0.42, ctx: '42/100 題' }) },
  // weak (4)
  { id: 'weak_aware',     category: 'weak', title: '知己知彼',   desc: '首次出現 1 個錯題記錄', icon: '🎯', tier: 'bronze', rule: () => ({ progress: 1, ctx: '' }) },
  { id: 'weak_collector', category: 'weak', title: '弱題收藏家', desc: '累積 5 個不同錯題',    icon: '🎯', tier: 'silver', rule: () => ({ progress: 0.6, ctx: '3/5 個' }) },
  { id: 'weak_master_3',  category: 'weak', title: '弱題剋星',   desc: '同一弱題錯 3 次以上',  icon: '🎯', tier: 'gold',   rule: () => ({ progress: 0, ctx: '' }) },
  { id: 'weak_clean_3',   category: 'weak', title: '清白之身',   desc: '連續 3 場戰鬥冇錯題',  icon: '🛡️', tier: 'silver', rule: () => ({ progress: 0, ctx: '' }) },
  // curve (4)
  { id: 'curve_starter',    category: 'curve', title: '起步紀錄',   desc: '至少有 1 日有 battle 記錄', icon: '📈', tier: 'bronze', rule: () => ({ progress: 1, ctx: '' }) },
  { id: 'curve_7_days',     category: 'curve', title: '一週堅持',   desc: '連續 7 日有練習',  icon: '📈', tier: 'silver', rule: () => ({ progress: 0.43, ctx: '3/7 日' }) },
  { id: 'curve_30_days',    category: 'curve', title: '月度達人',   desc: '連續 30 日有練習', icon: '📈', tier: 'gold',   rule: () => ({ progress: 0, ctx: '' }) },
  { id: 'curve_perfect_90', category: 'curve', title: '穩定達人',   desc: '最近 7 日平均準確率 ≥ 90%', icon: '📈', tier: 'silver', rule: () => ({ progress: 0, ctx: '' }) },
  // streak (3)
  { id: 'streak_3',   category: 'streak', title: '三日連擊',   desc: '連續 3 日有練習', icon: '🔥', tier: 'bronze',   rule: () => ({ progress: 1, ctx: '' }) },
  { id: 'streak_14',  category: 'streak', title: '雙週連擊',   desc: '連續 14 日有練習', icon: '🔥', tier: 'gold',     rule: () => ({ progress: 0, ctx: '' }) },
  { id: 'streak_100', category: 'streak', title: '百日傳說',   desc: '連續 100 日有練習', icon: '🔥', tier: 'platinum', rule: () => ({ progress: 0, ctx: '' }) }
];
// 對應 getAchievementProgress() 用 stub override（Track A 嘅 version 已經 return 結構，
// 呢度 mock 返：睇 unlocked list，再 iterate ACHIEVEMENTS 計 inProgress）
window.getAchievementProgress = function() {
  let unlocked = [];
  try {
    const raw = window.localStorage.getItem('mathDungeon_achievements');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) unlocked = parsed;
    }
  } catch(e) { unlocked = []; }
  const inProgress = {};
  for (const a of window.ACHIEVEMENTS) {
    if (unlocked.find(u => u.id === a.id)) continue;
    const r = a.rule({});
    inProgress[a.id] = { progress: r.progress, ctx: r.ctx || '' };
  }
  return { unlocked, inProgress };
};
`;

function buildJsdom(opts = {}) {
  const { injectStub = true, mockAchievements = [] } = opts;
  const dom = new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/, ''), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/'
  });
  const { window } = dom;
  window.AudioContext = class { constructor() {} };
  window.speechSynthesis = { cancel(){}, speak(){}, getVoices: () => [] };

  // Seed localStorage with mock data
  if (mockAchievements.length > 0) {
    window.localStorage.setItem('mathDungeon_achievements', JSON.stringify(mockAchievements));
  } else {
    window.localStorage.setItem('mathDungeon_achievements', '[]');
  }
  return { dom, window };
}

function runScript(window, code) {
  const script = window.document.createElement('script');
  script.textContent = code;
  window.document.head.appendChild(script);
}

function findScriptCode() {
  const fresh = fs.readFileSync(INDEX, 'utf8');
  const m = fresh.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no script block found');
  return m[1];
}

// ═══════════════════════════════════════════════════════════
section('1. 結構：6 個 tab panel + 6 個 tab button + achievement 排最後');
{
  const { window } = buildJsdom();
  const panels = window.document.querySelectorAll('.dash-panel');
  const tabs = window.document.querySelectorAll('.dash-tab');
  check('有 6 個 .dash-panel', panels.length === 6, `got ${panels.length}`);
  check('有 6 個 .dash-tab', tabs.length === 6, `got ${tabs.length}`);
  const lastPanel = panels[panels.length - 1];
  const lastTab = tabs[tabs.length - 1];
  check('最後一個 panel 係 achievement', lastPanel && lastPanel.dataset.panel === 'achievement',
    `got ${lastPanel && lastPanel.dataset.panel}`);
  check('最後一個 tab 係 achievement', lastTab && lastTab.dataset.tab === 'achievement',
    `got ${lastTab && lastTab.dataset.tab}`);
  // icon attribute
  const iconSrc = lastTab && lastTab.querySelector('img.dash-tab-icon');
  check('achievement tab 有 icon-achievement.webp', iconSrc && iconSrc.getAttribute('src').includes('icon-achievement.webp'),
    `got ${iconSrc && iconSrc.getAttribute('src')}`);
}

// ═══════════════════════════════════════════════════════════
section('2. 空數據：showDashboardScreen() 唔 throw + achievement panel graceful fallback');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  // 唔 inject stub — 模擬 Track A 未 merge 嘅狀態
  runScript(window, code);
  try {
    window.eval('showDashboardScreen()');
    check('空數據 + 無 ACHIEVEMENTS → showDashboardScreen 唔 throw', true);
  } catch (e) {
    check('空數據 + 無 ACHIEVEMENTS → showDashboardScreen 唔 throw', false, e.message);
  }
  // 6 個 panel 都應該有 hero banner
  const heroes = window.document.querySelectorAll('.dash-hero');
  check('6 個 panel 都有 hero banner', heroes.length === 6, `got ${heroes.length}`);
  // achievement panel 應該 render fallback empty state
  const achPanel = window.document.getElementById('dash-panel-achievement');
  const achEmpty = achPanel && achPanel.querySelector('.ach-empty');
  check('無 ACHIEVEMENTS 時 achievement panel render empty hint', !!achEmpty,
    'no .ach-empty fallback');
  const fallbackText = achEmpty && achEmpty.textContent;
  check('empty hint 提到「準備中」或「載入」', fallbackText && /準備中|載入/.test(fallbackText),
    `got "${fallbackText && fallbackText.slice(0, 50)}"`);
}

// ═══════════════════════════════════════════════════════════
section('3. Inject ACHIEVEMENTS stub：grid + summary + filter chips 全部出齊');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  runScript(window, STUB_ACHIEVEMENTS_CODE);
  // Set 2 unlocked (first_battle + first_practice)
  window.localStorage.setItem('mathDungeon_achievements', JSON.stringify([
    { id: 'first_battle',    unlockedAt: '2026/6/13 21:00:00' },
    { id: 'first_practice',  unlockedAt: '2026/6/13 21:10:00' }
  ]));
  window.eval('showDashboardScreen()');
  // Switch to achievement tab
  window.eval('switchDashboardTab("achievement", false)');
  const panel = window.document.getElementById('dash-panel-achievement');
  check('achievement panel 存在', !!panel);
  // summary
  const summary = panel.querySelector('.ach-summary');
  check('summary block 存在', !!summary, 'no .ach-summary');
  const unlockedNum = summary && summary.querySelector('.ach-summary-unlocked');
  const totalNum = summary && summary.querySelector('.ach-summary-total');
  check('summary unlocked 數字 = 2', unlockedNum && unlockedNum.textContent === '2',
    `got ${unlockedNum && unlockedNum.textContent}`);
  check('summary total 數字 = 22', totalNum && totalNum.textContent === '22',
    `got ${totalNum && totalNum.textContent}`);
  // progress bar
  const barFill = summary && summary.querySelector('.ach-summary-bar-fill');
  check('summary bar fill 設咗 width', barFill && /width:\d+/.test(barFill.getAttribute('style')),
    `got ${barFill && barFill.getAttribute('style')}`);
  // filter chips
  const filter = panel.querySelector('.ach-filter');
  check('filter chips 容器存在', !!filter, 'no .ach-filter');
  const chips = panel.querySelectorAll('.ach-chip');
  check('有 6 個 chip（all/battle/practice/weak/curve/streak）', chips.length === 6, `got ${chips.length}`);
  check('chip "all" 預設 active', chips[0] && chips[0].classList.contains('active'),
    `first chip classes: ${chips[0] && chips[0].className}`);
  // grid
  const grid = panel.querySelector('.ach-grid');
  check('grid 容器存在', !!grid, 'no .ach-grid');
  const cards = grid && grid.querySelectorAll('.ach-card');
  check('grid 數量 = ACHIEVEMENTS.length (22)', cards && cards.length === 22, `got ${cards && cards.length}`);
}

// ═══════════════════════════════════════════════════════════
section('4. Unlocked vs Locked card class 正確');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  runScript(window, STUB_ACHIEVEMENTS_CODE);
  window.localStorage.setItem('mathDungeon_achievements', JSON.stringify([
    { id: 'first_battle', unlockedAt: '2026/6/13 21:00:00' }
  ]));
  window.eval('showDashboardScreen(); switchDashboardTab("achievement", false);');
  const panel = window.document.getElementById('dash-panel-achievement');
  const unlocked = panel.querySelectorAll('.ach-card.ach-unlocked');
  const locked = panel.querySelectorAll('.ach-card.ach-locked');
  check('unlocked card 數量 = 1', unlocked.length === 1, `got ${unlocked.length}`);
  check('locked card 數量 = 21', locked.length === 21, `got ${locked.length}`);
  // unlocked card 有 data-id, data-cat, data-tier
  const firstUnlocked = unlocked[0];
  check('unlocked card 有 data-id', firstUnlocked && firstUnlocked.dataset.id === 'first_battle',
    `got ${firstUnlocked && firstUnlocked.dataset.id}`);
  check('unlocked card 有 data-cat', firstUnlocked && firstUnlocked.dataset.cat === 'battle',
    `got ${firstUnlocked && firstUnlocked.dataset.cat}`);
  check('unlocked card 有 data-tier', firstUnlocked && firstUnlocked.dataset.tier === 'bronze',
    `got ${firstUnlocked && firstUnlocked.dataset.tier}`);
  // unlocked card 有 date meta
  const dateEl = firstUnlocked && firstUnlocked.querySelector('.ach-card-date');
  check('unlocked card 有 date meta', dateEl && dateEl.textContent.includes('2026'),
    `got "${dateEl && dateEl.textContent}"`);
  // locked card 有 progress bar
  const firstLocked = locked[0];
  const progBar = firstLocked && firstLocked.querySelector('.ach-card-progress-bar');
  const progFill = firstLocked && firstLocked.querySelector('.ach-card-progress-fill');
  check('locked card 有 progress bar', !!progBar, 'no .ach-card-progress-bar');
  check('locked card 有 progress fill', !!progFill, 'no .ach-card-progress-fill');
  check('progress fill 設咗 width', progFill && /width:\d+%/.test(progFill.getAttribute('style')),
    `got ${progFill && progFill.getAttribute('style')}`);
  // locked card icon 係 🔒
  const lockedIcon = firstLocked && firstLocked.querySelector('.ach-card-icon');
  check('locked card icon = 🔒', lockedIcon && lockedIcon.textContent.includes('🔒'),
    `got "${lockedIcon && lockedIcon.textContent}"`);
}

// ═══════════════════════════════════════════════════════════
section('5. Filter chip click → 切換顯示');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  runScript(window, STUB_ACHIEVEMENTS_CODE);
  window.localStorage.setItem('mathDungeon_achievements', JSON.stringify([
    { id: 'first_battle', unlockedAt: '2026/6/13 21:00:00' }
  ]));
  window.eval('showDashboardScreen(); switchDashboardTab("achievement", false);');
  const panel = window.document.getElementById('dash-panel-achievement');
  // 撳 "battle" chip
  const battleChip = panel.querySelector('.ach-chip[data-cat="battle"]');
  check('battle chip 存在', !!battleChip, 'no battle chip');
  // 模擬 click
  window.eval('document.querySelector("#dash-panel-achievement .ach-chip[data-cat=\\"battle\\"]").click()');
  const filter = panel.querySelector('.ach-filter');
  check('click battle chip → data-cat-active = battle', filter && filter.dataset.catActive === 'battle',
    `got ${filter && filter.dataset.catActive}`);
  // active class 移咗去 battle chip
  const activeChips = panel.querySelectorAll('.ach-chip.active');
  check('active class 移到 battle chip', activeChips.length === 1 && activeChips[0] === battleChip,
    `got ${activeChips.length} active chips`);
  // 撳 "practice" chip
  window.eval('document.querySelector("#dash-panel-achievement .ach-chip[data-cat=\\"practice\\"]").click()');
  check('click practice chip → data-cat-active = practice', filter.dataset.catActive === 'practice',
    `got ${filter.dataset.catActive}`);
  // 撳 "all" 返去
  window.eval('document.querySelector("#dash-panel-achievement .ach-chip[data-cat=\\"all\\"]").click()');
  check('click all chip → data-cat-active = all', filter.dataset.catActive === 'all',
    `got ${filter.dataset.catActive}`);
  // 確認 grid 入面 category 正確分佈（唔同 category 都有 card）
  const cards = panel.querySelectorAll('.ach-card');
  const cats = new Set();
  cards.forEach(c => cats.add(c.dataset.cat));
  check('grid 入面有 battle/practice/weak/curve/streak 全部 category', cats.size === 5,
    `got ${cats.size} unique categories: ${[...cats].join(',')}`);
}

// ═══════════════════════════════════════════════════════════
section('6. Hash routing #dashboard/achievement 切到正確 panel');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  window.location.hash = '#dashboard/achievement';
  window.eval('showDashboardScreen()');
  const activePanel = window.document.querySelector('.dash-panel.active');
  const activeTab = window.document.querySelector('.dash-tab.active');
  check('hash #dashboard/achievement 切到 achievement panel', activePanel && activePanel.dataset.panel === 'achievement',
    `got ${activePanel && activePanel.dataset.panel}`);
  check('hash 切到 achievement button', activeTab && activeTab.dataset.tab === 'achievement',
    `got ${activeTab && activeTab.dataset.tab}`);
}

// ═══════════════════════════════════════════════════════════
section('7. Empty state（0 解鎖時）');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  runScript(window, STUB_ACHIEVEMENTS_CODE);
  // 解鎖 list 設空
  window.localStorage.setItem('mathDungeon_achievements', '[]');
  window.eval('showDashboardScreen(); switchDashboardTab("achievement", false);');
  const panel = window.document.getElementById('dash-panel-achievement');
  const empty = panel.querySelector('.ach-empty');
  check('0 解鎖時 render .ach-empty', !!empty, 'no .ach-empty');
  const emptyText = empty && empty.querySelector('.ach-empty-text');
  check('empty text = "尚未解鎖任何成就"', emptyText && emptyText.textContent.includes('尚未解鎖'),
    `got "${emptyText && emptyText.textContent}"`);
  const emptyBtn = empty && empty.querySelector('.ach-empty-btn');
  check('empty state 有 button（"回到主頁"）', !!emptyBtn, 'no .ach-empty-btn');
  // 冇 grid / filter / summary（empty 取代）
  const grid = panel.querySelector('.ach-grid');
  const filter = panel.querySelector('.ach-filter');
  const summary = panel.querySelector('.ach-summary');
  check('empty state 下冇 grid', !grid, 'grid should not exist');
  check('empty state 下冇 filter chips', !filter, 'filter should not exist');
  check('empty state 下冇 summary', !summary, 'summary should not exist');
}

// ═══════════════════════════════════════════════════════════
section('8. Tier 4 種 + CSS 顏色 hash attribute selector 喺度');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  // 檢查 CSS 入面有 4 種 tier border + 4 種 filter selector
  check('CSS 有 tier-bronze border', /\[data-tier="bronze"\]\{border-color:#cd7f32/.test(html), 'no bronze border CSS');
  check('CSS 有 tier-silver border', /\[data-tier="silver"\]\{border-color:#c0c0c0/.test(html), 'no silver border CSS');
  check('CSS 有 tier-gold border',   /\[data-tier="gold"\]\{border-color:#ffd700/.test(html), 'no gold border CSS');
  check('CSS 有 tier-platinum border', /\[data-tier="platinum"\]\{border-color:#e0e0ff/.test(html), 'no platinum border CSS');
  // CSS 5 種 filter selector
  check('CSS 有 filter battle selector',  /\[data-cat-active="battle"\]~.ach-grid/.test(html), 'no battle filter CSS');
  check('CSS 有 filter practice selector', /\[data-cat-active="practice"\]~.ach-grid/.test(html), 'no practice filter CSS');
  check('CSS 有 filter weak selector',    /\[data-cat-active="weak"\]~.ach-grid/.test(html), 'no weak filter CSS');
  check('CSS 有 filter curve selector',   /\[data-cat-active="curve"\]~.ach-grid/.test(html), 'no curve filter CSS');
  check('CSS 有 filter streak selector',  /\[data-cat-active="streak"\]~.ach-grid/.test(html), 'no streak filter CSS');
}

// ═══════════════════════════════════════════════════════════
section('9. Icon asset 存在 + size <= 10KB');
{
  const iconPath = path.join(__dirname, '..', 'assets', 'images', 'sprint18', 'icon-achievement.webp');
  const exists = fs.existsSync(iconPath);
  check('icon-achievement.webp 存在', exists, `not found at ${iconPath}`);
  if (exists) {
    const stat = fs.statSync(iconPath);
    check('icon size <= 10KB', stat.size <= 10 * 1024, `got ${stat.size} bytes (${(stat.size/1024).toFixed(1)}KB)`);
  }
}

// ═══════════════════════════════════════════════════════════
section('10. Re-render 唔會累積（clear old 然後再 render）');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  runScript(window, STUB_ACHIEVEMENTS_CODE);
  window.localStorage.setItem('mathDungeon_achievements', JSON.stringify([
    { id: 'first_battle', unlockedAt: '2026/6/13 21:00:00' }
  ]));
  window.eval('showDashboardScreen(); switchDashboardTab("achievement", false);');
  // 再 render 多次
  window.eval('renderAchievementPanel(); renderAchievementPanel(); renderAchievementPanel();');
  const panel = window.document.getElementById('dash-panel-achievement');
  const grids = panel.querySelectorAll('.ach-grid');
  check('re-render 3 次後只有 1 個 grid', grids.length === 1, `got ${grids.length} grids`);
  const filters = panel.querySelectorAll('.ach-filter');
  check('re-render 3 次後只有 1 個 filter', filters.length === 1, `got ${filters.length} filters`);
  const summaries = panel.querySelectorAll('.ach-summary');
  check('re-render 3 次後只有 1 個 summary', summaries.length === 1, `got ${summaries.length} summaries`);
  // cards count stay 22
  const cards = panel.querySelectorAll('.ach-card');
  check('re-render 後 card 數量 = 22', cards.length === 22, `got ${cards.length}`);
}

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  Total: ${passes + fails}  ✅ PASS: ${passes}  ❌ FAIL: ${fails}`);
console.log('══════════════════════════════════════════════════════════');
process.exit(fails > 0 ? 1 : 0);
