# Sprint 18 Track B — 成就 UI 交付

**Branch**: `feat/sprint18-ui-v1`
**Final commit SHA**: `e69d072` (HEAD — 含 deliverable.md；code 改動主 commit 係 `f0318ab`)
**Push**: ✅ `origin/feat/sprint18-ui-v1`

## Summary

Track B 為 math-dungeon 嘅 dashboard 加咗第 6 個 tab（成就），包括：tab 結構 + panel HTML
+ 6 個 tab icon（achievement trophy，1.1KB webp）+ summary block + 6 個 filter chip
（all/battle/practice/weak/curve/streak，JS toggle + CSS attribute selector 隱藏非匹配 card）
+ 22 個 achievement card（unlocked 帶 tier 顏色 + 解鎖日期，locked 帶 🔒 + progress bar）
+ 0 解鎖時嘅 empty state（spec §4.5）+ 4 種 tier 邊框色（bronze/silver/gold/platinum）。
Track A engine 仲未 merge 嗰陣，UI 會 render fallback empty hint，唔 throw。

## Changed files

| File | Status | Note |
|------|--------|------|
| `index.html` | modified | +198 lines — 6 個 tab/panel, `renderAchievementPanel()`, `.ach-*` CSS |
| `package.json` | modified | test script 加 `&& node tests/sprint18-achievement-ui.js` |
| `tests/sprint17-dashboard-ui.js` | modified | 5 → 6 panels 嘅 4 條 assertion（structural consistency） |
| `tests/sprint18-achievement-ui.js` | **new** | 58 條 case（spec §7.2 要求 12+） |
| `assets/images/sprint18/icon-achievement.webp` | **new** | 1.1 KB, 64x64, transparent, matrix MCP 整 |

## Test output

`npm test` 跑全 3 個 suite：

```
$ npm test
... (60 PASS smoke-spec-gaps)
... (23 PASS sprint17-dashboard-ui)
... (58 PASS sprint18-achievement-ui)

Last 30 lines of npm test:
══ 8. Tier 4 種 + CSS 顏色 hash attribute selector 喺度 ══
  ✅ CSS 有 tier-bronze border
  ✅ CSS 有 tier-silver border
  ✅ CSS 有 tier-gold border
  ✅ CSS 有 tier-platinum border
  ✅ CSS 有 filter battle selector
  ✅ CSS 有 filter practice selector
  ✅ CSS 有 filter weak selector
  ✅ CSS 有 filter curve selector
  ✅ CSS 有 filter streak selector

══ 9. Icon asset 存在 + size <= 10KB ══
  ✅ icon-achievement.webp 存在
  ✅ icon size <= 10KB

══ 10. Re-render 唔會累積（clear old 然後再 render） ══
  ✅ re-render 3 次後只有 1 個 grid
  ✅ re-render 3 次後只有 1 個 filter
  ✅ re-render 3 次後只有 1 個 summary
  ✅ re-render 後 card 數量 = 22

══════════════════════════════════════════════════════════
  Total: 58  ✅ PASS: 58  ❌ FAIL: 0
══════════════════════════════════════════════════════════
```

**Full summary**:
- `smoke-spec-gaps.js`: **60 PASS / 0 FAIL**
- `sprint17-dashboard-ui.js`: **23 PASS / 0 FAIL** (regression-safe，改咗 5→6 structural assertion)
- `sprint18-achievement-ui.js`: **58 PASS / 0 FAIL** (spec §7.2 要求 12+，超額 4.8x)
- **Total: 141 PASS / 0 FAIL**

## Icon generation method

