// SaveManager.js - Handles serialization to localStorage and JSON export
// Version: 1

export class SaveManager {
  constructor(storageKey = 'mathTownHero') {
    this.storageKey = storageKey;
  }

  save(gameState, heroState, progressState = {}) {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      heroState: heroState || {},
      progressState: progressState || {},
      gameState: gameState || {}
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(saveData));
      return { success: true, message: 'Saved successfully' };
    } catch (e) {
      console.error('Save failed:', e);
      return { success: false, message: 'Save failed: ' + e.message };
    }
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      if (!data.version) {
        console.warn('SaveManager: Unknown save version');
        return this.getDefaultSave();
      }
      return data;
    } catch (e) {
      console.error('Load failed:', e);
      return this.getDefaultSave();
    }
  }

  getDefaultSave() {
    return {
      version: 1,
      timestamp: Date.now(),
      heroState: { heroLevel: 1, heroExp: 0, expToNextLevel: 100 },
      progressState: {},
      gameState: {}
    };
  }

  exportSave() {
    const data = this.load();
    return JSON.stringify(data, null, 2);
  }

  importSave(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version) {
        return { success: false, message: 'Invalid save format' };
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return { success: true, message: 'Save imported successfully' };
    } catch (e) {
      return { success: false, message: 'Import failed: ' + e.message };
    }
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }

  hasSave() {
    return localStorage.getItem(this.storageKey) !== null;
  }
}

export function createSaveManager(key) {
  return new SaveManager(key);
}