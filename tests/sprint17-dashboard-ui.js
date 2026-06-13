#!/usr/bin/env node
/**
 * Sprint 17 — Dashboard UI smoke (jsdom-based, no shared browser state)
 *
 * Verifies:
 *   1. All 5 tab panels exist with correct data-panel attributes
 *   2. showDashboardScreen() runs without throwing
 *   3. Each tab panel contains the expected hero banner
 *   4. Hash routing #dashboard/<tab> works
 *   5. Tab switching via switchDashboardTab() updates visible panel
 *   6. With mock data: each panel renders non-empty content
 *
 * Usage: node tests/sprint17-dashboard-ui.js
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

function buildJsdom(mockData = {}) {
  // Strip <script> so we control when it runs
  const dom = new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/, ''), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/'
  });
  const { window } = dom;

  // Stub AudioContext (no audio in test)
  window.AudioContext = class { constructor() {} };
  window.speechSynthesis = { cancel(){}, speak(){}, getVoices: () => [] };

  // Seed localStorage with mock data
  if (mockData.practice) {
    window.localStorage.setItem('math_dungeon_practice', JSON.stringify(mockData.practice));
  }
  if (mockData.battleResult) {
    for (const [k, v] of Object.entries(mockData.battleResult)) {
      window.localStorage.setItem('mathDungeon_battleResult_' + k, JSON.stringify(v));
    }
  }
  if (mockData.learningLog) {
    window.localStorage.setItem('mathDungeon_learningLog', JSON.stringify(mockData.learningLog));
  }
  if (mockData.questionTiming) {
    window.localStorage.setItem('mathDungeon_questionTiming', JSON.stringify(mockData.questionTiming));
  }
  // Seed gameState.playerName for banner
  if (mockData.playerName) {
    window.localStorage.setItem('mathDungeon_save', JSON.stringify({ playerName: mockData.playerName }));
  }

  return { dom, window };
}

function runScript(window, code) {
  // jsdom with runScripts: 'dangerously' — write a <script> tag and let it execute.
  // Functions become available via window.eval.
  const script = window.document.createElement('script');
  script.textContent = code;
  window.document.head.appendChild(script);
}

function findScriptCode() {
  // Find <script> block (not the injected stub) — re-read the file
  const fresh = fs.readFileSync(INDEX, 'utf8');
  const m = fresh.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no script block found');
  return m[1];
}

section('1. 結構：5 個 tab panel + 5 個 tab button');
{
  const { window } = buildJsdom();
  const panels = window.document.querySelectorAll('.dash-panel');
  const tabs = window.document.querySelectorAll('.dash-tab');
  // Sprint 18 加咗 achievement tab → 5 → 6
  check('有 6 個 .dash-panel', panels.length === 6, `got ${panels.length}`);
  check('有 6 個 .dash-tab', tabs.length === 6, `got ${tabs.length}`);
  const expectedPanels = ['overview','battle','practice','weak','curve','achievement'];
  const expectedTabs = ['overview','battle','practice','weak','curve','achievement'];
  const panelsOk = expectedPanels.every((p, i) => panels[i] && panels[i].dataset.panel === p);
  check('panels 順序：overview/battle/practice/weak/curve/achievement', panelsOk, 'panel order wrong');
  const tabsOk = expectedTabs.every((t, i) => tabs[i] && tabs[i].dataset.tab === t);
  check('tabs 順序同上', tabsOk, 'tab order wrong');
  // 6 個 tab icon
  const icons = window.document.querySelectorAll('.dash-tab-icon');
  check('每個 tab 有 icon', icons.length === 6, `got ${icons.length}`);
}

section('2. 空數據：showDashboardScreen() 唔會 throw');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  try {
    window.eval('showDashboardScreen()');
    check('空數據 showDashboardScreen 正常執行', true);
  } catch (e) {
    check('空數據 showDashboardScreen 正常執行', false, e.message);
  }
  // 6 個 panel 都應該有 hero banner（Sprint 18 加咗 achievement）
  const heroes = window.document.querySelectorAll('.dash-hero');
  check('每個 panel 都有 hero banner（6 個）', heroes.length === 6, `got ${heroes.length}`);
  // 預設 tab = overview
  const activePanel = window.document.querySelector('.dash-panel.active');
  check('預設 active panel = overview', activePanel && activePanel.dataset.panel === 'overview',
    `got ${activePanel && activePanel.dataset.panel}`);
  // Empty state 至少出現一次
  const empties = window.document.querySelectorAll('.dash-empty');
  check('空數據時至少一個 panel 顯示 empty state', empties.length >= 1, `got ${empties.length}`);
}

section('3. Mock 數據：每個 panel render 出非空內容');
{
  const mockData = {
    playerName: '凱文',
    practice: {
      '0': [{ correct: 7, total: 10, wrong: ['7×8=56','8×7=56'], date: '2026-06-13' }],
      '7': [{ correct: 9, total: 10, wrong: [], date: '2026-06-12' }, { correct: 10, total: 10, wrong: [], date: '2026-06-13' }]
    },
    battleResult: {
      '2-easy': { stars: 5, lastAccuracy: 95, lastVictory: true, lastPlayed: '2026/6/13' },
      '2-easy_easy': { stars: 5, lastAccuracy: 95, lastVictory: true, lastPlayed: '2026/6/13' }
    },
    learningLog: [
      { date: '2026/6/13, 14:00:00', stageId: '2-easy', difficulty: 'easy', correctCount: 9, wrongCount: 1, accuracy: 90, maxCombo: 7, totalDamage: 100, wrongQuestions: ['7 × 8 = ?'] },
      { date: '2026/6/12, 10:00:00', stageId: '7-easy', difficulty: 'easy', correctCount: 10, wrongCount: 0, accuracy: 100, maxCombo: 10, totalDamage: 80, wrongQuestions: [] }
    ],
    questionTiming: {
      '2-easy': { '2x3': 2500, '2x4': 1800 }
    }
  };
  const { window } = buildJsdom(mockData);
  const code = findScriptCode();
  runScript(window, code);
  window.eval('showDashboardScreen()');
  // 6 個 stat card
  const statCards = window.document.querySelectorAll('.stat-card');
  check('overview 渲染 6 個 stat card', statCards.length >= 6, `got ${statCards.length}`);
  // 雷達圖 SVG
  const radar = window.document.querySelector('.radar-chart');
  check('overview 渲染雷達圖', !!radar, 'no radar-chart');
  const radarDots = window.document.querySelectorAll('.radar-dot');
  check('雷達圖有 6 個數據點', radarDots.length === 6, `got ${radarDots.length}`);
  // battle heatmap
  window.eval('switchDashboardTab("battle", false)');
  const heatmapCells = window.document.querySelectorAll('.battle-heatmap-cell');
  check('battle panel 渲染 heatmap cells', heatmapCells.length >= 4, `got ${heatmapCells.length}`);
  // practice
  window.eval('switchDashboardTab("practice", false)');
  const practiceRows = window.document.querySelectorAll('.practice-row');
  check('practice panel 渲染 row', practiceRows.length >= 2, `got ${practiceRows.length}`);
  const streakCells = window.document.querySelectorAll('.streak-cell');
  check('practice panel 渲染 streak heatmap (30 cells)', streakCells.length === 30, `got ${streakCells.length}`);
  const sparklines = window.document.querySelectorAll('.practice-spark');
  check('practice row 有 sparkline', sparklines.length >= 2, `got ${sparklines.length}`);
  // weak
  window.eval('switchDashboardTab("weak", false)');
  const weakBars = window.document.querySelectorAll('.weak-bar-row');
  check('weak panel 渲染 bar chart rows', weakBars.length >= 1, `got ${weakBars.length}`);
  // curve
  window.eval('switchDashboardTab("curve", false)');
  const curveSvg = window.document.querySelector('.curve-svg');
  check('curve panel 渲染 SVG line chart', !!curveSvg, 'no curve-svg');
  const curveLine = window.document.querySelector('.curve-line');
  check('curve line 有 path', !!curveLine, 'no curve-line');
}

section('4. Hash routing：#dashboard/battle 自動切 tab');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  window.location.hash = '#dashboard/battle';
  window.eval('showDashboardScreen()');
  const activePanel = window.document.querySelector('.dash-panel.active');
  check('hash #dashboard/battle 切到 battle tab', activePanel && activePanel.dataset.panel === 'battle',
    `got ${activePanel && activePanel.dataset.panel}`);
}

section('5. Tab 切換：switchDashboardTab 更新 visible panel + active button');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  window.eval('showDashboardScreen()');
  window.eval('switchDashboardTab("weak", true)');
  const activePanel = window.document.querySelector('.dash-panel.active');
  const activeTab = window.document.querySelector('.dash-tab.active');
  check('switchDashboardTab("weak") 切到 weak panel', activePanel && activePanel.dataset.panel === 'weak',
    `got ${activePanel && activePanel.dataset.panel}`);
  check('switchDashboardTab("weak") 切到 weak button', activeTab && activeTab.dataset.tab === 'weak',
    `got ${activeTab && activeTab.dataset.tab}`);
}

section('6. 學生名字 banner');
{
  const { window } = buildJsdom({ playerName: '小美' });
  const code = findScriptCode();
  runScript(window, code);
  window.eval('showDashboardScreen()');
  const heroName = window.document.querySelector('.dash-hero-name-text');
  check('banner 顯示 player name', heroName && heroName.textContent === '小美',
    `got "${heroName && heroName.textContent}"`);
}

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  Total: ${passes + fails}  ✅ PASS: ${passes}  ❌ FAIL: ${fails}`);
console.log('══════════════════════════════════════════════════════════');
process.exit(fails > 0 ? 1 : 0);
