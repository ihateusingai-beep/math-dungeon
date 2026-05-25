// NetworkClient.js - WebSocket client for networked multiplayer
// Phase 3.5: Client-side state sync with authoritative server
// Version: 1

export class NetworkClient {
  constructor(gameEngine, options = {}) {
    this.engine = gameEngine;
    this.ws = null;
    this.playerId = null;
    this.roomId = null;
    this.playerName = null;
    this.heroKey = null;
    this.pendingActions = new Map();
    this.serverState = null;
    this.lastStateHash = null;
    this.stateHashInterval = null;
    this.actionCounter = 0;
    this.isConnected = false;
    this.isSpectator = false;
    this.onRemoteStateUpdate = options.onRemoteStateUpdate || null;
    this.onRoomEvent = options.onRoomEvent || null;
    this.onConnectionChange = options.onConnectionChange || null;
    this.onError = options.onError || null;
    this.playerActionTimes = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (this.onConnectionChange) {
            this.onConnectionChange({ connected: true });
          }
          resolve();
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          if (this.onConnectionChange) {
            this.onConnectionChange({ connected: false });
          }
          this.attemptReconnect(serverUrl);
        };

        this.ws.onerror = (error) => {
          if (this.onError) {
            this.onError({ type: 'connection', error });
          }
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  attemptReconnect(serverUrl) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.onError) {
        this.onError({ type: 'reconnect_failed', attempts: this.reconnectAttempts });
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect(serverUrl).catch(() => {});
      }
    }, delay);
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isSpectator = false;
    this.pendingActions.clear();
  }

  createRoom(hostName, heroKey) {
    this.playerName = hostName;
    this.heroKey = heroKey;

    const message = {
      type: 'CREATE_ROOM',
      payload: {
        hostName,
        heroKey,
        maxPlayers: 8,
        gameMode: 'co-op'
      }
    };

    return this.sendMessage(message);
  }

  joinRoom(roomId, playerName, heroKey) {
    this.playerName = playerName;
    this.heroKey = heroKey;

    const message = {
      type: 'JOIN_ROOM',
      payload: { roomId, playerName, heroKey }
    };

    return this.sendMessage(message);
  }

  sendAction(action, data) {
    const actionId = `action_${++this.actionCounter}_${Date.now()}`;

    const rateLimit = this.checkRateLimit(action);
    if (!rateLimit.allowed) {
      return Promise.resolve({
        success: false,
        message: rateLimit.reason,
        actionId
      });
    }

    this.playerActionTimes.set(action, Date.now());

    const message = {
      type: 'PLAYER_ACTION',
      payload: {
        roomId: this.roomId,
        playerId: this.playerId,
        action,
        data: { ...data, actionId }
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingActions.set(actionId, { resolve, reject, action, timestamp: Date.now() });

      this.sendMessage(message).catch((err) => {
        this.pendingActions.delete(actionId);
        reject(err);
      });

      setTimeout(() => {
        if (this.pendingActions.has(actionId)) {
          this.pendingActions.delete(actionId);
          resolve({ success: false, message: 'Timeout', actionId });
        }
      }, 10000);
    });
  }

  checkRateLimit(action) {
    const now = Date.now();
    const lastAction = this.playerActionTimes.get(action) || 0;

    if (now - lastAction < 1000) {
      return { allowed: false, reason: 'Rate limited (1/sec)' };
    }

    return { allowed: true };
  }

  requestFullStateSync() {
    const message = {
      type: 'REQUEST_STATE',
      payload: {}
    };

    return this.sendMessage(message);
  }

  sendChat(message) {
    const chatMessage = {
      type: 'CHAT',
      payload: {
        roomId: this.roomId,
        playerId: this.playerId,
        message
      }
    };

    return this.sendMessage(chatMessage);
  }

  leaveRoom() {
    const message = {
      type: 'LEAVE_ROOM',
      payload: {
        roomId: this.roomId,
        playerId: this.playerId
      }
    };

    this.roomId = null;
    this.isSpectator = false;

    return this.sendMessage(message);
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Send timeout'));
      }, 5000);

      this.ws.send(JSON.stringify(message));
      clearTimeout(timeout);
      resolve();
    });
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'ROOM_CREATED':
        this.playerId = payload.playerId;
        this.roomId = payload.roomId;
        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'room_created', roomId: payload.roomId, playerId: payload.playerId });
        }
        break;

      case 'JOINED_ROOM':
        this.playerId = payload.playerId;
        this.roomId = payload.roomId;
        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'joined_room', roomId: payload.roomId, players: payload.players });
        }
        break;

      case 'PLAYER_JOINED':
        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'player_joined', player: payload.player });
        }
        break;

      case 'PLAYER_LEFT':
        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'player_left', playerId: payload.playerId });
        }
        break;

      case 'HOST_CHANGED':
        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'host_changed', newHost: payload.newHost });
        }
        break;

      case 'ACTION_RESULT':
        if (payload.data?.actionId && this.pendingActions.has(payload.data.actionId)) {
          const pending = this.pendingActions.get(payload.data.actionId);
          this.pendingActions.delete(payload.data.actionId);
          pending.resolve(payload.result);
        }
        break;

      case 'STATE_UPDATE':
        const hash = payload.stateHash || this.computeStateHash(payload.state);
        const stateWithHash = { ...payload.state, stateHash: hash };

        this.serverState = stateWithHash;

        if (this.lastStateHash && this.lastStateHash !== hash) {
          this.requestFullStateSync();
        } else {
          this.lastStateHash = hash;
          if (this.onRemoteStateUpdate) {
            this.onRemoteStateUpdate(stateWithHash);
          }
        }
        break;

      case 'STATE_SYNC':
        this.isSpectator = payload.isSpectator || false;
        this.serverState = payload.state;
        this.lastStateHash = payload.stateHash || this.computeStateHash(payload.state);

        if (this.engine && payload.state) {
          this.engine.loadState(payload.state);
        }

        if (this.onRemoteStateUpdate) {
          this.onRemoteStateUpdate(payload.state, { isSpectator: this.isSpectator });
        }

        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'state_sync', isSpectator: this.isSpectator });
        }
        break;

      case 'SPECTATE_MODE':
        this.isSpectator = !payload.canAct;
        if (this.onRoomEvent) {
          this.onRoomEvent({ type: 'spectate_mode', canAct: payload.canAct, reason: payload.reason });
        }
        break;

      case 'ERROR':
        if (this.onError) {
          this.onError({ type: 'server_error', message: payload.message });
        }

        for (const [id, pending] of this.pendingActions) {
          pending.reject(new Error(payload.message));
        }
        this.pendingActions.clear();
        break;

      default:
        break;
    }
  }

  computeStateHash(state) {
    if (!state) return null;

    const str = JSON.stringify({
      phase: state.phase,
      heroHp: state.heroHp,
      monsterHp: state.monsterHp,
      combo: state.combo,
      gold: state.gold,
      heroLevel: state.heroLevel,
      monsterTurnCount: state.monsterTurnCount
    });

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  reconcileState(serverState) {
    const serverHash = this.computeStateHash(serverState);
    const localHash = this.computeStateHash(this.engine?.getState());

    if (serverHash !== localHash) {
      if (serverState && this.engine) {
        this.engine.loadState(serverState);
        this.lastStateHash = serverHash;
        return { reconciled: true, action: 'full_sync' };
      }
    }

    return { reconciled: false };
  }

  startStateHashInterval(intervalMs = 5000) {
    this.stopStateHashInterval();
    this.stateHashInterval = setInterval(() => {
      if (this.serverState && this.lastStateHash) {
        const currentHash = this.computeStateHash(this.serverState);
        if (currentHash !== this.lastStateHash) {
          this.requestFullStateSync();
        }
      }
    }, intervalMs);
  }

  stopStateHashInterval() {
    if (this.stateHashInterval) {
      clearInterval(this.stateHashInterval);
      this.stateHashInterval = null;
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      playerId: this.playerId,
      roomId: this.roomId,
      isSpectator: this.isSpectator,
      pendingActions: this.pendingActions.size
    };
  }
}

export function createNetworkClient(gameEngine, options) {
  return new NetworkClient(gameEngine, options);
}