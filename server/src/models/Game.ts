import { Player } from './Player.js';
import { wordManager } from '../managers/WordManager.js';
import { generateInitialHint, revealLetters } from '../utils/hintGenerator.js';

export type GamePhase = 'LOBBY' | 'SELECTING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export interface CorrectGuesserInfo {
  id: string;
  name: string;
  timeTaken: number;
  points: number;
}

export interface RoundInsights {
  word: string;
  correctGuessers: CorrectGuesserInfo[];
  drawerName: string;
  drawerPoints: number;
  timeTaken: number;
  topScorer: { name: string; points: number } | null;
}

export interface GameCallbacks {
  onTimerTick: (timeLeft: number) => void;
  onHintUpdate: (hint: string) => void;
  onRoundStart: (drawerId: string, wordOptions: string[], drawTime: number, round: number, totalRounds: number) => void;
  onWordChosen: (drawerId: string, hint: string, drawTime: number) => void;
  onRoundEnd: (insights: RoundInsights, scores: Record<string, number>, nextDrawerId: string | null) => void;
  onGameOver: (winner: Player, leaderboard: Player[]) => void;
}

export class Game {
  public phase: GamePhase = 'LOBBY';
  public currentRound: number = 0;
  public totalRounds: number = 3;
  public drawTime: number = 80;
  public wordChoicesCount: number = 3;
  public hintCount: number = 2;
  public wordMode: 'normal' | 'hidden' | 'combination' = 'normal';
  public category: string = 'all';
  public customWords: string[] = [];

  public drawerOrder: string[] = [];
  public currentDrawerIndex: number = -1;
  public currentWord: string = '';
  public currentHint: string = '';
  public wordOptions: string[] = [];

  public timeLeft: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private roundStartTime: number = 0;
  private hintsGiven: number = 0;

  public correctGuessers: CorrectGuesserInfo[] = [];
  public drawerBonus: number = 0;

