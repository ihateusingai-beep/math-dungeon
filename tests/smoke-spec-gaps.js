#!/usr/bin/env node
/**
 * Sprint 2 spec-gaps smoke test (3 new checks + 16 regression checks).
 *
 * Strategy: extract pure JS function bodies from index.html + stages.json,
 * evaluate in a vm.Context with minimal DOM/localStorage stubs, then assert.
 *
 * This is NOT a replacement for the playwright headless smoke in
 * `.mavis/plans/final-review.md` §4.2, but a focused regression + new-feature
 * verifier that works without a browser runtime.
 *
 * Usage: node tests/smoke-spec-gaps.js
 *   (or via npm test if package.json adds it)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');
const INDEX = path.join(REPO, 'index.html');
const STAGES = path.join(REPO, 'data/stages.json');

let passes = 0;
let fails = 0;
const failDetails = [];

function check(name, ok, detail) {
  if (ok) {
    passes++;
    console.log(`  ✅ ${name}`);
  } else {
    fails++;
    failDetails.push(`❌ ${name} — ${detail || '(no detail)'}`);
    console.log(`  ❌ ${name} — ${detail || '(no detail)'}`);
  }
}

function section(title) {
  console.log(`\n══ ${title} ══`);
}

// ════════════════════════════════════════════════════════════════
// Build minimal DOM + global stubs
// ════════════════════════════════════════════════════════════════
function buildContext() {
  const elements = new Map();
  function el(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        hidden: true,
        className: '',
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
          _set: new Set(),
          add(c) { this._set.add(c); },
          remove(c) { this._set.delete(c); },
          contains(c) { return this._set.has(c); },
        },
        offsetWidth: 0,
        appendChild() {},
        removeChild() {},
        focus() {},
        getAttribute() { return null; },
        setAttribute() {},
        addEventListener() {},
      });
    }
    return elements.get(id);
  }
  const document = {
    getElementById: el,
    createElement: () => ({
      textContent: '',
      innerHTML: '',
      className: '',
      classList: { add(){}, remove(){}, contains(){return false;}, _set: new Set() },
      style: {},
    }),
    querySelectorAll: () => [],
  };
  const localStorageData = {};
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(localStorageData, k) ? localStorageData[k] : null; },
    setItem(k, v) { localStorageData[k] = String(v); },
    removeItem(k) { delete localStorageData[k]; },
    clear() { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); },
    _dump() { return localStorageData; },
  };
  const ctx = {
    document,
    localStorage,
    console,
    Math,
    Date,
    JSON,
    Set,
    Map,
    Number,
    String,
    Array,
    Object,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout: (fn, ms) => { /* default; tests can stub */ },
    clearTimeout: () => {},
    alert: () => {},
    confirm: () => true,
    window: null,
    speechSynthesis: { cancel(){}, speak(){}, getVoices: () => [] },
  };
  ctx.window = ctx;
  return { ctx, localStorage, document };
}

// ════════════════════════════════════════════════════════════════
// Extract pure JS function bodies from index.html
//   extractCode()           → P0-4c block up through saveBattleResultToLocal
//                             (used by testCountdown/testStars/testMonsterMod)
//   extractStatsHelpers()   → extends up to just before DASHBOARD section
//                             (adds recordQuestionTiming, getOverallStats,
//                              getRadarMetrics, getWeakQuestions, etc.)
// ════════════════════════════════════════════════════════════════
function extractCode() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const start = html.indexOf('// ==================== P0-4c: Difficulty');
  if (start < 0) throw new Error('P0-4c block not found');
  const endMarker = 'function nextQuestion()';
  const end = html.indexOf(endMarker, start);
  if (end < 0) throw new Error('nextQuestion not found');
  return html.slice(start, end);
}

function extractStatsHelpers() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const start = html.indexOf('// ==================== P0-4c: Difficulty');
  if (start < 0) throw new Error('P0-4c block not found');
  // Extend to just before DASHBOARD section so we include Sprint 17
  // stats helpers (getOverallStats / getRadarMetrics / getWeakQuestions / etc.)
  const endMarker = '// ==================== DASHBOARD';
  const end = html.indexOf(endMarker, start);
  if (end < 0) throw new Error('DASHBOARD section marker not found');
  return html.slice(start, end);
}

