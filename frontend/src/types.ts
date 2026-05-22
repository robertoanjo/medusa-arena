export type CardType = 'SHIELD' | 'VEIL' | 'MEDUSA';
export type Screen = 'home' | 'waiting' | 'playing' | 'gameover';
export type GamePhase = 'choosing' | 'revealing';

export interface PlayerStats {
  name: string;
  wins: number;
  losses: number;
  points: number;
}

export interface GameStartData {
  gameId: string;
  myId: string;
  myName: string;
  opponentId: string;
  opponentName: string;
  myEnergy: number;
  opponentEnergy: number;
  myStats: PlayerStats;
  opponentStats: PlayerStats;
}

export interface RoundResultData {
  choices: Record<string, CardType>;
  result: 'TIE' | 'A' | 'B';
  winnerId: string | null;
  loserId: string | null;
  energies: Record<string, number>;
  autoChoice: Record<string, boolean>;
}

export interface GameOverData {
  winnerId: string;
  loserId: string;
  winnerName: string;
  loserName: string;
  stats: Record<string, PlayerStats>;
}

export interface GameState {
  gameId: string;
  myId: string;
  myName: string;
  opponentName: string;
  myEnergy: number;
  opponentEnergy: number;
  phase: GamePhase;
  myChoice: CardType | null;
  opponentChoice: CardType | null;
  turnNumber: number;
  lastWinnerId: string | null;
  lastLoserId: string | null;
  isTie: boolean;
}