  private callbacks: GameCallbacks;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
  }

  public get currentDrawerId(): string | null {
    if (this.currentDrawerIndex >= 0 && this.currentDrawerIndex < this.drawerOrder.length) {
      return this.drawerOrder[this.currentDrawerIndex];
    }
    return null;
  }

  /**
   * Initializes and starts a new game.
   */
  public start(players: Player[], settings: {
    rounds: number;
    drawTime: number;
    wordChoices: number;
    hints: number;
    wordMode: 'normal' | 'hidden' | 'combination';
    category: string;
    customWords: string[];
  }): void {
    this.totalRounds = settings.rounds;
    this.drawTime = settings.drawTime;
    this.wordChoicesCount = settings.wordChoices;
    this.hintCount = settings.hints;
    this.wordMode = settings.wordMode;
    this.category = settings.category;
    this.customWords = settings.customWords;

    // Reset all player scores
    players.forEach(p => {
      p.score = 0;
      p.resetRound();
    });

    // Shuffle drawer order
    this.drawerOrder = players.filter(p => p.isConnected).map(p => p.id).sort(() => 0.5 - Math.random());
    this.currentDrawerIndex = -1;
    this.currentRound = 1;

    this.nextTurn(players);
  }

  /**
   * Moves to the next drawer's turn, or advances the round.
   */
  public nextTurn(players: Player[]): void {
    this.clearTimer();

    // Reset round scores & states
    players.forEach(p => p.resetRound());
    this.correctGuessers = [];
    this.drawerBonus = 0;
    this.hintsGiven = 0;

    // Advance drawer index
    this.currentDrawerIndex++;

    // Check if full cycle of drawers completed
    if (this.currentDrawerIndex >= this.drawerOrder.length) {
      this.currentDrawerIndex = 0;
      this.currentRound++;
    }

    // Check if game is over
    if (this.currentRound > this.totalRounds) {
      this.endGame(players);
      return;
    }

    // Skip disconnected players
    const drawerId = this.currentDrawerId;
    const drawer = players.find(p => p.id === drawerId);
    if (!drawer || !drawer.isConnected) {
      // If no valid players left, game over
      const activePlayers = players.filter(p => p.isConnected);
      if (activePlayers.length < 2) {
        this.endGame(players);
        return;
      }
      this.nextTurn(players);
      return;
    }

    // Start word selection phase
    this.phase = 'SELECTING_WORD';
    this.wordOptions = wordManager.getRandomChoices(
      this.wordChoicesCount,
      this.category,
      this.customWords,
      this.wordMode
    );

    // 15 seconds to choose a word
    this.timeLeft = 15;
    this.callbacks.onRoundStart(drawer.id, this.wordOptions, this.drawTime, this.currentRound, this.totalRounds);

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.callbacks.onTimerTick(this.timeLeft);

      if (this.timeLeft <= 0) {
        this.clearTimer();
        // Auto-select first word if drawer didn't choose
        const chosen = this.wordOptions[0] || 'apple';
        this.selectWord(chosen, players);
      }
    }, 1000);
  }

  /**
   * Called when drawer picks a word (or auto-selected on timeout).
   */
  public selectWord(word: string, players: Player[]): void {
    if (this.phase !== 'SELECTING_WORD') return;

    this.clearTimer();
    this.currentWord = word;
    this.currentHint = generateInitialHint(word, this.wordMode);
    this.phase = 'DRAWING';
    this.timeLeft = this.drawTime;
    this.roundStartTime = Date.now();
    this.hintsGiven = 0;

    const drawerId = this.currentDrawerId;
    if (drawerId) {
      this.callbacks.onWordChosen(drawerId, this.currentHint, this.drawTime);
    }

    // Main drawing countdown timer
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.callbacks.onTimerTick(this.timeLeft);

      // Check if progressive hint should be revealed
      this.checkProgressiveHints();

      if (this.timeLeft <= 0) {
        this.endRound(players);
      }
    }, 1000);
  }

  /**
   * Progressively reveals hints if hints are enabled and enough time has elapsed.
   */
  private checkProgressiveHints(): void {
    if (this.hintCount <= 0 || this.wordMode === 'hidden') return;

    // Distribute hints at fractions of drawTime: e.g. at 60%, 40%, 20%
    const hintThresholds = [];
    for (let i = 1; i <= this.hintCount; i++) {
      hintThresholds.push(Math.floor((this.drawTime * (this.hintCount - i + 1)) / (this.hintCount + 1)));
    }

    for (let i = 0; i < hintThresholds.length; i++) {
      if (this.timeLeft <= hintThresholds[i] && this.hintsGiven <= i) {
        this.currentHint = revealLetters(this.currentWord, this.currentHint, 1);
        this.hintsGiven++;
        this.callbacks.onHintUpdate(this.currentHint);
        break;
      }
    }
  }

  /**
   * Submits a guess for a player. Returns score if correct, or 0.
   */
  public handleCorrectGuess(player: Player, players: Player[]): number {
    if (this.phase !== 'DRAWING') return 0;
    if (player.id === this.currentDrawerId) return 0; // Drawer cannot guess
    if (player.hasGuessed) return 0; // Already guessed

    player.hasGuessed = true;
    player.guessTimeRemaining = this.timeLeft;

    // Scoring: Speed bonus up to 500 points
    // First guesser gets bonus; later guessers get slightly less
    const timeFraction = Math.max(0.1, this.timeLeft / this.drawTime);
    const guessRankBonus = Math.max(0, 100 - this.correctGuessers.length * 20);
    const points = Math.round(200 + 200 * timeFraction + guessRankBonus);

    player.addScore(points);

    // Drawer earns 50 points per correct guess
    const drawer = players.find(p => p.id === this.currentDrawerId);
    if (drawer) {
      const drawerPts = 50;
      drawer.addScore(drawerPts);
      this.drawerBonus += drawerPts;
    }

    const timeTaken = Math.max(1, Math.round((Date.now() - this.roundStartTime) / 1000));
    this.correctGuessers.push({
      id: player.id,
      name: player.name,
      timeTaken,
      points,
    });

    // Check if all eligible guessers have guessed
    const eligibleGuessers = players.filter(p => p.isConnected && p.id !== this.currentDrawerId);
    const allGuessed = eligibleGuessers.length > 0 && eligibleGuessers.every(p => p.hasGuessed);

    if (allGuessed) {
      // Early round end
      setTimeout(() => {
        this.endRound(players);
      }, 1000);
    }

    return points;
  }

  /**
   * Ends the drawing round, broadcasts round insights, and schedules next turn.
   */
  public endRound(players: Player[]): void {
    if (this.phase === 'ROUND_END' || this.phase === 'GAME_OVER') return;

    this.clearTimer();
    this.phase = 'ROUND_END';

    const drawer = players.find(p => p.id === this.currentDrawerId);
    const timeTaken = Math.max(1, Math.round((Date.now() - this.roundStartTime) / 1000));

    // Calculate top scorer of this round
    let topScorer: { name: string; points: number } | null = null;
    let maxPts = 0;
    for (const p of players) {
      if (p.roundScore > maxPts) {
        maxPts = p.roundScore;
        topScorer = { name: p.name, points: p.roundScore };
      }
    }

    const insights: RoundInsights = {
      word: this.currentWord,
      correctGuessers: this.correctGuessers,
      drawerName: drawer ? drawer.name : 'Unknown',
      drawerPoints: this.drawerBonus,
      timeTaken,
      topScorer,
    };

    const scores: Record<string, number> = {};
    players.forEach(p => {
      scores[p.id] = p.score;
    });

    // Find next drawer preview
    let nextDrawerId: string | null = null;
    const nextIdx = this.currentDrawerIndex + 1;
    if (nextIdx < this.drawerOrder.length) {
      nextDrawerId = this.drawerOrder[nextIdx];
    } else if (this.currentRound < this.totalRounds) {
      nextDrawerId = this.drawerOrder[0];
    }

    this.callbacks.onRoundEnd(insights, scores, nextDrawerId);

    // Wait 5 seconds to show insights and replay, then move to next turn
    this.timer = setTimeout(() => {
      this.nextTurn(players);
    }, 6000);
  }

  /**
   * Finishes the game, calculates final rankings, and invokes callback.
   */
  public endGame(players: Player[]): void {
    this.clearTimer();
    this.phase = 'GAME_OVER';

    const leaderboard = [...players].sort((a, b) => b.score - a.score);
    const winner = leaderboard[0] || players[0];

    this.callbacks.onGameOver(winner, leaderboard);
  }

  public clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
