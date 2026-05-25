// Monster.js - Monster model with serialization
// Version: 2 (added element, defense, atk, 3-phase support)

import { ELEMENT_WEAKNESS, Element } from './Element.js';

export class Monster {
  constructor(name, emoji, img, hpMin, hpMax, gold, exp, boss = false, element = null, defense = 0, atk = 0) {
    this.name = name;
    this.emoji = emoji;
    this.img = img;
    this.hpMin = hpMin;
    this.hpMax = hpMax;
    this.gold = gold;
    this.exp = exp;
    this.boss = boss;
    this.element = element;
    this.defense = defense;
    this.atk = atk;
    this.buffs = [];
    this.phase = 1;
    this.maxPhase = boss ? 3 : 1;
  }

  serialize() {
    return {
      name: this.name,
      emoji: this.emoji,
      img: this.img,
      hpMin: this.hpMin,
      hpMax: this.hpMax,
      gold: this.gold,
      exp: this.exp,
      boss: this.boss,
      element: this.element,
      defense: this.defense,
      atk: this.atk,
      buffs: this.buffs,
      phase: this.phase,
      maxPhase: this.maxPhase
    };
  }

  static deserialize(data) {
    const monster = new Monster(
      data.name,
      data.emoji,
      data.img,
      data.hpMin,
      data.hpMax,
      data.gold,
      data.exp,
      data.boss,
      data.element,
      data.defense,
      data.atk
    );
    monster.phase = data.phase || 1;
    monster.maxPhase = data.maxPhase || (data.boss ? 3 : 1);
    monster.buffs = data.buffs || [];
    return monster;
  }

  rollHp(playerCount = 1) {
    const baseHp = Math.floor(Math.random() * (this.hpMax - this.hpMin + 1)) + this.hpMin;
    const scaledHp = Math.floor(baseHp * (1 + 0.2 * (playerCount - 1)));
    return scaledHp;
  }

  advancePhase() {
    if (this.phase < this.maxPhase) {
      this.phase++;
      return true;
    }
    return false;
  }

  getWeakness(attackElement) {
    if (!attackElement || !this.element) return false;
    return ELEMENT_WEAKNESS[attackElement] === this.element;
  }

  isResistantTo(attackElement) {
    if (!attackElement || !this.element) return false;
    return ELEMENT_WEAKNESS[this.element] === attackElement;
  }

  getPhaseThreshold() {
    if (this.phase === 1) return 100;
    if (this.phase === 2) return 60;
    if (this.phase === 3) return 30;
    return 100;
  }

  getPhaseName() {
    if (!this.boss) return '';
    if (this.phase === 1) return '第一階段';
    if (this.phase === 2) return '第二階段';
    if (this.phase === 3) return '狂暴階段';
    return '';
  }
}

export const MONSTERS = {
  newbie: [
    new Monster('森林史萊姆', '🟢', 'assets/images/slime-monster.jpeg', 5, 8, 10, 5, false, Element.WATER),
    new Monster('草原小狼', '🐺', 'assets/images/monsters/wolf.png', 7, 10, 15, 8, false, Element.WIND)
  ],
  veteran: [
    new Monster('城堡守衛', '⚔️', 'assets/images/castle-guard.jpeg', 12, 18, 25, 15, false, Element.EARTH),
    new Monster('蝙蝠王', '🦇', 'assets/images/monsters/bat.png', 15, 20, 30, 20, false, Element.DARK)
  ],
  legend: [
    new Monster('暗黑惡魔', '👹', 'assets/images/demon-boss.jpeg', 25, 35, 50, 40, true, Element.DARK, 5, 12),
    new Monster('骨法師', '💀', 'assets/images/monsters/skeleton_mage.png', 20, 30, 45, 35, true, Element.DARK, 3, 15)
  ]
};

export const BOSS_TEMPLATES = {
  'dragon-boss': {
    element: Element.FIRE,
    phases: [
      { hpThreshold: 100, name: '火焰吐息', abilities: ['flameBreath', 'fireShield'] },
      { hpThreshold: 60, name: '空襲', abilities: ['dive', 'immune'] },
      { hpThreshold: 30, name: '狂暴', abilities: ['doubleStrike', 'enrage'] }
    ]
  },
  'dark-wizard-boss': {
    element: Element.DARK,
    phases: [
      { hpThreshold: 100, name: '暗影箭', abilities: ['shadowBolt', 'darkShield'] },
      { hpThreshold: 60, name: '詛咒', abilities: ['curse', 'summonMinion'] },
      { hpThreshold: 30, name: '毀滅', abilities: ['doom', 'lifeDrain'] }
    ]
  },
  'shadow-knight-boss': {
    element: Element.DARK,
    phases: [
      { hpThreshold: 100, name: '黑暗劍擊', abilities: ['darkSlash', 'shield'] },
      { hpThreshold: 60, name: '影分身', abilities: ['shadowClone', 'quickStrike'] },
      { hpThreshold: 30, name: '終結', abilities: ['execute', 'rage'] }
    ]
  }
};

export function getMonstersForDomain(domain) {
  return MONSTERS[domain] || MONSTERS.newbie;
}

export function selectRandomMonster(domain, playerCount = 1) {
  const pool = getMonstersForDomain(domain);
  const template = pool[Math.floor(Math.random() * pool.length)];
  const hp = template.rollHp(playerCount);

  const goldMultiplier = 1 + 0.1 * (playerCount - 1);
  const expMultiplier = 1 + 0.1 * (playerCount - 1);

  return {
    name: template.name,
    emoji: template.emoji,
    img: template.img,
    hp: hp,
    maxHp: hp,
    gold: Math.floor(template.gold * goldMultiplier),
    exp: Math.floor(template.exp * expMultiplier),
    boss: template.boss,
    element: template.element,
    defense: template.defense,
    atk: template.atk,
    phase: 1,
    maxPhase: template.maxPhase,
    intent: null,
    buffs: []
  };
}