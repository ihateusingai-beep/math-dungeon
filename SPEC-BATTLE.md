# 乘法小鎮 - 戰鬥系統規格書
# Multiplication Town - Battle System Specification

**Version**: 1.0
**Date**: 2026-05-23
**Purpose**: Game development and maintenance reference

---

## 1. System Overview

### 1.1 Core Purpose
Educational multiplication practice game with real-time battle system.

### 1.2 Technical Stack
- File: index.html (~7000 lines)
- Style: Inline CSS
- Script: Inline JavaScript
- Storage: localStorage

---

## 2. Stage Progression System

### 2.1 Stage Data Structure
`javascript
const stages = [
  { id: 1, table: 2, name: "森林哨兵", timerMod: 1.5, hpScale: 1.0, ... },
  { id: 2, table: 3, name: "哥布林", timerMod: 1.0, hpScale: 1.1, ... },
  // ... stages 1-9
];
`

### 2.2 Stage Configuration
| Stage | Table | Monster | TimerMod | HPScale | ThemeColor |
|-------|-------|---------|----------|---------|------------|
| 1 | 2x | 森林哨兵 | 1.5x | 1.0x | #4ade80 |
| 2 | 3x | 哥布林 | 1.0x | 1.1x | #60a5fa |
| 3 | 4x | 骸骨兵 | 1.0x | 1.2x | #a1a1aa |
| 4 | 5x | 獸人戰士 | 0.95x | 1.3x | #f97316 |
| 5 | 6x | 黑暗騎士 | 0.95x | 1.4x | #6366f1 |
| 6 | 7x | 暗影法師 | 0.90x | 1.5x | #8b5cf6 |
| 7 | 8x | 幼龍 | 0.90x | 1.6x | #ef4444 |
| 8 | 9x | 惡魔領主 | 0.85x | 1.8x | #dc2626 |
| 9 | 10x | 深淵魔王 | 0.85x | 2.5x | #fbbf24 |

---

## 3. Battle State

`javascript
battleState = {
  active: false,
  inBattle: false,
  currentStage: null,
  combo: 0,
  heroHp: 100,
  monsterHp: 50,
  timeLeft: 3,
  battleAnswer: 12,
  questionType: "normal",
  answerMode: "input"
};
`

---

## 4. Star Rating System

| Stars | Condition |
|-------|------------|
| ⭐ | Complete stage |
| ⭐⭐ | Accuracy >=70% OR time >30% |
| ⭐⭐⭐ | Accuracy >=90% AND time >50% |

---

## 5. Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| getStageData(stageId) | 5306 | Get stage config |
| calculateStarRating() | 5320 | Calculate stars |
| generateStageQuestion() | 5363 | Generate question |
| spawnMonster() | 4681 | Spawn monster |
| monsterDefeated() | 6796 | Handle victory |
| showStageVictory() | 6886 | Show victory screen |

---

## 6. localStorage Keys

| Key | Purpose |
|-----|---------|
| multiplicationTownStageProgress | Stage progress |
| mathTownProgress | World progress (legacy) |
| mathTownHero | Hero data |
| battleData | Battle statistics |

---

## 7. UI Components

### 7.1 Stage Selector
- CSS: .stage-selector, .stage-btn, .stage-grid
- Function: openStageSelector(), renderStageSelector()

### 7.2 Stage Banner
- CSS: .stage-banner with stage-X classes
- Animated glow for Boss stage (stage-9)

### 7.3 HP Bars
- CSS: .hp-bar, .hp-fill with green/yellow/red states
- Smooth transitions (0.3s)

### 7.4 Timer
- CSS: .timer-bar, .timer-fill
- Warning at 50%, danger at 25%

### 7.5 Combo Display
- CSS: .combo-display with milestones (5, 10, 15, 20)

---

## 8. Question Types

| Type | Description | Example |
|------|-------------|---------|
| direct | Direct multiplication | 7 × 8 = ? |
| missing | Missing factor | 7 × ? = 56 |
| application | Word problem | 每群有7隻... |

---

## 9. Unlock Rules

- Stage 1: Initially unlocked
- Stage 2-8: Complete previous stage
- Stage 9 (Boss): Complete Stage 8 + 15 total stars

---

**End of document**
