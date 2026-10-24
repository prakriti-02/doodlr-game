import { Player, PlayerData } from './Player.js';
import { Game, GameCallbacks, RoundInsights } from './Game.js';

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeData {
  id: string;
  color: string;
  size: number;
  isEraser: boolean;
  points: StrokePoint[];
  timestamp: number; // millisecond offset from round start
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordChoices: number;
  hints: number;
  wordMode: 'normal' | 'hidden' | 'combination';
  category: string;
  isPrivate: boolean;
  customWords: string[];
}

export class Room {
  public id: string;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public settings: RoomSettings;
  public game: Game;

  public strokes: StrokeData[] = [];
  public roundReplays: Map<number, { word: string; strokes: StrokeData[] }> = new Map();
  public roundStartTime: number = 0;
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(id: string, hostPlayer: Player, settings?: Partial<RoomSettings>, callbacks?: Partial<GameCallbacks>) {
    this.id = id;
    this.hostId = hostPlayer.id;
    this.players.set(hostPlayer.id, hostPlayer);

    this.settings = {
      maxPlayers: Math.min(Math.max(settings?.maxPlayers ?? 8, 2), 20),
      rounds: Math.min(Math.max(settings?.rounds ?? 3, 2), 10),
      drawTime: Math.min(Math.max(settings?.drawTime ?? 80, 15), 240),
      wordChoices: Math.min(Math.max(settings?.wordChoices ?? 3, 1), 5),
      hints: Math.min(Math.max(settings?.hints ?? 2, 0), 5),
      wordMode: settings?.wordMode || 'normal',
      category: settings?.category || 'all',
      isPrivate: settings?.isPrivate ?? false,
      customWords: settings?.customWords || [],
    };

    const defaultCallbacks: GameCallbacks = {
      onTimerTick: () => {},
      onHintUpdate: () => {},
      onRoundStart: () => {},
      onWordChosen: () => {},
      onRoundEnd: () => {},
      onGameOver: () => {},
      ...callbacks,
    };

    this.game = new Game({
      ...defaultCallbacks,
      onRoundStart: (drawerId, wordOptions, drawTime, round, totalRounds) => {
        this.clearStrokes();
        this.roundStartTime = Date.now();
        defaultCallbacks.onRoundStart(drawerId, wordOptions, drawTime, round, totalRounds);
      },
      onRoundEnd: (insights, scores, nextDrawerId) => {
        // Save round replay for Priority 1: Round Replay feature!
        this.roundReplays.set(this.game.currentRound, {
          word: insights.word,
          strokes: [...this.strokes],
        });
        defaultCallbacks.onRoundEnd(insights, scores, nextDrawerId);
      },
    });
  }

  public addPlayer(player: Player): { success: boolean; error?: string } {
    if (this.players.size >= this.settings.maxPlayers) {
      return { success: false, error: 'Room is full (max ' + this.settings.maxPlayers + ' players)' };
    }

    // Check duplicate names among active players
    const existing = Array.from(this.players.values()).find(
      p => p.name.toLowerCase() === player.name.toLowerCase() && p.isConnected && p.sessionToken !== player.sessionToken
    );
    if (existing) {
      return { success: false, error: 'A player with this name is already in the room' };
    }

    this.players.set(player.id, player);
    return { success: true };
  }

