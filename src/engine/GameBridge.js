// GameBridge.js - Connects GameEngine to existing DOM rendering
// This allows the modular GameEngine to work with the existing index.html
// Version: 1

import { createGameEngine } from '../engine/GameEngine.js';
import { createNetworkClient } from '../engine/NetworkClient.js';
import { createSaveManager } from '../managers/SaveManager.js';
import { HEROES, HERO_SKILLS } from '../models/index.js';

export class GameBridge {
  constructor(options = {}) {
    this.engine = null;
    this.networkClient = null;
    this.saveManager = createSaveManager('mathTownHero');
    this.isNetworkMode = false;
    this.bindMethods();
    this.setupNetworkCallbacks(options);
  }

  setupNetworkCallbacks(options = {}) {
    this.onNetworkStateUpdate = options.onNetworkStateUpdate || null;
    this.onNetworkRoomEvent = options.onNetworkRoomEvent || null;
    this.onNetworkConnectionChange = options.onNetworkConnectionChange || null;
    this.onNetworkError = options.onNetworkError || null;
  }

  bindMethods() {
    this.handleStateChange = this.handleStateChange.bind(this);
    this.handlePhaseChange = this.handlePhaseChange.bind(this);
    this.handleRemoteStateUpdate = this.handleRemoteStateUpdate.bind(this);
    this.handleRoomEvent = this.handleRoomEvent.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
  }

  initialize(options = {}) {
    this.engine = createGameEngine({
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

  enableNetworkMode(serverUrl) {
    this.networkClient = createNetworkClient(this.engine, {
      onRemoteStateUpdate: this.handleRemoteStateUpdate,
      onRoomEvent: this.handleRoomEvent,
      onConnectionChange: this.handleConnectionChange,
      onError: this.onNetworkError
    });

    this.isNetworkMode = true;
    return this.networkClient.connect(serverUrl);
  }

  disableNetworkMode() {
    if (this.networkClient) {
      this.networkClient.disconnect();
      this.networkClient = null;
    }
    this.isNetworkMode = false;
  }

  createRoom(hostName, heroKey) {
    return this.networkClient?.createRoom(hostName, heroKey);
  }

  joinRoom(roomId, playerName, heroKey) {
    return this.networkClient?.joinRoom(roomId, playerName, heroKey);
  }

  sendAction(action, data) {
    return this.networkClient?.sendAction(action, data);
  }

  requestFullStateSync() {
    return this.networkClient?.requestFullStateSync();
  }

  sendChat(message) {
    return this.networkClient?.sendChat(message);
  }

  leaveRoom() {
    return this.networkClient?.leaveRoom();
  }

  getNetworkState() {
    return this.networkClient?.getConnectionState() || null;
  }

  isNetworkConnected() {
    return this.networkClient?.isConnected || false;
  }

  isSpectator() {
    return this.networkClient?.isSpectator || false;
  }

  handleRemoteStateUpdate(serverState, options = {}) {
    if (options.isSpectator) {
      this.engine.loadState(serverState);
      this.renderBattleState();
      return;
    }

    const reconciled = this.networkClient?.reconcileState(serverState);
    if (reconciled?.reconciled) {
      this.renderBattleState();
    }

    if (this.onNetworkStateUpdate) {
      this.onNetworkStateUpdate(serverState, options);
    }
  }

  handleRoomEvent(event) {
    if (this.onNetworkRoomEvent) {
      this.onNetworkRoomEvent(event);
    }
  }

  handleConnectionChange(state) {
    if (this.onNetworkConnectionChange) {
      this.onNetworkConnectionChange(state);
    }
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

  handleStateChange(state) {
    // These are called by the engine but don't directly update DOM
    // The index.html will call getState() and render manually
  }

  handlePhaseChange(phase, data) {
    // Handle phase change callbacks for MP sync points
    // For SP, this could trigger UI updates
  }

  // ========== DOM UPDATE HELPERS ==========
  // These methods update the DOM based on engine state

  updateMonsterDisplay() {
    const state = this.engine.state;
    if (typeof updateMonsterHpBar === 'function') updateMonsterHpBar();
    if (typeof updateBattleStatsBar === 'function') updateBattleStatsBar();
  }

  updateHeroDisplay() {
    const state = this.engine.state;
    if (typeof updateHeroHpBar === 'function') updateHeroHpBar();
    if (typeof updateShieldDisplay === 'function') updateShieldDisplay();
    if (typeof updateManaDisplay === 'function') updateManaDisplay();
    if (typeof updateHeroLevelDisplay === 'function') updateHeroLevelDisplay();
  }

  updateComboDisplay() {
    const combo = this.engine.state.combo;
    const comboEl = document.getElementById('comboDisplay');
    if (comboEl) comboEl.textContent = `🔥 ${combo}`;
  }

  updateGoldDisplay() {
    const gold = this.engine.state.gold;
    const goldEl = document.getElementById('battleGoldDisplay');
    if (goldEl) goldEl.textContent = gold;
  }

  renderBattleState() {
    const state = this.engine.state;
    this.updateMonsterDisplay();
    this.updateHeroDisplay();
    this.updateComboDisplay();
    this.updateGoldDisplay();
  }

  // ========== UTILITY ==========

  getState() {
    return this.engine ? this.engine.getState() : null;
  }

  getCurrentQuestion() {
    return this.engine.currentQuestion;
  }

  serialize() {
    return this.engine ? this.engine.serialize() : null;
  }

  deserialize(data) {
    return this.engine ? this.engine.deserialize(data) : false;
  }
}

export function createGameBridge(options = {}) {
  return new GameBridge(options);
}

// Bridge instance for global access from index.html
let globalBridge = null;

export function getBridge() {
  if (!globalBridge) {
    globalBridge = createGameBridge();
    globalBridge.initialize();
  }
  return globalBridge;
}

export function initBridge(options) {
  globalBridge = createGameBridge(options);
  globalBridge.initialize(options);
  return globalBridge;
}