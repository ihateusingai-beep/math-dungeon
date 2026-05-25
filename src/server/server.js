// server.js - WebSocket server for networked co-op
// Phase 3.5-4: Authoritative server with state hash, rate limiting, leaderboards
// Usage: node server.js

const WebSocket = require('ws');

const PORT = process.env.PORT || 3001;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map();
const playerSessions = new Map();
const playerActionTimes = new Map();

const leaderboards = {
  'co-op': [],
  'versus': [],
  'relay': []
};

console.log(`MathBattle WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let playerId = null;
  let currentRoom = null;

  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message, {
        playerId,
        currentRoom,
        setPlayerId: (id) => { playerId = id; },
        setRoom: (room) => { currentRoom = room; }
      });
    } catch (e) {
      console.error('Invalid message:', e);
      ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid message format' } }));
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);
    if (currentRoom && playerId) {
      handlePlayerLeave(currentRoom, playerId);
    }
    playerActionTimes.delete(playerId);
  });
});

function handleMessage(ws, message, context) {
  const { type, payload } = message;

  switch (type) {
    case 'CREATE_ROOM':
      handleCreateRoom(ws, payload, context);
      break;
    case 'JOIN_ROOM':
      handleJoinRoom(ws, payload, context);
      break;
    case 'PLAYER_ACTION':
      handlePlayerAction(ws, payload, context);
      break;
    case 'LEAVE_ROOM':
      handleLeaveRoom(context);
      break;
    case 'CHAT':
      handleChat(ws, payload, context);
      break;
    case 'REQUEST_STATE':
      handleRequestState(ws, context);
      break;
    case 'REQUEST_FULL_SYNC':
      handleRequestFullSync(ws, context);
      break;
    case 'GET_LEADERBOARD':
      handleGetLeaderboard(ws, payload);
      break;
    case 'SUBMIT_SCORE':
      handleSubmitScore(ws, payload);
      break;
    default:
      ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Unknown message type' } }));
  }
}

function handleCreateRoom(ws, payload, context) {
  const { hostName, heroKey, maxPlayers = 8, gameMode = 'co-op' } = payload;

  const roomId = generateRoomId();
  const hostPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const room = {
    id: roomId,
    host: hostPlayerId,
    players: [{ id: hostPlayerId, name: hostName, heroKey, ws, ready: true, score: 0 }],
    maxPlayers,
    gameMode,
    state: null,
    turnOrder: [],
    currentTurnIndex: 0,
    createdAt: Date.now(),
    battleStarted: false
  };

  rooms.set(roomId, room);
  playerSessions.set(hostPlayerId, roomId);

  context.setPlayerId(hostPlayerId);
  context.setRoom(roomId);

  ws.send(JSON.stringify({
    type: 'ROOM_CREATED',
    payload: {
      roomId,
      playerId: hostPlayerId,
      player: room.players[0],
      maxPlayers,
      gameMode
    }
  }));

  console.log(`Room ${roomId} created by ${hostName}`);
}

function handleJoinRoom(ws, payload, context) {
  const { roomId, playerName, heroKey } = payload;

  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
    return;
  }

  if (room.players.length >= room.maxPlayers) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room is full' } }));
    return;
  }

  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const player = { id: playerId, name: playerName, heroKey, ws, ready: true, score: 0 };

  room.players.push(player);
  playerSessions.set(playerId, roomId);

  context.setPlayerId(playerId);
  context.setRoom(roomId);

  const isSpectating = room.battleStarted;
  const spectatePayload = isSpectating ? {
    type: 'SPECTATE_MODE',
    payload: { canAct: false, reason: 'Battle in progress' }
  } : {
    type: 'JOINED_ROOM',
    payload: {
      roomId,
      playerId,
      player,
      players: room.players.map(p => ({ id: p.id, name: p.name, heroKey: p.heroKey, ready: p.ready }))
    }
  };

  ws.send(JSON.stringify(spectatePayload));

  if (isSpectating && room.state) {
    ws.send(JSON.stringify({
      type: 'STATE_SYNC',
      payload: {
        state: room.state,
        stateHash: computeStateHash(room.state),
        isSpectator: true,
        players: room.players.map(p => ({ id: p.id, name: p.name, heroKey: p.heroKey }))
      }
    }));
  }

  broadcastToRoom(roomId, {
    type: 'PLAYER_JOINED',
    payload: { player: { id: playerId, name: playerName, heroKey } }
  }, playerId);

  console.log(`${playerName} joined room ${roomId}${isSpectating ? ' (spectating)' : ''}`);
}

function handlePlayerAction(ws, payload, context) {
  const { roomId, playerId, action, data } = payload;

  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
    return;
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Player not found' } }));
    return;
  }

  const rateLimit = checkRateLimit(playerId, action);
  if (!rateLimit.allowed) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: rateLimit.reason }
    }));
    return;
  }

  const result = processAction(action, data, room);

  ws.send(JSON.stringify({
    type: 'ACTION_RESULT',
    payload: { playerId, action, result, timestamp: Date.now(), actionId: data.actionId }
  }));

  if (result.gameState) {
    room.state = result.gameState;
    const stateHash = computeStateHash(result.gameState);

    broadcastToRoom(roomId, {
      type: 'STATE_UPDATE',
      payload: { state: result.gameState, stateHash }
    });
  }

  if (result.battleEnded) {
    handleBattleEnd(room);
  }
}

function checkRateLimit(playerId, actionType) {
  const now = Date.now();
  const key = `${playerId}_${actionType}`;
  const lastAction = playerActionTimes.get(key) || 0;

  if (now - lastAction < 1000) {
    return { allowed: false, reason: 'Rate limited (1/sec)' };
  }

  playerActionTimes.set(key, now);
  return { allowed: true };
}

function processAction(action, data, room) {
  switch (action) {
    case 'answer':
      return processAnswer(data, room);
    case 'use_skill':
      return processUseSkill(data, room);
    case 'end_turn':
      return processEndTurn(room);
    default:
      return { success: false, message: 'Unknown action' };
  }
}

function processAnswer(data, room) {
  const { input, questionId } = data;
  const state = room.state || {};

  if (!state.currentQuestion) {
    return { success: false, message: 'No active question' };
  }

  const correct = parseInt(input) === state.currentQuestion.answer;

  if (correct) {
    state.combo = (state.combo || 0) + 1;
  } else {
    state.combo = 0;
    if (state.sharedHp) {
      state.sharedHp -= 10;
    }
  }

  return {
    success: true,
    correct,
    combo: state.combo,
    data
  };
}

function processUseSkill(data, room) {
  const { skillKey } = data;
  return { success: true, message: `Skill ${skillKey} used` };
}

function processEndTurn(room) {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

  if (room.state) {
    const monsterHp = room.state.monsterHp || 0;
    if (monsterHp <= 0) {
      return {
        success: true,
        nextPlayerId: room.players[room.currentTurnIndex].id,
        monsterDefeated: true
      };
    }
  }

  return {
    success: true,
    nextPlayerId: room.players[room.currentTurnIndex].id
  };
}

function handleBattleEnd(room) {
  room.battleStarted = false;

  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  const battleResult = {
    type: 'BATTLE_END',
    payload: {
      rankings: sortedPlayers.map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        name: p.name,
        score: p.score
      })),
      gameMode: room.gameMode
    }
  };

  broadcastToRoom(room.id, battleResult);

  sortedPlayers.forEach(player => {
    updateLeaderboard(room.gameMode, player.id, player.name, player.score);
  });
}

function handlePlayerLeave(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players = room.players.filter(p => p.id !== playerId);
  playerSessions.delete(playerId);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted (empty)`);
  } else {
    broadcastToRoom(roomId, {
      type: 'PLAYER_LEFT',
      payload: { playerId }
    });

    if (room.host === playerId) {
      room.host = room.players[0].id;
      broadcastToRoom(roomId, {
        type: 'HOST_CHANGED',
        payload: { newHost: room.host }
      });
    }
  }
}