  public setDisconnectTimer(playerId: string, callback: () => void, delayMs = 5000): void {
    this.clearDisconnectTimer(playerId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      callback();
    }, delayMs);
    this.disconnectTimers.set(playerId, timer);
  }

  public clearDisconnectTimer(playerId: string): void {
    const existing = this.disconnectTimers.get(playerId);
    if (existing) {
      clearTimeout(existing);
      this.disconnectTimers.delete(playerId);
    }
  }

  public reconnectPlayer(sessionToken: string, newSocketId: string): Player | null {
    if (!sessionToken) return null;

    // Find player by sessionToken
    let targetPlayer: Player | undefined;
    let oldSocketId: string | undefined;

    for (const [id, p] of this.players.entries()) {
      if (p.sessionToken === sessionToken) {
        targetPlayer = p;
        oldSocketId = id;
        break;
      }
    }

    if (!targetPlayer || !oldSocketId) return null;

    // Clear any pending disconnect timer
    this.clearDisconnectTimer(oldSocketId);

    // Re-key player in map with new socket ID
    this.players.delete(oldSocketId);
    targetPlayer.id = newSocketId;
    targetPlayer.isConnected = true;
    this.players.set(newSocketId, targetPlayer);

    // Update hostId if player was host
    if (this.hostId === oldSocketId) {
      this.hostId = newSocketId;
    }

    // Update drawerOrder in Game if player was in drawer queue
    const drawerIdx = this.game.drawerOrder.indexOf(oldSocketId);
    if (drawerIdx !== -1) {
      this.game.drawerOrder[drawerIdx] = newSocketId;
    }

    return targetPlayer;
  }

  public removePlayer(playerId: string): { remainingCount: number; newHostId?: string } {
    this.clearDisconnectTimer(playerId);

    const player = this.players.get(playerId);
    if (!player) return { remainingCount: this.players.size };

    this.players.delete(playerId);

    // If host left, transfer host role to the next connected player
    let newHostId: string | undefined = undefined;
    if (playerId === this.hostId && this.players.size > 0) {
      const nextHost = Array.from(this.players.values()).find(p => p.isConnected);
      if (nextHost) {
        nextHost.isHost = true;
        this.hostId = nextHost.id;
        newHostId = nextHost.id;
      }
    }

    // If active drawer left during drawing phase, advance turn!
    if (this.game.phase === 'DRAWING' || this.game.phase === 'SELECTING_WORD') {
      if (this.game.currentDrawerId === playerId) {
        this.game.nextTurn(this.getAllPlayers());
      }
    }

    return { remainingCount: this.players.size, newHostId };
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySession(sessionToken: string): Player | undefined {
    return Array.from(this.players.values()).find(p => p.sessionToken === sessionToken);
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public getPlayersData(): PlayerData[] {
    return this.getAllPlayers().map(p => p.toJSON());
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    if (newSettings.maxPlayers !== undefined) {
      this.settings.maxPlayers = Math.min(Math.max(newSettings.maxPlayers, 2), 20);
    }
    if (newSettings.rounds !== undefined) {
      this.settings.rounds = Math.min(Math.max(newSettings.rounds, 2), 10);
    }
    if (newSettings.drawTime !== undefined) {
      this.settings.drawTime = Math.min(Math.max(newSettings.drawTime, 15), 240);
    }
    if (newSettings.wordChoices !== undefined) {
      this.settings.wordChoices = Math.min(Math.max(newSettings.wordChoices, 1), 5);
    }
    if (newSettings.hints !== undefined) {
      this.settings.hints = Math.min(Math.max(newSettings.hints, 0), 5);
    }
    if (newSettings.wordMode !== undefined) {
      this.settings.wordMode = newSettings.wordMode;
    }
    if (newSettings.category !== undefined) {
      this.settings.category = newSettings.category;
    }
    if (newSettings.isPrivate !== undefined) {
      this.settings.isPrivate = newSettings.isPrivate;
    }
    if (newSettings.customWords !== undefined) {
      this.settings.customWords = newSettings.customWords;
    }
  }

  public addStroke(stroke: StrokeData): void {
    this.strokes.push(stroke);
  }

  public undoStroke(): StrokeData | undefined {
    return this.strokes.pop();
  }

  public clearStrokes(): void {
    this.strokes = [];
  }

  public canStartGame(): { ok: boolean; reason?: string } {
    if (this.game.phase !== 'LOBBY' && this.game.phase !== 'GAME_OVER') {
      return { ok: false, reason: 'Game is already in progress' };
    }
    const connectedCount = this.getAllPlayers().filter(p => p.isConnected).length;
    if (connectedCount < 2) {
      return { ok: false, reason: 'Need at least 2 connected players to start' };
    }
    return { ok: true };
  }

  public getRoundReplay(round?: number): StrokeData[] {
    const targetRound = round ?? this.game.currentRound;
    return this.roundReplays.get(targetRound)?.strokes || [];
  }

  public destroy(): void {
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.game.clearTimer();
    this.strokes = [];
    this.roundReplays.clear();
    this.players.clear();
  }
}
