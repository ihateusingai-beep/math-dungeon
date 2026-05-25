// StatusEffect.js - Status effect system for Multiplication Town
// Version: 1

export const StatusType = {
  DEBUFF: 'debuff',
  BUFF: 'buff',
  SPECIAL: 'special'
};

export class StatusEffect {
  constructor(type, name, icon, duration, stacks = 1, properties = {}) {
    this.type = type;
    this.name = name;
    this.icon = icon;
    this.duration = duration;
    this.stacks = stacks;
    this.startedAt = Date.now();
    Object.assign(this, properties);
  }

  tick() {
    if (this.duration > 0) {
      this.duration--;
    }
    return this.duration !== 0;
  }

  serialize() {
    return {
      type: this.type,
      name: this.name,
      icon: this.icon,
      duration: this.duration,
      stacks: this.stacks,
      startedAt: this.startedAt
    };
  }

  static deserialize(data) {
    return new StatusEffect(data.type, data.name, data.icon, data.duration, data.stacks);
  }
}

export const STATUS_EFFECTS = {
  BURN: { name: '燃燒', icon: '🔥', type: StatusType.DEBUFF, duration: 3, dot: 0.08 },
  FREEZE: { name: '冰凍', icon: '❄️', type: StatusType.DEBUFF, duration: 2, cantAct: true },
  POISON: { name: '中毒', icon: '🟢', type: StatusType.DEBUFF, duration: 4, dot: 0.05 },
  STUN: { name: '眩暈', icon: '⚡', type: StatusType.DEBUFF, duration: 1, cantAct: true },
  SLOW: { name: '減速', icon: '🐌', type: StatusType.DEBUFF, duration: 3, speedPenalty: 0.5 },
  WEAK: { name: '虛弱', icon: '💔', type: StatusType.DEBUFF, duration: 3, atkPenalty: 0.3 },
  SILENCE: { name: '沉默', icon: '🤐', type: StatusType.DEBUFF, duration: 2, cantAct: true },
  CURSE: { name: '詛咒', icon: '💀', type: StatusType.DEBUFF, duration: 3, defPenalty: 0.2 },
  BLIND: { name: '失明', icon: '👁️', type: StatusType.DEBUFF, duration: 2, accuracyPenalty: 0.5 },
  PETRIFY: { name: '石化', icon: '🗿', type: StatusType.DEBUFF, duration: 1, cantAct: true },

  SHIELD: { name: '護盾', icon: '🛡️', type: StatusType.BUFF, duration: 3, absorb: 100 },
  HASTE: { name: '急速', icon: '💨', type: StatusType.BUFF, duration: 2, speedBonus: 0.5 },
  STRENGTH: { name: '力量', icon: '💪', type: StatusType.BUFF, duration: 3, atkBonus: 0.3 },
  INVINCIBLE: { name: '無敵', icon: '⭐', type: StatusType.BUFF, duration: 1, immune: true },
  REGEN: { name: '再生', icon: '💚', type: StatusType.BUFF, duration: 3, healPercent: 0.03 },
  BARRIER: { name: '屏障', icon: '🌈', type: StatusType.BUFF, duration: 2, damageReduction: 0.5 },
  MIGHT: { name: '神威', icon: '👊', type: StatusType.BUFF, duration: 3, critBonus: 0.15 },
  WISDOM: { name: '智慧', icon: '🧠', type: StatusType.BUFF, duration: 3, manaBonus: 0.2 },

  HEROIC: { name: '英雄', icon: '🌟', type: StatusType.SPECIAL, duration: -1, permanent: true, allStatsBonus: 0.5 },
  RAGE: { name: '狂暴', icon: '😡', type: StatusType.SPECIAL, duration: 3, atkBonus: 0.5, defPenalty: 0.2 },
  ZEN: { name: '禪定', icon: '🧘', type: StatusType.SPECIAL, duration: -1, permanent: true, manaEfficiency: 0.2 },
  POSSESSED: { name: '惡魔', icon: '😈', type: StatusType.SPECIAL, duration: 4, atkBonus: 0.8, defPenalty: 0.3, selfDamage: true }
};

export function createStatusEffect(effectKey, stacks = 1) {
  const template = STATUS_EFFECTS[effectKey];
  if (!template) return null;
  return new StatusEffect(template.type, template.name, template.icon, template.duration, stacks, template);
}

export function applyStatusEffect(target, effectKey, stacks = 1) {
  const effect = createStatusEffect(effectKey, stacks);
  if (!effect) return false;

  const existing = target.buffs?.find(e => e.name === effect.name);
  if (existing) {
    existing.stacks = Math.min(existing.stacks + stacks, 5);
    existing.duration = effect.duration;
  } else {
    if (!target.buffs) target.buffs = [];
    target.buffs.push(effect);
  }
  return true;
}

export function tickStatusEffects(target) {
  if (!target.buffs) return;
  target.buffs = target.buffs.filter(effect => effect.tick());
}

export function hasEffect(target, effectName) {
  return target.buffs?.some(e => e.name === effectName) || false;
}

export function getEffectByName(target, effectName) {
  return target.buffs?.find(e => e.name === effectName) || null;
}

export function removeEffect(target, effectName) {
  if (!target.buffs) return false;
  const index = target.buffs.findIndex(e => e.name === effectName);
  if (index !== -1) {
    target.buffs.splice(index, 1);
    return true;
  }
  return false;
}