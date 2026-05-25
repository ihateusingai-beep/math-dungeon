// Summon.js - Summon兽 system for Multiplication Town
// Version: 1

export class Summon {
  constructor(type, ownerId) {
    const template = SUMMONS[type];
    if (!template) {
      throw new Error(`Unknown summon type: ${type}`);
    }

    this.type = type;
    this.name = template.name;
    this.ownerId = ownerId;
    this.rarity = template.rarity;
    this.element = template.element;
    this.hp = template.hp;
    this.maxHp = template.hp;
    this.atk = template.atk;
    this.duration = template.duration;
    this.skill = template.skill;
    this.ai = template.ai;
    this.buffs = [];
  }

  takeTurn(targets, gameState) {
    if (!targets || targets.length === 0) {
      return { success: false, message: 'No targets' };
    }

    const action = this.ai(targets, gameState, this);
    this.executeAction(action, targets, gameState);

    this.tickBuffs();

    return action;
  }

  executeAction(action, targets, gameState) {
    if (action.type === 'attack' && action.target) {
      action.target.hp = Math.max(0, action.target.hp - action.damage);
    } else if (action.type === 'heal' && action.target) {
      action.target.hp = Math.min(action.target.maxHp, action.target.hp + action.heal);
    } else if (action.type === 'buff') {
      this.buffs.push(action.buff);
    } else if (action.type === 'debuff' && action.target) {
      action.target.buffs = action.target.buffs || [];
      action.target.buffs.push(action.buff);
    }
  }

  tickBuffs() {
    this.buffs = this.buffs.filter(buff => {
      if (buff.duration !== undefined && buff.duration > 0) {
        buff.duration--;
        return buff.duration > 0;
      }
      return true;
    });
  }

  isAlive() {
    return this.hp > 0;
  }

  serialize() {
    return {
      type: this.type,
      name: this.name,
      ownerId: this.ownerId,
      rarity: this.rarity,
      element: this.element,
      hp: this.hp,
      maxHp: this.maxHp,
      atk: this.atk,
      duration: this.duration,
      skill: this.skill,
      buffs: this.buffs
    };
  }

  static deserialize(data) {
    const summon = new Summon(data.type, data.ownerId);
    summon.hp = data.hp;
    summon.maxHp = data.maxHp;
    summon.duration = data.duration;
    summon.buffs = data.buffs || [];
    return summon;
  }
}

const findWeakTarget = (targets, element) => {
  let weakTarget = null;
  let maxDamage = 0;

  const ELEMENT_WEAKNESS = {
    fire: 'ice', ice: 'fire', wind: 'ice', earth: 'wind',
    thunder: 'earth', water: 'thunder', light: 'dark', dark: 'light'
  };

  for (const target of targets) {
    let damage = 1;
    if (target.element && ELEMENT_WEAKNESS[element] === target.element) {
      damage = 1.5;
    }
    if (damage > maxDamage) {
      maxDamage = damage;
      weakTarget = target;
    }
  }

  return weakTarget || targets[0];
};

const lowestHpAlly = (targets, ownerId) => {
  return targets.filter(t => t.ownerId === ownerId).sort((a, b) => a.hp - b.hp)[0];
};

