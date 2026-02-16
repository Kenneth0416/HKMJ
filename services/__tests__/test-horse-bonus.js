const calculateBaseValue = (faan, unitPrice) => unitPrice * Math.pow(2, Math.max(0, faan - 1));

// 修復後的 calculateHorseBonus
const calculateHorseBonus = (horseConfig, horseHits, rawFaan, rules) => {
  if (!horseConfig.enabled || horseHits === 0) {
    return { effectiveFaan: rawFaan, horseBonusTotal: 0 };
  }

  const originalBaseValue = calculateBaseValue(rawFaan, rules.unitPrice);
  let effectiveFaan = rawFaan;
  let horseBonusTotal = 0;

  switch (horseConfig.payoutMode) {
    case 'ADD_FAAN': {
      effectiveFaan = rawFaan + (horseHits * horseConfig.perHorseValue);
      if (horseConfig.capApplies) {
        effectiveFaan = Math.min(effectiveFaan, rules.maxFaan);
      }
      const newBaseValue = calculateBaseValue(effectiveFaan, rules.unitPrice);
      horseBonusTotal = newBaseValue - originalBaseValue;
      break;
    }
    case 'MULTIPLIER': {
      const multiplier = 1 + (horseConfig.perHorseValue * horseHits);
      horseBonusTotal = originalBaseValue * (multiplier - 1);
      break;
    }
    case 'ADD_UNITS': {
      horseBonusTotal = horseConfig.perHorseValue * horseHits * rules.unitPrice;
      break;
    }
  }
  return { effectiveFaan, horseBonusTotal };
};

// 測試
const rules = {
  minFaan: 0, maxFaan: 10, dealerDouble: true, unitPrice: 10,
  horse: { enabled: true, horseCount: 4, perHorseValue: 1, capApplies: false }
};

console.log('='.repeat(60));
console.log('calculateHorseBonus 測試');
console.log('='.repeat(60));

// ADD_FAAN
const addFaanResult = calculateHorseBonus({...rules.horse, payoutMode: 'ADD_FAAN'}, 2, 3, rules);
console.log('\nADD_FAAN 3番 中2馬:');
console.log('  horseBonusTotal:', addFaanResult.horseBonusTotal);
console.log('  預期: 160 - 40 = 120');
console.log('  驗證:', addFaanResult.horseBonusTotal === 120 ? '✅' : '❌');

// MULTIPLIER
const multiplierResult = calculateHorseBonus({...rules.horse, payoutMode: 'MULTIPLIER'}, 2, 3, rules);
console.log('\nMULTIPLIER 3番 中2馬:');
console.log('  horseBonusTotal:', multiplierResult.horseBonusTotal);
console.log('  預期: 40 * (3-1) = 80');
console.log('  驗證:', multiplierResult.horseBonusTotal === 80 ? '✅' : '❌');

// ADD_UNITS
const addUnitsResult = calculateHorseBonus({...rules.horse, payoutMode: 'ADD_UNITS'}, 2, 3, rules);
console.log('\nADD_UNITS 3番 中2馬:');
console.log('  horseBonusTotal:', addUnitsResult.horseBonusTotal);
console.log('  預期: 2 * 1 * 10 = 20');
console.log('  驗證:', addUnitsResult.horseBonusTotal === 20 ? '✅' : '❌');

console.log('\n' + '='.repeat(60));
console.log('Modal 顯示 (3家份)');
console.log('='.repeat(60));
console.log('ADD_FAAN:', addFaanResult.horseBonusTotal * 3, '(預期 360)');
console.log('MULTIPLIER:', multiplierResult.horseBonusTotal * 3, '(預期 240)');
console.log('ADD_UNITS:', addUnitsResult.horseBonusTotal * 3, '(預期 60)');
