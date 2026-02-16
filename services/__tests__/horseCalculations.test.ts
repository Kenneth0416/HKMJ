/**
 * 跑馬仔 (Horse) 計算測試
 * 覆蓋所有 payoutMode × liability × winType 組合
 */

import { calculateRoundDeltas, calculateBaseValue, calculateHorseBonus } from '../scoringService.js';
import { WinType, RuleConfig, HorseConfig, PlayerId } from '../../types.js';

// 基礎測試配置
const baseRules: RuleConfig = {
  minFaan: 0,
  maxFaan: 10,
  dealerDouble: true,
  discarderPaysAll: true,
  unitPrice: 10,  // 10蚊底
};

const createHorseConfig = (overrides: Partial<HorseConfig> = {}): HorseConfig => ({
  enabled: true,
  horseCount: 4,
  payoutMode: 'ADD_FAAN',
  perHorseValue: 1,
  liability: 'ALL_PAY',
  capApplies: false,
  ...overrides,
});

const createRules = (horseConfig?: HorseConfig): RuleConfig => ({
  ...baseRules,
  horse: horseConfig,
});

// 輔助函數：驗證零和
const verifyZeroSum = (deltas: Record<PlayerId, number>) => {
  const sum = Object.values(deltas).reduce((a, b) => a + b, 0);
  return Math.abs(sum) < 0.01;  // 浮點數容差
};

// 輔助函數：格式化輸出
const formatDeltas = (deltas: Record<PlayerId, number>) =>
  `[P0: ${deltas[0]}, P1: ${deltas[1]}, P2: ${deltas[2]}, P3: ${deltas[3]}]`;

console.log('='.repeat(80));
console.log('跑馬仔計算測試報告');
console.log('='.repeat(80));
console.log(`基礎設定: ${baseRules.unitPrice}蚊底, ${baseRules.maxFaan}番封頂, 莊家雙倍\n`);

// ============================================
// 測試 1: 基礎公式驗證
// ============================================
console.log('📊 測試 1: 基礎籌碼公式驗證');
console.log('-'.repeat(60));

const faanTests = [
  { faan: 0, expected: 10 },   // 10 × 2^(-1) → 10 × 2^0 = 10
  { faan: 1, expected: 10 },   // 10 × 2^0 = 10
  { faan: 2, expected: 20 },   // 10 × 2^1 = 20
  { faan: 3, expected: 40 },   // 10 × 2^2 = 40
  { faan: 4, expected: 80 },   // 10 × 2^3 = 80
  { faan: 5, expected: 160 },  // 10 × 2^4 = 160
  { faan: 6, expected: 320 },  // 10 × 2^5 = 320
  { faan: 7, expected: 640 },  // 10 × 2^6 = 640
  { faan: 8, expected: 1280 }, // 10 × 2^7 = 1280
  { faan: 9, expected: 2560 }, // 10 × 2^8 = 2560
  { faan: 10, expected: 5120 },// 10 × 2^9 = 5120
];

faanTests.forEach(({ faan, expected }) => {
  const result = calculateBaseValue(faan, 10);
  const pass = result === expected;
  console.log(`  ${faan}番 → ${result} (期望: ${expected}) ${pass ? '✅' : '❌'}`);
});

// ============================================
// 測試 2: 無馬獎基準測試
// ============================================
console.log('\n📊 測試 2: 無馬獎基準測試 (3番食糊)');
console.log('-'.repeat(60));

const noHorseRules = createRules();

