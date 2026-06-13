# Sprint 18 — Track A: 成就 Engine (deliverable)

## Summary

Sprint 18 Track A 完成。喺 `feat/sprint18-engine-v1` branch 上面 ship 咗
`ACHIEVEMENTS` 陣 (22 個成就，5 類) + `checkAndUnlockAchievements()` 解鎖引擎 +
`showAchievementToast()` 視覺通知 + battle-end 同 practice-submit trigger hook +
jsdom test 65 條 case。`npm test` 全綠 148/148（60 既有 + 23 sprint17 + 65 sprint18-A）。

## Branch + Commit

- **Branch**: `feat/sprint18-engine-v1`
- **Final commit SHA**: `77c48bf1bddf62af30f80e55bada63e8e9d343d0`
- **Pushed**: `origin/feat/sprint18-engine-v1` (new branch)
- **Worktree**: `/private/tmp/sprint18-engine-v1` (isolated，避免同 Track B 撞)
- **Track B branch**: `feat/sprint18-ui-v1` 同時存在，scope 完全唔 overlap

## Pre-flight 結果 (4 條開放問題)

| # | 項目 | 結果 |
|---|------|------|
| a) | `no_damage` HP 數據點 | **冇** `minHp` / `lowestHp` / `damageTaken` / `currentHp` / `playerHp`（grep index.html 完全冇 match）。**Fallback 用 `stars === 3`**（per spec §2.1 註） |
| b) | Practice submit handler | 喺 `showPracticeResult()` (line 4576-4587)。入面 call `savePracticeResult(table, correct, 10, wrong)`。Hook 加喺 `savePracticeResult` 之後、`showScreen('practice-result-screen')` 之前 |
| c) | Sonner toast function name | **冇**。grep `toast` / `showToast` / `sonner` / `notification` 完全冇 match（只有 `alert` 用緊）。**實作**：`showAchievementToast(id)` 自家建 DOM toast host `#achievement-toast-host`，5s 自動 fade-out，多個 stack |
| d) | CSS vars | `--accent: #ff8fb3` (注意：係 pink，唔係 spec 假設嘅 `--accent: #00b894`)、`--text-dim: #c0b8db`、`--border: #6a6190` 全部都存在（index.html:12-14） |

### Spec 偏差

1. **no_damage 規則** — spec 已經預期 HP 數據唔存在要 fallback，rule 用 `battles.<any>.stars === 3`。
   文件入面 `desc` 寫「任何一場 3 星完美通關（無錯）」，對得返 fallback 邏輯。

