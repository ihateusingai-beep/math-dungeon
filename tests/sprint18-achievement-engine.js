#!/usr/bin/env node
/**
 * Sprint 18 — 成就 engine smoke (jsdom-based, no shared browser state)
 *
 * Verifies:
 *   1. ACHIEVEMENTS 陣結構：22 個、id 唯一、rule return shape 正確
 *   2. getAchievementProgress() shape：{unlocked, inProgress}
 *   3. checkAndUnlockAchievements：battle/practice 觸發 + 冪等 + 壞 JSON 容錯
 *   4. localStorage 形狀正確：[{id, unlockedAt}, ...]
 *   5. derive-only trigger ('achievement-open') 唔寫 storage
 *   6. 個別 rule 函數：空 state / 滿足 condition / 邊界
 *
 * Usage: node tests/sprint18-achievement-engine.js
 */

'use strict';

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'index.html');

let passes = 0, fails = 0;
function check(name, ok, detail) {
  if (ok) { passes++; console.log(`  ✅ ${name}`); }
  else { fails++; console.log(`  ❌ ${name} — ${detail || '(no detail)'}`); }
}
function section(t) { console.log(`\n══ ${t} ══`); }

function buildJsdom(mockData = {}) {
  const html = fs.readFileSync(INDEX, 'utf8');
  // strip <script> so we control when it runs
  const dom = new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/, ''), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/'
  });
  const { window } = dom;

  // Stubs
  window.AudioContext = class { constructor() {} };
  window.speechSynthesis = { cancel(){}, speak(){}, getVoices: () => [] };
  window.alert = () => {};  // 避免 trigger 嗰陣 alert 彈出

  // Clear & seed
  window.localStorage.clear();
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
  if (mockData.unlocked) {
    window.localStorage.setItem('mathDungeon_achievements', JSON.stringify(mockData.unlocked));
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

// ────────────────────────────────────────────────────────────
// 1. ACHIEVEMENTS schema
// ────────────────────────────────────────────────────────────
section('1. ACHIEVEMENTS 陣結構');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  const arr = window.eval('ACHIEVEMENTS');
  check('ACHIEVEMENTS 存在', Array.isArray(arr), 'not an array');
  check('ACHIEVEMENTS 數量 = 22', arr && arr.length === 22, `got ${arr && arr.length}`);

  // 5 類分配
  const catCount = { battle: 0, practice: 0, weak: 0, curve: 0, streak: 0 };
  for (const a of arr) catCount[a.category] = (catCount[a.category] || 0) + 1;
  check('battle = 6', catCount.battle === 6, `got ${catCount.battle}`);
  check('practice = 5', catCount.practice === 5, `got ${catCount.practice}`);
  check('weak = 4', catCount.weak === 4, `got ${catCount.weak}`);
  check('curve = 4', catCount.curve === 4, `got ${catCount.curve}`);
  check('streak = 3', catCount.streak === 3, `got ${catCount.streak}`);

  // id 唯一
  const ids = new Set();
  let dup = null;
  for (const a of arr) {
    if (ids.has(a.id)) { dup = a.id; break; }
    ids.add(a.id);
  }
  check('id 唯一', !dup, `duplicate id: ${dup}`);

  // 每個都有 rule function
  const noRule = arr.filter(a => typeof a.rule !== 'function');
  check('每個成就都有 rule()', noRule.length === 0, `missing rule: ${noRule.map(a=>a.id).join(',')}`);

  // 每個 rule 喺空 ctx 都 return {progress, ctx}
  const emptyRuleOk = arr.every(a => {
    const r = a.rule({stats:{}, battles:{}, log:[], practice:{}, weak:[], curve:[], streak:0});
    return r && typeof r.progress === 'number' && r.progress >= 0 && r.progress <= 1;
  });
  check('每個 rule(空ctx) 都 return {progress: 0-1}', emptyRuleOk, 'shape violation');
}

