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
 * Calculate horse bonus based on payout mode
 * Returns the total horse bonus amount to be distributed
 */
export const calculateHorseBonus = (
  horseConfig: HorseConfig,
  horseHits: number,
  rawFaan: number,
  rules: RuleConfig
): { effectiveFaan: number; horseBonusTotal: number } => {
  if (!horseConfig.enabled || horseHits === 0) {
    return { effectiveFaan: rawFaan, horseBonusTotal: 0 };
  }

  const originalBaseValue = calculateBaseValue(rawFaan, rules.unitPrice);
  let effectiveFaan = rawFaan;
  let horseBonusTotal = 0;

  switch (horseConfig.payoutMode) {
    case 'ADD_FAAN':
      // 每中一馬加 N 番，計算新的籌碼值
      effectiveFaan = rawFaan + (horseHits * horseConfig.perHorseValue);
      if (horseConfig.capApplies) {
        effectiveFaan = Math.min(effectiveFaan, rules.maxFaan);
      }
      const newBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);
      horseBonusTotal = newBaseValue - originalBaseValue;
      break;

    case 'MULTIPLIER':
      // 每中一馬乘 N 倍
      if (horseConfig.capApplies && rawFaan > rules.maxFaan) {
        effectiveFaan = rules.maxFaan;
      }
      const cappedBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);
      horseBonusTotal = cappedBaseValue * (horseConfig.perHorseValue * horseHits) - cappedBaseValue;
      break;

    case 'ADD_UNITS':
      // 每中一馬加 N 底 (unitPrice)
      horseBonusTotal = horseConfig.perHorseValue * horseHits * rules.unitPrice;
      break;
  }

  return { effectiveFaan, horseBonusTotal };
};

/**
 * Core scoring calculation for Mode A (Calculator)
 * Supports horse (跑馬仔) bonus calculation with multiple payout modes
 */
export const calculateRoundDeltas = (
  rules: RuleConfig,
  winType: WinType,
  winnerId: PlayerId,
  loserId: PlayerId | null,
  rawFaan: number,
  dealerId: PlayerId,
  horseHits?: number
): Record<PlayerId, number> => {
  const deltas: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  if (winType === WinType.Draw) {
    return deltas as Record<PlayerId, number>;
  }

  // 1. Calculate base faan (with cap)
  let effectiveFaan = Math.max(0, rawFaan);
  if (effectiveFaan < rules.minFaan) return deltas as Record<PlayerId, number>;
  if (effectiveFaan > rules.maxFaan) effectiveFaan = rules.maxFaan;

  // 2. Get original base value before horse adjustment
  const originalBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

  // 3. Calculate horse bonus if enabled
  const horseConfig = rules.horse;
  let horseBonusPerPlayer = 0;  // 每家額外付的馬獎

  if (horseConfig?.enabled && horseHits && horseHits > 0) {
    switch (horseConfig.payoutMode) {
      case 'ADD_FAAN': {
        // 加番模式：馬直接加到番數上，不用額外計算馬獎
        // 因為 effectiveFaan 會增加，baseValue 自然增加
        let newFaan = rawFaan + (horseHits * horseConfig.perHorseValue);
        if (horseConfig.capApplies) {
          newFaan = Math.min(newFaan, rules.maxFaan);
        }
        effectiveFaan = newFaan;
        // ADD_FAAN 模式下 horseBonusPerPlayer = 0，因為已經體現在番數增加上了
        horseBonusPerPlayer = 0;
        break;
      }
      case 'MULTIPLIER': {
        // 倍數模式：baseValue 乘以倍數
        const multiplier = horseConfig.perHorseValue * horseHits;
        horseBonusPerPlayer = originalBaseValue * (multiplier - 1);
        break;
      }
      case 'ADD_UNITS': {
        // 加籌碼模式：每中一馬加 N 底
        horseBonusPerPlayer = horseConfig.perHorseValue * horseHits * rules.unitPrice;
        break;
      }
    }
  }

  // 4. Get final Base Value via Formula (with horse-adjusted faan for ADD_FAAN mode)
  const baseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

  // 5. Dealer Multiplier Logic
  let dealerMultiplier = 1;
  if (rules.dealerDouble) {
    const isWinnerDealer = winnerId === dealerId;
    if (winType === WinType.SelfDraw) {
      if (isWinnerDealer) dealerMultiplier = 2;
    } else {
      const isLoserDealer = loserId === dealerId;
      if (isWinnerDealer || isLoserDealer) dealerMultiplier = 2;
    }
  }

  const finalBaseValue = baseValue * dealerMultiplier;
  const finalHorseBonus = horseBonusPerPlayer * dealerMultiplier;

  // 6. Distribute based on win type and liability
  if (winType === WinType.SelfDraw) {
    let totalWin = 0;

    ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
      if (pid !== winnerId) {
        let playerPays = -finalBaseValue;

        // Add horse bonus based on liability (for non-ADD_FAAN modes)
        if (horseBonusPerPlayer > 0 && horseConfig && horseConfig.payoutMode !== 'ADD_FAAN') {
          switch (horseConfig.liability) {
            case 'ALL_PAY':
              // 三家付：每家固定付 horseBonusPerPlayer（不是除3）
              playerPays -= finalHorseBonus;
              break;
            case 'SPLIT_PAY':
              // 分攤：總額除3
              playerPays -= finalHorseBonus / 3;
              break;
            case 'DISCARDER_PAYS':
              // 自摸時等同分攤
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
    const loserPays = -finalBaseValue;
    let winnerGets = finalBaseValue;

    // Add horse bonus based on liability (for non-ADD_FAAN modes)
    if (horseBonusPerPlayer > 0 && horseConfig && horseConfig.payoutMode !== 'ADD_FAAN') {
      switch (horseConfig.liability) {
        case 'ALL_PAY':
          // 三家付：每家固定付 horseBonusPerPlayer
          ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
            if (pid !== winnerId) {
              if (pid === loserId) {
                deltas[pid] = loserPays - finalHorseBonus;
              } else {
                deltas[pid] = -finalHorseBonus;
              }
            }
          });
          winnerGets += finalHorseBonus * 3;
          deltas[winnerId] = winnerGets;
          return deltas as Record<PlayerId, number>;

        case 'DISCARDER_PAYS':
          // 出銃者付：出銃者包晒
          deltas[loserId] = loserPays - finalHorseBonus * 3;
          deltas[winnerId] = -deltas[loserId];
          return deltas as Record<PlayerId, number>;

        case 'SPLIT_PAY':
          // 分攤：總額除3
          ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
            if (pid !== winnerId) {
              if (pid === loserId) {
                deltas[pid] = loserPays - finalHorseBonus / 3;
              } else {
                deltas[pid] = -finalHorseBonus / 3;
              }
            }
          });
          winnerGets += finalHorseBonus;
          let totalFromLoser2 = -deltas[loserId];
          let totalFromOthers2 = 0;
          ([0, 1, 2, 3] as PlayerId[]).forEach((pid) => {
            if (pid !== winnerId && pid !== loserId) {
              totalFromOthers2 += -deltas[pid];
            }
          });
          deltas[winnerId] = totalFromLoser2 + totalFromOthers2;
          return deltas as Record<PlayerId, number>;
      }
    }

    // No horse bonus or ADD_FAAN mode (bonus already in baseValue)
    deltas[loserId] = loserPays;
    deltas[winnerId] = winnerGets;
  }

  return deltas as Record<PlayerId, number>;
};