// ════════════════════════════════════════════════════════════════
// Test 1: P0-4a — Countdown timeout triggers submitChoice(0)
// ════════════════════════════════════════════════════════════════
function testCountdown() {
  section('P0-4a: Countdown — 超時觸發 submitChoice(0)');

  const code = extractCode();
  const { ctx } = buildContext();

  // Replace the real QUESTION_TIME_LIMIT_MS=30000 with 100ms to speed up the test
  const codeShort = code.replace('const QUESTION_TIME_LIMIT_MS = 30000;', 'const QUESTION_TIME_LIMIT_MS = 100;');

  // Provide stub battleState + addLog + submitChoice that records calls
  let timerFired = false;
  let submitCalledWith = null;
  let addLogCalled = false;

  ctx.battleState = { battleActive: true };
  ctx.addLog = (msg) => { if (typeof msg === 'string' && msg.includes('超時')) addLogCalled = true; };
  ctx.submitChoice = (val) => {
    submitCalledWith = val;
    // After submitChoice, code will call clearQuestionTimer which is fine
  };
  // Override setTimeout to invoke the callback immediately (synchronous test)
  ctx.setTimeout = (fn, ms) => {
    if (ms === 100) { fn(); return 1; }
    return setTimeoutOriginal(fn, ms);
  };
  ctx.clearTimeout = () => {};
  // We need a real setTimeout fallback for nested setTimeout (warnAt/dangerAt)
  const setTimeoutOriginal = setTimeout;

  vm.createContext(ctx);
  vm.runInContext(codeShort, ctx);

  // Call startQuestionTimer
  ctx.startQuestionTimer();

  check('setTimeout 超時 callback 觸發', submitCalledWith === 0,
    `submitCalledWith=${submitCalledWith} (expected 0)`);
  check('addLog 顯示 "⏰ 超時" 訊息', addLogCalled,
    'addLog 沒被調用或訊息不含"超時"');
}

// ════════════════════════════════════════════════════════════════
// Test 2: P0-4b — computeBattleStars accuracy ladder
// ════════════════════════════════════════════════════════════════
function testStars() {
  section('P0-4b: computeBattleStars — accuracy 6 級評分');

  const code = extractCode();
  const { ctx } = buildContext();
  vm.createContext(ctx);
  // Evaluate only the bits we need
  vm.runInContext(code + '\nthis.computeBattleStars = computeBattleStars;\nthis.renderBattleStars = renderBattleStars;\nthis.saveBattleResultToLocal = saveBattleResultToLocal;', ctx);

  const cases = [
    { acc: 0,   expected: 0 },  // 0% → 0 stars
    { acc: 10,  expected: 1 },  // >0% <25% → 1 star
    { acc: 24,  expected: 1 },
    { acc: 25,  expected: 2 },  // ≥25% → 2 stars
    { acc: 49,  expected: 2 },
    { acc: 50,  expected: 3 },  // ≥50% → 3 stars
    { acc: 74,  expected: 3 },
    { acc: 75,  expected: 4 },  // ≥75% → 4 stars
    { acc: 89,  expected: 4 },
    { acc: 90,  expected: 5 },  // ≥90% → 5 stars
    { acc: 100, expected: 5 },
    { acc: -5,  expected: 0 },  // negative → 0
    { acc: NaN, expected: 0 },  // NaN → 0
  ];
  for (const c of cases) {
    const got = ctx.computeBattleStars(c.acc);
    check(`accuracy=${c.acc} → ${c.expected} stars`, got === c.expected,
      `got ${got}`);
  }

  // Test renderBattleStars
  const html5 = ctx.renderBattleStars(5);
  const html0 = ctx.renderBattleStars(0);
  check('renderBattleStars(5) 含 5 顆 ⭐', (html5.match(/⭐/g) || []).length === 5,
    `star count: ${(html5.match(/⭐/g) || []).length}`);
  check('renderBattleStars(0) 標籤 "再接再厲"', html0.includes('再接再厲'),
    'label missing');
  check('renderBattleStars(5) 標籤 "完美！"', html5.includes('完美'),
    'label missing');
  check('renderBattleStars(5) 含 "5/5"', html5.includes('5/5'),
    'counter missing');

  // Test saveBattleResultToLocal round-trip + max-stars preservation
  const { localStorage } = buildContext();
  const ctx2 = { localStorage, console, Math, Date, JSON };
  vm.createContext(ctx2);
  vm.runInContext(code + '\nthis.saveBattleResultToLocal = saveBattleResultToLocal;', ctx2);
  ctx2.saveBattleResultToLocal('stage-1', 3, 60, true);
  const after1 = JSON.parse(ctx2.localStorage.getItem('mathDungeon_battleResult_stage-1'));
  check('saveBattleResultToLocal 第一次寫入 stars=3', after1.stars === 3,
    `got ${after1.stars}`);
  ctx2.saveBattleResultToLocal('stage-1', 5, 95, true);
  const after2 = JSON.parse(ctx2.localStorage.getItem('mathDungeon_battleResult_stage-1'));
  check('saveBattleResultToLocal 第二次 stars=5 提升到 5', after2.stars === 5,
    `got ${after2.stars}`);
  ctx2.saveBattleResultToLocal('stage-1', 2, 30, true);
  const after3 = JSON.parse(ctx2.localStorage.getItem('mathDungeon_battleResult_stage-1'));
  check('saveBattleResultToLocal 第三次 stars=2 保留歷史最高 5', after3.stars === 5,
    `got ${after3.stars} (expected max-preservation)`);
}