const SUMMONS = {
  fireSprite: {
    name: 'Fire Sprite',
    rarity: 'common',
    element: 'fire',
    hp: 30,
    atk: 8,
    duration: 3,
    skill: { name: 'Flame Bolt', damage: 0.8 },
    ai: (targets, gameState, summon) => {
      const damage = Math.floor(summon.atk * summon.skill.damage);
      return {
        success: true,
        type: 'attack',
        target: targets[0],
        damage: damage,
        message: `${summon.name} uses Flame Bolt for ${damage} damage!`
      };
    }
  },

  iceSpirit: {
    name: 'Ice Spirit',
    rarity: 'good',
    element: 'ice',
    hp: 40,
    atk: 6,
    duration: 4,
    skill: { name: 'Frost Bolt', damage: 0.6, slow: true },
    ai: (targets, gameState, summon) => {
      const damage = Math.floor(summon.atk * summon.skill.damage);
      const target = targets[0];
      const debuff = { type: 'slow', duration: 2, speedPenalty: 0.5 };
      return {
        success: true,
        type: 'attack',
        target: target,
        damage: damage,
        debuff: debuff,
        message: `${summon.name} uses Frost Bolt for ${damage} damage!`
      };
    }
  },

  thunderDrake: {
    name: 'Thunder Drake',
    rarity: 'rare',
    element: 'thunder',
    hp: 60,
    atk: 15,
    duration: 3,
    skill: { name: 'Lightning Chain', damage: 0.8, chain: 3 },
    ai: (targets, gameState, summon) => {
      const baseDamage = Math.floor(summon.atk * summon.skill.damage);
      let totalDamage = 0;
      const chainCount = Math.min(summon.skill.chain, targets.length);

      for (let i = 0; i < chainCount; i++) {
        if (targets[i]) {
          totalDamage += baseDamage;
          targets[i].hp = Math.max(0, targets[i].hp - baseDamage);
        }
      }

      return {
        success: true,
        type: 'attack',
        target: targets[0],
        damage: totalDamage,
        chainCount: chainCount,
        message: `${summon.name} uses Lightning Chain for ${totalDamage} damage!`
      };
    }
  },

  holyAngel: {
    name: 'Holy Angel',
    rarity: 'epic',
    element: 'light',
    hp: 100,
    atk: 20,
    duration: 2,
    skill: { name: 'Divine Heal', healPercent: 0.3 },
    ai: (targets, gameState, summon) => {
      const heroTarget = { hp: gameState.heroHp, maxHp: gameState.heroMaxHp };
      const healAmount = Math.floor(heroTarget.maxHp * summon.skill.healPercent);

      return {
        success: true,
        type: 'heal',
        target: heroTarget,
        heal: healAmount,
        message: `${summon.name} uses Divine Heal for ${healAmount} HP!`
      };
    }
  },

  shadowDemon: {
    name: 'Shadow Demon',
    rarity: 'epic',
    element: 'dark',
    hp: 80,
    atk: 25,
    duration: 3,
    skill: { name: 'Soul Drain', damage: 1.0, lifesteal: 0.5 },
    ai: (targets, gameState, summon) => {
      const damage = Math.floor(summon.atk * summon.skill.damage);
      const lifesteal = Math.floor(damage * summon.skill.lifesteal);
      const target = targets[0];

      const heroTarget = { hp: gameState.heroHp, maxHp: gameState.heroMaxHp };
      const healAmount = Math.min(lifesteal, heroTarget.maxHp - heroTarget.hp);

      return {
        success: true,
        type: 'attack',
        target: target,
        damage: damage,
        heal: healAmount,
        message: `${summon.name} uses Soul Drain for ${damage} damage and heals ${healAmount} HP!`
      };
    }
  },

  dragonSpirit: {
    name: 'Dragon Spirit',
    rarity: 'legendary',
    element: 'fire',
    hp: 200,
    atk: 35,
    duration: 5,
    skill: { name: 'Dragon Flame', damage: 1.5, aoe: true },
    ai: (targets, gameState, summon) => {
      const damage = Math.floor(summon.atk * summon.skill.damage);
      let totalDamage = 0;

      for (const target of targets) {
        const targetDamage = Math.floor(damage * (0.8 + Math.random() * 0.4));
        target.hp = Math.max(0, target.hp - targetDamage);
        totalDamage += targetDamage;
      }

      return {
        success: true,
        type: 'attack',
        target: targets[0],
        damage: totalDamage,
        aoe: true,
        message: `${summon.name} uses Dragon Flame for ${totalDamage} total damage!`
      };
    }
  }
};

export const SUMMON_TYPES = Object.keys(SUMMONS);

export function getSummonTemplate(type) {
  return SUMMONS[type] || null;
}

export function createSummon(type, ownerId) {
  const template = getSummonTemplate(type);
  if (!template) return null;
  return new Summon(type, ownerId);
}

export function getSummonsByRarity(rarity) {
  return Object.entries(SUMMONS)
    .filter(([_, summon]) => summon.rarity === rarity)
    .map(([type, _]) => type);
}

export const RARITY_ORDER = ['common', 'good', 'rare', 'epic', 'legendary'];