// ────────────────────────────────────────────────────────────
// 2. getAchievementProgress() shape
// ────────────────────────────────────────────────────────────
section('2. getAchievementProgress() shape');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  const result = window.eval('getAchievementProgress()');
  check('return object', result && typeof result === 'object', 'not an object');
  check('unlocked 係 array', Array.isArray(result.unlocked), `got ${typeof result.unlocked}`);
  check('inProgress 係 object', result.inProgress && typeof result.inProgress === 'object', 'not an object');

  // 22 個 inProgress（全部都 populate 因為冇 unlocked）
  const ids = Object.keys(result.inProgress);
  check('inProgress 入面有 22 個成就', ids.length === 22, `got ${ids.length}`);

  // 每個 inProgress entry 都有 progress 0-1
  const badProgress = ids.filter(id => {
    const v = result.inProgress[id];
    return !v || typeof v.progress !== 'number' || v.progress < 0 || v.progress > 1;
  });
  check('每個 inProgress.progress 都喺 0-1 之間', badProgress.length === 0, `bad: ${badProgress.join(',')}`);

  // corrupted localStorage 唔會 crash
  window.localStorage.setItem('mathDungeon_achievements', '{not valid json}');
  let crashed = false;
  let r2;
  try { r2 = window.eval('getAchievementProgress()'); } catch(e) { crashed = true; }
  check('壞 JSON 容錯：唔 crash', !crashed && Array.isArray(r2.unlocked), 'crash on bad JSON');
  check('壞 JSON → unlocked = []', r2.unlocked.length === 0, `got ${r2.unlocked.length}`);
}

// ────────────────────────────────────────────────────────────
// 3. 個別 rule 行為：first_battle
// ────────────────────────────────────────────────────────────
section('3. rule 個別：first_battle / perfect_accuracy / no_damage');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);

  // empty battles
  const r1 = window.eval('ACHIEVEMENTS.find(a => a.id === "first_battle").rule({battles: {}})');
  check('first_battle 空 state: progress=0', r1.progress === 0, `got ${r1.progress}`);

  // 1 battle
  const r2 = window.eval('ACHIEVEMENTS.find(a => a.id === "first_battle").rule({battles: {"2-easy": {lastVictory: true}}})');
  check('first_battle 1 場: progress=1', r2.progress === 1, `got ${r2.progress}`);

  // ten_battles
  const r3 = window.eval('ACHIEVEMENTS.find(a => a.id === "ten_battles").rule({battles: Object.fromEntries(Array.from({length:3},(_,i)=>["k"+i,{}]))})');
  check('ten_battles 3 場: progress=0.3', Math.abs(r3.progress - 0.3) < 0.01, `got ${r3.progress}`);

  // perfect_accuracy
  const r4 = window.eval('ACHIEVEMENTS.find(a => a.id === "perfect_accuracy").rule({battles: {"x": {lastAccuracy: 100}}})');
  check('perfect_accuracy lastAccuracy=100: progress=1', r4.progress === 1, `got ${r4.progress}`);
  const r5 = window.eval('ACHIEVEMENTS.find(a => a.id === "perfect_accuracy").rule({battles: {"x": {lastAccuracy: 99}}})');
  check('perfect_accuracy lastAccuracy=99: progress=0', r5.progress === 0, `got ${r5.progress}`);

  // no_damage fallback (stars===3)
  const r6 = window.eval('ACHIEVEMENTS.find(a => a.id === "no_damage").rule({battles: {"x": {stars: 3}}})');
  check('no_damage stars=3: progress=1', r6.progress === 1, `got ${r6.progress}`);
  const r7 = window.eval('ACHIEVEMENTS.find(a => a.id === "no_damage").rule({battles: {"x": {stars: 2}}})');
  check('no_damage stars=2: progress=0', r7.progress === 0, `got ${r7.progress}`);

  // boss_slayer
  const r8 = window.eval('ACHIEVEMENTS.find(a => a.id === "boss_slayer").rule({battles: {"boss-final_easy": {lastVictory: true}}})');
  check('boss_slayer boss key: progress=1', r8.progress === 1, `got ${r8.progress}`);
}