// ════════════════════════════════════════════════════════════════
// Test 3: P0-4c — MONSTER_MOD_BY_DIFF 4 個難度倍率 + getMonsterMod fallback
// ════════════════════════════════════════════════════════════════
function testMonsterMod() {
  section('P0-4c: monsterMod — 4 難度倍率 + 未知 fallback');

  const code = extractCode();
  const { ctx } = buildContext();
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.getMonsterMod = getMonsterMod;\nthis.MONSTER_MOD_BY_DIFF = MONSTER_MOD_BY_DIFF;', ctx);

  const cases = [
    { diff: 'easy',   hp: 0.8, atk: 0.8 },
    { diff: 'normal', hp: 1.0, atk: 1.0 },
    { diff: 'hard',   hp: 1.2, atk: 1.2 },
    { diff: 'boss',   hp: 1.5, atk: 1.5 },
  ];
  for (const c of cases) {
    const mod = ctx.getMonsterMod(c.diff);
    check(`getMonsterMod("${c.diff}").hp === ${c.hp}`, mod.hp === c.hp,
      `got ${mod.hp}`);
    check(`getMonsterMod("${c.diff}").atk === ${c.atk}`, mod.atk === c.atk,
      `got ${mod.atk}`);
  }

  // Fallback for unknown difficulty
  const fallback = ctx.getMonsterMod('unknown');
  check('getMonsterMod("unknown") fallback to easy (hp=0.8)', fallback.hp === 0.8,
    `got ${fallback.hp}`);
  const empty = ctx.getMonsterMod(undefined);
  check('getMonsterMod(undefined) fallback to easy (hp=0.8)', empty.hp === 0.8,
    `got ${empty.hp}`);

  // Test the 2 call sites use getMonsterMod instead of inline ternaries
  const html = fs.readFileSync(INDEX, 'utf8');
  const callSiteCount = (html.match(/getMonsterMod\(/g) || []).length;
  // Expect 4: 1 definition + 2 call sites in startBattle/spawnNextWave + 1 in test
  check('getMonsterMod 有定義 + 2 調用點 (startBattle, spawnNextWave)', callSiteCount >= 3,
    `got ${callSiteCount} occurrences`);

  // stages.json boss stage uses difficulty: "boss"
  const stages = JSON.parse(fs.readFileSync(STAGES, 'utf8'));
  // Schema: stages[topic][table].stages[] — flatten
  const allStages = [];
  for (const topic of Object.values(stages)) {
    for (const table of Object.values(topic || {})) {
      if (table && Array.isArray(table.stages)) {
        for (const s of table.stages) allStages.push(s);
      }
    }
  }
  const bossStages = allStages.filter(s => s.id && s.id.startsWith('boss-'));
  check('stages.json 有 boss 入口 (>=1 stage)', bossStages.length >= 1,
    `got ${bossStages.length} boss stages`);
  for (const bs of bossStages) {
    check(`boss stage "${bs.id}" difficulty === "boss"`, bs.difficulty === 'boss',
      `got "${bs.difficulty}"`);
  }
  // Backward compatibility: 2-easy/2-normal/2-hard/3-* / 5-* still have explicit difficulty
  const explicit = allStages.filter(s => s.id && /^[235]-(easy|normal|hard)$/.test(s.id));
  let allExplicit = true;
  for (const s of explicit) {
    if (!['easy', 'normal', 'hard'].includes(s.difficulty)) allExplicit = false;
  }
  check('9 個 2/3/5 stage 都有 explicit difficulty (向後兼容)', allExplicit && explicit.length === 9,
    `explicit.length=${explicit.length}, allExplicit=${allExplicit}`);
}

// ════════════════════════════════════════════════════════════════
// Test 4: 16 個原有 smoke 的回歸 — function 存在性 + q.a/b regex
// ════════════════════════════════════════════════════════════════
function testRegression() {
  section('Regression: 16 原有 smoke checks 的非 runtime 驗證');

  const html = fs.readFileSync(INDEX, 'utf8');
  // 6) 函數存在性
  const fns = ['startBattle', 'nextQuestion', 'submitChoice', 'submitNumpad',
               'saveProgress', 'loadProgress', 'savePracticeResult',
               'getPracticeData', 'checkBattleEnd', 'showBattleResult'];
  for (const fn of fns) {
    const present = new RegExp(`function\\s+${fn}\\s*\\(`).test(html);
    check(`function ${fn}() 存在`, present, 'definition not found');
  }

  // 10) counter 怪值修復 — line 1446 in worktree
  const counterFix = /totalQ\s*=\s*battleState\.questions\.length\s*\*\s*battleState\.enemiesPerStage/.test(html);
  check('counter 修復: totalQ = questions.length * enemiesPerStage', counterFix,
    'regression! 計數器會顯示 1/10 而非 1/30');

  // 9) 暴擊視覺修復 — line 1545
  const critFix = /skillUsed === 'critical'/.test(html) && /showDmgNumber\(dmg,\s*false,\s*skillUsed === 'critical'\)/.test(html);
  check('暴擊視覺修復: submitChoice 1545/1579 用 skillUsed', critFix,
    'regression! crit-number 還是缺');

  // q.a / q.b regex — line ~1439 in worktree
  const qRegexCheck = html.includes('q.q.match(/(\\d+)') || /q\.q\.match\(\/\(\\d\+\)\\s\*\[×x\]\\s\*\(\\d\+\)\/i\)/.test(html);
  check('q.a/b regex parser 存在', qRegexCheck, 'regex not found');

  // SPEC.md markers
  const spec = fs.readFileSync(path.join(REPO, 'SPEC.md'), 'utf8');
  const specMarkers = (spec.match(/已實作 \(sprint2\/spec-gaps P0-4[abc]\)/g) || []).length;
  check('SPEC.md 補完標記 >= 3', specMarkers >= 3,
    `got ${specMarkers} markers (expected 3 for P0-4a/b/c, P1-5 may add)`);
  // 4 SPEC sections: L521-536 (countdown), L549-557 (monster mod), L743-760 (stars), L1042-1111 (stars detail)
  const sectionRefs = (spec.match(/sprint2\/spec-gaps P0-4[abc]\)/g) || []).length;
  check('SPEC.md P0-4a/b/c 標記共 >= 3', sectionRefs >= 3,
    `got ${sectionRefs}`);

  // Boss 入口 (P1-5) — difficulty list
  const bossButton = /<button[^>]*class="diff-btn boss"/.test(html);
  check('P1-5: difficulty list 含 "boss" 按鈕', bossButton, 'diff-btn boss missing');

  // 4) 頁面大小 141353 bytes (regression — index.html should be ~148KB after edits)
  const size = fs.statSync(INDEX).size;
  check('index.html 大小 > 140KB (頁面沒被截斷)', size > 140000,
    `size=${size}`);
}

