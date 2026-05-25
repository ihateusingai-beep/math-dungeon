// GameEngine.js - Core game logic without DOM dependencies
// Version: 2 (added elemental damage, energy/ultimate, combo enhancement, 3-phase bosses, new hero skills)
import {
  BattleState,
  BattlePhase,
  TurnAction,
  ActionResult,
  HEROES,
  HERO_SKILLS,
  getSkillByKey,
  canUseSkill,
  selectRandomMonster,
  Question,
  QuestionGenerator,
  QuestionType,
  PASSIVE_EFFECTS
} from '../models/index.js';
import { calculateElementalDamage, isWeakTo, isResistantTo } from '../models/Element.js';
import { applyStatusEffect, tickStatusEffects, hasEffect } from '../models/StatusEffect.js';
import { Summon } from '../models/Summon.js';

const CLASS_DAMAGE_BONUS = {
  knight: 1.10,
  mage: 1.15,
  berserker: 1.20,
  rogue: 1.12,
  priest: 1.08,
  ranger: 1.14
};

const ULTIMATE_SKILLS = {
  mage: { name: 'Arcane Burst', effect: 'aoe_150_ignore_defense' },
  knight: { name: 'Holy Strike', effect: 'heal_30pct_stun' },
  berserker: { name: 'Blood Rage', effect: 'damage_80pct_3turns_dot_10pct' },
  rogue: { name: 'Shadow Step', effect: 'teleport_300_crit' },
  priest: { name: 'Divine Heal', effect: 'heal_aoe_50pct_remove_debuffs' },
  ranger: { name: 'Arrow Rain', effect: 'aoe_120_all' }
};

const SPECIAL_COMBO_TRIGGERS = {
  15: { type: 'unlock_buff', name: 'Wind Protection', effect: 'wind_shield' },
  20: { type: 'clear_cooldowns', name: 'Clear All' },
  30: { type: 'restore_energy', name: 'Full Energy', amount: 100 },
  50: { type: 'heroic_domain', name: 'Heroic Domain', effect: 'all_stats_50pct' }
};

export class GameEngine {
  constructor(options = {}) {
    this.state = new BattleState();
    this.questionGenerator = options.questionGenerator || new QuestionGenerator();
    this.currentQuestion = null;
    this.onStateChange = options.onStateChange || null;
    this.onPhaseChange = options.onPhaseChange || null;
    this.playerCount = options.playerCount || 1;
    this.sessionId = options.sessionId || null;
    this.answerStartTime = null;
    this.summons = [];
  }

  // ========== STATE MANAGEMENT ==========

  getState() {
    return this.state.serialize();
  }

  loadState(stateData) {
    return this.state.deserialize(stateData);
  }

  reset() {
    this.state.reset();
    this.currentQuestion = null;
    this.summons = [];
  }

  // ========== BATTLE FLOW ==========

  startBattle(options = {}) {
    const { heroKey = 'knight', domain = 'newbie', stage = null } = options;

    this.state.phase = BattlePhase.BATTLE;
    this.state.heroKey = heroKey;
    this.state.domain = domain;
    this.state.currentStage = stage;

    const hero = HEROES[heroKey];
    if (!hero) return { success: false, message: 'Invalid hero' };

    this.state.heroMaxHp = hero.hp + (this.state.heroLevel - 1) * 20;
    this.state.heroHp = this.state.heroMaxHp;
    this.state.mana = this.state.maxMana;
    this.state.combo = 0;
    this.state.shield = 0;
    this.state.skillCooldowns = {};
    this.state.activeEffects = [];
    this.state.monsterTurnCount = 0;
    this.state.monsterBuffs = [];
    this.state.energy = 0;
    this.state.ultimateReady = false;
    this.state.attackCount = 0;
    this.summons = [];

    this.spawnMonster();
    this.generateQuestion();

    this.emitStateChange();
    return { success: true, message: 'Battle started' };
  }