// 2a. 自摸 (非莊家胡，莊家是 P0)
console.log('\n  【自摸】P1 胡 (莊家=P0):');
let deltas = calculateRoundDeltas(noHorseRules, WinType.SelfDraw, 1 as PlayerId, null, 3, 0 as PlayerId, 0);
console.log(`    結果: ${formatDeltas(deltas)}`);
console.log(`    零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
// P1 收 3×40 = 120, 其他人各付 40

// 2b. 自摸 (莊家胡)
console.log('\n  【自摸】P0 莊家胡:');
deltas = calculateRoundDeltas(noHorseRules, WinType.SelfDraw, 0 as PlayerId, null, 3, 0 as PlayerId, 0);
console.log(`    結果: ${formatDeltas(deltas)}`);
console.log(`    零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
// P0 收 3×80 = 240, 其他人各付 80 (莊家雙倍)

// 2c. 出銃 (非莊家胡非莊家銃)
console.log('\n  【出銃】P1 胡, P2 銃 (莊家=P0):');
deltas = calculateRoundDeltas(noHorseRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 0);
console.log(`    結果: ${formatDeltas(deltas)}`);
console.log(`    零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
// P2 付 40, P1 收 40

// 2d. 出銃 (莊家胡)
console.log('\n  【出銃】P0 莊家胡, P2 銃:');
deltas = calculateRoundDeltas(noHorseRules, WinType.Discard, 0 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 0);
console.log(`    結果: ${formatDeltas(deltas)}`);
console.log(`    零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
// P2 付 80 (莊家雙倍), P0 收 80

// 2e. 出銃 (莊家銃)
console.log('\n  【出銃】P1 胡, P0 莊家銃:');
deltas = calculateRoundDeltas(noHorseRules, WinType.Discard, 1 as PlayerId, 0 as PlayerId, 3, 0 as PlayerId, 0);
console.log(`    結果: ${formatDeltas(deltas)}`);
console.log(`    零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
// P0 付 80 (莊家雙倍), P1 收 80

// ============================================
// 測試 3: ADD_FAAN 模式
// ============================================
console.log('\n📊 測試 3: ADD_FAAN 模式 (每馬+1番)');
console.log('-'.repeat(60));

const addFaanRules = createRules(createHorseConfig({
  payoutMode: 'ADD_FAAN',
  perHorseValue: 1,
  liability: 'ALL_PAY',
}));

// 3a. 自摸 + 中2馬 (非莊家胡)
console.log('\n  【自摸 + ADD_FAAN】P1 胡 3番, 中2馬 (莊家=P0):');
console.log('  預期: 3番+2馬=5番, base=160');
deltas = calculateRoundDeltas(addFaanRules, WinType.SelfDraw, 1 as PlayerId, null, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
console.log(`  P1 應收: ${deltas[1]} (預期: 3×160=480 或需檢查馬獎責任)`);

// 3b. 出銃 + 中2馬 + ALL_PAY
console.log('\n  【出銃 + ADD_FAAN + ALL_PAY】P1 胡 3番, P2銃, 中2馬:');
console.log('  預期: 3番+2馬=5番, base=160, 馬獎如何分?');
deltas = calculateRoundDeltas(addFaanRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// 3c. ADD_FAAN + SPLIT_PAY
const addFaanSplitRules = createRules(createHorseConfig({
  payoutMode: 'ADD_FAAN',
  perHorseValue: 1,
  liability: 'SPLIT_PAY',
}));
console.log('\n  【出銃 + ADD_FAAN + SPLIT_PAY】P1 胡 3番, P2銃, 中2馬:');
deltas = calculateRoundDeltas(addFaanSplitRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// 3d. ADD_FAAN + DISCARDER_PAYS
const addFaanDiscarderRules = createRules(createHorseConfig({
  payoutMode: 'ADD_FAAN',
  perHorseValue: 1,
  liability: 'DISCARDER_PAYS',
}));
console.log('\n  【出銃 + ADD_FAAN + DISCARDER_PAYS】P1 胡 3番, P2銃, 中2馬:');
deltas = calculateRoundDeltas(addFaanDiscarderRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// ============================================
// 測試 4: MULTIPLIER 模式
// ============================================
console.log('\n📊 測試 4: MULTIPLIER 模式 (每馬×1倍)');
console.log('-'.repeat(60));

const multiplierRules = createRules(createHorseConfig({
  payoutMode: 'MULTIPLIER',
  perHorseValue: 1,
  liability: 'ALL_PAY',
}));

// 4a. 自摸 + 中2馬
console.log('\n  【自摸 + MULTIPLIER】P1 胡 3番, 中2馬:');
console.log('  預期: base=40, multiplier=1+(1×2)=3, 馬獎=40×2=80每家');
deltas = calculateRoundDeltas(multiplierRules, WinType.SelfDraw, 1 as PlayerId, null, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
console.log(`  P1 應收: ${deltas[1]} (預期: 3×40 + 3×80 = 360)`);

// 4b. 出銃 + 中2馬 + ALL_PAY
console.log('\n  【出銃 + MULTIPLIER + ALL_PAY】P1 胡 3番, P2銃, 中2馬:');
console.log('  預期: base=40, 馬獎=80, 出銃者付base+馬獎, 其他兩家各付馬獎');
deltas = calculateRoundDeltas(multiplierRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
console.log(`  P1 應收: ${deltas[1]} (預期: 40 + 3×80 = 280)`);

// 4c. MULTIPLIER + SPLIT_PAY
const multiplierSplitRules = createRules(createHorseConfig({
  payoutMode: 'MULTIPLIER',
  perHorseValue: 1,
  liability: 'SPLIT_PAY',
}));
console.log('\n  【出銃 + MULTIPLIER + SPLIT_PAY】P1 胡 3番, P2銃, 中2馬:');
console.log('  預期: base=40, 馬獎=80, 三家各付80/3≈26.67');
deltas = calculateRoundDeltas(multiplierSplitRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// 4d. MULTIPLIER + DISCARDER_PAYS
const multiplierDiscarderRules = createRules(createHorseConfig({
  payoutMode: 'MULTIPLIER',
  perHorseValue: 1,
  liability: 'DISCARDER_PAYS',
}));
console.log('\n  【出銃 + MULTIPLIER + DISCARDER_PAYS】P1 胡 3番, P2銃, 中2馬:');
console.log('  預期: P2付 40 + 3×80 = 280');
deltas = calculateRoundDeltas(multiplierDiscarderRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// ============================================
// 測試 5: ADD_UNITS 模式
// ============================================
console.log('\n📊 測試 5: ADD_UNITS 模式 (每馬+1底=10蚊)');
console.log('-'.repeat(60));

const addUnitsRules = createRules(createHorseConfig({
  payoutMode: 'ADD_UNITS',
  perHorseValue: 1,
  liability: 'ALL_PAY',
}));

// 5a. 自摸 + 中2馬
console.log('\n  【自摸 + ADD_UNITS】P1 胡 3番, 中2馬:');
console.log('  預期: base=40, 馬獎=2×10=20每家');
deltas = calculateRoundDeltas(addUnitsRules, WinType.SelfDraw, 1 as PlayerId, null, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
console.log(`  P1 應收: ${deltas[1]} (預期: 3×40 + 3×20 = 180)`);

// 5b. 出銃 + 中2馬 + ALL_PAY
console.log('\n  【出銃 + ADD_UNITS + ALL_PAY】P1 胡 3番, P2銃, 中2馬:');
console.log('  預期: base=40, 馬獎=20, 出銃者付40+20, 其他兩家各付20');
deltas = calculateRoundDeltas(addUnitsRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);
console.log(`  P1 應收: ${deltas[1]} (預期: 40 + 3×20 = 100)`);

// 5c. ADD_UNITS + SPLIT_PAY
const addUnitsSplitRules = createRules(createHorseConfig({
  payoutMode: 'ADD_UNITS',
  perHorseValue: 1,
  liability: 'SPLIT_PAY',
}));
console.log('\n  【出銃 + ADD_UNITS + SPLIT_PAY】P1 胡 3番, P2銃, 中2馬:');
deltas = calculateRoundDeltas(addUnitsSplitRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// 5d. ADD_UNITS + DISCARDER_PAYS
const addUnitsDiscarderRules = createRules(createHorseConfig({
  payoutMode: 'ADD_UNITS',
  perHorseValue: 1,
  liability: 'DISCARDER_PAYS',
}));
console.log('\n  【出銃 + ADD_UNITS + DISCARDER_PAYS】P1 胡 3番, P2銃, 中2馬:');
deltas = calculateRoundDeltas(addUnitsDiscarderRules, WinType.Discard, 1 as PlayerId, 2 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// ============================================
// 測試 6: 封頂測試 (capApplies)
// ============================================
console.log('\n📊 測試 6: 封頂測試 (capApplies=true, maxFaan=10)');
console.log('-'.repeat(60));

const cappedRules = createRules(createHorseConfig({
  payoutMode: 'ADD_FAAN',
  perHorseValue: 1,
  capApplies: true,
}));

// 6a. 8番 + 3馬 = 11番 → 應封頂至10番
console.log('\n  【ADD_FAAN + 封頂】P1 胡 8番, 中3馬:');
console.log('  預期: 8+3=11番 → 封頂10番, base=5120');
deltas = calculateRoundDeltas(cappedRules, WinType.SelfDraw, 1 as PlayerId, null, 8, 0 as PlayerId, 3);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// 6b. MULTIPLIER 封頂測試
const multiplierCappedRules = createRules(createHorseConfig({
  payoutMode: 'MULTIPLIER',
  perHorseValue: 1,
  capApplies: true,
}));
console.log('\n  【MULTIPLIER + 封頂】P1 胡 12番(已超封頂), 中2馬:');
console.log('  注意: MULTIPLIER 模式封頂邏輯可能未實現');
deltas = calculateRoundDeltas(multiplierCappedRules, WinType.SelfDraw, 1 as PlayerId, null, 12, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// ============================================
// 測試 7: 莊家雙倍測試
// ============================================
console.log('\n📊 測試 7: 莊家雙倍測試 (馬獎是否受影響)');
console.log('-'.repeat(60));

const horseWithDealerRules = createRules(createHorseConfig({
  payoutMode: 'MULTIPLIER',
  perHorseValue: 1,
  liability: 'ALL_PAY',
}));

// 7a. 莊家胡 + 中馬
console.log('\n  【莊家自摸 + MULTIPLIER】P0 莊家胡 3番, 中2馬:');
console.log('  預期: base=80(莊家雙倍), 馬獎=160(雙倍?), P0收3×(80+160)=720');
deltas = calculateRoundDeltas(horseWithDealerRules, WinType.SelfDraw, 0 as PlayerId, null, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// 7b. 莊家銃 + 中馬
console.log('\n  【莊家銃 + MULTIPLIER + ALL_PAY】P1 胡 3番, P0莊家銃, 中2馬:');
deltas = calculateRoundDeltas(horseWithDealerRules, WinType.Discard, 1 as PlayerId, 0 as PlayerId, 3, 0 as PlayerId, 2);
console.log(`  結果: ${formatDeltas(deltas)}`);
console.log(`  零和: ${verifyZeroSum(deltas) ? '✅' : '❌'}`);

// ============================================
// 測試 8: calculateHorseBonus 函數測試
// ============================================
console.log('\n📊 測試 8: calculateHorseBonus 函數測試');
console.log('-'.repeat(60));

// 8a. ADD_FAAN
console.log('\n  【calculateHorseBonus + ADD_FAAN】3番, 中2馬:');
let bonus = calculateHorseBonus(
  createHorseConfig({ payoutMode: 'ADD_FAAN', perHorseValue: 1 }),
  2, 3, baseRules
);
console.log(`  effectiveFaan: ${bonus.effectiveFaan} (預期: 5)`);
console.log(`  horseBonusTotal: ${bonus.horseBonusTotal} (預期: 160-40=120)`);

// 8b. MULTIPLIER
console.log('\n  【calculateHorseBonus + MULTIPLIER】3番, 中2馬:');
bonus = calculateHorseBonus(
  createHorseConfig({ payoutMode: 'MULTIPLIER', perHorseValue: 1 }),
  2, 3, baseRules
);
console.log(`  effectiveFaan: ${bonus.effectiveFaan} (預期: 3)`);
console.log(`  horseBonusTotal: ${bonus.horseBonusTotal}`);
console.log(`  ⚠️ 注意: 這裡公式與 calculateRoundDeltas 不一致!`);

// 8c. ADD_UNITS
console.log('\n  【calculateHorseBonus + ADD_UNITS】3番, 中2馬:');
bonus = calculateHorseBonus(
  createHorseConfig({ payoutMode: 'ADD_UNITS', perHorseValue: 1 }),
  2, 3, baseRules
);
console.log(`  effectiveFaan: ${bonus.effectiveFaan} (預期: 3)`);
console.log(`  horseBonusTotal: ${bonus.horseBonusTotal} (預期: 2×10=20)`);

// ============================================
// 總結
// ============================================
console.log('\n' + '='.repeat(80));
console.log('測試總結');
console.log('='.repeat(80));
console.log('\n需要關注的問題:');
console.log('1. ADD_FAAN 模式: 馬獎是否重複計算?');
console.log('2. MULTIPLIER 模式: calculateHorseBonus 公式與 calculateRoundDeltas 不一致');
console.log('3. MULTIPLIER 模式: capApplies 邏輯未實現');
console.log('4. ALL_PAY 模式: 莊家雙倍是否應用於馬獎?');
console.log('\n建議: 逐一驗證上述問題並修復');
