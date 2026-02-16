/**
 * 測試：DISCARDER_PAYS + 自摸中馬的情況
 *
 * 問題描述：
 * 「出銃者付」(DISCARDER_PAYS) 責任模式下，自摸時應該如何處理馬獎？
 *
 * 當前代碼邏輯 (line 176-179):
 *   case 'DISCARDER_PAYS':
 *     // 自摸時等同分攤
 *     playerPays -= finalHorseBonus / 3;
 *     break;
 *
 * 問題：自摸時沒有「出銃者」，但 DISCARDER_PAYS 卻把馬獎分攤給三家
 *       這與「出銃者付」的語義不符
 */

console.log('='.repeat(80));
console.log('DISCARDER_PAYS + 自摸中馬 測試');
console.log('='.repeat(80));

const calculateBaseValue = (faan, unitPrice) => {
    const power = Math.max(0, faan - 1);
    return unitPrice * Math.pow(2, power);
};

const WinType = {
  SelfDraw: "自摸",
  Discard: "出衝",
  Draw: "流局",
};

const calculateRoundDeltas = (rules, winType, winnerId, loserId, rawFaan, dealerId, horseHits = 0) => {
  const deltas = { 0: 0, 1: 0, 2: 0, 3: 0 };
  if (winType === WinType.Draw) return deltas;

  let effectiveFaan = Math.max(0, rawFaan);
  if (effectiveFaan < rules.minFaan) return deltas;
  if (effectiveFaan > rules.maxFaan) effectiveFaan = rules.maxFaan;

  const originalBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);
  const horseConfig = rules.horse;
  let horseBonusPerPlayer = 0;
  let hasHorseBonus = false;

  if (horseConfig?.enabled && horseHits && horseHits > 0) {
    hasHorseBonus = true;
    switch (horseConfig.payoutMode) {
      case 'ADD_FAAN': {
        let newFaan = rawFaan + (horseHits * horseConfig.perHorseValue);
        if (horseConfig.capApplies) {
          newFaan = Math.min(newFaan, rules.maxFaan);
        }
        effectiveFaan = newFaan;
        const newBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);
        horseBonusPerPlayer = newBaseValue - originalBaseValue;
        break;
      }
      case 'MULTIPLIER': {
        const multiplier = 1 + (horseConfig.perHorseValue * horseHits);
        horseBonusPerPlayer = originalBaseValue * (multiplier - 1);
        break;
      }
      case 'ADD_UNITS': {
        horseBonusPerPlayer = horseConfig.perHorseValue * horseHits * rules.unitPrice;
        break;
      }
    }
  }

  const baseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

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

  if (winType === WinType.SelfDraw) {
    let totalWin = 0;
    [0, 1, 2, 3].forEach((pid) => {
      if (pid !== winnerId) {
        let playerPays = -finalBaseValue;

        if (hasHorseBonus && horseConfig) {
          switch (horseConfig.liability) {
            case 'ALL_PAY':
              playerPays -= finalHorseBonus;
              break;
            case 'SPLIT_PAY':
              playerPays -= finalHorseBonus / 3;
              break;
            case 'DISCARDER_PAYS':
              // 自摸時沒有出銃者，視同 ALL_PAY（三家各付全額馬獎）
              playerPays -= finalHorseBonus;
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

    if (hasHorseBonus && horseConfig) {
      switch (horseConfig.liability) {
        case 'ALL_PAY':
          deltas[loserId] = loserPays - finalHorseBonus;
          [0, 1, 2, 3].forEach((pid) => {
            if (pid !== winnerId && pid !== loserId) {
              deltas[pid] = -finalHorseBonus;
            }
          });
          deltas[winnerId] = finalBaseValue + finalHorseBonus * 3;
          return deltas;

        case 'DISCARDER_PAYS':
          // 出銃者包晒
          deltas[loserId] = loserPays - finalHorseBonus * 3;
          deltas[winnerId] = -deltas[loserId];
          return deltas;

        case 'SPLIT_PAY':
          const horseShare = finalHorseBonus / 3;
          [0, 1, 2, 3].forEach((pid) => {
            if (pid !== winnerId) {
              if (pid === loserId) {
                deltas[pid] = loserPays - horseShare;
              } else {
                deltas[pid] = -horseShare;
              }
            }
          });
          deltas[winnerId] = finalBaseValue + finalHorseBonus;
          return deltas;
      }
    }

    deltas[loserId] = loserPays;
    deltas[winnerId] = finalBaseValue;
  }

  return deltas;
};

// ============================================
// 測試用例
// ============================================

const rules = {
  minFaan: 0,
  maxFaan: 10,
  dealerDouble: true,
  discarderPaysAll: true,
  unitPrice: 10,
  horse: {
    enabled: true,
    horseCount: 4,
    payoutMode: 'MULTIPLIER',
    perHorseValue: 1,
    liability: 'DISCARDER_PAYS',
    capApplies: false,
  }
};

console.log('\n測試設定:');
console.log(`  - 10蚊底, 10番封頂, 莊家雙倍`);
console.log(`  - MULTIPLIER 模式, 每馬 ×1 倍`);
console.log(`  - liability: DISCARDER_PAYS (出銃者付)`);

const verifyZeroSum = (deltas) => {
  const sum = Object.values(deltas).reduce((a, b) => a + b, 0);
  return Math.abs(sum) < 0.01;
};

console.log('\n' + '='.repeat(60));
console.log('測試 1: 自摸 3番 中2馬 (DISCARDER_PAYS)');
console.log('='.repeat(60));

const selfDrawResult = calculateRoundDeltas(rules, WinType.SelfDraw, 1, null, 3, 0, 2);
console.log(`\n結果: [P0: ${selfDrawResult[0]}, P1: ${selfDrawResult[1]}, P2: ${selfDrawResult[2]}, P3: ${selfDrawResult[3]}]`);
console.log(`零和檢查: ${verifyZeroSum(selfDrawResult) ? '✅' : '❌'}`);

console.log('\n計算分析:');
console.log(`  - base (3番) = 40`);
console.log(`  - 馬獎 = 40 × (3-1) = 80 (每家)`);
console.log(`  - 馬獎總額 = 80 × 3 = 240`);
console.log('');
console.log('  當前實現 (DISCARDER_PAYS + 自摸 = 分攤):');
console.log(`    每家付 = 40 + 80/3 = 66.67`);
console.log(`    P1 收 = ${selfDrawResult[1]}`);
console.log('');
console.log('  ⚠️ 問題: 自摸時沒有「出銃者」，但代碼把馬獎分攤給三家');
console.log('           這與「出銃者付」的語義矛盾！');

console.log('\n' + '='.repeat(60));
console.log('測試 2: 出銃 3番 中2馬 (DISCARDER_PAYS)');
console.log('='.repeat(60));

const discardResult = calculateRoundDeltas(rules, WinType.Discard, 1, 2, 3, 0, 2);
console.log(`\n結果: [P0: ${discardResult[0]}, P1: ${discardResult[1]}, P2: ${discardResult[2]}, P3: ${discardResult[3]}]`);
console.log(`零和檢查: ${verifyZeroSum(discardResult) ? '✅' : '❌'}`);

console.log('\n計算分析:');
console.log(`  - base (3番) = 40`);
console.log(`  - 馬獎 = 40 × (3-1) = 80 (每家)`);
console.log(`  - 馬獎總額 = 80 × 3 = 240`);
console.log('');
console.log('  當前實現 (DISCARDER_PAYS + 出銃):');
console.log(`    P2 (出銃者) 付 = 40 + 80×3 = 280`);
console.log(`    P1 (胡家) 收 = ${discardResult[1]}`);
console.log(`    P0, P3 不用付 = ${discardResult[0]}, ${discardResult[3]}`);
console.log('');
console.log('  ✅ 出銃時「出銃者付」邏輯正確');

console.log('\n' + '='.repeat(60));
console.log('對比測試: 其他責任模式的自摸表現');
console.log('='.repeat(60));

const testLiability = (liability) => {
  const testRules = {
    ...rules,
    horse: { ...rules.horse, liability }
  };
  const result = calculateRoundDeltas(testRules, WinType.SelfDraw, 1, null, 3, 0, 2);
  console.log(`\n${liability}:`);
  console.log(`  結果: [P0: ${result[0]}, P1: ${result[1]}, P2: ${result[2]}, P3: ${result[3]}]`);
  return result;
};

const allPayResult = testLiability('ALL_PAY');
const splitPayResult = testLiability('SPLIT_PAY');
const discarderPaysResult = testLiability('DISCARDER_PAYS');

console.log('\n' + '='.repeat(60));
console.log('問題總結');
console.log('='.repeat(60));

console.log(`
⚠️ 發現問題:

  DISCARDER_PAYS + 自摸 時，代碼將馬獎分攤給三家
  (line 176-179: "自摸時等同分攤")

  這導致:
  - SPLIT_PAY 自摸: 每家付 66.67
  - DISCARDER_PAYS 自摸: 每家付 66.67 ← 完全一樣！

  但這兩種模式的語義應該不同:
  - SPLIT_PAY: 馬獎由三家分攤
  - DISCARDER_PAYS: 馬獎由出銃者付，但自摸時沒有出銃者！

🤔 可能的解釋:

  1. 傳統規則: 自摸時 DISCARDER_PAYS 沒有意義，因為沒人出銃
     → 應該跟 SPLIT_PAY 一樣處理（當前實現）

  2. 或者: 自摸時 DISCARDER_PAYS 應該讓三家各付全額馬獎
     → 即跟 ALL_PAY 一樣

  3. 或者: 自摸時馬獎不生效
     → 每家只付 base

需要確認: 你期望的行為是哪一種？
`);

console.log('='.repeat(60));
console.log('建議修復方案');
console.log('='.repeat(60));

console.log(`
方案 A: 保持現狀，但添加註釋說明

  // 自摸時沒有出銃者，DISCARDER_PAYS 行為等同 SPLIT_PAY
  case 'DISCARDER_PAYS':
    playerPays -= finalHorseBonus / 3;
    break;

方案 B: 自摸時 DISCARDER_PAYS 視為「無馬獎」

  case 'DISCARDER_PAYS':
    // 自摸時沒有出銃者，馬獎不生效
    break;  // 不加馬獎

方案 C: 自摸時 DISCARDER_PAYS 視為 ALL_PAY

  case 'DISCARDER_PAYS':
    // 自摸時沒有出銃者，視為三家各付一份
    playerPays -= finalHorseBonus;
    break;
`);