// ────────────────────────────────────────────────────────────
// 4. rule 個別：practice / weak / curve / streak
// ────────────────────────────────────────────────────────────
section('4. rule 個別：practice / weak / curve / streak');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);

  // first_practice 用 stats.totalPracticeRuns
  const r1 = window.eval('ACHIEVEMENTS.find(a => a.id === "first_practice").rule({stats: {totalPracticeRuns: 0}})');
  check('first_practice 0 次: progress=0', r1.progress === 0, `got ${r1.progress}`);
  const r2 = window.eval('ACHIEVEMENTS.find(a => a.id === "first_practice").rule({stats: {totalPracticeRuns: 1}})');
  check('first_practice 1 次: progress=1', r2.progress === 1, `got ${r2.progress}`);

  // practice_ace: 練習 record 內 correct === total
  const r3 = window.eval('ACHIEVEMENTS.find(a => a.id === "practice_ace").rule({practice: {3: [{correct: 10, total: 10}]}})');
  check('practice_ace 有 10/10: progress=1', r3.progress === 1, `got ${r3.progress}`);
  const r4 = window.eval('ACHIEVEMENTS.find(a => a.id === "practice_ace").rule({practice: {3: [{correct: 9, total: 10}]}})');
  check('practice_ace 只有 9/10: progress=0', r4.progress === 0, `got ${r4.progress}`);

  // weak_aware
  const r5 = window.eval('ACHIEVEMENTS.find(a => a.id === "weak_aware").rule({weak: [{question: "7×8", count: 1}]})');
  check('weak_aware 1 條弱題: progress=1', r5.progress === 1, `got ${r5.progress}`);

  // weak_master_3: same question count >= 3
  const r6 = window.eval('ACHIEVEMENTS.find(a => a.id === "weak_master_3").rule({weak: [{question: "7×8", count: 3}]})');
  check('weak_master_3 count=3: progress=1', r6.progress === 1, `got ${r6.progress}`);
  const r7 = window.eval('ACHIEVEMENTS.find(a => a.id === "weak_master_3").rule({weak: [{question: "7×8", count: 2}]})');
  check('weak_master_3 count=2: progress=0', r7.progress === 0, `got ${r7.progress}`);

  // weak_clean_3: 連續 3 場 log entry wrongCount===0
  const r8 = window.eval('ACHIEVEMENTS.find(a => a.id === "weak_clean_3").rule({log: [{wrongCount:0},{wrongCount:0},{wrongCount:0}]})');
  check('weak_clean_3 連 3 場清白: progress=1', r8.progress === 1, `got ${r8.progress}`);
  const r9 = window.eval('ACHIEVEMENTS.find(a => a.id === "weak_clean_3").rule({log: [{wrongCount:0},{wrongCount:1},{wrongCount:0}]})');
  check('weak_clean_3 中間有錯: progress<1', r9.progress < 1, `got ${r9.progress}`);

  // curve_starter
  const r10 = window.eval('ACHIEVEMENTS.find(a => a.id === "curve_starter").rule({curve: [{battleCount: 0}, {battleCount: 1}]})');
  check('curve_starter 有 1 日 battle: progress=1', r10.progress === 1, `got ${r10.progress}`);

  // curve_perfect_90: 7 日平均 ≥ 90
  const r11 = window.eval('ACHIEVEMENTS.find(a => a.id === "curve_perfect_90").rule({curve: Array.from({length:7},()=>({accuracy: 95}))})');
  check('curve_perfect_90 7 日平均 95%: progress=1', r11.progress === 1, `got ${r11.progress}`);
  const r12 = window.eval('ACHIEVEMENTS.find(a => a.id === "curve_perfect_90").rule({curve: Array.from({length:7},()=>({accuracy: 80}))})');
  check('curve_perfect_90 7 日平均 80%: progress<1', r12.progress < 1, `got ${r12.progress}`);

  // streak_3 / streak_14
  const r13 = window.eval('ACHIEVEMENTS.find(a => a.id === "streak_3").rule({streak: 3})');
  check('streak_3 = 3: progress=1', r13.progress === 1, `got ${r13.progress}`);
  const r14 = window.eval('ACHIEVEMENTS.find(a => a.id === "streak_14").rule({streak: 3})');
  check('streak_14 = 3: progress<1', r14.progress < 1, `got ${r14.progress}`);
  const r15 = window.eval('ACHIEVEMENTS.find(a => a.id === "streak_100").rule({streak: 100})');
  check('streak_100 = 100: progress=1', r15.progress === 1, `got ${r15.progress}`);
}

