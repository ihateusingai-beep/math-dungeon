// MathBattle Module Bundle
// Version: 1
// This file bundles all modules for use in browser via script tag

(function(global) {
  'use strict';

  // ========== BattleState.js ==========
  const BattlePhase = {
    MENU: 'menu',
    BATTLE: 'battle',
    VICTORY: 'victory',
    DEFEAT: 'defeat'
  };

  const TurnAction = {
    ANSWER_QUESTION: 'answer_question',
    USE_SKILL: 'use_skill',
    DEFEND: 'defend',
    ITEM: 'item'
  };

  class BattleState {
    constructor() {
      this.reset();
    }

    reset() {
      this.version = 1;
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
        questionType: this.questionType
      };
    }

    deserialize(data) {
      if (!data || data.version !== 1) return false;
      Object.assign(this, data);
      return true;
    }
  }

  class TurnContext {
    constructor(playerId, availableActions, timeLimit = null) {
      this.playerId = playerId;
      this.turnNumber = 0;
      this.availableActions = availableActions || Object.values(TurnAction);
      this.timeLimit = timeLimit;
      this.startedAt = Date.now();
    }
  }

  class ActionResult {
    constructor(action, success, data = {}) {
      this.action = action;
      this.success = success;
      this.timestamp = Date.now();
      this.data = data;
    }
  }

  // ========== Hero.js ==========
  class Hero {
    constructor(key, name, hp, atkMin, atkMax, crit, img, color, passive) {
      this.key = key;
      this.name = name;
      this.hp = hp;
      this.maxHp = hp;
      this.atkMin = atkMin;
      this.atkMax = atkMax;
      this.crit = crit;
      this.img = img;
      this.color = color;
      this.passive = passive;
    }

    serialize() {
      return { ...this };
    }
  }

  const HEROES = {
    knight: new Hero('knight', '銀藍騎士', 100, 8, 12, 0.1, 'assets/images/knight-hero.png', '#4a90e2', 'block'),
    mage: new Hero('mage', '銀月法師', 80, 12, 18, 0.15, 'assets/images/mage-hero.png', '#9b59b6', 'critBoost'),
    berserker: new Hero('berserker', '烈焰狂戰', 120, 15, 25, 0.25, 'assets/images/berserker-hero.png', '#e74c3c', 'rage')
  };

  class PlayerProfile {
    constructor(playerId, name, heroKey) {
      this.playerId = playerId;
      this.name = name;
      this.heroKey = heroKey;
      this.hp = 100;
      this.maxHp = 100;
      this.gold = 0;
      this.exp = 0;
      this.level = 1;
    }

    serialize() {
      return { ...this };
    }

    deserialize(data) {
      Object.assign(this, data);
    }
  }

  // ========== Monster.js ==========
  class Monster {
    constructor(name, emoji, img, hpMin, hpMax, gold, exp, boss = false) {
      this.name = name;
      this.emoji = emoji;
      this.img = img;
      this.hpMin = hpMin;
      this.hpMax = hpMax;
      this.gold = gold;
      this.exp = exp;
      this.boss = boss;
    }

    rollHp(playerCount = 1) {
      const baseHp = Math.floor(Math.random() * (this.hpMax - this.hpMin + 1)) + this.hpMin;
      return Math.floor(baseHp * (1 + 0.2 * (playerCount - 1)));
    }
  }

  const MONSTERS = {
    newbie: [
      new Monster('森林史萊姆', '🟢', 'assets/images/slime-monster.jpeg', 5, 8, 10, 5),
      new Monster('草原小狼', '🐺', 'assets/images/monsters/wolf.png', 7, 10, 15, 8)
    ],
    veteran: [
      new Monster('城堡守衛', '⚔️', 'assets/images/castle-guard.jpeg', 12, 18, 25, 15),
      new Monster('蝙蝠王', '🦇', 'assets/images/monsters/bat.png', 15, 20, 30, 20)
    ],
    legend: [
      new Monster('暗黑惡魔', '👹', 'assets/images/demon-boss.jpeg', 25, 35, 50, 40, true),
      new Monster('骨法師', '💀', 'assets/images/monsters/skeleton_mage.png', 20, 30, 45, 35, true)
    ]
  };

  function getMonstersForDomain(domain) {
    return MONSTERS[domain] || MONSTERS.newbie;
  }

  function selectRandomMonster(domain, playerCount = 1) {
    const pool = getMonstersForDomain(domain);
    const template = pool[Math.floor(Math.random() * pool.length)];
    const hp = template.rollHp(playerCount);
    return {
      name: template.name,
      emoji: template.emoji,
      img: template.img,
      hp: hp,
      maxHp: hp,
      gold: template.gold,
      exp: template.exp,
      boss: template.boss
    };
  }

  // ========== Skill.js ==========
  const SkillEffect = {
    SHIELD_BLOCK: 'shield_block',
    CHALLENGE: 'challenge',
    BULWARK: 'bulwark',
    LAST_STAND: 'last_stand',
    DIVINE_SHIELD: 'divine_shield',
    ARCANE_BOLT: 'arcane_bolt',
    MANA_SURGE: 'mana_surge',
    ARCANE_BARRAGE: 'arcane_barrage',
    SPELL_SHIELD: 'spell_shield',
    ARCANE_MASTERY: 'arcane_mastery',
    WILD_SWING: 'wild_swing',
    RAGE_BUILD: 'rage_build',
    BERSERKER_ROAR: 'berserker_roar',
    BLOODLUST: 'bloodlust',
    UNDYING_RAGE: 'undying_rage'
  };

  class Skill {
    constructor(key, name, level, manaCost, cooldown, description, effect) {
      this.key = key;
      this.name = name;
      this.level = level;
      this.manaCost = manaCost;
      this.cooldown = cooldown;
      this.description = description;
      this.effect = effect;
    }
  }

  const HERO_SKILLS = {
    knight: {
      shieldBlock: new Skill('shieldBlock', '盾牌格擋', 1, 0, 2, '下次受到的傷害-50%', SkillEffect.SHIELD_BLOCK),
      challenge: new Skill('challenge', '挑釁', 3, 10, 3, '怪物優先攻擊騎士3回合', SkillEffect.CHALLENGE),
      bulwark: new Skill('bulwark', '壁壘', 7, 20, 4, '獲得等同20%最大HP的護盾', SkillEffect.BULWARK),
      lastStand: new Skill('lastStand', '背水一戰', 12, 0, 5, 'HP低於25%時攻擊力+50%', SkillEffect.LAST_STAND),
      divineShield: new Skill('divineShield', '神聖護盾', 18, 50, 8, '無敵1回合', SkillEffect.DIVINE_SHIELD)
    },
    mage: {
      arcaneBolt: new Skill('arcaneBolt', '奧術箭', 1, 5, 1, '造成150%傷害', SkillEffect.ARCANE_BOLT),
      manaSurge: new Skill('manaSurge', '法力湧動', 4, 0, 3, '恢復50%最大法力', SkillEffect.MANA_SURGE),
      arcaneBarrage: new Skill('arcaneBarrage', '奧術轟擊', 8, 25, 3, '連續3次50%傷害攻擊', SkillEffect.ARCANE_BARRAGE),
      spellShield: new Skill('spellShield', '法術護盾', 11, 15, 4, '抵消下次法術攻擊', SkillEffect.SPELL_SHIELD),
      arcaneMastery: new Skill('arcaneMastery', '奧術大師', 15, 40, 5, '下次攻擊300%傷害', SkillEffect.ARCANE_MASTERY),
      manaFont: new Skill('manaFont', '法力之泉', 20, 0, 6, '被動:答對+2法力', SkillEffect.MANA_SURGE)
    },
    berserker: {
      wildSwing: new Skill('wildSwing', '狂暴打擊', 1, 0, 1, '120%傷害,自己-5HP', SkillEffect.WILD_SWING),
      rageBuild: new Skill('rageBuild', '怒火積蓄', 5, 0, 2, '獲得1層怒火(最高5層)', SkillEffect.RAGE_BUILD),
      berserkerRoar: new Skill('berserkerRoar', '狂戰怒吼', 9, 15, 4, '消耗所有怒火,每層+25%傷害', SkillEffect.BERSERKER_ROAR),
      bloodlust: new Skill('bloodlust', '血祭', 13, 20, 4, '造成傷害的30%轉為治療', SkillEffect.BLOODLUST),
      undyingRage: new Skill('undyingRage', '不死怒火', 17, 30, 6, 'HP降至0時保留1HP(每戰一次)', SkillEffect.UNDYING_RAGE)
    }
  };

  function getSkillByKey(heroKey, skillKey) {
    return HERO_SKILLS[heroKey]?.[skillKey] || null;
  }

  function getAvailableSkills(heroKey, heroLevel) {
    const skills = HERO_SKILLS[heroKey] || {};
    return Object.values(skills).filter(s => s.level <= heroLevel);
  }

  function canUseSkill(heroKey, skillKey, heroLevel, currentCooldowns, currentMana) {
    const skill = getSkillByKey(heroKey, skillKey);
    if (!skill) return { canUse: false, reason: '技能不存在' };
    if (heroLevel < skill.level) return { canUse: false, reason: `需要等級${skill.level}` };
    if (currentCooldowns[skillKey] > 0) return { canUse: false, reason: '冷卻中' };
    if (currentMana < skill.manaCost) return { canUse: false, reason: '法力不足' };
    return { canUse: true, skill };
  }

  // ========== Question.js ==========
  const QuestionType = {
    STANDARD: 'standard',
    MISSING: 'missing',
    WORD_PROBLEM: 'word_problem'
  };

  class Question {
    constructor(type, num1, num2, answer, hint = '') {
      this.type = type;
      this.num1 = num1;
      this.num2 = num2;
      this.answer = answer;
      this.hint = hint;
      this.id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.createdAt = Date.now();
    }

    serialize() {
      return {
        type: this.type,
        num1: this.num1,
        num2: this.num2,
        answer: this.answer,
        hint: this.hint,
        id: this.id,
        createdAt: this.createdAt
      };
    }

    static deserialize(data) {
      const q = new Question(data.type, data.num1, data.num2, data.answer, data.hint);
      q.id = data.id;
      q.createdAt = data.createdAt;
      return q;
    }

    get displayText() {
      switch (this.type) {
        case QuestionType.STANDARD:
          return `${this.num1} × ${this.num2} = ?`;
        case QuestionType.MISSING:
          return `${this.num1} × ? = ${this.num1 * this.num2}`;
        case QuestionType.WORD_PROBLEM:
          return `有${this.num1}群怪物，每群${this.num2}隻，總共幾隻？`;
        default:
          return `${this.num1} × ${this.num2} = ?`;
      }
    }
  }

  class QuestionGenerator {
    constructor(seed = null) {
      this.seed = seed;
      this.adaptiveState = {
        weaknessPatterns: {},
        difficultyLevel: 0,
        recentAccuracy: [],
        consecutiveErrors: 0
      };
      this.rng = seed ? this.createSeededRNG(seed) : () => Math.random();
    }

    createSeededRNG(seed) {
      let s = seed;
      return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
    }

    generate(domain = 'newbie', difficultyLevel = 0) {
      const tables = this.getTablesForDomain(domain);
      const tableIndex = Math.floor(this.rng() * tables.length);
      const num1 = tables[tableIndex];
      const num2 = Math.floor(this.rng() * 8) + 2;
      const typeRoll = this.rng();
      let questionType = QuestionType.STANDARD;
      if (typeRoll > 0.7) questionType = QuestionType.MISSING;
      else if (typeRoll > 0.85) questionType = QuestionType.WORD_PROBLEM;
      return new Question(questionType, num1, num2, num1 * num2);
    }

    getTablesForDomain(domain) {
      switch (domain) {
        case 'newbie': return [2, 3, 4, 5];
        case 'veteran': return [2, 3, 4, 5, 6, 7, 8, 9];
        case 'legend': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        default: return [2, 3, 4, 5, 6, 7, 8, 9];
      }
    }

    generateOptions(correctAnswer, count = 4) {
      const options = new Set([correctAnswer]);
      while (options.size < count) {
        const offset = Math.floor(this.rng() * 10) - 5;
        const wrong = correctAnswer + (offset === 0 ? 1 : offset);
        if (wrong > 0) options.add(wrong);
      }
      return Array.from(options).sort(() => this.rng() - 0.5);
    }

    updateAdaptiveState(correct) {
      this.adaptiveState.recentAccuracy.push(correct ? 1 : 0);
      if (this.adaptiveState.recentAccuracy.length > 5) {
        this.adaptiveState.recentAccuracy.shift();
      }
      if (!correct) {
        this.adaptiveState.consecutiveErrors++;
        if (this.adaptiveState.consecutiveErrors >= 2) {
          this.adaptiveState.difficultyLevel = Math.max(0, this.adaptiveState.difficultyLevel - 1);
        }
      } else {
        this.adaptiveState.consecutiveErrors = 0;
      }
    }
  }

  // ========== GameEngine.js ==========
  class GameEngine {
    constructor(options = {}) {
      this.state = new BattleState();
      this.questionGenerator = options.questionGenerator || new QuestionGenerator();
      this.currentQuestion = null;
      this.onStateChange = options.onStateChange || null;
      this.onPhaseChange = options.onPhaseChange || null;
      this.playerCount = options.playerCount || 1;
      this.sessionId = options.sessionId || null;
    }

    getState() {
      return this.state.serialize();
    }

    loadState(stateData) {
      return this.state.deserialize(stateData);
    }

    startBattle(options = {}) {
      const { heroKey = 'knight', domain = 'newbie', stage = null } = options;
      this.state.phase = BattlePhase.BATTLE;
      this.state.heroKey = heroKey;
      this.state.domain = domain;
      this.state.currentStage = stage;
      const hero = HEROES[heroKey];
      if (!hero) return { success: false, message: 'Invalid hero' };
      this.state.heroMaxHp = hero.maxHp + (this.state.heroLevel - 1) * 20;
      this.state.heroHp = this.state.heroMaxHp;
      this.state.mana = this.state.maxMana;
      this.state.combo = 0;
      this.state.shield = 0;
      this.state.skillCooldowns = {};
      this.state.activeEffects = [];
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
      this.emitStateChange();
      return monster;
    }

    generateQuestion() {
      this.currentQuestion = this.questionGenerator.generate(this.state.domain, this.state.difficultyLevel);
      this.state.questionType = this.currentQuestion.type;
      return this.currentQuestion;
    }

    answer(input) {
      if (!this.currentQuestion) return { correct: false, message: 'No question active' };
      const correct = parseInt(input) === this.currentQuestion.answer;
      if (correct) this.handleCorrectAnswer();
      else this.handleWrongAnswer();
      this.questionGenerator.updateAdaptiveState(correct);
      return new ActionResult(TurnAction.ANSWER_QUESTION, correct, { input, correctAnswer: this.currentQuestion.answer });
    }

    handleCorrectAnswer() {
      const hero = HEROES[this.state.heroKey];
      const baseDamage = Math.floor(Math.random() * (hero.atkMax - hero.atkMin + 1)) + hero.atkMin;
      let damageMultiplier = 1;
      let isCrit = false;
      if (Math.random() < hero.crit) {
        damageMultiplier = 2;
        isCrit = true;
      }
      this.state.combo++;
      damageMultiplier += Math.min(this.state.combo * 0.1, 1.0);
      const arcaneMastery = this.state.activeEffects.find(e => e.type === 'arcane_mastery');
      if (arcaneMastery) {
        damageMultiplier *= 3;
        this.state.activeEffects = this.state.activeEffects.filter(e => e.type !== 'arcane_mastery');
      }
      let finalDamage = Math.floor(baseDamage * damageMultiplier);
      this.state.monsterHp = Math.max(0, this.state.monsterHp - finalDamage);
      this.state.mana = Math.min(this.state.maxMana, this.state.mana + 2);
      this.checkMonsterDefeated();
      this.emitStateChange();
      return { damage: finalDamage, isCrit, combo: this.state.combo };
    }

    handleWrongAnswer() {
      this.state.combo = 0;
      this.performMonsterTurn();
      this.emitStateChange();
    }

    useSkill(skillKey) {
      const check = canUseSkill(this.state.heroKey, skillKey, this.state.heroLevel, this.state.skillCooldowns, this.state.mana);
      if (!check.canUse) return { success: false, message: check.reason };
      const skill = check.skill;
      this.state.mana -= skill.manaCost;
      this.state.skillCooldowns[skillKey] = skill.cooldown;
      return this.applySkillEffect(skill);
    }

    applySkillEffect(skill) {
      const hero = HEROES[this.state.heroKey];
      switch (skill.effect) {
        case 'shield_block':
          this.state.shield = Math.min(this.state.shield + 1, 5);
          return { success: true, message: '+1護盾' };
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
          const { damage, isCrit } = this.calculateDamage(1.5);
          this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
          this.checkMonsterDefeated();
          return { success: true, message: `${damage}傷害`, damage, isCrit };
        case 'mana_surge':
          this.state.mana = Math.min(this.state.maxMana, this.state.mana + Math.floor(this.state.maxMana * 0.5));
          return { success: true, message: '法力恢復' };
        case 'arcane_barrage':
          let totalDamage = 0;
          for (let i = 0; i < 3; i++) {
            const { damage } = this.calculateDamage(0.5);
            this.state.monsterHp = Math.max(0, this.state.monsterHp - damage);
            totalDamage += damage;
          }
          this.checkMonsterDefeated();
          return { success: true, message: `奧術轟擊 ${totalDamage}傷害`, damage: totalDamage };
        case 'arcane_mastery':
          this.state.activeEffects.push({ type: 'arcane_mastery', multiplier: 3.0, turnsRemaining: 1 });
          return { success: true, message: '下次300%傷害' };
        case 'wild_swing':
          const wsDamage = this.calculateDamage(1.2);
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
            const { damage, isCrit } = this.calculateDamage(bonus);
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
        default:
          return { success: false, message: '技能效果未知' };
      }
    }

    calculateDamage(multiplier = 1) {
      const hero = HEROES[this.state.heroKey];
      const baseDamage = Math.floor(Math.random() * (hero.atkMax - hero.atkMin + 1)) + hero.atkMin;
      let finalMultiplier = multiplier;
      const isCrit = Math.random() < hero.crit;
      if (isCrit) finalMultiplier *= 2;
      const lastStand = this.state.activeEffects.find(e => e.type === 'last_stand');
      if (lastStand && this.state.heroHp < this.state.heroMaxHp * 0.25) {
        finalMultiplier *= 1.5;
      }
      return { damage: Math.floor(baseDamage * finalMultiplier), isCrit };
    }

    performMonsterTurn() {
      this.state.monsterTurnCount++;
      const damage = Math.floor(Math.random() * 8) + 5;
      this.applyDamageToHero(damage);
      this.state.activeEffects = this.state.activeEffects.filter(e => {
        if (e.turnsRemaining !== undefined) {
          e.turnsRemaining--;
          return e.turnsRemaining > 0;
        }
        return true;
      });
      this.tickCooldowns();
      this.emitStateChange();
      this.checkDefeat();
    }

    applyDamageToHero(damage) {
      let mitigatedDamage = damage;
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
          return false;
        }
        this.state.phase = BattlePhase.DEFEAT;
        this.emitPhaseChange('defeat');
        return true;
      }
      return false;
    }

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

    getScaledHP(baseHP, playerCount) {
      return Math.floor(baseHP * (1 + 0.2 * (playerCount - 1)));
    }

    emitStateChange() {
      if (this.onStateChange) this.onStateChange(this.getState());
    }

    emitPhaseChange(phase, data = {}) {
      if (this.onPhaseChange) this.onPhaseChange(phase, data);
    }

    serialize() {
      return {
        version: 1,
        state: this.state.serialize(),
        currentQuestion: this.currentQuestion ? this.currentQuestion.serialize() : null,
        questionGenerator: this.questionGenerator.adaptiveState,
        playerCount: this.playerCount,
        sessionId: this.sessionId
      };
    }

    deserialize(data) {
      if (!data || data.version !== 1) return false;
      this.state.deserialize(data.state);
      this.playerCount = data.playerCount || 1;
      this.sessionId = data.sessionId;
      return true;
    }
  }

  // ========== SaveManager.js ==========
  class SaveManager {
    constructor(storageKey = 'mathTownHero') {
      this.storageKey = storageKey;
    }

    save(gameState, heroState, progressState = {}) {
      const saveData = {
        version: 1,
        timestamp: Date.now(),
        heroState: heroState || {},
        progressState: progressState || {},
        gameState: gameState || {}
      };
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(saveData));
        return { success: true, message: 'Saved successfully' };
      } catch (e) {
        return { success: false, message: 'Save failed: ' + e.message };
      }
    }

    load() {
      try {
        const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        if (!data.version) return this.getDefaultSave();
        return data;
      } catch (e) {
        return this.getDefaultSave();
      }
    }

    getDefaultSave() {
      return {
        version: 1,
        timestamp: Date.now(),
        heroState: { heroLevel: 1, heroExp: 0, expToNextLevel: 100 },
        progressState: {},
        gameState: {}
      };
    }

    exportSave() {
      return JSON.stringify(this.load(), null, 2);
    }

    importSave(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data.version) return { success: false, message: 'Invalid save format' };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        return { success: true, message: 'Save imported successfully' };
      } catch (e) {
        return { success: false, message: 'Import failed: ' + e.message };
      }
    }

    clear() {
      localStorage.removeItem(this.storageKey);
    }

    hasSave() {
      return localStorage.getItem(this.storageKey) !== null;
    }
  }

  // ========== LocalSessionManager.js ==========
  class LocalSessionManager {
    constructor(maxPlayers = 8) {
      this.players = [];
      this.currentPlayerIndex = 0;
      this.maxPlayers = maxPlayers;
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.gameEngine = null;
      this.turnNumber = 0;
    }

    addPlayer(name, heroKey = 'knight') {
      if (this.players.length >= this.maxPlayers) {
        return { success: false, message: `Maximum ${this.maxPlayers} players` };
      }
      const playerId = `player_${this.players.length + 1}`;
      const profile = new PlayerProfile(playerId, name, heroKey);
      const hero = HEROES[heroKey];
      if (hero) {
        profile.maxHp = hero.maxHp;
        profile.hp = hero.maxHp;
      }
      this.players.push(profile);
      return { success: true, playerId };
    }

    removePlayer(playerId) {
      const index = this.players.findIndex(p => p.playerId === playerId);
      if (index === -1) return { success: false, message: 'Player not found' };
      this.players.splice(index, 1);
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0;
      }
      return { success: true };
    }

    startSession(options = {}) {
      if (this.players.length === 0) {
        return { success: false, message: 'No players in session' };
      }
      this.gameEngine = new GameEngine({
        playerCount: this.players.length,
        sessionId: this.sessionId
      });
      this.currentPlayerIndex = 0;
      this.turnNumber = 1;
      const firstPlayer = this.getCurrentPlayer();
      this.gameEngine.startBattle({
        heroKey: firstPlayer.heroKey,
        domain: options.domain || 'newbie'
      });
      this.gameEngine.setActivePlayer(firstPlayer.playerId);
      return { success: true, sessionId: this.sessionId, currentPlayer: firstPlayer };
    }

    getCurrentPlayer() {
      return this.players[this.currentPlayerIndex];
    }

    getActivePlayerId() {
      const player = this.getCurrentPlayer();
      return player ? player.playerId : null;
    }

    advanceTurn() {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      this.turnNumber++;
      const nextPlayer = this.getCurrentPlayer();
      this.gameEngine.setActivePlayer(nextPlayer.playerId);
      return { currentPlayer: nextPlayer, turnNumber: this.turnNumber };
    }

    isCurrentPlayer(playerId) {
      const current = this.getCurrentPlayer();
      return current && current.playerId === playerId;
    }

    submitAnswer(playerId, input) {
      if (!this.isCurrentPlayer(playerId)) {
        return { success: false, message: 'Not your turn', invalid: true };
      }
      const result = this.gameEngine.answer(input);
      return { ...result, playerId, playerName: this.getCurrentPlayer().name };
    }

    useSkill(playerId, skillKey) {
      if (!this.isCurrentPlayer(playerId)) {
        return { success: false, message: 'Not your turn', invalid: true };
      }
      return this.gameEngine.useSkill(skillKey);
    }

    endTurn(playerId) {
      if (!this.isCurrentPlayer(playerId)) {
        return { success: false, message: 'Not your turn' };
      }
      const advance = this.advanceTurn();
      this.gameEngine.endTurn();
      return { success: true, nextPlayer: advance.currentPlayer, turnNumber: advance.turnNumber };
    }

    getSessionState() {
      return {
        sessionId: this.sessionId,
        players: this.players.map(p => p.serialize()),
        currentPlayerIndex: this.currentPlayerIndex,
        currentPlayer: this.getCurrentPlayer()?.serialize(),
        activePlayerId: this.getActivePlayerId(),
        turnNumber: this.turnNumber,
        playerCount: this.players.length,
        gameState: this.gameEngine ? this.gameEngine.getState() : null
      };
    }

    serialize() {
      return {
        version: 1,
        sessionId: this.sessionId,
        players: this.players.map(p => p.serialize()),
        currentPlayerIndex: this.currentPlayerIndex,
        turnNumber: this.turnNumber,
        gameEngine: this.gameEngine ? this.gameEngine.serialize() : null
      };
    }

    deserialize(data) {
      if (!data || data.version !== 1) return false;
      this.sessionId = data.sessionId;
      this.players = data.players.map(p => {
        const profile = new PlayerProfile(p.playerId, p.name, p.heroKey);
        profile.deserialize(p);
        return profile;
      });
      this.currentPlayerIndex = data.currentPlayerIndex;
      this.turnNumber = data.turnNumber;
      if (data.gameEngine) {
        this.gameEngine = new GameEngine();
        this.gameEngine.deserialize(data.gameEngine);
      }
      return true;
    }

    exportSession() {
      return JSON.stringify(this.serialize(), null, 2);
    }

    importSession(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        return this.deserialize(data) ? { success: true } : { success: false, message: 'Invalid session format' };
      } catch (e) {
        return { success: false, message: 'Import failed: ' + e.message };
      }
    }
  }

  // ========== GameBridge.js ==========
  class GameBridge {
    constructor() {
      this.engine = null;
      this.saveManager = new SaveManager('mathTownHero');
      this.bindMethods();
    }

    bindMethods() {
      this.handleStateChange = this.handleStateChange.bind(this);
      this.handlePhaseChange = this.handlePhaseChange.bind(this);
    }

    initialize(options = {}) {
      this.engine = new GameEngine({
        ...options,
        onStateChange: this.handleStateChange,
        onPhaseChange: this.handlePhaseChange
      });
      const savedHero = this.loadHeroState();
      if (savedHero) {
        this.engine.state.heroLevel = savedHero.heroLevel || 1;
        this.engine.state.heroExp = savedHero.heroExp || 0;
        this.engine.state.expToNextLevel = savedHero.expToNextLevel || 100;
      }
      return this.engine;
    }

    loadHeroState() {
      try {
        return JSON.parse(localStorage.getItem('mathTownHero') || '{}');
      } catch (e) {
        return {};
      }
    }

    saveHeroState() {
      const heroState = {
        heroLevel: this.engine.state.heroLevel,
        heroExp: this.engine.state.heroExp,
        expToNextLevel: this.engine.state.expToNextLevel,
        gold: this.engine.state.gold,
        monstersDefeated: this.engine.state.monstersDefeated
      };
      localStorage.setItem('mathTownHero', JSON.stringify(heroState));
    }

    startBattle(options = {}) {
      return this.engine.startBattle(options);
    }

    answer(input) {
      const result = this.engine.answer(input);
      this.saveHeroState();
      return result;
    }

    useSkill(skillKey) {
      return this.engine.useSkill(skillKey);
    }

    endTurn() {
      this.engine.endTurn();
      this.saveHeroState();
    }

    getAvailableSkills() {
      const heroKey = this.engine.state.heroKey;
      const level = this.engine.state.heroLevel;
      return HERO_SKILLS[heroKey] ? Object.values(HERO_SKILLS[heroKey]).filter(s => s.level <= level) : [];
    }

    getSkillCooldown(skillKey) {
      return this.engine.state.skillCooldowns[skillKey] || 0;
    }

    handleStateChange(state) {}
    handlePhaseChange(phase, data) {}

    getState() {
      return this.engine ? this.engine.getState() : null;
    }

    getCurrentQuestion() {
      return this.engine ? this.engine.currentQuestion : null;
    }

    serialize() {
      return this.engine ? this.engine.serialize() : null;
    }

    deserialize(data) {
      return this.engine ? this.engine.deserialize(data) : false;
    }
  }

  // ========== Exports ==========
  const MathBattle = {
    VERSION: 1,
    BattleState,
    BattlePhase,
    TurnContext,
    TurnAction,
    ActionResult,
    Hero,
    HEROES,
    PlayerProfile,
    Monster,
    MONSTERS,
    getMonstersForDomain,
    selectRandomMonster,
    Skill,
    HERO_SKILLS,
    getSkillByKey,
    getAvailableSkills,
    canUseSkill,
    SkillEffect,
    Question,
    QuestionGenerator,
    QuestionType,
    GameEngine,
    SaveManager,
    LocalSessionManager,
    GameBridge,
    createGameEngine: (options) => new GameEngine(options),
    createSaveManager: (key) => new SaveManager(key),
    createLocalSessionManager: (maxPlayers) => new LocalSessionManager(maxPlayers),
    createGameBridge: () => new GameBridge()
  };

  global.MathBattle = MathBattle;

})(typeof window !== 'undefined' ? window : global);