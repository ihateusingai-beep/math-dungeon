# Math Dungeon 戰鬥邏輯流程

> 用途：確認每題答對/答錯會發生什麼事
> 模型版本：commit `631387f` 起 — 簡化為「答錯 = 怪物反擊」單一回合，沒有 turnIndex 奇偶回合切換。

---

## 🔄 整體流程

```
題目出現
    ↓
玩家選擇答案 / 輸入數字
    ↓
submitChoice(answer)
    ↓
[答案正確？]
  ├─ YES → 玩家攻擊怪物（扣 monsterHP，combo++）
  └─ NO  → 怪物反擊（扣 playerHP，combo=0）
    ↓
下一題 或 戰鬥結束
```

---

## ✅ 答對（我方進攻回合）

```js
if (answer === correct) {
  // 玩家攻擊怪物
  combo++
  monsterHP -= playerATK + 技能加成
  addLog(`✅ 回答正確！(combo連擊) 攻擊造成 ${dmg} 傷害！`)
}
```

技能加成（依啟動順序）：
- `critical` (暴擊之刃) → 傷害 ×3
- `berserkStacks` (狂暴) → 傷害 ×2，每用一次消耗 1 層
- `battleCryStacks` (戰鬥怒吼) → +5 攻擊
- `bloodRageStacks` (血腥狂暴) → ×1.5 + 50% 吸血
- `minionBonus` (召喚僕從) → +20
- `eagleEyeActive` (鷹眼) → +8

答對獎勵：MP +3（最多到 playerMaxMP）。

---

## ❌ 答錯（怪物反擊）

```js
else {
  // 怪物反擊，玩家扣血
  combo = 0
  if (gameState.evadeNext) {
    // 煙霧彈 / 暗影面紗：迴避
    addLog('💨 迴避了攻擊！')
  } else {
    playerHP -= monsterATK
    addLog(`👹 ${monsterName} 反擊！造成 ${monsterATK} 傷害！`)
  }
}
```

> 註：怪物反擊造成的傷害會被護盾 / 怪物攻擊減益 / 治療光環等 buff/debuff 影響嗎？
> **不會** — 答錯路徑目前是純 `playerHP -= monsterATK`，不套用 shield/monsterAtkDebuff/heal aura 等邏輯。
> 這些 buff/debuff 設計上是給未來的「怪物主動回合」用的（見 §「未來」）。

---

## 🛠️ 技能 advanceTurn()

- 技能消耗 MP 直接生效（傷害、buff、debuff）
- 調用 `advanceTurn()` = `nextQuestion() + checkBattleEnd()`
- **不觸發怪物反擊**（技能時玩家沒有答題，所以也沒有「答錯 = 反擊」）

---

## ⚠️ 為何會出現「答對也扣血」的錯覺？

**可能原因：把「答對」理解成「防守」但卻在玩家進攻回合**

例子：
1. 出現第 1 題
2. 玩家答對 → 扣怪物 HP ✅
3. 出現第 2 題
4. 玩家答錯 → 玩家扣 HP 💥

**結論**：邏輯上「答對永遠不會扣血」。如果同學反映「高難度答對也扣血」，
可能把「答錯後下一題」或「連續答錯」的情況錯認為答對也在扣血。

---

## 📊 難度損血條件速查表

| 難度 | 答對 | 答錯 |
|------|------|------|
| easy/normal/hard | 扣怪 HP ✅ | 扣我 HP 💥 |
| boss（同 hard 規則） | 同上 | 同上 |

> 註：之前 BATTLE_LOGIC.md 描述的「turnIndex 奇數/偶數回合」模型已被 commit `631387f` 簡化廢除。
> 當前模型：每題 = 一次攻擊機會，沒有「我方進攻 vs 怪獸進攻」分開的回合概念。

---

## 🔮 未來

- **怪物主動回合**（被動反擊變回合制）：需要把 `submitChoice` 答錯路徑擴展成「怪物真正按時序攻擊」
- **能量 100% 大招**：SPEC §E，目前未實作
- **題目倒計時**：SPEC L521-536，timeout 自動算答錯 → 走「答錯 = 怪物反擊」路徑
- **戰鬥評星**：SPEC L743-760，5 星評級（基於答對率 + 速度 + 連擊）

---

## 🐛 如果發現 Bug

請提供：
1. 哪個難度？
2. 第幾題？
3. 具體情況：「答對/答錯？
4. battle log 截圖
