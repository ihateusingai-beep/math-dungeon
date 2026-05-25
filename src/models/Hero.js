// Hero.js - Hero model with serialization
// Version: 2 (added rogue, priest, ranger)

export class Hero {
  constructor(key, name, hp, atkMin, atkMax, crit, img, color, passive, passiveDesc, element = null, extraStats = {}) {
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
    this.passiveDesc = passiveDesc;
    this.element = element;
    this.extraStats = extraStats;
  }

  serialize() {
    return {
      key: this.key,
      name: this.name,
      hp: this.hp,
      maxHp: this.maxHp,
      atkMin: this.atkMin,
      atkMax: this.atkMax,
      crit: this.crit,
      img: this.img,
      color: this.color,
      passive: this.passive,
      passiveDesc: this.passiveDesc,
      element: this.element,
      extraStats: this.extraStats
    };
  }

  static deserialize(data) {
    return new Hero(
      data.key,
      data.name,
      data.hp,
      data.atkMin,
      data.atkMax,
      data.crit,
      data.img,
      data.color,
      data.passive,
      data.passiveDesc || '',
      data.element,
      data.extraStats || {}
    );
  }
}

export const HEROES = {
  knight: new Hero('knight', '銀藍騎士', 100, 8, 12, 0.1, 'assets/images/knight-hero.png', '#4a90e2', 'block', '格擋反擊+20%', 'light'),
  mage: new Hero('mage', '銀月法師', 80, 12, 18, 0.15, 'assets/images/mage-hero.png', '#9b59b6', 'critBoost', '暴擊傷害+50%', 'arcane'),
  berserker: new Hero('berserker', '烈焰狂戰', 120, 15, 25, 0.25, 'assets/images/berserker-hero.png', '#e74c3c', 'rage', 'HP低於50%時攻擊+30%', 'dark'),

  rogue: new Hero(
    'rogue', '幻影刺客', 75, 20, 28, 0.25,
    'assets/images/rogue-male.jpeg', '#2ecc71',
    'swift_blade', '速度+25%, 每4次攻擊必暴擊', 'wind',
    { evade: 0.20, speed: 15, mp: 80 }
  ),
  priest: new Hero(
    'priest', '聖光祭司', 90, 12, 18, 0.10,
    'assets/images/priest-male.jpeg', '#f1c40f',
    'divine_blessing', '每回合回血3%, 免疫眩暈', 'light',
    { healBonus: 0.25, lightBonus: 0.20, mp: 100 }
  ),
  ranger: new Hero(
    'ranger', '遠程獵人', 70, 18, 26, 0.15,
    'assets/images/ranger-male.jpeg', '#e67e22',
    'eagle_eye', '射程無限, 命中率+20%', 'wind',
    { range: 'infinite', accuracy: 0.20, mp: 60 }
  )
};

export const PASSIVE_EFFECTS = {
  block: (state) => { return { atkBonus: state.combo >= 3 ? 0.2 : 0 }; },
  critBoost: (state) => { return { critDamageBonus: 0.5 }; },
  rage: (state) => { return { atkBonus: state.heroHp < state.heroMaxHp * 0.5 ? 0.3 : 0 }; },
  swift_blade: (state) => {
    const attackCount = state.attackCount || 0;
    const willCrit = (attackCount + 1) % 4 === 0;
    return { speedBonus: 0.25, forceCrit: willCrit };
  },
  divine_blessing: (state) => {
    return { regenPercent: 0.03, stunImmune: true };
  },
  eagle_eye: (state) => {
    return { accuracyBonus: 0.20, ignoreObstacles: true };
  }
};

export class PlayerProfile {
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
    return {
      playerId: this.playerId,
      name: this.name,
      heroKey: this.heroKey,
      hp: this.hp,
      maxHp: this.maxHp,
      gold: this.gold,
      exp: this.exp,
      level: this.level
    };
  }

  deserialize(data) {
    this.playerId = data.playerId;
    this.name = data.name;
    this.heroKey = data.heroKey;
    this.hp = data.hp ?? 100;
    this.maxHp = data.maxHp ?? 100;
    this.gold = data.gold ?? 0;
    this.exp = data.exp ?? 0;
    this.level = data.level ?? 1;
  }
}