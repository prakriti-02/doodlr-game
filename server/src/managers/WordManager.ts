import wordsData from '../data/words.json';

export interface WordList {
  animals: string[];
  food: string[];
  objects: string[];
  actions: string[];
  places: string[];
  [key: string]: string[];
}

export class WordManager {
  private categories: WordList;

  constructor() {
    this.categories = wordsData as WordList;
  }

  /**
   * Returns a pool of words based on chosen category and any custom words.
   */
  public getWordPool(category: string = 'all', customWords: string[] = []): string[] {
    let pool: string[] = [];

    if (category !== 'all' && this.categories[category]) {
      pool = [...this.categories[category]];
    } else {
      for (const cat of Object.keys(this.categories)) {
        pool.push(...this.categories[cat]);
      }
    }

    if (customWords && customWords.length > 0) {
      const sanitizedCustom = customWords
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length >= 2 && w.length <= 30);
      pool = [...pool, ...sanitizedCustom];
    }

    return pool;
  }

  /**
   * Selects N unique words for the drawer to choose from.
   * Supports 'normal', 'hidden', and 'combination' modes.
   */
  public getRandomChoices(
    count: number = 3,
    category: string = 'all',
    customWords: string[] = [],
    mode: 'normal' | 'hidden' | 'combination' = 'normal'
  ): string[] {
    const pool = this.getWordPool(category, customWords);
    const safeCount = Math.min(Math.max(1, count), 5);

    if (mode === 'combination') {
      const combinations: string[] = [];
      for (let i = 0; i < safeCount; i++) {
        const word1 = pool[Math.floor(Math.random() * pool.length)];
        const word2 = pool[Math.floor(Math.random() * pool.length)];
        combinations.push(`${word1} ${word2}`);
      }
      return combinations;
    }

    // Shuffle and pick unique words
    const shuffled = [...new Set(pool)].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, safeCount);
  }
}

export const wordManager = new WordManager();
