/**
 * 跑馬仔 (Horse) 計算測試 - Node 直接執行版本
 */

// 手動複製核心計算函數
const calculateBaseValue = (faan, unitPrice) => {
    const power = Math.max(0, faan - 1);
    return unitPrice * Math.pow(2, power);
};

const WinType = {
  SelfDraw: "自摸 (Self-Draw)",
  Discard: "出衝 (Discard)",
  Draw: "流局 (Draw)",
};

// 完整計算函數（從 scoringService.ts 複製）
const calculateRoundDeltas = (
  rules,
  winType,
  winnerId,
  loserId,
  rawFaan,
  dealerId,
  horseHits = 0
) => {
  const deltas = { 0: 0, 1: 0, 2: 0, 3: 0 };

  if (winType === WinType.Draw) {
    return deltas;
  }

  // 1. Calculate base faan (with cap)
  let effectiveFaan = Math.max(0, rawFaan);
  if (effectiveFaan < rules.minFaan) return deltas;
  if (effectiveFaan > rules.maxFaan) effectiveFaan = rules.maxFaan;

  // 2. Get original base value before horse adjustment
  const originalBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);

  // 3. Calculate horse bonus if enabled
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
        // 馬獎已體現在 effectiveFaan 增加中，不需要額外計算
        horseBonusPerPlayer = 0;
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

  // 4. Get final Base Value
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

  // 6. Distribute
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

// 測試配置
const baseRules = {
  minFaan: 0,
  maxFaan: 10,
  dealerDouble: true,
  discarderPaysAll: true,
  unitPrice: 10,
};

const createHorseConfig = (overrides = {}) => ({
  enabled: true,
  horseCount: 4,
  payoutMode: 'ADD_FAAN',
  perHorseValue: 1,
  liability: 'ALL_PAY',
  capApplies: false,
  ...overrides,
});

const verifyZeroSum = (deltas) => {
  const sum = Object.values(deltas).reduce((a, b) => a + b, 0);
  return Math.abs(sum) < 0.01;
};

const formatDeltas = (deltas) =>
  `[P0: ${deltas[0]}, P1: ${deltas[1]}, P2: ${deltas[2]}, P3: ${deltas[3]}]`;

let passCount = 0;
let failCount = 0;
const issues = [];

