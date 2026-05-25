// LocalSessionManager.js - Manages hotseat multiplayer sessions
// Version: 1
import { PlayerProfile } from '../models/Hero.js';
import { HEROES } from '../models/Hero.js';
import { createGameEngine } from '../engine/GameEngine.js';

export class LocalSessionManager {
  constructor(maxPlayers = 8) {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.maxPlayers = maxPlayers;
    this.sessionId = this.generateSessionId();
    this.gameEngine = null;
    this.turnNumber = 0;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    this.gameEngine = createGameEngine({
      playerCount: this.players.length,
      sessionId: this.sessionId,
      ...options
    });

    this.currentPlayerIndex = 0;
    this.turnNumber = 1;

    const firstPlayer = this.getCurrentPlayer();
    this.gameEngine.startBattle({
      heroKey: firstPlayer.heroKey,
      domain: options.domain || 'newbie'
    });

    this.gameEngine.setActivePlayer(firstPlayer.playerId);

    return {
      success: true,
      sessionId: this.sessionId,
      currentPlayer: firstPlayer
    };
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

    return {
      currentPlayer: nextPlayer,
      turnNumber: this.turnNumber
    };
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
    return {
      ...result,
      playerId,
      playerName: this.getCurrentPlayer().name
    };
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

    return {
      success: true,
      nextPlayer: advance.currentPlayer,
      turnNumber: advance.turnNumber
    };
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
      this.gameEngine = createGameEngine();
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

export function createLocalSessionManager(maxPlayers = 8) {
  return new LocalSessionManager(maxPlayers);
}