export type GamePhase = 'LOBBY' | 'SELECTING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  roundScore: number;
  isHost: boolean;
  hasGuessed: boolean;
  isConnected: boolean;
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
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  avatar: string;
  text: string;
  type: 'chat' | 'system' | 'guess_correct' | 'close' | 'error' | 'wrong';
  hasGuessed?: boolean;
  timestamp: number;
}

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