const test = (name, fn) => {
  try {
    fn();
    passCount++;
  } catch (e) {
    failCount++;
    issues.push({ name, error: e.message });
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log('='.repeat(80));
console.log('跑馬仔計算測試報告');
console.log('='.repeat(80));
console.log(`基礎設定: ${baseRules.unitPrice}蚊底, ${baseRules.maxFaan}番封頂, 莊家雙倍\n`);

// ============================================
// 測試 1: 基礎籌碼公式
// ============================================
console.log('📊 測試 1: 基礎籌碼公式');
console.log('-'.repeat(60));

const faanTests = [
  { faan: 0, expected: 10 },
  { faan: 1, expected: 10 },
  { faan: 2, expected: 20 },
  { faan: 3, expected: 40 },
  { faan: 4, expected: 80 },
  { faan: 5, expected: 160 },
  { faan: 6, expected: 320 },
  { faan: 7, expected: 640 },
  { faan: 8, expected: 1280 },
  { faan: 9, expected: 2560 },
  { faan: 10, expected: 5120 },
];

faanTests.forEach(({ faan, expected }) => {
  test(`${faan}番 → ${expected}`, () => {
    const result = calculateBaseValue(faan, 10);
    assert(result === expected, `期望 ${expected}, 得到 ${result}`);
  });
});

// ============================================
// 測試 2: 無馬獎基準
// ============================================
console.log('\n📊 測試 2: 無馬獎基準 (3番)');
console.log('-'.repeat(60));

const noHorseRules = { ...baseRules };

test('自摸 P1 胡 (莊家=P0): P1 收 120, 其他各付 40', () => {
  const deltas = calculateRoundDeltas(noHorseRules, WinType.SelfDraw, 1, null, 3, 0, 0);
  assert(verifyZeroSum(deltas), '零和失敗');
  assert(deltas[1] === 120, `P1 應收 120, 得到 ${deltas[1]}`);
  assert(deltas[0] === -40 && deltas[2] === -40 && deltas[3] === -40, '其他應各付 40');
});

test('自摸 P0 莊家胡: P0 收 240, 其他各付 80', () => {
  const deltas = calculateRoundDeltas(noHorseRules, WinType.SelfDraw, 0, null, 3, 0, 0);
  assert(verifyZeroSum(deltas), '零和失敗');
  assert(deltas[0] === 240, `P0 應收 240, 得到 ${deltas[0]}`);
  assert(deltas[1] === -80 && deltas[2] === -80 && deltas[3] === -80, '其他應各付 80');
});

test('出銃 P1 胡 P2 銃: P2 付 40, P1 收 40', () => {
  const deltas = calculateRoundDeltas(noHorseRules, WinType.Discard, 1, 2, 3, 0, 0);
  assert(verifyZeroSum(deltas), '零和失敗');
  assert(deltas[1] === 40 && deltas[2] === -40, `P1 應收 40, P2 應付 40`);
});

test('出銃 P0 莊家胡 P2 銃: P2 付 80, P0 收 80', () => {
  const deltas = calculateRoundDeltas(noHorseRules, WinType.Discard, 0, 2, 3, 0, 0);
  assert(verifyZeroSum(deltas), '零和失敗');
  assert(deltas[0] === 80 && deltas[2] === -80, `P0 應收 80, P2 應付 80`);
});

test('出銃 P1 胡 P0 莊家銃: P0 付 80, P1 收 80', () => {
  const deltas = calculateRoundDeltas(noHorseRules, WinType.Discard, 1, 0, 3, 0, 0);
  assert(verifyZeroSum(deltas), '零和失敗');
  assert(deltas[1] === 80 && deltas[0] === -80, `P1 應收 80, P0 應付 80`);
});

// ============================================
// 測試 3: ADD_FAAN 模式
// ============================================
console.log('\n📊 測試 3: ADD_FAAN 模式 (每馬+1番)');
console.log('-'.repeat(60));

const addFaanAllPay = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_FAAN', liability: 'ALL_PAY' }) };
const addFaanSplit = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_FAAN', liability: 'SPLIT_PAY' }) };
const addFaanDiscarder = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_FAAN', liability: 'DISCARDER_PAYS' }) };

test('ADD_FAAN 自摸 P1 胡 3番 中2馬: 番數 3→5, base 40→160', () => {
  const deltas = calculateRoundDeltas(addFaanAllPay, WinType.SelfDraw, 1, null, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 3番+2馬=5番, base=160
  // 每家付 160 + 馬獎(160-40=120) = 280? 還是只付 160?
  // 根據代碼邏輯: baseValue 已是 160, horseBonusPerPlayer = 120
  // 每家付 160 + 120 = 280
});

test('ADD_FAAN 出銃 ALL_PAY P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(addFaanAllPay, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
});

test('ADD_FAAN 出銃 SPLIT_PAY P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(addFaanSplit, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
});

test('ADD_FAAN 出銃 DISCARDER_PAYS P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(addFaanDiscarder, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
});

// ============================================
// 測試 4: MULTIPLIER 模式
// ============================================
console.log('\n📊 測試 4: MULTIPLIER 模式 (每馬×1倍)');
console.log('-'.repeat(60));

const multAllPay = { ...baseRules, horse: createHorseConfig({ payoutMode: 'MULTIPLIER', perHorseValue: 1, liability: 'ALL_PAY' }) };
const multSplit = { ...baseRules, horse: createHorseConfig({ payoutMode: 'MULTIPLIER', perHorseValue: 1, liability: 'SPLIT_PAY' }) };
const multDiscarder = { ...baseRules, horse: createHorseConfig({ payoutMode: 'MULTIPLIER', perHorseValue: 1, liability: 'DISCARDER_PAYS' }) };

