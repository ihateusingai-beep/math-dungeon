# Multiplication Town — ARPG 化填充計劃

**目標**：將 SPEC.md 描述的 ARPG 機制落地到 index.html
**依據**：autonomous-arpg-optimizer 技能
**項目**：`~/workspace/vs code/education/multiplication-town/`

---

## 🔴 Area 1: Energy Bar + Ultimate System（最高優先）

### 現狀
- HTML 有 energy bar UI（`arcaneBar`, `shieldEnergyValue`）
- `src/engine/GameEngine.js` 有完整 energy/ultimate邏輯
- `index.html` 完全無 energy 邏輯

### 目標
1. 每答對1題 +10 energy，錯誤 -20 energy
2. 100 energy 時 `ultimateReady = true`，能量條閃光 pulse
3. 按鈕/按鍵觸發大招，播放特效動畫
4. 大招释放后 energy = 0

---

## 🔴 Area 2: SoundEngine 音效系統（最高優先）

### 現狀
- `index.html` 完全無音效系統
- SPEC.md 描述多個音效觸發點

### 目標
1. 建立 SoundEngine（Web Audio API）
2. 接入：答對(`correct()`)、答錯(`fail()`)、點擊(`click()`)、大招(`ultimate()`)、升級(`levelUp()`)、Combo Milestone(`comboMilestone()`)
3. BGM 檔案路徑：`assets/bgm/heroic-realm-bgm.mp3`, `awakening-realm-bgm.mp3`, `destruction-flame-bgm.mp3`

---

## 🔴 Area 3: Elemental Damage 接通

### 現狀
- Element system 代碼存在（359 refs）
- 但無接入 `calculateElementalDamage()`

### 目標
- `handleCorrectAnswer()` 時，傷害計算經過 `calculateElementalDamage()`
- 顯示元素顏色（fire=橙, ice=青, etc.）

---

## 🟡 Area 4: Combo Milestone 視覺反饋

### 現狀
- `showComboMilestone()` 存在但只有1處調用
- 無螢幕震動、無史詩音效

### 目標
- Combo 5/10/20/50 時各自有獨特視覺特效
- Combo 50 觸發「勇者領域」BGM

---

## 🟡 Area 5: Boss Phase Transition

### 現狀
- `battleState.monsterPhase` 存在
- 無phase transition 邏輯

### 目標
- Boss HP <= 60% → Phase 2（攻擊力+20%，視覺提示）
- Boss HP <= 30% → Phase 3（狂暴，紅色光環）

---

## 🟡 Area 6: Status Effect 可視化

### 現狀
- StatusEffect 代碼在 `src/models/StatusEffect.js`
- `index.html` 無 debuff/buff icon 顯示

### 目標
- 在怪物頭像旁顯示 active debuff icons
- 在角色狀態列顯示 active buff icons

---

## 🟡 Area 7: 被動技能觸發

### 現狀
- Hero 被動名稱存在（如 `block`/格擋反擊）
- 無被動效果實現

### 目標
- Knight 被動：答對後 20% 機會反擊
- Mage 被動：暴擊傷害+50%
- Berserker 被動：HP<50% 攻擊+30%
- Rogue/Priest/Ranger 被動：按 SPEC.md 實現

---

## 🟢 Area 8: Summon System UI

### 現狀
- `Summon.js` 完全未接入 UI

### 目標
- 召喚獸按鈕（需能量/冷卻）
- 召喚獸狀態顯示（HP/duration）

---

## 🚀 執行順序

1. SoundEngine（所有其他系統依賴它）
2. Energy Bar + Ultimate System
3. Elemental Damage 接通
4. Combo Milestone 視覺
5. Boss Phase Transition
6. Status Effect Display
7. 被動技能觸發

---
*建立：2026-05-25*