  spawnMonster() {
    const monster = selectRandomMonster(this.state.domain, this.playerCount);
    this.state.monsterHp = monster.hp;
    this.state.monsterMaxHp = monster.maxHp;
    this.state.monsterName = monster.name;
    this.state.monsterEmoji = monster.emoji;
    this.state.monsterGold = monster.gold;
    this.state.monsterExp = monster.exp;
    this.state.isBoss = monster.boss;
    this.state.monsterBuffs = monster.buffs || [];
    this.state.monsterPhase = monster.phase || 1;
    this.state.monsterMaxPhase = monster.maxPhase || 1;
    this.state.monsterElement = monster.element || null;

    this.emitStateChange();
    return monster;
  }

  generateQuestion(playerIndex = 0) {
    let adjustedDifficulty = this.state.difficultyLevel;

    if (this.playerCount > 1 && playerIndex > 0) {
      adjustedDifficulty = Math.min(this.state.difficultyLevel + playerIndex, 10);
    }

    this.currentQuestion = this.questionGenerator.generate(
      this.state.domain,
      adjustedDifficulty
    );
    this.state.questionType = this.currentQuestion.type;
    this.answerStartTime = Date.now();
    return this.currentQuestion;
  }

  // ========== PLAYER ACTIONS ==========

  answer(input) {
    if (!this.currentQuestion) {
      return { correct: false, message: 'No question active' };
    }

    const correct = parseInt(input) === this.currentQuestion.answer;
    const result = new ActionResult(TurnAction.ANSWER_QUESTION, correct, {
      input: input,
      correctAnswer: this.currentQuestion.answer,
      questionId: this.currentQuestion.id
    });

    if (correct) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }

    this.questionGenerator.updateAdaptiveState(correct);
    return result;
  }

  handleCorrectAnswer() {
    const answerTime = (Date.now() - this.answerStartTime) / 1000;
    const hero = HEROES[this.state.heroKey];
    const baseDamage = Math.floor(Math.random() * (hero.atkMax - hero.atkMin + 1)) + hero.atkMin;

    let damageMultiplier = 1;
    let isCrit = false;

    if (Math.random() < hero.crit) {
      damageMultiplier = 2;
      isCrit = true;
    }

    this.state.combo++;
    this.state.attackCount++;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 10);
    if (this.state.energy >= 100) {
      this.state.ultimateReady = true;
    }

    const comboMultiplier = this.getComboMultiplier();
    damageMultiplier *= comboMultiplier;

    const timeBonus = this.getTimeBonus(answerTime);
    damageMultiplier *= timeBonus;

    const arcaneMastery = this.state.activeEffects.find(e => e.type === 'arcane_mastery');
    if (arcaneMastery) {
      damageMultiplier *= 3;
      this.state.activeEffects = this.state.activeEffects.filter(e => e.type !== 'arcane_mastery');
    }

    let finalDamage = Math.floor(baseDamage * damageMultiplier);

    const heroElement = hero.element || 'arcane';
    if (this.state.monsterElement) {
      finalDamage = Math.floor(calculateElementalDamage(finalDamage, heroElement, this.state.monsterElement));
    }

    this.state.monsterHp = Math.max(0, this.state.monsterHp - finalDamage);

    this.state.mana = Math.min(this.state.maxMana, this.state.mana + 2);

    this.checkSpecialComboTriggers();

    this.checkPhaseTransition();
    this.checkMonsterDefeated();

    this.emitStateChange();
    return { damage: finalDamage, isCrit, combo: this.state.combo, element: heroElement };
  }

  handleWrongAnswer() {
    this.state.combo = 0;
    this.state.energy = Math.max(0, this.state.energy - 20);
    if (this.state.energy < 100) {
      this.state.ultimateReady = false;
    }
    this.performMonsterTurn();
    this.emitStateChange();
  }

  releaseUltimate() {
    if (this.state.energy < 100 || !this.state.ultimateReady) {
      return { success: false, message: 'Ultimate not ready' };
    }

    const heroKey = this.state.heroKey;
    const ultimateSkill = ULTIMATE_SKILLS[heroKey];
    if (!ultimateSkill) {
      return { success: false, message: 'No ultimate skill available' };
    }

    this.state.energy = 0;
    this.state.ultimateReady = false;
    this.state.combo = 0;

    const result = this.applyUltimateEffect(ultimateSkill);

    this.checkPhaseTransition();
    this.checkMonsterDefeated();

    this.emitStateChange();
    return { success: true, skill: ultimateSkill, ...result };
  }

  applyUltimateEffect(ultimate) {
    const hero = HEROES[this.state.heroKey];
    const baseDamage = Math.floor(Math.random() * (hero.atkMax - hero.atkMin + 1)) + hero.atkMin;

    switch (ultimate.effect) {
      case 'aoe_150_ignore_defense':
        const damage = Math.floor(baseDamage * 1.5);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
        return { damage, message: `${ultimate.name}! ${damage}傷害` };

      case 'heal_30pct_stun':
        const healAmount = Math.floor(this.state.heroMaxHp * 0.3);
        this.state.heroHp = Math.min(this.state.heroMaxHp, this.state.heroHp + healAmount);
        this.applyStatusToMonster('stun', 1);
        return { damage: 0, heal: healAmount, message: `${ultimate.name}! 治療${healAmount}HP並眩暈` };

      case 'damage_80pct_3turns_dot_10pct':
        const dotDamage = Math.floor(baseDamage * 0.8);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - dotDamage);
        this.state.monsterBuffs.push({ type: 'burn', duration: 3, dot: 0.1 });
        return { damage: dotDamage, message: `${ultimate.name}! ${dotDamage}傷害+燃燒3回合` };

      case 'teleport_300_crit':
        const critDamage = Math.floor(baseDamage * 3);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - critDamage);
        return { damage: critDamage, isCrit: true, message: `${ultimate.name}! ${critDamage}暴擊傷害` };

      case 'heal_aoe_50pct_remove_debuffs':
        const aoeHeal = Math.floor(this.state.heroMaxHp * 0.5);
        this.state.heroHp = Math.min(this.state.heroMaxHp, this.state.heroHp + aoeHeal);
        this.state.activeEffects = this.state.activeEffects.filter(e => e.type !== 'debuff');
        return { heal: aoeHeal, message: `${ultimate.name}! 治療${aoeHeal}HP並清除debuff` };

      case 'aoe_120_all':
        const aoeDamage = Math.floor(baseDamage * 1.2);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - aoeDamage);
        return { damage: aoeDamage, message: `${ultimate.name}! ${aoeDamage}傷害` };

      default:
        return { damage: 0, message: `${ultimate.name} triggered` };
    }
  }

  useSkill(skillKey) {
    const check = canUseSkill(
      this.state.heroKey,
      skillKey,
      this.state.heroLevel,
      this.state.skillCooldowns,
      this.state.mana
    );

    if (!check.canUse) {
      return { success: false, message: check.reason };
    }

    const skill = check.skill;
    this.state.mana -= skill.manaCost;
    this.state.skillCooldowns[skillKey] = skill.cooldown;

    const result = this.applySkillEffect(skill);
    return result;
  }

  applySkillEffect(skill) {
    const hero = HEROES[this.state.heroKey];
    const heroElement = hero.element || 'arcane';

    switch (skill.effect) {
      case 'shield_block':
        this.state.shield = Math.min(this.state.shield + 1, 5);
        return { success: true, message: '+1護盾', damage: 0 };

      case 'challenge':
        this.state.activeEffects.push({ type: 'challenge', turnsRemaining: 3 });
        return { success: true, message: '挑釁成功' };

      case 'bulwark':
        const bulwarkShield = Math.floor(this.state.heroMaxHp * 0.2);
        this.state.shield = Math.min(this.state.shield + bulwarkShield, 10);
        return { success: true, message: `+${bulwarkShield}護盾` };

      case 'last_stand':
        this.state.activeEffects.push({ type: 'last_stand', turnsRemaining: 99 });
        return { success: true, message: '背水一戰啟動' };

      case 'divine_shield':
        this.state.activeEffects.push({ type: 'divine_shield', turnsRemaining: 1 });
        return { success: true, message: '無敵1回合' };

      case 'arcane_bolt':
        const { damage, isCrit } = this.calculateDamage(1.5, heroElement);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
        this.checkMonsterDefeated();
        return { success: true, message: `${damage}傷害`, damage, isCrit };

      case 'mana_surge':
        this.state.mana = Math.min(this.state.maxMana, this.state.mana + Math.floor(this.state.maxMana * 0.5));
        return { success: true, message: '法力恢復' };

      case 'arcane_barrage':
        let totalDamage = 0;
        for (let i = 0; i < 3; i++) {
          const { damage } = this.calculateDamage(0.5, heroElement);
          this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
          totalDamage += damage;
        }
        this.checkMonsterDefeated();
        return { success: true, message: `奧術轟擊 ${totalDamage}傷害`, damage: totalDamage };

      case 'arcane_mastery':
        this.state.activeEffects.push({ type: 'arcane_mastery', multiplier: 3.0, turnsRemaining: 1 });
        return { success: true, message: '下次300%傷害' };

      case 'wild_swing':
        const wsDamage = this.calculateDamage(1.2, heroElement);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - wsDamage.damage);
        this.state.heroHp = Math.max(1, this.state.heroHp - 5);
        this.checkMonsterDefeated();
        return { success: true, message: `${wsDamage.damage}傷害, -5HP`, damage: wsDamage.damage };

      case 'rage_build':
        this.state.rageStacks = Math.min(this.state.rageStacks + 1, 5);
        return { success: true, message: `怒火+1 (${this.state.rageStacks}/5)` };

      case 'berserker_roar':
        if (this.state.rageStacks > 0) {
          const bonus = 1 + this.state.rageStacks * 0.25;
          const { damage, isCrit } = this.calculateDamage(bonus, heroElement);
          this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
          this.state.rageStacks = 0;
          this.checkMonsterDefeated();
          return { success: true, message: `怒火爆發! ${damage}傷害`, damage, isCrit };
        }
        return { success: false, message: '沒有怒火' };

      case 'bloodlust':
        this.state.activeEffects.push({ type: 'bloodlust', turnsRemaining: 99 });
        return { success: true, message: '血祭啟動' };

      case 'undying_rage':
        this.state.activeEffects.push({ type: 'undying_rage', used: false, turnsRemaining: 99 });
        return { success: true, message: '不死怒火啟動' };

      case 'shadow_step':
        const ssDamage = this.calculateDamage(2.0, 'wind', true);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - ssDamage.damage);
        this.applyStatusToMonster('stun', 1);
        return { success: true, message: `影步! ${ssDamage.damage}傷害`, damage: ssDamage.damage, isCrit: ssDamage.isCrit };

      case 'backstab':
        const bsDamage = this.calculateDamage(2.0, 'wind', true, true);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - bsDamage.damage);
        return { success: true, message: `背刺! ${bsDamage.damage}傷害`, damage: bsDamage.damage, isCrit: bsDamage.isCrit };

      case 'poison_blade':
        const pbDamage = this.calculateDamage(1.2, 'wind');
        this.state.monsterHp = Math.max(0, this.state.monsterHp - pbDamage.damage);
        this.applyStatusToMonster('poison', 4);
        return { success: true, message: `毒刃! ${pbDamage.damage}傷害`, damage: pbDamage.damage };

      case 'smoke_bomb':
        this.state.activeEffects.push({ type: 'stealth', turnsRemaining: 2, guaranteedFirst: true });
        return { success: true, message: '煙霧彈! 隱身2回合' };

      case 'lethal_razor':
        let lrTotal = 0;
        for (let i = 0; i < 3; i++) {
          const { damage } = this.calculateDamage(1.5, 'wind');
          this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
          lrTotal += damage;
        }
        this.checkMonsterDefeated();
        return { success: true, message: `致命剃刀! ${lrTotal}傷害×3`, damage: lrTotal };

      case 'shadow_master':
        const smDamage = this.calculateDamage(2.5, 'wind', true);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - smDamage.damage);
        this.applyStatusToMonster('stun', 2);
        this.checkMonsterDefeated();
        return { success: true, message: `影主! ${smDamage.damage}傷害+眩暈`, damage: smDamage.damage, isCrit: smDamage.isCrit };

      case 'divine_heal':
        const healAmount = Math.floor(this.state.heroMaxHp * 0.3);
        this.state.heroHp = Math.min(this.state.heroMaxHp, this.state.heroHp + healAmount);
        return { success: true, message: `神聖治療! +${healAmount}HP`, heal: healAmount };

      case 'holy_light':
        const hlDamage = this.calculateDamage(1.2, 'light');
        this.state.monsterHp = Math.max(0, this.state.monsterHp - hlDamage.damage);
        this.checkMonsterDefeated();
        return { success: true, message: `聖光! ${hlDamage.damage}傷害`, damage: hlDamage.damage, isCrit: hlDamage.isCrit };

      case 'blessing':
        this.state.activeEffects.push({ type: 'blessing', turnsRemaining: 3, atkBonus: 0.15 });
        return { success: true, message: '祝福! 攻擊+15% 3回合' };

      case 'holy_nova':
        const hnDamage = this.calculateDamage(1.8, 'light');
        this.state.monsterHp = Math.max(0, this.state.monsterHp - hnDamage.damage);
        this.checkMonsterDefeated();
        return { success: true, message: `聖光新星! ${hnDamage.damage}傷害`, damage: hnDamage.damage, isCrit: hnDamage.isCrit };

      case 'dispel':
        this.state.monsterBuffs = [];
        const dispDamage = this.calculateDamage(1.0, 'light');
        this.state.monsterHp = Math.max(0, this.state.monsterHp - dispDamage.damage);
        this.checkMonsterDefeated();
        return { success: true, message: `驅散! 移除buff+${dispDamage.damage}傷害`, damage: dispDamage.damage };

      case 'angelic_descent':
        const adHeal = Math.floor(this.state.heroMaxHp * 0.5);
        this.state.heroHp = Math.min(this.state.heroMaxHp, this.state.heroHp + adHeal);
        this.state.activeEffects.push({ type: 'divine_shield', turnsRemaining: 2 });
        this.applyStatusToSelf('regen', 3);
        return { success: true, message: `天使降臨! +${adHeal}HP+無敵`, heal: adHeal };

      case 'shot':
        const shotDamage = this.calculateDamage(1.0, 'wind');
        this.state.monsterHp = Math.max(0, this.state.monsterHp - shotDamage.damage);
        this.checkMonsterDefeated();
        return { success: true, message: `射擊! ${shotDamage.damage}傷害`, damage: shotDamage.damage };

      case 'multi_shot':
        let msTotal = 0;
        for (let i = 0; i < 3; i++) {
          const { damage } = this.calculateDamage(0.8, 'wind');
          this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
          msTotal += damage;
        }
        this.checkMonsterDefeated();
        return { success: true, message: `多重射擊! ${msTotal}傷害×3`, damage: msTotal };

      case 'snipe':
        const snipeDamage = this.calculateDamage(2.5, 'wind', false, true);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - snipeDamage.damage);
        this.checkMonsterDefeated();
        return { success: true, message: `狙擊! ${snipeDamage.damage}傷害`, damage: snipeDamage.damage, isCrit: snipeDamage.isCrit };

      case 'arrow_rain':
        let arTotal = 0;
        for (let i = 0; i < 5; i++) {
          const { damage } = this.calculateDamage(1.2, 'wind');
          this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
          arTotal += damage;
        }
        this.checkMonsterDefeated();
        return { success: true, message: `箭雨! ${arTotal}傷害×5`, damage: arTotal };

      case 'trap':
        this.state.monsterBuffs.push({ type: 'trap', duration: 99, triggerDamage: 150 });
        this.state.monsterBuffs.push({ type: 'stun', duration: 1 });
        return { success: true, message: '陷阱! 眩暈+150%傷害' };

      case 'piercing_shot':
        const psDamage = this.calculateDamage(4.0, 'wind', false, true);
        this.state.monsterHp = Math.max(0, this.state.monsterHp - psDamage.damage);
        this.checkMonsterDefeated();
        return { success: true, message: `穿刺之箭! ${psDamage.damage}傷害`, damage: psDamage.damage, isCrit: psDamage.isCrit };

      default:
        return { success: false, message: '技能效果未知' };
    }
  }

  applyStatusToMonster(statusType, duration) {
    if (!this.state.monsterBuffs) this.state.monsterBuffs = [];
    this.state.monsterBuffs.push({ type: statusType, duration });
  }

  applyStatusToSelf(statusType, duration) {
    this.state.activeEffects.push({ type: statusType, duration });
  }

  calculateDamage(multiplier = 1, element = 'arcane', ignoreDefense = false, forceCrit = false) {
    const hero = HEROES[this.state.heroKey];
    let baseDamage = Math.floor(Math.random() * (hero.atkMax - hero.atkMin + 1)) + hero.atkMin;

    let finalMultiplier = multiplier;
    let isCrit = forceCrit || Math.random() < hero.crit;
    if (isCrit) finalMultiplier *= 2;

    const lastStand = this.state.activeEffects.find(e => e.type === 'last_stand');
    if (lastStand && this.state.heroHp < this.state.heroMaxHp * 0.25) {
      finalMultiplier *= 1.5;
    }

    const blessing = this.state.activeEffects.find(e => e.type === 'blessing');
    if (blessing) {
      finalMultiplier *= (1 + blessing.atkBonus);
    }

    const heroic = this.state.activeEffects.find(e => e.type === 'heroic');
    if (heroic) {
      finalMultiplier *= 1.5;
    }

    if (!ignoreDefense && this.state.monsterDef) {
      const reduction = this.state.monsterDef / 100;
      finalMultiplier *= (1 - reduction);
    }

    const classBonus = CLASS_DAMAGE_BONUS[this.state.heroKey] || 1.0;
    finalMultiplier *= classBonus;

    return { damage: Math.floor(baseDamage * finalMultiplier), isCrit };
  }

  getTimeBonus(answerTime) {
    if (answerTime <= 5) return 1.5;
    if (answerTime <= 10) return 1.2;
    if (answerTime <= 20) return 1.0;
    return 0.8;
  }

  getComboMultiplier() {
    if (this.state.combo >= 50) return 2.0;
    if (this.state.combo >= 20) return 1.5;
    if (this.state.combo >= 10) return 1.25;
    if (this.state.combo >= 5) return 1.1;
    return 1.0;
  }

  checkSpecialComboTriggers() {
    const trigger = SPECIAL_COMBO_TRIGGERS[this.state.combo];
    if (!trigger) return;

    switch (trigger.type) {
      case 'unlock_buff':
        this.state.activeEffects.push({ type: trigger.effect, turnsRemaining: 3, name: trigger.name });
        break;
      case 'clear_cooldowns':
        this.state.skillCooldowns = {};
        break;
      case 'restore_energy':
        this.state.energy = this.state.maxEnergy;
        this.state.ultimateReady = true;
        break;
      case 'heroic_domain':
        this.state.activeEffects.push({ type: 'heroic', name: trigger.name, permanent: true, allStatsBonus: 0.5 });
        break;
    }
  }

  checkPhaseTransition() {
    if (!this.state.isBoss || this.state.monsterMaxPhase <= 1) return;

    const hpPercent = (this.state.monsterHp / this.state.monsterMaxHp) * 100;

    if (this.state.monsterPhase === 1 && hpPercent <= 60) {
      this.state.monsterPhase = 2;
      this.emitPhaseChange('boss_phase_change', { phase: 2, name: '第二階段' });
    } else if (this.state.monsterPhase === 2 && hpPercent <= 30) {
      this.state.monsterPhase = 3;
      this.emitPhaseChange('boss_phase_change', { phase: 3, name: '狂暴階段' });
    }
  }

  // ========== MONSTER TURN ==========

  performMonsterTurn() {
    this.state.monsterTurnCount++;

    let damage = Math.floor(Math.random() * 8) + 5;
    if (this.state.isBoss && this.state.monsterPhase > 1) {
      damage = Math.floor(damage * (1 + 0.2 * this.state.monsterPhase));
    }

    this.applyDamageToHero(damage);

    tickStatusEffects({ buffs: this.state.activeEffects });

    this.tickCooldowns();
    this.emitStateChange();

    this.checkDefeat();
  }

  applyDamageToHero(damage) {
    let mitigatedDamage = damage;

    const stunEffect = this.state.activeEffects.find(e => e.type === 'stun' || e.type === 'freeze');
    if (stunEffect) {
      return;
    }

    const divineShield = this.state.activeEffects.find(e => e.type === 'divine_shield');
    if (divineShield) {
      mitigatedDamage = 0;
      this.state.activeEffects = this.state.activeEffects.filter(e => e.type !== 'divine_shield');
    }

    if (this.state.shield > 0) {
      this.state.shield--;
      mitigatedDamage = Math.floor(mitigatedDamage * 0.5);
    }

    this.state.heroHp = Math.max(0, this.state.heroHp - mitigatedDamage);

    if (mitigatedDamage > 0) {
      this.state.mana = Math.max(0, this.state.mana - 5);
    }
  }

  tickCooldowns() {
    for (const key in this.state.skillCooldowns) {
      if (this.state.skillCooldowns[key] > 0) {
        this.state.skillCooldowns[key]--;
      }
    }
  }

  // ========== WIN/LOSE CONDITIONS ==========

  checkMonsterDefeated() {
    if (this.state.monsterHp <= 0) {
      this.state.gold += this.state.monsterGold;
      this.state.monstersDefeated++;
      this.state.heroExp += this.state.monsterExp;

      this.checkLevelUp();
      this.spawnMonster();
      this.generateQuestion();
      return true;
    }
    return false;
  }

  checkLevelUp() {
    if (this.state.heroExp >= this.state.expToNextLevel) {
      this.state.heroLevel++;
      this.state.heroExp = 0;
      this.state.expToNextLevel = Math.floor(this.state.expToNextLevel * 1.5);
      this.state.heroMaxHp += 20;

      this.emitPhaseChange('level_up', { level: this.state.heroLevel });
    }
  }

  checkDefeat() {
    if (this.state.heroHp <= 0) {
      const undyingRage = this.state.activeEffects.find(e => e.type === 'undying_rage' && !e.used);
      if (undyingRage) {
        undyingRage.used = true;
        this.state.heroHp = 1;
        this.state.activeEffects = this.state.activeEffects.filter(e => e.type !== 'undying_rage' || e !== undyingRage);
        return false;
      }

      this.state.phase = BattlePhase.DEFEAT;
      this.emitPhaseChange('defeat');
      return true;
    }
    return false;
  }

  // ========== SUMMON SYSTEM ==========

  summon(summonType, ownerId) {
    if (this.summons.length > 0) {
      return { success: false, message: 'Already have an active summon' };
    }
    const summon = new Summon(summonType, ownerId);
    this.summons.push(summon);
    return { success: true, summon };
  }

  executeSummonTurn() {
    for (const summon of this.summons) {
      const action = summon.takeTurn([this.state], this.getState());
      if (action.damage) {
        this.state.monsterHp = Math.max(0, this.state.monsterHp - action.damage);
      }
      if (action.heal) {
        this.state.heroHp = Math.min(this.state.heroMaxHp, this.state.heroHp + action.heal);
      }
      summon.duration--;
    }
    this.summons = this.summons.filter(s => s.duration > 0);
  }

  // ========== SESSION MANAGEMENT ==========

  endTurn() {
    this.performMonsterTurn();

    if (this.state.phase === BattlePhase.BATTLE) {
      this.emitPhaseChange('turn_end', { nextPhase: 'player_turn' });
    }

    this.emitStateChange();
  }

  setActivePlayer(playerId) {
    this.emitPhaseChange('player_turn', { playerId });
  }

  // ========== UTILITY ==========

  getScaledHP(baseHP, playerCount) {
    return Math.floor(baseHP * (1 + 0.2 * (playerCount - 1)));
  }

  // ========== CALLBACKS ==========

  emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  emitPhaseChange(phase, data = {}) {
    if (this.onPhaseChange) {
      this.onPhaseChange(phase, data);
    }
  }

  // ========== SERIALIZATION ==========

  serialize() {
    return {
      version: 2,
      state: this.state.serialize(),
      currentQuestion: this.currentQuestion ? this.currentQuestion.serialize() : null,
      questionGenerator: this.questionGenerator.serialize(),
      playerCount: this.playerCount,
      sessionId: this.sessionId
    };
  }

  deserialize(data) {
    if (!data || data.version !== 2) return false;
    this.state.deserialize(data.state);
    this.questionGenerator.deserialize(data.questionGenerator);
    this.playerCount = data.playerCount || 1;
    this.sessionId = data.sessionId;
    return true;
  }
}

export function createGameEngine(options) {
  return new GameEngine(options);
}