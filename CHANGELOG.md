# Changelog

All notable changes to Math Dungeon are documented here. This project follows an in-house
`sprint-N — <feature>` cadence; each sprint is a single feat commit on `main` (or a
`merge sprintN/<topic>` merge commit if a worktree was used).

The latest sprint is on top.

---

## Sprint 17 — 統計頁面升級（5 tabs：總覽/戰鬥/練習/弱題/曲線）
**Commit:** see `git log --oneline | head -1` (self-referential hash) · **Date:** 2026-06-13 · **Scope:** 統計中心 + 數據可視化

**Major refactor：** 將 dashboard 從「practice-only 摘要」升級成全功能統計中心，涵蓋戰鬥 + 練習 + 弱題 + 學習曲線 4 條數據流，5 個 tab + 個人化 hero header + 4 種 inline SVG 可視化（雷達圖 / heatmap / bar chart / line chart），0 外部 library 依賴。

### 數據層 (5 new localStorage keys / fields)
- `mathDungeon_questionTiming` — `submitChoice` 開頭記 `Date.now()`，每題 durMs 寫入 `{stageId: {qid: ms}}`。
- `mathDungeon_learningLog[].wrongQuestions` — `submitChoice` 錯題 branch 收集 `currentWrongIds`，`showBattleResult` 結算時 push 入 log entry。
- `mathDungeon_achievements` — 預寫 `[]`（純 hook，Sprint 18 成就系統用）。
- `mathDungeon_battleResult_<stageId>_<difficulty>` — **雙 key 寫入**，新 key 帶 difficulty，舊 key fallback 兼容。
- `getPlayerName()` — 從 `gameState.playerName` 或 save dump 攞，fallback「冒險者」。

### 統計 helpers (純函數，方便 smoke test)
- `getOverallStats()` — `{ totalAnswered, totalCorrect, overallAccuracy, totalBattles, totalWins, battleWinRate, totalPracticeRuns, maxStars, avgAnswerTimeMs, avgAnswerTimeSec }`
- `getRadarMetrics()` — 6 軸 0-100 (`str` 戰鬥勝率 / `agi` 答題速度 / `spd` throughput / `wis` 準確率 / `def` 連勝率 / `hp` 活躍度)
- `getWeakQuestions(limit=10)` — 跨 `math_dungeon_practice.wrong[]` + `learningLog[].wrongQuestions` ranking
- `getLearningCurve(days=7)` — 7/30 日 `{date, accuracy, battleCount}[]`，gap 為 `null`（唔填 0）
- `getStreakHeatmap(days=30)` — GitHub-style `{days, streak}`
- `getBattleHeatmap()` — `{ tableKey: { easy, normal, hard, boss } }` from localStorage + STAGES_DATA
- `getBattleStats(stageId, difficulty?)` — 從 battleResult 讀（new key 優先，old key fallback）
- `getAchievementProgress()` — Stub: `{ unlocked: [], inProgress: {} }`，Sprint 18 會 populate

### UI 層
- **Tab 切換框架**：`#dashboard-screen` 加 `.dash-tabs` + 5 個 `.dash-panel`（overview/battle/practice/weak/curve）。`switchDashboardTab(tabId, syncHash)` 處理顯示 + localStorage 記憶 + `history.replaceState` hash 同步。
- **Hash routing**：`#dashboard/overview` / `#dashboard/battle` 等 deep link 支援，reload 自動落返去上次嘅 tab。
- **§4.0 學生名字 Banner**（每個 tab 頂部）— `✦ {name} 嘅學習基地 ✦` 大字 + 截至今日嘅學習報告副標 + 📈 比上週 +X% 準確率 / ⚠️ 退步 / ➡️ 持平 trend indicator。背景用 `assets/images/sprint17/dashboard-banner-bg.webp`（19 KB，1024×256 cyber-hex 圖）。
- **§4.2 總覽 tab** — 6 個 stat-card（整體準確率 / 戰鬥勝率 / 總答題 / 練習次數 / 最高星 / 平均速度） + CTA「🔥 開始今日練習」 + **六角能力雷達圖**（6 軸 STR/AGI/SPD/WIS/DEF/HP，紅色半透明 polygon + 同心 hex grid + 每軸 hover tooltip）。
- **§4.3 戰鬥分析 tab** — 主視覺係 **stage × 難度 heatmap**（10 stage × 4 難度 color-coded cell，5 級色階：灰=未挑戰、紅=1⭐、橙=2⭐、金=3-4⭐、粉金=5⭐），hover tooltip 顯示「×7 階段 1 中難度: ⭐⭐⭐」，點 cell 重玩。摺疊 list view 顯示 10 個 stage 嘅 row（star / 上次 acc% / 上次時間）。
- **§4.4 練習分析 tab** — GitHub-style 30 日 **streak heatmap**（4 級色階：0/1-2/3-5/6+）+ 🔥 streak 連續日數 + 每 row **SVG sparkline**（最近 7 次準確率，14px 高 × 80px 闊，綠/黃/紅線色按最新分數）。
- **§4.5 弱題分析 tab** — **Horizontal Bar Chart**（top 10 弱題，bar 長度 = 錯嘅次數，紅→橙漸層）。
- **§4.6 學習曲線 tab** — 純 inline SVG **line chart**（X 軸日期，Y 軸 accuracy，gradient area fill，hover dot tooltip），7/30 日切換按鈕。

