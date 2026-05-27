export type CardType  = 'SHIELD' | 'VEIL' | 'MEDUSA';
export type Screen    = 'home' | 'waiting' | 'playing' | 'gameover' | 'profile' | 'verify-email';
export type GamePhase = 'choosing' | 'revealing';

export interface PlayerStats {
  name:   string;
  wins:   number;
  losses: number;
  points: number;
}

export interface PlayerProfile extends PlayerStats {
  email:          string;
  real_name:      string | null;
  email_verified: boolean;
  rank?:          number;
}

export interface GameStartPayload {
  gameId:        string;
  myName:        string;
  opponentName:  string;
  myEnergy:      number;
  opponentEnergy: number;
}

export interface RoundResultPayload {
  choices:    Record<string, CardType>;
  result:     'TIE' | 'A' | 'B';
  winnerName: string | null;
  loserName:  string | null;
  energies:   Record<string, number>;
}

export interface GameOverPayload {
  winnerName: string;
  loserName:  string;
  forfeit?:   boolean;
  stats:      Record<string, PlayerStats>;
}

export interface GameState {
  gameId:         string;
  myName:         string;
  opponentName:   string;
  myEnergy:       number;
  opponentEnergy: number;
  phase:          GamePhase;
  myChoice:       CardType | null;
  opponentChoice: CardType | null;
  turnNumber:     number;
  lastWinnerName: string | null;
  lastLoserName:  string | null;
  isTie:          boolean;
}
