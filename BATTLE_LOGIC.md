# Math Dungeon 戰鬥邏輯流程

> 用途：確認高難度答正確題是否錯誤扣血

---

## 🔄 整體流程

```
題目出現
    ↓
玩家選擇答案 / 輸入數字
    ↓
submitChoice(answer)
    ↓
[turnIndex 奇數？]
  ├─ YES → 我方進攻（答對扣怪物HP）
  └─ NO  → 怪獸進攻（答對=防守成功, 答錯=我方扣血）
```

---

## ⚔️ turnIndex 定義

- `turnIndex = 1,3,5...`（奇數）→ **我方進攻回合**
- `turnIndex = 2,4,6...`（偶數）→ **怪獸進攻回合**

---

## 📌 我方進攻（奇數回合）

```js
if (answer === correct) {
  // ✅ 答對 → 扣怪物HP
  combo++
  monsterHP -= playerATK
  turnIndex++
  show next question & indicator (玩家攻 ⚔️)
} else {
  // ❌ 答錯 → attack misses，雙方無損
  combo = 0
  turnIndex++
  show next question & indicator
}
```

---

## 🛡️ 怪獸進攻（偶數回合）

```js
if (answer === correct) {
  // ✅ 答對 → 防守成功，零扣血
  combo++
  turnIndex++
  show next question & indicator (怪獸攻 👹)
} else {
  // ❌ 答錯 → 怪獸扣我方HP
  combo = 0
  playerHP -= monsterATK
  turnIndex++
  updateBattleUI()
  checkBattleEnd()
}
```

---

## 🔧 技能 advanceTurn()

- 直接 `turnIndex++`，**不觸發 monsterAttack()**
- 技能消耗 MP，無需答題

---

## ⚠️ 為何高難度可能出現「答對扣血」？

**可能原因：把「答對」理解成「防守」但卻在奇數回合**

例子：
1. turnIndex = 1（奇數 = 我方進攻）
2. 出現第1題
3. 玩家答對 → 扣怪物HP ✅
4. turnIndex++ → 變成 2
5. 出現第2題，但這題變成「怪獸進攻回合」
6. 如玩家答對 → 防守成功 ✅
7. 如玩家答錯 → 玩家扣血 💥

**結論**：邏輯上「答對永遠不會扣血」。如果同學反映「高難度答對也扣血」，可能把「答錯後下一題」或「連續答錯」的情況錯認為答對也在扣血。

---

## 📊 難度損血條件速查表

| 難度 | 答對（奇數） | 答錯（奇數） | 答對（偶數） | 答錯（偶數） |
|------|------------|------------|------------|------------|
| easy/normal/hard | 扣怪HP ✅ | 無損 ❌ | 防守 ✅ | 扣我HP 💥 |

---

## 🐛 如果發現 Bug

請提供：
1. 哪個難度？
2. 第幾題？
3. 具體情況：「答對/答錯？
4. battle log 截圖
