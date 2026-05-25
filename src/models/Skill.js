// Skill.js - Skill model with serialization
// Version: 2 (added rogue, priest, ranger skills)

export const SkillEffect = {
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
  UNDYING_RAGE: 'undying_rage',

  SHADOW_STEP: 'shadow_step',
  BACKSTAB: 'backstab',
  POISON_BLADE: 'poison_blade',
  SMOKE_BOMB: 'smoke_bomb',
  LETHAL_RAZOR: 'lethal_razor',
  SHADOW_MASTER: 'shadow_master',

  DIVINE_HEAL: 'divine_heal',
  HOLY_LIGHT: 'holy_light',
  BLESSING: 'blessing',
  HOLY_NOVA: 'holy_nova',
  DISPEL: 'dispel',
  ANGELIC_DESCENT: 'angelic_descent',

  SHOT: 'shot',
  MULTI_SHOT: 'multi_shot',
  SNIPE: 'snipe',
  ARROW_RAIN: 'arrow_rain',
  TRAP: 'trap',
  PIERCING_SHOT: 'piercing_shot'
};

export class Skill {
  constructor(key, name, level, manaCost, cooldown, description, effect) {
    this.key = key;
    this.name = name;
    this.level = level;
    this.manaCost = manaCost;
    this.cooldown = cooldown;
    this.description = description;
    this.effect = effect;
  }

  serialize() {
    return {
      key: this.key,
      name: this.name,
      level: this.level,
      manaCost: this.manaCost,
      cooldown: this.cooldown,
      description: this.description,
      effect: this.effect
    };
  }

  static deserialize(data) {
    return new Skill(data.key, data.name, data.level, data.manaCost, data.cooldown, data.description, data.effect);
  }
}

export const HERO_SKILLS = {
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
  },
  rogue: {
    shadowStep: new Skill('shadowStep', '影步', 1, 15, 3, '瞬移至敵人背面,下次攻擊必定暴擊', SkillEffect.SHADOW_STEP),
    backstab: new Skill('backstab', '背刺', 4, 25, 2, '200%傷害,無視防禦', SkillEffect.BACKSTAB),
    poisonBlade: new Skill('poisonBlade', '毒刃', 7, 20, 3, '攻擊帶毒,每回合損失8%HP', SkillEffect.POISON_BLADE),
    smokeBomb: new Skill('smokeBomb', '煙霧彈', 11, 15, 4, '隱身1回合,下回合必定先手', SkillEffect.SMOKE_BOMB),
    lethalRazor: new Skill('lethalRazor', '致命剃刀', 16, 35, 5, '150%傷害×3次', SkillEffect.LETHAL_RAZOR),
    shadowMaster: new Skill('shadowMaster', '影主', 22, 50, 6, '250%傷害並眩暈敵人', SkillEffect.SHADOW_MASTER)
  },
  priest: {
    divineHeal: new Skill('divineHeal', '神聖治療', 1, 20, 2, '恢復30%最大HP', SkillEffect.DIVINE_HEAL),
    holyLight: new Skill('holyLight', '聖光', 4, 15, 1, '120%光屬性傷害', SkillEffect.HOLY_LIGHT),
    blessing: new Skill('blessing', '祝福', 8, 25, 3, '全體攻擊+15%持3回合', SkillEffect.BLESSING),
    holyNova: new Skill('holyNova', '聖光新星', 13, 40, 4, '180%光屬性範圍傷害', SkillEffect.HOLY_NOVA),
    dispel: new Skill('dispel', '驅散', 17, 30, 3, '移除敵人 buff 並造成100%傷害', SkillEffect.DISPEL),
    angelicDescent: new Skill('angelicDescent', '天使降臨', 23, 60, 7, '治療全體50%HP並獲得無敵', SkillEffect.ANGELIC_DESCENT)
  },
  ranger: {
    shot: new Skill('shot', '射擊', 1, 10, 1, '100%遠程傷害', SkillEffect.SHOT),
    multiShot: new Skill('multiShot', '多重射擊', 5, 20, 2, '3發箭矢各80%傷害', SkillEffect.MULTI_SHOT),
    snipe: new Skill('snipe', '狙擊', 9, 30, 3, '250%遠程傷害,無視護盾', SkillEffect.SNIPE),
    arrowRain: new Skill('arrowRain', '箭雨', 14, 45, 5, '120%傷害×5次全體攻擊', SkillEffect.ARROW_RAIN),
    trap: new Skill('trap', '陷阱', 18, 25, 4, '設置陷阱,敵人踩中眩暈+150%伤害', SkillEffect.TRAP),
    piercingShot: new Skill('piercingShot', '穿刺之箭', 24, 55, 6, '400%傷害,無視防禦', SkillEffect.PIERCING_SHOT)
  }
};

export function getSkillByKey(heroKey, skillKey) {
  return HERO_SKILLS[heroKey]?.[skillKey] || null;
}

export function getAvailableSkills(heroKey, heroLevel) {
  const skills = HERO_SKILLS[heroKey] || {};
  return Object.values(skills).filter(s => s.level <= heroLevel);
}

export function canUseSkill(heroKey, skillKey, heroLevel, currentCooldowns, currentMana) {
  const skill = getSkillByKey(heroKey, skillKey);
  if (!skill) return { canUse: false, reason: '技能不存在' };
  if (heroLevel < skill.level) return { canUse: false, reason: `需要等級${skill.level}` };
  if (currentCooldowns[skillKey] > 0) return { canUse: false, reason: '冷卻中' };
  if (currentMana < skill.manaCost) return { canUse: false, reason: '法力不足' };
  return { canUse: true, skill };
}