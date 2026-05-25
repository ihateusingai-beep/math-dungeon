// Question.js - Question model with serialization
// Version: 1

export const QuestionType = {
  STANDARD: 'standard',
  MISSING: 'missing',
  WORD_PROBLEM: 'word_problem'
};

export class Question {
  constructor(type, num1, num2, answer, hint = '') {
    this.type = type;
    this.num1 = num1;
    this.num2 = num2;
    this.answer = answer;
    this.hint = hint;
    this.id = this.generateId();
    this.createdAt = Date.now();
  }

  generateId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  serialize() {
    return {
      type: this.type,
      num1: this.num1,
      num2: this.num2,
      answer: this.answer,
      hint: this.hint,
      id: this.id,
      createdAt: this.createdAt
    };
  }

  static deserialize(data) {
    const q = new Question(data.type, data.num1, data.num2, data.answer, data.hint);
    q.id = data.id;
    q.createdAt = data.createdAt;
    return q;
  }

  get displayText() {
    switch (this.type) {
      case QuestionType.STANDARD:
        return `${this.num1} × ${this.num2} = ?`;
      case QuestionType.MISSING:
        return `${this.num1} × ? = ${this.num1 * this.num2}`;
      case QuestionType.WORD_PROBLEM:
        return `有${this.num1}群怪物，每群${this.num2}隻，總共幾隻？`;
      default:
        return `${this.num1} × ${this.num2} = ?`;
    }
  }

  getOperands() {
    return [this.num1, this.num2];
  }
}

export class QuestionGenerator {
  constructor(seed = null) {
    this.seed = seed;
    this.adaptiveState = {
      weaknessPatterns: {},
      difficultyLevel: 0,
      recentAccuracy: [],
      consecutiveErrors: 0
    };
    this.rng = seed ? this.createSeededRNG(seed) : Math.random;
  }

  createSeededRNG(seed) {
    let s = seed;
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  generate(domain = 'newbie', difficultyLevel = 0) {
    const tables = this.getTablesForDomain(domain);
    const difficulty = Math.min(difficultyLevel, tables.length - 1);

    const tableIndex = Math.floor(this.rng() * tables.length);
    const num1 = tables[tableIndex];
    const num2 = Math.floor(this.rng() * 8) + 2;

    const typeRoll = this.rng();
    let questionType = QuestionType.STANDARD;
    if (typeRoll > 0.7) {
      questionType = QuestionType.MISSING;
    } else if (typeRoll > 0.85) {
      questionType = QuestionType.WORD_PROBLEM;
    }

    const answer = num1 * num2;
    return new Question(questionType, num1, num2, answer);
  }

  getTablesForDomain(domain) {
    switch (domain) {
      case 'newbie': return [2, 3, 4, 5];
      case 'veteran': return [2, 3, 4, 5, 6, 7, 8, 9];
      case 'legend': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      default: return [2, 3, 4, 5, 6, 7, 8, 9];
    }
  }

  generateOptions(correctAnswer, count = 4) {
    const options = new Set([correctAnswer]);
    while (options.size < count) {
      const offset = Math.floor(this.rng() * 10) - 5;
      const wrong = correctAnswer + (offset === 0 ? 1 : offset);
      if (wrong > 0) options.add(wrong);
    }
    return Array.from(options).sort(() => this.rng() - 0.5);
  }

  updateAdaptiveState(correct) {
    this.adaptiveState.recentAccuracy.push(correct ? 1 : 0);
    if (this.adaptiveState.recentAccuracy.length > 5) {
      this.adaptiveState.recentAccuracy.shift();
    }

    const avgAccuracy = this.adaptiveState.recentAccuracy.reduce((a, b) => a + b, 0) / this.adaptiveState.recentAccuracy.length;

    if (!correct) {
      this.adaptiveState.consecutiveErrors++;
      if (this.adaptiveState.consecutiveErrors >= 2) {
        this.adaptiveState.difficultyLevel = Math.max(0, this.adaptiveState.difficultyLevel - 1);
      }
    } else {
      this.adaptiveState.consecutiveErrors = 0;
      if (avgAccuracy > 0.8 && this.adaptiveState.difficultyLevel < 10) {
        this.adaptiveState.difficultyLevel++;
      }
    }
  }

  serialize() {
    return {
      seed: this.seed,
      adaptiveState: { ...this.adaptiveState }
    };
  }

  deserialize(data) {
    this.seed = data.seed;
    this.adaptiveState = data.adaptiveState || {};
    this.rng = this.seed ? this.createSeededRNG(this.seed) : Math.random;
  }
}

export function createQuestionGenerator(seed) {
  return new QuestionGenerator(seed);
}