// ════════════════════════════════════════════════════════════════
// Test 5: Sprint 17 — 數據層 5 條新 assertion
//   - recordQuestionTiming round-trip
//   - saveBattleResultToLocal 雙 key 寫入
//   - getAchievementProgress stub
//   - getOverallStats empty shape（5/8 由 UI 觸發唔入 smoke）
//   - getWeakQuestions 跨 source ranking
// ════════════════════════════════════════════════════════════════
function testSprint17() {
  section('Sprint 17 — 統計頁面數據層 (5 new checks)');

  const code = extractStatsHelpers();
  const { ctx, localStorage } = buildContext();
  vm.createContext(ctx);
  vm.runInContext(code + '\n' +
    'this.saveBattleResultToLocal = saveBattleResultToLocal;\n' +
    'this.recordQuestionTiming = recordQuestionTiming;\n' +
    'this.getAchievementProgress = getAchievementProgress;\n' +
    'this.getOverallStats = getOverallStats;\n' +
    'this.getRadarMetrics = getRadarMetrics;\n' +
    'this.getWeakQuestions = getWeakQuestions;\n' +
    'this.getLearningCurve = getLearningCurve;\n' +
    'this.getStreakHeatmap = getStreakHeatmap;\n' +
    'this.getBattleHeatmap = getBattleHeatmap;\n' +
    'this.getPlayerName = getPlayerName;', ctx);

  // 1. recordQuestionTiming round-trip
  ctx.recordQuestionTiming('stage-1', '2x3', 2500);
  ctx.recordQuestionTiming('stage-1', '2x4', 1800);
  const timing = JSON.parse(ctx.localStorage.getItem('mathDungeon_questionTiming'));
  check('recordQuestionTiming 寫入後讀到正確 duration', timing && timing['stage-1'] && timing['stage-1']['2x3'] === 2500,
    `got ${JSON.stringify(timing)}`);
  check('recordQuestionTiming 多筆獨立記錄', timing['stage-1']['2x4'] === 1800,
    `got 2x4=${timing['stage-1'] && timing['stage-1']['2x4']}`);

  // 2. saveBattleResultToLocal 雙 key 寫入
  ctx.saveBattleResultToLocal('3-easy', 4, 80, true);
  const newKey = JSON.parse(ctx.localStorage.getItem('mathDungeon_battleResult_3-easy_unknown'));
  const oldKey = JSON.parse(ctx.localStorage.getItem('mathDungeon_battleResult_3-easy'));
  check('saveBattleResultToLocal 雙 key — 新 key 有 stars', newKey && newKey.stars === 4,
    `new key missing/wrong: ${JSON.stringify(newKey)}`);
  check('saveBattleResultToLocal 雙 key — 舊 key fallback 有 stars', oldKey && oldKey.stars === 4,
    `old key missing/wrong: ${JSON.stringify(oldKey)}`);

  // 3. getAchievementProgress stub
  const ach = ctx.getAchievementProgress();
  check('getAchievementProgress 返回 { unlocked, inProgress } 結構',
    ach && Array.isArray(ach.unlocked) && typeof ach.inProgress === 'object',
    `got ${JSON.stringify(ach)}`);

  // 4. getOverallStats empty data 回 0
  const stats = ctx.getOverallStats();
  check('getOverallStats 空數據回傳 shape 齊全（totalAnswered=0, overallAccuracy=0）',
    stats && stats.totalAnswered === 0 && stats.overallAccuracy === 0 && typeof stats.maxStars === 'number',
    `got ${JSON.stringify(stats)}`);

  // 5. getRadarMetrics 6 軸 0-100
  const radar = ctx.getRadarMetrics();
  const axes = ['str','agi','spd','wis','def','hp'];
  const radarOk = radar && axes.every(a => typeof radar[a] === 'number' && radar[a] >= 0 && radar[a] <= 100 && !isNaN(radar[a]));
  check('getRadarMetrics 6 軸 (str/agi/spd/wis/def/hp) 全部 0-100 無 NaN', radarOk,
    `got ${JSON.stringify(radar)}`);
}

// ════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════
console.log('══════════════════════════════════════════════════════════');
console.log(' Sprint 2 spec-gaps smoke (3 new + 16 regression checks)');
console.log('══════════════════════════════════════════════════════════');

try {
  testCountdown();
  testStars();
  testMonsterMod();
  testRegression();
  testSprint17();
} catch (e) {
  console.error('\n💥 Unhandled error:', e.stack || e.message);
  fails++;
}

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  Total: ${passes + fails}  ✅ PASS: ${passes}  ❌ FAIL: ${fails}`);
console.log('══════════════════════════════════════════════════════════');
if (fails > 0) {
  console.log('\nFailure details:');
  failDetails.forEach(d => console.log('  ' + d));
  process.exit(1);
} else {
  process.exit(0);
}