### 新增 assets
- `assets/images/sprint17/dashboard-banner-bg.webp` (19 KB, 1024×256) — 學生 banner 背景（cyber hex grid + 星塵）。
- `assets/images/sprint17/icon-overview.webp` (1.9 KB) / `icon-battle.webp` (1.8 KB) / `icon-practice.webp` (2.0 KB) / `icon-weak.webp` (3.1 KB) / `icon-curve.webp` (1.4 KB) — 5 個 tab icon 96×96 cyber-pixel 風格。

### Test 層
- `tests/smoke-spec-gaps.js` 加 `testSprint17()` — **+7 條新 assertion**（53 → 60 PASS）：
  - `recordQuestionTiming` round-trip + multi-record
  - `saveBattleResultToLocal` 雙 key 寫入
  - `getAchievementProgress` stub shape
  - `getOverallStats` empty data shape
  - `getRadarMetrics` 6 軸 0-100 無 NaN
- **新增** `tests/sprint17-dashboard-ui.js` (jsdom-based) — **23 條 assertion** 全部 PASS：
  - 5 個 panel + button 結構
  - 空數據唔 throw + hero banner × 5
  - Mock 數據渲染 stat card / 雷達圖 / heatmap / streak / sparkline / bar chart / SVG line chart
  - Hash routing `#dashboard/battle` 切 tab
  - `switchDashboardTab` 切換 visible panel + active button
  - 學生名字 banner 顯示 player name
- **Total verification：83/83 PASS**（60 spec-gaps + 23 UI）。

### 向後兼容
- 舊 `mathDungeon_battleResult_<stageId>` key 繼續寫入，新 dashboard 讀取時優先用新 key（帶 difficulty），fallback 舊 key。
- 舊 player save 載入後 dashboard 立即顯示佢有嘅數據，唔需要 migration。
- 純 static `index.html`，無 build step；inline SVG / CSS gradient，0 外部 library。

### 後續 sprint 銜接
- `getAchievementProgress()` hook 已喺度，**Sprint 18 成就系統可以直接食**（寫成就定義 + 解鎖判斷，唔使改 dashboard 數據層）。
- 統計頁面 datasource 已經 generic，**Sprint 19 加法範疇**只係多一個 key，自動支援。

---

## Sprint 15 — Home hero portrait + section title polish + continue 自動 disable
**Commit:** `7e86a7d` · **Date:** 2026-06-13 · **Scope:** UI polish

- **Hero portrait**: added `assets/images/hero-warrior.png` (167 KB, 768×768, 64-color
  palette-quantized). Half-body dark-fantasy warrior holding a glowing magic book with
  floating math glyphs. No text on image.
- **HTML layout**: added `<img class="home-hero-img">` inside `.home-left`, with
  `onerror` fallback (`this.style.display='none'`) in case the asset is missing.
- **CSS**:
  - `.home-hero-img` — `max-width:360px`, `aspect-ratio:1`, rounded corners, drop shadow,
  `object-fit:cover`.
  - `.home-section-title` upgraded from `0.85rem` plain gold to `1rem` with a 3 px gold
  left border, soft gold background block, and `4px 8px` padding for visual weight.
  - `.home-btn:disabled` (and `[aria-disabled="true"]`) — `opacity:.4`, `grayscale(60%)`,
  `cursor:not-allowed`, no hover transform/shadow.