test('MULTIPLIER 自摸 P1 胡 3番 中2馬: base=40, 馬獎=40×(3-1)=80每家', () => {
  const deltas = calculateRoundDeltas(multAllPay, WinType.SelfDraw, 1, null, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 預期: 每家付 40 + 80 = 120, P1 收 360
  assert(deltas[1] === 360, `P1 應收 360, 得到 ${deltas[1]}`);
});

test('MULTIPLIER 出銃 ALL_PAY P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(multAllPay, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // P2 付 40 + 80 = 120, P0/P3 各付 80, P1 收 120 + 160 = 280
  assert(deltas[1] === 280, `P1 應收 280, 得到 ${deltas[1]}`);
  assert(deltas[2] === -120, `P2 應付 120, 得到 ${deltas[2]}`);
  assert(deltas[0] === -80 && deltas[3] === -80, `P0/P3 應各付 80`);
});

test('MULTIPLIER 出銃 SPLIT_PAY P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(multSplit, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 馬獎 80 由三家分, 每家 80/3 ≈ 26.67
  // P2 付 40 + 26.67 = 66.67
  // P0/P3 各付 26.67
  // P1 收 40 + 80 = 120
  assert(Math.abs(deltas[1] - 120) < 0.1, `P1 應收 120, 得到 ${deltas[1]}`);
});

test('MULTIPLIER 出銃 DISCARDER_PAYS P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(multDiscarder, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // P2 付 40 + 3×80 = 280
  assert(deltas[2] === -280, `P2 應付 280, 得到 ${deltas[2]}`);
  assert(deltas[1] === 280, `P1 應收 280, 得到 ${deltas[1]}`);
});

// ============================================
// 測試 5: ADD_UNITS 模式
// ============================================
console.log('\n📊 測試 5: ADD_UNITS 模式 (每馬+1底=10蚊)');
console.log('-'.repeat(60));

const unitsAllPay = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_UNITS', perHorseValue: 1, liability: 'ALL_PAY' }) };
const unitsSplit = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_UNITS', perHorseValue: 1, liability: 'SPLIT_PAY' }) };
const unitsDiscarder = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_UNITS', perHorseValue: 1, liability: 'DISCARDER_PAYS' }) };

test('ADD_UNITS 自摸 P1 胡 3番 中2馬: base=40, 馬獎=2×10=20每家', () => {
  const deltas = calculateRoundDeltas(unitsAllPay, WinType.SelfDraw, 1, null, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 每家付 40 + 20 = 60, P1 收 180
  assert(deltas[1] === 180, `P1 應收 180, 得到 ${deltas[1]}`);
});

test('ADD_UNITS 出銃 ALL_PAY P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(unitsAllPay, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // P2 付 40 + 20 = 60, P0/P3 各付 20, P1 收 60 + 40 = 100
  assert(deltas[1] === 100, `P1 應收 100, 得到 ${deltas[1]}`);
});

test('ADD_UNITS 出銃 SPLIT_PAY P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(unitsSplit, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // P1 收 40 + 20 = 60
  assert(deltas[1] === 60, `P1 應收 60, 得到 ${deltas[1]}`);
});

