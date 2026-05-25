// Element.js - Element system for Multiplication Town
// Version: 1

export const Element = {
  FIRE: 'fire',
  ICE: 'ice',
  WIND: 'wind',
  EARTH: 'earth',
  THUNDER: 'thunder',
  WATER: 'water',
  LIGHT: 'light',
  DARK: 'dark'
};

export const ELEMENT_COLORS = {
  fire: '#FF6B35',
  ice: '#00D4FF',
  wind: '#98FB98',
  earth: '#8B4513',
  thunder: '#9370DB',
  water: '#4169E1',
  light: '#FFD700',
  dark: '#4B0082'
};

export const ELEMENT_WEAKNESS = {
  fire: 'ice',
  ice: 'fire',
  wind: 'ice',
  earth: 'wind',
  thunder: 'earth',
  water: 'thunder',
  light: 'dark',
  dark: 'light'
};

export const ELEMENT_REACTIONS = {
  'fire+water': { name: 'Evaporation', multiplier: 1.5, visual: 'steam' },
  'fire+wind': { name: 'Burn', dot: true, damage: 0.05 },
  'fire+earth': { name: 'Lava', block: true },
  'ice+water': { name: 'Freeze', slow: 0.5, duration: 2 },
  'ice+wind': { name: 'Blizzard', aoe: true, damage: 1.0 },
  'thunder+water': { name: 'Conduction', chain: 3, damage: 0.8 },
  'light+dark': { name: 'HolyDark', damage: 2.0, vsUndead: 3.0 },
  'fire+fire': { name: 'Inferno', multiplier: 1.8, aoe: true },
  'ice+ice': { name: 'Glacier', multiplier: 1.8, slow: 0.7 },
  'thunder+thunder': { name: 'Thunderstorm', multiplier: 1.8, chain: 4 }
};

export function getElementColor(element) {
  return ELEMENT_COLORS[element] || '#ffffff';
}

export function isWeakTo(attackElement, defenseElement) {
  return ELEMENT_WEAKNESS[attackElement] === defenseElement;
}

export function isResistantTo(attackElement, defenseElement) {
  return ELEMENT_WEAKNESS[defenseElement] === attackElement;
}

export function calculateElementalDamage(baseDamage, attackElement, defenseElement) {
  if (isWeakTo(attackElement, defenseElement)) {
    return baseDamage * 1.5;
  }
  if (isResistantTo(attackElement, defenseElement)) {
    return baseDamage * 0.5;
  }
  return baseDamage;
}

export function getElementReaction(elem1, elem2) {
  const key1 = `${elem1}+${elem2}`;
  const key2 = `${elem2}+${elem1}`;
  return ELEMENT_REACTIONS[key1] || ELEMENT_REACTIONS[key2] || null;
}