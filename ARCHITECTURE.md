# Multiplication Town — Modular Architecture

> **Plan:** `.kilo/plans/1779638678591-lucky-island.md`
> **Implementation:** Phase 0 (Architecture Foundation) + Phase 1-2 core systems

## Architecture Overview

The game has been refactored to separate **game logic** from **DOM rendering**, enabling:

1. **Unit testing** of core game logic without browser
2. **Multiplayer-ready** architecture with serializable state
3. **Hotseat multiplayer** (local 2-8 players)
4. **Future networked co-op** via WebSocket server

## File Structure

```
src/
├── engine/
│   ├── GameEngine.js      # Core game logic (no DOM deps)
│   ├── GameBridge.js      # Connects Engine to existing DOM
│   └── index.js
├── models/
│   ├── BattleState.js     # Battle state with serialization
│   ├── Hero.js            # Hero & PlayerProfile
│   ├── Monster.js         # Monster with HP scaling
│   ├── Question.js        # QuestionGenerator with adaptive difficulty
│   ├── Skill.js           # Skills with cooldown system
│   └── index.js
├── managers/
│   ├── SaveManager.js     # localStorage + JSON export
│   ├── LocalSessionManager.js  # Hotseat multiplayer
│   └── index.js
├── server/
│   ├── server.js          # WebSocket server skeleton
│   └── package.json
├── index.js              # ES module exports
└── mathbattle.bundle.js   # Browser bundle (UMD format)
```

## Key Classes

### GameEngine
Core game logic — receives commands, manages state, emits changes.

```javascript
const engine = createGameEngine({
  onStateChange: (state) => {},  // Called on every state mutation
  onPhaseChange: (phase, data) => {},  // MP sync points
  playerCount: 1
});

engine.startBattle({ heroKey: 'knight', domain: 'newbie' });
const result = engine.answer(42);  // Returns { correct, damage, combo }
const skillResult = engine.useSkill('shieldBlock');
engine.endTurn();  // Triggers monster turn
```

### BattleState
Serializable game state (version 1):

```javascript
{
  version: 1,
  phase: 'battle',
  heroKey: 'knight',
  heroHp: 100, heroMaxHp: 100,
  heroLevel: 1, heroExp: 0, expToNextLevel: 100,
  monsterHp: 50, monsterMaxHp: 100,
  combo: 0, gold: 0, shield: 0,
  mana: 100, maxMana: 100,
  skillCooldowns: {},
  activeEffects: [],
  domain: 'newbie'
}
```

### LocalSessionManager
Hotseat multiplayer manager:

```javascript
const session = createLocalSessionManager(8);
session.addPlayer('Alice', 'knight');
session.addPlayer('Bob', 'mage');
session.startSession({ domain: 'newbie' });

// Turn validation
const result = session.submitAnswer('player_1', 42);  // Only current player can answer
session.endTurn('player_1');  // Requires explicit end turn
```

### SaveManager
Persistence with JSON export:

```javascript
const saveManager = createSaveManager('mathTownHero');
saveManager.save(gameState, heroState, progressState);
const jsonExport = saveManager.exportSave();  // For cloud save / backup
saveManager.importSave(jsonString);
```

## Hotseat Usage

1. **Include bundle** in HTML:
   ```html
   <script src="src/mathbattle.bundle.js"></script>
   ```

2. **Start session**:
   ```javascript
   const session = MathBattle.createLocalSessionManager();
   session.addPlayer('Player 1', 'knight');
   session.addPlayer('Player 2', 'mage');
   session.startSession({ domain: 'newbie' });
   ```

3. **Get current player**:
   ```javascript
   const current = session.getCurrentPlayer();  // PlayerProfile
   const state = session.getSessionState();  // Full state for rendering
   ```

4. **Submit answer** (validated):
   ```javascript
   const result = session.submitAnswer(current.playerId, input);
   ```

5. **Advance turn** (explicit confirmation required):
   ```javascript
   session.endTurn(current.playerId);
   ```

## MP Sync Points

Phase hooks enable MP synchronization:

- `onPhaseChange('player_turn', { playerId })` — Broadcast "player X's turn"
- `onPhaseChange('turn_end', { nextPhase })` — Trigger UI swap
- `onPhaseChange('level_up', { level })` — Shared celebration
- `onPhaseChange('defeat')` — Game over for all clients

## Server (Phase 3)

Run WebSocket server:
```bash
cd src/server
npm install
npm start
```

Message protocol:
```javascript
{ type: 'CREATE_ROOM', payload: { hostName, heroKey, maxPlayers } }
{ type: 'JOIN_ROOM', payload: { roomId, playerName, heroKey } }
{ type: 'PLAYER_ACTION', payload: { roomId, playerId, action, data } }
{ type: 'STATE_UPDATE', payload: { state } }  // Server → Client
```

## Backward Compatibility

The existing `index.html` continues to work unchanged. The `GameBridge` class
can optionally be integrated for future modular features:

```javascript
const bridge = MathBattle.createGameBridge();
bridge.initialize({ onStateChange: (state) => console.log(state) });
bridge.startBattle({ heroKey: 'knight' });
```

## State Versioning

All serialized state includes `version: 1`. Future migrations will check version
and apply appropriate transforms. This ensures existing saves don't break when
new fields are added (e.g., `playerId` for MP).

## Scale Math

Monster HP scales with player count:
```javascript
getScaledHP(baseHP, playerCount)  // baseHP * (1 + 0.2 * (playerCount - 1))
```

For 2 players: 1.2x HP
For 4 players: 1.6x HP
For 8 players: 2.4x HP