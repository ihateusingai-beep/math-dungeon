// BattleState.js - Serializable battle state model
// Version: 2 (added energy, monster phase, attack count)

export const BattlePhase = {
  MENU: 'menu',
  BATTLE: 'battle',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
};

export const TurnAction = {
  ANSWER_QUESTION: 'answer_question',
  USE_SKILL: 'use_skill',
  DEFEND: 'defend',
  ITEM: 'item',
  ULTIMATE: 'ultimate'
};

export class BattleState {
  constructor() {
    this.reset();
  }

  reset() {
    this.version = 2;
    this.phase = BattlePhase.MENU;
    this.heroKey = 'knight';
    this.heroHp = 100;
    this.heroMaxHp = 100;
    this.heroLevel = 1;
    this.heroExp = 0;
    this.expToNextLevel = 100;
    this.monsterHp = 0;
    this.monsterMaxHp = 0;
    this.monsterName = '';
    this.monsterEmoji = '';
    this.monsterGold = 0;
    this.monsterExp = 0;
    this.isBoss = false;
    this.combo = 0;
    this.gold = 0;
    this.monstersDefeated = 0;
    this.shield = 0;
    this.mana = 100;
    this.maxMana = 100;
    this.skillCooldowns = {};
    this.activeEffects = [];
    this.rageStacks = 0;
    this.monsterTurnCount = 0;
    this.monsterBuffs = [];
    this.currentStage = null;
    this.answerMode = 'input';
    this.optionCount = 3;
    this.domain = 'newbie';
    this.difficultyLevel = 0;
    this.timeLeft = 3.0;
    this.maxTime = 3.0;
    this.questionType = 'normal';
    this.activeEffects = [];
    this.energy = 0;
    this.maxEnergy = 100;
    this.ultimateReady = false;
    this.monsterPhase = 1;
    this.monsterMaxPhase = 1;
    this.monsterElement = null;
    this.attackCount = 0;
  }

  serialize() {
    return {
      version: this.version,
      phase: this.phase,
      heroKey: this.heroKey,
      heroHp: this.heroHp,
      heroMaxHp: this.heroMaxHp,
      heroLevel: this.heroLevel,
      heroExp: this.heroExp,
      expToNextLevel: this.expToNextLevel,
      monsterHp: this.monsterHp,
      monsterMaxHp: this.monsterMaxHp,
      monsterName: this.monsterName,
      monsterEmoji: this.monsterEmoji,
      monsterGold: this.monsterGold,
      monsterExp: this.monsterExp,
      isBoss: this.isBoss,
      combo: this.combo,
      gold: this.gold,
      monstersDefeated: this.monstersDefeated,
      shield: this.shield,
      mana: this.mana,
      maxMana: this.maxMana,
      skillCooldowns: { ...this.skillCooldowns },
      activeEffects: this.activeEffects.map(e => ({ ...e })),
      rageStacks: this.rageStacks,
      monsterTurnCount: this.monsterTurnCount,
      monsterBuffs: this.monsterBuffs.map(b => ({ ...b })),
      currentStage: this.currentStage,
      answerMode: this.answerMode,
      optionCount: this.optionCount,
      domain: this.domain,
      difficultyLevel: this.difficultyLevel,
      timeLeft: this.timeLeft,
      maxTime: this.maxTime,
      questionType: this.questionType,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      ultimateReady: this.ultimateReady,
      monsterPhase: this.monsterPhase,
      monsterMaxPhase: this.monsterMaxPhase,
      monsterElement: this.monsterElement,
      attackCount: this.attackCount
    };
  }

  deserialize(data) {
    if (!data) {
      console.warn('BattleState: No data provided, using defaults');
      return false;
    }
    this.version = data.version ?? 2;
    this.phase = data.phase ?? BattlePhase.MENU;
    this.heroKey = data.heroKey ?? 'knight';
    this.heroHp = data.heroHp ?? 100;
    this.heroMaxHp = data.heroMaxHp ?? 100;
    this.heroLevel = data.heroLevel ?? 1;
    this.heroExp = data.heroExp ?? 0;
    this.expToNextLevel = data.expToNextLevel ?? 100;
    this.monsterHp = data.monsterHp ?? 0;
    this.monsterMaxHp = data.monsterMaxHp ?? 0;
    this.monsterName = data.monsterName ?? '';
    this.monsterEmoji = data.monsterEmoji ?? '';
    this.monsterGold = data.monsterGold ?? 0;
    this.monsterExp = data.monsterExp ?? 0;
    this.isBoss = data.isBoss ?? false;
    this.combo = data.combo ?? 0;
    this.gold = data.gold ?? 0;
    this.monstersDefeated = data.monstersDefeated ?? 0;
    this.shield = data.shield ?? 0;
    this.mana = data.mana ?? 100;
    this.maxMana = data.maxMana ?? 100;
    this.skillCooldowns = data.skillCooldowns ?? {};
    this.activeEffects = (data.activeEffects || []).map(e => ({ ...e }));
    this.rageStacks = data.rageStacks ?? 0;
    this.monsterTurnCount = data.monsterTurnCount ?? 0;
    this.monsterBuffs = (data.monsterBuffs || []).map(b => ({ ...b }));
    this.currentStage = data.currentStage ?? null;
    this.answerMode = data.answerMode ?? 'input';
    this.optionCount = data.optionCount ?? 3;
    this.domain = data.domain ?? 'newbie';
    this.difficultyLevel = data.difficultyLevel ?? 0;
    this.timeLeft = data.timeLeft ?? 3.0;
    this.maxTime = data.maxTime ?? 3.0;
    this.questionType = data.questionType ?? 'normal';
    this.energy = data.energy ?? 0;
    this.maxEnergy = data.maxEnergy ?? 100;
    this.ultimateReady = data.ultimateReady ?? false;
    this.monsterPhase = data.monsterPhase ?? 1;
    this.monsterMaxPhase = data.monsterMaxPhase ?? 1;
    this.monsterElement = data.monsterElement ?? null;
    this.attackCount = data.attackCount ?? 0;
    return true;
  }
}

export class TurnContext {
  constructor(playerId, availableActions, timeLimit = null) {
    this.playerId = playerId;
    this.turnNumber = 0;
    this.availableActions = availableActions || [TurnAction.ANSWER_QUESTION, TurnAction.USE_SKILL, TurnAction.DEFEND, TurnAction.ITEM];
    this.timeLimit = timeLimit;
    this.startedAt = Date.now();
  }

  serialize() {
    return {
      playerId: this.playerId,
      turnNumber: this.turnNumber,
      availableActions: this.availableActions,
      timeLimit: this.timeLimit,
      startedAt: this.startedAt
    };
  }
}

export class ActionResult {
  constructor(action, success, data = {}) {
    this.action = action;
    this.success = success;
    this.timestamp = Date.now();
    this.data = data;
  }

  serialize() {
    return {
      action: this.action,
      success: this.success,
      timestamp: this.timestamp,
      data: { ...this.data }
    };
  }
}