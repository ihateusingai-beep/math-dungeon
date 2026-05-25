// src/index.js - Main entry point
// Exports all modules for use in browser or Node.js

export { BattleState, BattlePhase, TurnContext, TurnAction, ActionResult } from './models/BattleState.js';
export { Hero, HEROES, PlayerProfile } from './models/Hero.js';
export { Monster, MONSTERS, getMonstersForDomain, selectRandomMonster } from './models/Monster.js';
export { Skill, HERO_SKILLS, getSkillByKey, getAvailableSkills, canUseSkill, SkillEffect } from './models/Skill.js';
export { Question, QuestionGenerator, QuestionType, createQuestionGenerator } from './models/Question.js';
export { GameEngine, createGameEngine } from './engine/GameEngine.js';
export { GameBridge, createGameBridge, getBridge, initBridge } from './engine/GameBridge.js';
export { NetworkClient, createNetworkClient } from './engine/NetworkClient.js';
export { SaveManager, createSaveManager } from './managers/SaveManager.js';
export { LocalSessionManager, createLocalSessionManager } from './managers/LocalSessionManager.js';

export const VERSION = 1;