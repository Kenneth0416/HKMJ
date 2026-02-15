import { PlayerId, RuleConfig, WinType } from '../types';

/**
 * Calculates the chip value for a given faan based on standard HK exponential rules.
 * Formula: unitPrice * 2^(max(0, faan - 1))
 * Note: 0 faan and 1 faan usually have the same base value in this formula logic.
 */
export const calculateBaseValue = (faan: number, unitPrice: number): number => {
    // Effective power: 
    // 0 Faan -> 2^0 = 1
    // 1 Faan -> 2^0 = 1
    // 2 Faan -> 2^1 = 2
    // 3 Faan -> 2^2 = 4
    // 4 Faan -> 2^3 = 8
    const power = Math.max(0, faan - 1);
    return unitPrice * Math.pow(2, power);
};

/**
 * Core scoring calculation for Mode A (Calculator)
 */
export const calculateRoundDeltas = (
  rules: RuleConfig,
  winType: WinType,
  winnerId: PlayerId,
  loserId: PlayerId | null, // The discarder. Null if SelfDraw.
  rawFaan: number,
  dealerId: PlayerId
): Record<PlayerId, number> => {
  const deltas: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  if (winType === WinType.Draw) {
    return deltas as Record<PlayerId, number>;
  }

  // 1. Cap Faan
  let effectiveFaan = Math.max(0, rawFaan);
  if (effectiveFaan < rules.minFaan) return deltas as Record<PlayerId, number>; // Should be validated in UI, but safety check
  if (effectiveFaan > rules.maxFaan) effectiveFaan = rules.maxFaan;

  // 2. Get Base Value (籌碼) via Formula
  const baseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

  // 3. Dealer Multiplier Logic (Optional)
  // If dealerDouble is ON, and Winner OR Payer is dealer, the stakes double.
  // Note: Standard HKMJ often doesn't do "Dealer Double" globally, but specific tables do.
  let multiplier = 1;
  if (rules.dealerDouble) {
    const isWinnerDealer = winnerId === dealerId;
    if (winType === WinType.SelfDraw) {
      // In self draw, if dealer wins, everyone pays double? Or if dealer pays, they pay double?
      // Simplified: If winner is dealer, score is double.
      if (isWinnerDealer) multiplier = 2;
    } else {
       // Discard
       const isLoserDealer = loserId === dealerId;
       if (isWinnerDealer || isLoserDealer) multiplier = 2;
    }
  }

  const finalValue = baseValue * multiplier;

  // 4. Distribute
  if (winType === WinType.SelfDraw) {
    // Winner gets from 3 others
    // Standard HK: Self-draw means every other player pays the calculated value.
    let totalWin = 0;
    ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
      if (pid !== winnerId) {
        deltas[pid] = -finalValue;
        totalWin += finalValue;
      }
    });
    deltas[winnerId] = totalWin;

  } else if (winType === WinType.Discard && loserId !== null) {
    // Winner gets from Loser
    if (rules.discarderPaysAll) {
      // "Baau" - Shooter pays for all 3 players' potential loss
      // Winner gets 3x Base (equivalent to Self-Draw total).
      const totalWin = finalValue * 3; 
      deltas[loserId] = -totalWin;
      deltas[winnerId] = totalWin;
    } else {
      // "Half Pay" or Chicken style: Shooter pays, others pay nothing.
      // Typically "Discard" win is treated as 1x.
      const factor = 1;
      const totalWin = finalValue * factor;
      
      deltas[loserId] = -totalWin;
      deltas[winnerId] = totalWin;
    }
  }

  return deltas as Record<PlayerId, number>;
};