2. **Toast 實作** — 因為冇既有 toast 系統，照 spec §3.4 風格（cyan/pink 邊框）自己建
   `showAchievementToast(id)`。Border 配 `--accent` (#ff8fb3 pink) + cyan accent (#00b894)，
   5s auto-fade。Host container `#achievement-toast-host` 喺 `<body>` 末端。

3. **CSS variables 顏色** — spec 寫 `--accent: #00b894`（綠），但實際 `index.html:12` 用
   `--accent: #ff8fb3`（粉）。Toast 採用「cyan/pink 雙色」風格（`#00b894` accent 加
   `--accent` `#ff8fb3` border），對得返 spec 嘅「cyan/pink border」描述。

## Changed files

| 檔案 | 動作 | 行數變化 |
|------|------|---------|
| `index.html` | 修改 | +289 / -8 |
| `package.json` | 修改 | +1 / -1（test script 加 `&& node tests/sprint18-achievement-engine.js`） |
| `tests/sprint18-achievement-engine.js` | 新增 | 350 行（65 個 case） |

**冇改**：`DASHBOARD_TABS`、dash-panel-achievement HTML、CSS、assets/images/sprint18/
（嗰啲係 Track B scope）。

## Test 結果（`npm test` 最後 30 行）

```
══ 8. localStorage 邊界 ══
  ✅ key 唔存在 → unlocked = []
  ✅ 壞 JSON 唔 crash
  ✅ 壞 JSON → unlocked = []
  ✅ 非 array 結構 → unlocked = []
  ✅ 空 array → unlocked = []

══ 9. getAchievementProgress 排除已解鎖成就 ══
  ✅ 已解鎖成就唔喺 inProgress
  ✅ inProgress 剩 21 個

══ 10. Sprint 17 stats hooks 形狀冇被破壞 ══
  ✅ getOverallStats 11 個 key 齊全
  ✅ getRadarMetrics 6 軸齊全
  ✅ getStreakHeatmap return {days, streak}
  ✅ getStreakHeatmap(7).days.length = 7
  ✅ getLearningCurve(5) return array

══════════════════════════════════════════════════════════
  Total: 65  ✅ PASS: 65  ❌ FAIL: 0
══════════════════════════════════════════════════════════
```

**全 suite**: 60 (smoke-spec-gaps) + 23 (sprint17-dashboard-ui) + 65 (sprint18-engine) = **148/148 PASS, 0 FAIL**.

## Test 覆蓋範圍

`tests/sprint18-achievement-engine.js` 65 個 case 覆蓋：

| Section | 條數 | 涵蓋 |
|---------|------|------|
| 1. ACHIEVEMENTS 結構 | 10 | 22 個、id 唯一、5 類分配、rule shape |
| 2. getAchievementProgress shape | 7 | `{unlocked, inProgress}` 結構、壞 JSON 容錯 |
| 3. Battle rules 個別 | 8 | first_battle / ten_battles / perfect_accuracy / no_damage / boss_slayer |
| 4. Practice/weak/curve/streak rules | 15 | first_practice / practice_ace / weak_aware / weak_master_3 / weak_clean_3 / curve_starter / curve_perfect_90 / streak_3/14/100 |
| 5. battle trigger 寫 storage | 6 | 寫入、形狀、冪等 |
| 6. practice trigger 寫 storage | 4 | practice_ace 解鎖、practice_volume_100 唔解 |
| 7. achievement-open derive-only | 3 | 唔寫 storage |
| 8. localStorage 邊界 | 5 | 唔存在 / 壞 JSON / 非 array / 空 array |
| 9. 已解鎖排除 | 2 | unlocked 唔喺 inProgress |
| 10. Stats hooks 冇破壞 | 5 | getOverallStats / getRadarMetrics / getStreakHeatmap / getLearningCurve shape |

## Notes for verifier

1. **Worktree**: 所有編輯喺 `/private/tmp/sprint18-engine-v1`，唔影響 main worktree。
2. **Track B 共存**: 嗰邊用 `/private/tmp/sprint18-ui-v1` 改 `feat/sprint18-ui-v1` branch，
   scope 完全唔 overlap（Track B 改 `DASHBOARD_TABS` + panel + CSS + asset），
   Integration gate 應該 merge 兩個 branch 之後再睇。
3. **stats hooks 保持不變**: `getOverallStats` 11 個 key、`getRadarMetrics` 6 軸、
   `getStreakHeatmap` / `getLearningCurve` 形狀冇變（test §10 確認）。
4. **Idempotency 已 verify**: 連續 call `checkAndUnlockAchievements('battle', ...)` 兩次，
   第二次 return `[]`，localStorage 冇變。
5. **no_damage 規則文檔**: spec §2.1 已經預期 HP fallback 行為，desc 改寫做
   「任何一場 3 星完美通關（無錯）」，對得返 rule 邏輯。
6. **Toast 自動 fire**: battle-end line 4160 之後 + practice-result line 4579 之後都會
   call `checkAndUnlockAchievements`，新解鎖即刻 fire toast。
7. **9.5 個 `streak-*` 解鎖順序**: spec §2.5 話「唔好合拼」所以 6 個 streak/curve 成就獨立 card；
   解 streak_14 時 streak_3/5/7 會一齊解（用戶見到 3 個 toast stack）— 屬預期行為。