function handleLeaveRoom(context) {
  if (context.currentRoom && context.playerId) {
    handlePlayerLeave(context.currentRoom, context.playerId);
    context.setRoom(null);
  }
}

function handleChat(ws, payload, context) {
  const { roomId, playerId, message } = payload;
  broadcastToRoom(roomId, {
    type: 'CHAT',
    payload: { playerId, message, timestamp: Date.now() }
  });
}

function handleRequestState(ws, context) {
  if (!context.currentRoom) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not in a room' } }));
    return;
  }

  const room = rooms.get(context.currentRoom);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
    return;
  }

  ws.send(JSON.stringify({
    type: 'STATE_SYNC',
    payload: {
      state: room.state,
      stateHash: room.state ? computeStateHash(room.state) : null,
      players: room.players.map(p => ({ id: p.id, name: p.name, heroKey: p.heroKey }))
    }
  }));
}

function handleRequestFullSync(ws, context) {
  if (!context.currentRoom) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not in a room' } }));
    return;
  }

  const room = rooms.get(context.currentRoom);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
    return;
  }

  ws.send(JSON.stringify({
    type: 'FULL_STATE_SYNC',
    payload: {
      state: room.state,
      stateHash: room.state ? computeStateHash(room.state) : null,
      players: room.players.map(p => ({ id: p.id, name: p.name, heroKey: p.heroKey, ready: p.ready })),
      roomSettings: {
        maxPlayers: room.maxPlayers,
        gameMode: room.gameMode,
        host: room.host,
        currentTurnIndex: room.currentTurnIndex
      }
    }
  }));
}

function handleGetLeaderboard(ws, payload) {
  const { mode = 'co-op', limit = 100 } = payload;
  const lb = leaderboards[mode] || [];

  ws.send(JSON.stringify({
    type: 'LEADERBOARD_DATA',
    payload: {
      mode,
      entries: lb.slice(0, limit)
    }
  }));
}

function handleSubmitScore(ws, payload) {
  const { mode = 'co-op', playerId, name, score } = payload;

  updateLeaderboard(mode, playerId, name, score);

  ws.send(JSON.stringify({
    type: 'SCORE_SUBMITTED',
    payload: { success: true, mode, playerId, score }
  }));
}

function updateLeaderboard(gameMode, playerId, name, score) {
  const lb = leaderboards[gameMode] || [];

  const existingIndex = lb.findIndex(entry => entry.playerId === playerId);
  if (existingIndex >= 0) {
    if (score > lb[existingIndex].score) {
      lb[existingIndex].score = score;
      lb[existingIndex].date = Date.now();
    }
  } else {
    lb.push({ playerId, name, score, date: Date.now() });
  }

  lb.sort((a, b) => b.score - a.score);
  lb.splice(100);

  leaderboards[gameMode] = lb;
}

function computeStateHash(state) {
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

function broadcastToRoom(roomId, message, excludePlayerId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  const data = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.id !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

wss.on('close', () => {
  console.log('Server shutting down');
});