✅ **`matrix_generate_image` MCP success** — prompt:
> "Flat design 64x64 transparent icon, a gold trophy cup with cyan and pink accent stars,
> minimalist vector style, clean lines, no background, suitable for a small UI tab icon.
> The trophy has a wide cup with two handles, sitting on a small pedestal. Subtle cyan
> (#5bc8f5) and pink (#ff8fb3) glow highlights on the trophy edges."

後處理:
1. `sips -z 64 64` resize 原始 1.1MB PNG → 8.9KB 64x64 PNG
2. `cwebp -q 80 -resize 64 64` 轉 webp → **1.1KB final**（遠低於 10KB 上限）
3. 中間 PNG + CDN 原始檔 `mavis-trash` 清理

## Deviations from spec

1. **Track A engine 仲未 commit 嘅 graceful fallback** — spec §3 假設 `ACHIEVEMENTS` 一定定義；
   現實係 Track A 喺另一條 branch / 另一個 worktree 開發。我喺 `renderAchievementPanel()` 開頭
   加咗 `if (typeof ACHIEVEMENTS === 'undefined' || !Array.isArray(ACHIEVEMENTS) || ACHIEVEMENTS.length === 0)`
   嘅 fallback，render 一個「🏆 成就系統準備中」empty state 提示用戶等 engine 載入。
   **冇 throw，唔影響其他 5 個 tab 嘅 render**。Integration gate（Track A merge 完之後）實
   唔需要再改 — 自動用真嘅 ACHIEVEMENTS。
2. **sprint17-dashboard-ui.js 改 5→6** — spec §7.3 講「sprint17-dashboard-ui.js 必須繼續 pass」，
   唔代表「唔可以改」。「有 5 個 .dash-panel」呢句 assertion 本身就 encode 咗個錯誤數字；
   加咗 6 個 tab 之後結構斷言要更新。改咗 4 行（5 → 6），其他邏輯驗證全部 23 條仍然 pass。
3. **CSS filter selector 留低（雖然 spec §6 話可以用 JS toggle）** — 我兩個都用咗：
   JS toggle `data-cat-active` 同時 5 條 CSS attribute selector 都仲喺度
   （`[data-cat-active="battle"] ~ .ach-grid .ach-card:not([data-cat="battle"]) { display:none }`）。
   原因：純 JS toggle 唔穩，hash 進去或者 quick re-render 之後可能要 force re-apply；
   留 CSS 做最終真理，避免任何 race condition。CSS 規則連同 JS 一起都 brief 過。
4. **Tier label 第四個** — spec §4.3 寫「platinum」但 tier list 入面有 4 種，我喺
   `tierLabel()` 加咗 `platinum: '彩'` 嘅 label（per spec 中文），同樣 bronze=銅, silver=銀, gold=金。

## Notes for verifier

- **Track A integration 零摩擦** — UI function 只用 `ACHIEVEMENTS` array shape `{id, category,
  title, desc, icon, tier, rule}` 同 `getAchievementProgress()` return `{unlocked, inProgress}`。
  兩個都係 spec §1 寫死嘅 contract，Track A commit 完之後立即 work。
- **Test 12+ → 58** — 1. 結構 / 2. graceful fallback / 3. summary+grid+filter 全部齊 / 4. locked vs unlocked
  class 細節 / 5. filter click + 5 個 category 切換 / 6. hash routing / 7. empty state 全 6 個
  element（text/btn/absence of grid/filter/summary）/ 8. CSS attribute selector 9 條 regex /
  9. icon 存在 + size / 10. re-render 冇累積。
- **Hero banner 仍 prepend 6 個 panel** — `renderDashboardHero()` 喺 `showDashboardScreen()` 嘅
  `renderAchievementPanel()` 之前 call，sprint 17 邏輯唔改 → 6 個 panel 都有 `.dash-hero`。
  sprint18-achievement-ui.js §2 第三條 check 確認 6 個 hero banner。
- **既有 5 個 tab 唔破壞** — `sprint17-dashboard-ui.js` 23 條全部仍然 pass（除咗 4 條改 5→6
  structural assertion）。
- **Worktree** — `/private/tmp/sprint18-ui-v1` 喺 `feat/sprint18-ui-v1` branch，code 改動 commit `f0318ab`，
  HEAD `e69d072`，push 去 `origin/feat/sprint18-ui-v1`，冇 force-push，冇改 git config。

## Files summary for diff

```
 index.html                                | +198 -1
 package.json                              | +1 -1
 tests/sprint17-dashboard-ui.js            | +10 -9
 tests/sprint18-achievement-ui.js          | +316 (new)
 assets/images/sprint18/icon-achievement.webp | binary (1.1KB, new)
 5 files changed, 526 insertions(+), 11 deletions(-)
```
