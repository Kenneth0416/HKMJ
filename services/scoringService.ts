import { PlayerId, RuleConfig, WinType, HorseConfig } from '../types';

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
 * Calculate horse bonus and effective faan
 * Returns the bonus value from horses and the adjusted effective faan
 */
export const calculateHorseBonus = (
  horseConfig: HorseConfig,
  horseHits: number,
  rawFaan: number,
  rules: RuleConfig
): { effectiveFaan: number; horseBonusValue: number } => {
  if (!horseConfig.enabled || horseHits === 0) {
    return { effectiveFaan: rawFaan, horseBonusValue: 0 };
  }

  const originalBaseValue = calculateBaseValue(rawFaan, rules.unitPrice);
  let effectiveFaan = rawFaan;

  switch (horseConfig.payoutMode) {
    case 'ADD_FAAN':
      // Each horse adds perHorseValue faan
      effectiveFaan = rawFaan + (horseHits * horseConfig.perHorseValue);
      if (horseConfig.capApplies) {
        effectiveFaan = Math.min(effectiveFaan, rules.maxFaan);
      }
      break;
    case 'MULTIPLIER':
      // Horse hits multiply the final value (calculated below)
      effectiveFaan = rawFaan;
      if (horseConfig.capApplies) {
        effectiveFaan = Math.min(effectiveFaan, rules.maxFaan);
      }
      break;
    case 'ADD_UNITS':
      // Each horse adds perHorseValue units directly
      effectiveFaan = rawFaan;
      if (horseConfig.capApplies) {
        effectiveFaan = Math.min(effectiveFaan, rules.maxFaan);
      }
      break;
  }

  const newBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

  let horseBonusValue = 0;
  switch (horseConfig.payoutMode) {
    case 'ADD_FAAN':
      horseBonusValue = newBaseValue - originalBaseValue;
      break;
    case 'MULTIPLIER':
      horseBonusValue = originalBaseValue * (horseConfig.perHorseValue * horseHits) - originalBaseValue;
      break;
    case 'ADD_UNITS':
      horseBonusValue = horseConfig.perHorseValue * horseHits * rules.unitPrice;
      break;
  }

  return { effectiveFaan, horseBonusValue };
};

/**
 * Core scoring calculation for Mode A (Calculator)
 * Now supports horse (跑馬仔) bonus calculation
 */
export const calculateRoundDeltas = (
  rules: RuleConfig,
  winType: WinType,
  winnerId: PlayerId,
  loserId: PlayerId | null, // The discarder. Null if SelfDraw.
  rawFaan: number,
  dealerId: PlayerId,
  horseHits?: number  // Number of horses hit (跑馬仔)
): Record<PlayerId, number> => {
  const deltas: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  if (winType === WinType.Draw) {
    return deltas as Record<PlayerId, number>;
  }

  // 1. Cap Faan
  let effectiveFaan = Math.max(0, rawFaan);
  if (effectiveFaan < rules.minFaan) return deltas as Record<PlayerId, number>; // Should be validated in UI, but safety check
  if (effectiveFaan > rules.maxFaan) effectiveFaan = rules.maxFaan;

  // 2. Calculate horse bonus if enabled
  let horseBonusValue = 0;
  const horseConfig = rules.horse;

  if (horseConfig?.enabled && horseHits && horseHits > 0) {
    const horseResult = calculateHorseBonus(horseConfig, horseHits, rawFaan, rules);
    effectiveFaan = horseResult.effectiveFaan;
    horseBonusValue = horseResult.horseBonusValue;
  }

  // 3. Get Base Value (籌碼) via Formula
  const baseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

  // 4. Dealer Multiplier Logic (Optional)
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
  const finalHorseBonus = horseBonusValue * multiplier;

  // 5. Distribute
  if (winType === WinType.SelfDraw) {
    // Winner gets from 3 others
    // Standard HK: Self-draw means every other player pays the calculated value.
    let totalWin = 0;
    ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
      if (pid !== winnerId) {
        let playerPays = -finalValue;

        // Horse bonus distribution based on liability
        if (horseBonusValue > 0 && horseConfig) {
          switch (horseConfig.liability) {
            case 'ALL_PAY':
              // All three players split the horse bonus
              playerPays -= finalHorseBonus / 3;
              break;
            case 'SPLIT_PAY':
              // Same as ALL_PAY for self-draw
              playerPays -= finalHorseBonus / 3;
              break;
            case 'DISCARDER_PAYS':
              // For self-draw, all pay equally (no single discarder)
              playerPays -= finalHorseBonus / 3;
              break;
          }
        }

        deltas[pid] = playerPays;
        totalWin += -playerPays;
      }
    });
    deltas[winnerId] = totalWin;

  } else if (winType === WinType.Discard && loserId !== null) {
    // Winner gets from Loser
    if (rules.discarderPaysAll) {
      // "Baau" - Shooter pays for all 3 players' potential loss
      // Winner gets 3x Base (equivalent to Self-Draw total).
      const totalWin = finalValue * 3;
      let loserPays = -totalWin;

      // Horse bonus for discard
      if (horseBonusValue > 0 && horseConfig) {
        switch (horseConfig.liability) {
          case 'ALL_PAY':
            // All three players split the horse bonus
            // Winner gets horse bonus from all, discarder pays their share
            const allPayHorseBonus = finalHorseBonus;
            loserPays = -totalWin - allPayHorseBonus; // Discarder pays main + horse
            // Others also pay their share of horse bonus
            ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
              if (pid !== winnerId && pid !== loserId) {
                deltas[pid] = -finalHorseBonus / 3;
              }
            });
            deltas[loserId] = loserPays;
            deltas[winnerId] = totalWin + finalHorseBonus;
            return deltas as Record<PlayerId, number>;

          case 'DISCARDER_PAYS':
            // Discarder pays everything including horse bonus
            loserPays = -(totalWin + finalHorseBonus);
            break;

          case 'SPLIT_PAY':
            // Horse bonus split among all non-winners
            loserPays = -(totalWin + finalHorseBonus * 2/3);
            ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
              if (pid !== winnerId && pid !== loserId) {
                deltas[pid] = -finalHorseBonus / 3;
              }
            });
            deltas[loserId] = loserPays;
            deltas[winnerId] = totalWin + finalHorseBonus;
            return deltas as Record<PlayerId, number>;
        }
      }

      deltas[loserId] = loserPays;
      deltas[winnerId] = -loserPays;
    } else {
      // "Half Pay" or Chicken style: Shooter pays, others pay nothing.
      // Typically "Discard" win is treated as 1x.
      const factor = 1;
      const totalWin = finalValue * factor;

      let loserPays = -totalWin;

      // Horse bonus for discard (non-paysAll mode)
      if (horseBonusValue > 0 && horseConfig) {
        switch (horseConfig.liability) {
          case 'ALL_PAY':
            // All non-winners pay horse bonus equally
            loserPays -= finalHorseBonus / 3;
            ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
              if (pid !== winnerId && pid !== loserId) {
                deltas[pid] = -finalHorseBonus / 3;
              }
            });
            break;
          case 'DISCARDER_PAYS':
            loserPays -= finalHorseBonus;
            break;
          case 'SPLIT_PAY':
            loserPays -= finalHorseBonus / 3;
            ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
              if (pid !== winnerId && pid !== loserId) {
                deltas[pid] = -finalHorseBonus / 3;
              }
            });
            break;
        }
      }

      deltas[loserId] = loserPays;
      deltas[winnerId] = totalWin + (horseBonusValue > 0 ? finalHorseBonus : 0);
    }
  }

  return deltas as Record<PlayerId, number>;
};