// ────────────────────────────────────────────────────────────
// 5. checkAndUnlockAchievements — battle trigger
// ────────────────────────────────────────────────────────────
section('5. checkAndUnlockAchievements — battle trigger 寫 storage');
{
  const mockData = {
    battleResult: { '2-easy_easy': { stars: 3, lastAccuracy: 100, lastVictory: true } },
    learningLog: []
  };
  const { window } = buildJsdom(mockData);
  const code = findScriptCode();
  runScript(window, code);

  // 觸發 battle end
  const result = window.eval(`checkAndUnlockAchievements('battle', {stageId: '2-easy', accuracy: 100, correctCount: 10, wrongCount: 0, maxCombo: 10})`);
  check('first call return 係 array', Array.isArray(result), 'not array');
  check('first call 解鎖咗 1+ 個', result.length >= 1, `got ${result.length}`);

  // 讀返 localStorage
  const stored = JSON.parse(window.localStorage.getItem('mathDungeon_achievements') || '[]');
  check('localStorage 有寫入', Array.isArray(stored) && stored.length === result.length, `len ${stored.length}`);

  // 形狀：[{id, unlockedAt}]
  const shapeOk = stored.every(u => u && typeof u.id === 'string' && typeof u.unlockedAt === 'string');
  check('每個 entry 都有 {id, unlockedAt}', shapeOk, 'shape wrong');

  // 冪等：再 call 一次冇新增
  const result2 = window.eval(`checkAndUnlockAchievements('battle', {stageId: '2-easy', accuracy: 100, correctCount: 10, wrongCount: 0, maxCombo: 10})`);
  check('第二次 call 冇新增（冪等）', result2.length === 0, `got ${result2.length}`);

  const stored2 = JSON.parse(window.localStorage.getItem('mathDungeon_achievements') || '[]');
  check('第二次 call storage 冇變', stored2.length === stored.length, `len ${stored2.length} vs ${stored.length}`);
}

// ────────────────────────────────────────────────────────────
// 6. checkAndUnlockAchievements — practice trigger
// ────────────────────────────────────────────────────────────
section('6. checkAndUnlockAchievements — practice trigger 寫 storage');
{
  const mockData = {
    practice: { '0': [{ correct: 10, total: 10, wrong: [], date: '2026-06-13' }] }
  };
  const { window } = buildJsdom(mockData);
  const code = findScriptCode();
  runScript(window, code);

  const result = window.eval(`checkAndUnlockAchievements('practice', {category: 0, correct: 10, total: 10})`);
  check('practice trigger return array', Array.isArray(result), 'not array');
  // 10/10 應該解 practice_ace；totalAnswered 由 practice 累積嘅 r.total = 10，未達 100
  const ids = result.map(r => r.id);
  check('解鎖咗 practice_ace', ids.includes('practice_ace'), `got: ${ids.join(',')}`);
  check('未解鎖 practice_volume_100', !ids.includes('practice_volume_100'), `got: ${ids.join(',')}`);

  const stored = JSON.parse(window.localStorage.getItem('mathDungeon_achievements') || '[]');
  check('localStorage 有 practice_ace entry', stored.some(u => u.id === 'practice_ace'), 'missing');
}

// ────────────────────────────────────────────────────────────
// 7. checkAndUnlockAchievements — achievement-open derive-only
// ────────────────────────────────────────────────────────────
section('7. achievement-open trigger 唔寫 storage');
{
  const mockData = {
    battleResult: { '2-easy_easy': { stars: 3, lastAccuracy: 100, lastVictory: true } }
  };
  const { window } = buildJsdom(mockData);
  const code = findScriptCode();
  runScript(window, code);

  const result = window.eval(`checkAndUnlockAchievements('achievement-open', {})`);
  check('achievement-open return array', Array.isArray(result), 'not array');
  check('derive 出解鎖', result.length >= 1, `got ${result.length}`);

  const stored = window.localStorage.getItem('mathDungeon_achievements');
  check('derive-only trigger 唔寫 storage', stored === null || stored === '[]', `got: ${stored}`);
}

