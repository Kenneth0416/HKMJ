// Domain Models

export type PlayerId = 0 | 1 | 2 | 3;

export enum Wind {
  East = "東",
  South = "南",
  West = "西",
  North = "北",
}

export interface Player {
  id: PlayerId;
  name: string;
  score: number; // Current chips balance
  wind: Wind; // Seat wind (門風) - fixed based on initial seating position
}

export enum WinType {
  SelfDraw = "自摸 (Self-Draw)",
  Discard = "出衝 (Discard)",
  Draw = "流局 (Draw)",
}

export interface RuleConfig {
  minFaan: number; // Minimum faan to win (e.g., 3)
  maxFaan: number; // Cap (e.g., 8 or 10)
  dealerDouble: boolean; // Does dealer win/lose double?
  discarderPaysAll: boolean; // True: Shooter pays everything. False: Shooter pays base, others pay base.
  unitPrice: number; // The value of 1 Faan (Base chip value). Formula: unitPrice * 2^(faan-1)
  presetId?: number; // Index of the selected preset, undefined means custom
}

export interface RoundResult {
  id: string;
  timestamp: number;
  type: 'CALCULATED' | 'MANUAL'; // Mode A or Mode B

  // For Display/History
  winnerId: PlayerId | null; // Null if Draw
  loserId: PlayerId | null; // Null if Self-Draw or Draw
  faan?: number;

  // The crucial accounting part
  deltas: Record<PlayerId, number>; // Must sum to 0
  note?: string;
}

// Round wind (圈風) - represents which round of the game
export type RoundWind = 'EAST' | 'SOUTH' | 'WEST' | 'NORTH';

export interface GameSession {
  players: Record<PlayerId, Player>;
  rounds: RoundResult[];
  dealerId: PlayerId; // Who is currently East (dealer)
  rules: RuleConfig;
  // New fields for round tracking
  roundWind: RoundWind; // Current round wind (東圈/南圈/西圈/北圈)
  dealerCount: number; // How many times current dealer has been dealer (for continuous East)
}