- **JS**: `DOMContentLoaded` now reads `localStorage[SAVE_KEY]`. If no save exists, the
  "繼續遊戲" button (`#home-continue-btn`) is auto-disabled and gets `title="無存檔"`.
  Wrapped in `try/catch` for SSR / quota-exceeded safety.
- **Verification**: 53/53 spec-gaps regression smoke PASS + Playwright screenshots confirm
  hero visible, section titles stronger, continue button greyed-out on a fresh profile.

---

## Sprint 14 — Home screen 2-column 3 區 layout
**Commit:** `dc660c7` · **Date:** 2026-06-12 · **Scope:** Layout refactor

- Replaced the original single-column home screen with a 2-column flex layout.
- **Left column** (`.home-left`): logo + motto (and later the hero portrait in sprint 15).
- **Right column** (`.home-right`): three sections stacked vertically:
  1. **🗡️ 冒險** — 開始冒險 / 繼續遊戲 / 溫習乘法.
  2. **⚙️ 設定** — 主題 / 語音開關 / 音量（移入設定區）.
  3. **📊 進度** — 顯示已解鎖的職業 / 當前等級 / gold 概要.
- Mobile fallback: `flex-wrap:wrap` collapses to single column under 600 px viewport.
- Moved theme/voice controls out of the inline settings row into a dedicated 設定 section
  for clearer IA.

---

## Sprint 13 — Stage UI 收尾（防止連點 + 載入動畫）
**Commit:** `6c48164` · **Date:** 2026-06-12 · **Scope:** UX polish

- **Debounce double-click on stage start**:
  - Added `confirm-start-btn` id and a per-button `inFlight` flag.
  - If user double-taps "開始" before the stage screen paints, the second tap is dropped.
- **Loading spinner** during stage transition (CSS-only, no asset):
  - Pulsing gold ring + "載入中..." text.
  - Auto-removed when stage DOM mounts.
- Verified 53/53 spec-gaps regression smoke PASS.

---

## Sprint 12 — Stage UI modifier 摘要 + SPEC %3 統一
**Commit:** `9ac07ed` · **Date:** 2026-06-12 · **Scope:** UX + spec alignment

- **Stage detail screen modifier summary**: each stage card now shows a one-line summary
  of active modifiers (e.g. `⚡ 連擊 +1` / `⏱️ 限時 30s` / `💀 一擊必殺`), so users can
  read the rule change without entering the stage.
- **SPEC %3 alignment**: audited the spec and confirmed level-up frequency is
  `level % 3 === 0 → +1 skill point` everywhere. Removed an outdated `+1 SP every level`
  comment from the code, replaced with the corrected rule.
- Files touched: `index.html` + `SPEC.md` (clarification pass, no behaviour change).

---

## Sprint 11 — Stage Selection UI 改進（A+B+C）
**Commit:** `8df4ba7` · **Date:** 2026-06-12 · **Scope:** UX

Three small stage-selection improvements, landed in one sprint:

- **A. 題目數顯示**: each stage card now shows total question count (e.g. `10 題`),
  sourced from `STAGE_DATA[id].totalQuestions`.
- **B. 推薦等級提示**: each stage card shows `推薦 Lv.N` and a warning badge
  (`⚠️ 低於推薦`) if the player's level is below it.
- **C. 歷史星數**: each stage card shows the best star rating achieved
  (`★ 0` / `★ 1` / `★ 2` / `★ 3`), read from `localStorage[STAGE_STARS_KEY]`.
- 背景圖: stage selection screen now uses `bg-forest.jpeg` (and other stage-appropriate
  backgrounds) instead of a flat colour.
- Side cleanups: "返回" button on the stage-detail screen labelled "← 難度選擇"
  (semantic). 開始按鈕 got `id="confirm-start-btn"` for future disable support.
- **Verification**: entered `2的乘法 normal` — saw `10 題` / `推薦 Lv.5` / `⚠️ 低於推薦` /
  `0 星` correctly. 53/53 spec-gaps regression smoke PASS.

---

## Sprint 10a — Skill Tree 系統（資料 + 升級 + 戰鬥整合）
**Commit:** `8eb6f75` · **Date:** 2026-06-12 · **Scope:** Core system (large)

The biggest change since the project started. +357 / -5 lines, single `index.html` edit.

### What landed