// ────────────────────────────────────────────────────────────
// 8. localStorage 邊界：壞 JSON / 不存在 / 空 array
// ────────────────────────────────────────────────────────────
section('8. localStorage 邊界');
{
  // 唔存在 key
  let { window } = buildJsdom();
  let code = findScriptCode();
  runScript(window, code);
  const r1 = window.eval('getAchievementProgress()');
  check('key 唔存在 → unlocked = []', r1.unlocked.length === 0, `got ${r1.unlocked.length}`);

  // 壞 JSON
  ({ window } = buildJsdom());
  window.localStorage.setItem('mathDungeon_achievements', 'garbage');
  code = findScriptCode();
  runScript(window, code);
  let crashed = false;
  let r2;
  try { r2 = window.eval('getAchievementProgress()'); } catch(e) { crashed = true; }
  check('壞 JSON 唔 crash', !crashed, 'crashed');
  check('壞 JSON → unlocked = []', r2.unlocked.length === 0, `got ${r2.unlocked.length}`);

  // 非 array 結構（例如 object）
  ({ window } = buildJsdom());
  window.localStorage.setItem('mathDungeon_achievements', JSON.stringify({foo: 'bar'}));
  code = findScriptCode();
  runScript(window, code);
  let r3;
  try { r3 = window.eval('getAchievementProgress()'); } catch(e) { r3 = {unlocked:['CRASH']}; }
  check('非 array 結構 → unlocked = []', r3.unlocked.length === 0, `got ${r3.unlocked.length}`);

  // 空 array 行為
  ({ window } = buildJsdom());
  window.localStorage.setItem('mathDungeon_achievements', '[]');
  code = findScriptCode();
  runScript(window, code);
  const r4 = window.eval('getAchievementProgress()');
  check('空 array → unlocked = []', r4.unlocked.length === 0, `got ${r4.unlocked.length}`);
}

// ────────────────────────────────────────────────────────────
// 9. getAchievementProgress 排除已解鎖
// ────────────────────────────────────────────────────────────
section('9. getAchievementProgress 排除已解鎖成就');
{
  const unlocked = [{ id: 'first_battle', unlockedAt: '2026/6/13' }];
  const { window } = buildJsdom({ unlocked });
  const code = findScriptCode();
  runScript(window, code);
  const r = window.eval('getAchievementProgress()');
  check('已解鎖成就唔喺 inProgress', !('first_battle' in r.inProgress), 'still in inProgress');
  check('inProgress 剩 21 個', Object.keys(r.inProgress).length === 21, `got ${Object.keys(r.inProgress).length}`);
}

// ────────────────────────────────────────────────────────────
// 10. stats hooks 形狀冇被破壞（smoke 確認關鍵 shape 唔變）
// ────────────────────────────────────────────────────────────
section('10. Sprint 17 stats hooks 形狀冇被破壞');
{
  const { window } = buildJsdom();
  const code = findScriptCode();
  runScript(window, code);
  const stats = window.eval('getOverallStats()');
  const expected = ['totalAnswered','totalCorrect','overallAccuracy','totalBattles','totalWins',
                    'battleWinRate','battleAvgAcc','totalPracticeRuns','maxStars',
                    'avgAnswerTimeMs','avgAnswerTimeSec'];
  const missing = expected.filter(k => !(k in stats));
  check('getOverallStats 11 個 key 齊全', missing.length === 0, `missing: ${missing.join(',')}`);

  const radar = window.eval('getRadarMetrics()');
  const radarKeys = ['str','agi','spd','wis','def','hp'];
  const radarMissing = radarKeys.filter(k => !(k in radar));
  check('getRadarMetrics 6 軸齊全', radarMissing.length === 0, `missing: ${radarMissing.join(',')}`);

  const streakObj = window.eval('getStreakHeatmap(7)');
  check('getStreakHeatmap return {days, streak}',
    Array.isArray(streakObj.days) && typeof streakObj.streak === 'number', 'shape wrong');
  check('getStreakHeatmap(7).days.length = 7', streakObj.days.length === 7, `got ${streakObj.days.length}`);

  const curve = window.eval('getLearningCurve(5)');
  check('getLearningCurve(5) return array', Array.isArray(curve) && curve.length === 5, `got ${curve && curve.length}`);
}

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  Total: ${passes + fails}  ✅ PASS: ${passes}  ❌ FAIL: ${fails}`);
console.log('══════════════════════════════════════════════════════════');
process.exit(fails > 0 ? 1 : 0);