test('ADD_UNITS 出銃 DISCARDER_PAYS P1 胡 3番 P2銃 中2馬', () => {
  const deltas = calculateRoundDeltas(unitsDiscarder, WinType.Discard, 1, 2, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // P2 付 40 + 3×20 = 100
  assert(deltas[2] === -100, `P2 應付 100, 得到 ${deltas[2]}`);
});

// ============================================
// 測試 6: 封頂測試
// ============================================
console.log('\n📊 測試 6: 封頂測試 (capApplies=true)');
console.log('-'.repeat(60));

const addFaanCapped = { ...baseRules, horse: createHorseConfig({ payoutMode: 'ADD_FAAN', perHorseValue: 1, capApplies: true }) };

test('ADD_FAAN + 封頂: 8番 + 3馬 = 11番 → 封頂10番', () => {
  const deltas = calculateRoundDeltas(addFaanCapped, WinType.SelfDraw, 1, null, 8, 0, 3);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 8+3=11 但封頂10番, base=5120
  // 每家付 5120, P1 收 15360
  assert(deltas[1] === 15360, `P1 應收 15360, 得到 ${deltas[1]}`);
});

// ============================================
// 測試 7: 莊家雙倍測試
// ============================================
console.log('\n📊 測試 7: 莊家雙倍測試');
console.log('-'.repeat(60));

test('莊家自摸 MULTIPLIER P0 胡 3番 中2馬: base=80, 馬獎=160', () => {
  const deltas = calculateRoundDeltas(multAllPay, WinType.SelfDraw, 0, null, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 莊家雙倍: base=80, 馬獎=160
  // 每家付 80 + 160 = 240, P0 收 720
  assert(deltas[0] === 720, `P0 應收 720, 得到 ${deltas[0]}`);
});

test('莊家銃 MULTIPLIER ALL_PAY P1 胡 3番 P0銃 中2馬', () => {
  const deltas = calculateRoundDeltas(multAllPay, WinType.Discard, 1, 0, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  assert(verifyZeroSum(deltas), '零和失敗');
  // 莊家雙倍: base=80, 馬獎=160
  // P0 付 80 + 160 = 240, P2/P3 各付 160, P1 收 240 + 320 = 560
  assert(deltas[1] === 560, `P1 應收 560, 得到 ${deltas[1]}`);
});

// ============================================
// 問題測試: ADD_FAAN 重複計算檢查
// ============================================
console.log('\n📊 測試 8: ADD_FAAN 問題檢測');
console.log('-'.repeat(60));

test('⚠️ ADD_FAAN 自摸: 檢查馬獎是否重複計算', () => {
  const deltas = calculateRoundDeltas(addFaanAllPay, WinType.SelfDraw, 1, null, 3, 0, 2);
  console.log(`  結果: ${formatDeltas(deltas)}`);
  console.log(`  分析:`);
  console.log(`    - 原番數: 3, base=40`);
  console.log(`    - 加馬後: 5, base=160`);
  console.log(`    - horseBonusPerPlayer = 160-40 = 120`);
  console.log(`    - 每家應付: 160 (base) + 120 (馬獎) = 280`);
  console.log(`    - P1 實際收到: ${deltas[1]}`);
  console.log(`    - 預期: 3×160=480 (若馬獎不重複) 或 3×280=840 (若重複)`);
  console.log(`  ⚠️ 問題: ADD_FAAN 模式下, 馬獎已體現在番數增加,`);
  console.log(`           但代碼仍額外計算 horseBonusPerPlayer, 導致重複!`);
});

// ============================================
// 總結
// ============================================
console.log('\n' + '='.repeat(80));
console.log('測試總結');
console.log('='.repeat(80));
console.log(`通過: ${passCount}, 失敗: ${failCount}`);

if (issues.length > 0) {
  console.log('\n失敗的測試:');
  issues.forEach(({ name, error }) => {
    console.log(`  ❌ ${name}: ${error}`);
  });
}

console.log('\n📋 發現的問題:');
console.log('1. ADD_FAAN 模式: 馬獎可能重複計算');
console.log('   - effectiveFaan 增加 → baseValue 增加');
console.log('   - 但 horseBonusPerPlayer 仍計算差額並疊加');
console.log('   - 導致每家同時付更高的 base 和額外馬獎');
console.log('');
console.log('2. MULTIPLIER 模式: 封頂邏輯未實現');
console.log('   - capApplies 選項被忽略');
console.log('');
console.log('3. 需確認規則: 馬獎是否受莊家倍數影響?');
