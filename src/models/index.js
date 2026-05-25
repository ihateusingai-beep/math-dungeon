// models/index.js - Export all models
export { BattleState, BattlePhase, TurnContext, TurnAction, ActionResult } from './BattleState.js';
export { Hero, HEROES, PlayerProfile, PASSIVE_EFFECTS } from './Hero.js';
export { Monster, MONSTERS, getMonstersForDomain, selectRandomMonster, BOSS_TEMPLATES } from './Monster.js';
export { Skill, HERO_SKILLS, getSkillByKey, getAvailableSkills, canUseSkill, SkillEffect } from './Skill.js';
export { Question, QuestionGenerator, QuestionType, createQuestionGenerator } from './Question.js';
export { Element, ELEMENT_COLORS, ELEMENT_WEAKNESS, ELEMENT_REACTIONS, calculateElementalDamage, getElementColor, isWeakTo, isResistantTo, getElementReaction } from './Element.js';
export { StatusType, StatusEffect, STATUS_EFFECTS, createStatusEffect, applyStatusEffect, tickStatusEffects, hasEffect, getEffectByName, removeEffect } from './StatusEffect.js';
export { Summon, SUMMON_TYPES, getSummonTemplate, createSummon, getSummonsByRarity, RARITY_ORDER, SUMMONS } from './Summon.js';