- **SKILL_TREE data structure** — full skill tree for **6 職業** (necromancer / paladin
  / druid / viking / shadow / ranger), each containing **7 技能** (4 existing tier-0
  basics + 3 new tier-2 ultimates, each gated by a tier-0 branch reaching level 2).
  Total: **42 技能** + 18 prerequisites = **60 節點**. See
  `~/.mavis/scratchpads/mvs_16ff5f550c624c2bb0852debc815f5b1/sprint9-skill-tree-design.md`
  for the full design doc.
- **Skill upgrade logic** — `upgradeSkill(skillId)` checks prereq level, deducts 1 SP,
  increments `skill.level`. Dynamic cost curve: tier-0 = 8 gold, tier-1 = 12,
  tier-2 = 18.
- **Skill point economy** — `level % 3 === 0` grants +1 SP. Reset costs 100 gold and
  refunds all SP. (Confirmed level-3 grants +1 SP and `resetAllSkills` refunds 5 SP
  properly.)
- **Battle integration** — battle UI shows the 3 unlocked skills as buttons (or the
  full set once you can afford them). Skill effects pipe into the existing battle
  pipeline.
- **Skill tree UI** — `showSkillTreeScreen()` renders the tree per-class with
  `data-skill` attributes on each button (sprint 12 lesson learned — never use
  `classList[1]` for skill ID; always use `btn.dataset.skill`).

### Bugs found & fixed during this sprint

1. **First-time knight auto-unlock missing** — new players got `0 unlocked skills` and
   the battle UI was empty. Fix: grant 3 tier-0 skills to knight on first save load.
2. **Tier-2 prereq check was inverted** — allowed learning ultimates before
   prerequisites. Fix: invert the `if` branch in the prereq gate.
3. **Reset refund was over-counted** — refunded SP for skills that hadn't been learned.
   Fix: iterate `learned` set, not the full `SKILL_TREE`.

### Verification

53/53 spec-gaps regression smoke PASS + Playwright end-to-end covers:

- 10 職業 (combined with previous classes) 6 技能 each loads.
- Auto-unlock 3 tier-0 (knight) on first load.
- Tier-2 prereq check fail (`iron-fortress` lv1 → ultimate `aegis-of-light` rejected).
- `iron-fortress` lv2 → ultimate unlock succeeds.
- Dynamic cost curve 8/12/18.
- Battle UI correctly shows unlocked skill buttons.
- `level % 3 === 0` grants +1 SP.
- `resetAllSkills` refunds 5 SP and deducts 100 gold.
- Re-level-up after reaching `level % 3` works.

### Known design inconsistency (deferred)

- 6 職業 have **7 技能** each (not 6). The "6 per class" rule is soft. The extra
  skills are the 3 new tier-2 ultimates slotted into existing branches. The team
  decided on 2026-06-12 to keep it as is rather than merge ultimates into tier-1.
  See the sprint 10a review checklist for the rationale.

---

## Sprint 9 — 7 隻新怪物 PNG 補完
**Commit:** `a344551` · **Date:** 2026-06-12 · **Scope:** Content (assets only)

- 7 new monster PNGs added to `assets/images/monsters/` to populate the 7 new
  stages from sprint 8. Pure asset delivery, no code changes.
- All PNGs processed through the in-house PIL palette-quantize pipeline
  (`→ 1024 resize → 64 colors → ~100-180 KB each`).
- Commit stat: 8 files changed, 0 insertions, 0 deletions (binary only).

---

## Sprint 8 — 7 個新場景 + 對應怪物 + 背景圖
**Commit:** `0db9eec` · **Date:** 2026-06-12 · **Scope:** Content (assets only)

- 7 new stages added to `STAGE_DATA` (forest, castle, dungeon, tower, swamp, ice,
  volcano) along with their corresponding background images in
  `assets/images/backgrounds/`.
- Each stage got a thematic monster (PNG) shipped alongside.
- Pure content delivery, no code logic changed.

---

## Cross-cutting notes

- **Branch model**: all sprint work landed directly on `main`. Sprints 8-15 were
  self-contained enough to skip worktree + PR; sprint 10a was the only one done in
  a worktree due to its 357-line size.
- **Test gate**: every sprint passed `tests/smoke-spec-gaps.js` (53/53 assertions).
  Playwright end-to-end screenshots back up the visual changes.
- **No push policy**: this is a local-only Mac project. Do not push to origin.
- **Memory**: skill-tree architecture, dataset.skill gotcha, and per-sprint lessons
  are recorded in `~/.mavis/agents/mavis/memory/MEMORY.md`.
