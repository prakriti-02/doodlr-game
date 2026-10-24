export interface PlayerData {
  id: string;
  sessionToken: string;
  name: string;
  avatar: string;
  score: number;
  roundScore: number;
  isHost: boolean;
  hasGuessed: boolean;
  isConnected: boolean;
}

export class Player {
  public id: string; // current socket ID
  public sessionToken: string; // persistent player session token across reconnects
  public name: string;
  public avatar: string;
  public score: number = 0;
  public roundScore: number = 0;
  public isHost: boolean = false;
  public hasGuessed: boolean = false;
  public guessTimeRemaining: number = 0;
  public isConnected: boolean = true;

  constructor(
    id: string,
    name: string,
    avatar: string = '🎨',
    isHost: boolean = false,
    sessionToken?: string
  ) {
    this.id = id;
    this.sessionToken = sessionToken || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.name = name.trim().slice(0, 20) || 'Player';
    this.avatar = avatar || '🎨';
    this.isHost = isHost;
  }

  public resetRound(): void {
    this.hasGuessed = false;
    this.roundScore = 0;
    this.guessTimeRemaining = 0;
  }

  public addScore(points: number): void {
    this.roundScore += points;
    this.score += points;
  }

  public toJSON(): PlayerData {
    return {
      id: this.id,
      sessionToken: this.sessionToken,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      roundScore: this.roundScore,
      isHost: this.isHost,
      hasGuessed: this.hasGuessed,
      isConnected: this.isConnected,
    };
  }
}
