import { RuleConfig, Wind, RoundWind } from './types';

export const WINDS_ORDER = [Wind.East, Wind.South, Wind.West, Wind.North];

// Round wind order for game progression
export const ROUND_WINDS_ORDER: RoundWind[] = ['EAST', 'SOUTH', 'WEST', 'NORTH'];

// Round wind display names
export const ROUND_WIND_NAMES: Record<RoundWind, Record<string, string>> = {
  EAST: { 'zh-HK': '東圈', 'en': 'East Round' },
  SOUTH: { 'zh-HK': '南圈', 'en': 'South Round' },
  WEST: { 'zh-HK': '西圈', 'en': 'West Round' },
  NORTH: { 'zh-HK': '北圈', 'en': 'North Round' },
};

export const DEFAULT_RULES: RuleConfig = {
  minFaan: 0,
  maxFaan: 8,
  dealerDouble: false,
  discarderPaysAll: true, // Hidden from UI but defaults to true (Standard HKMJ)
  unitPrice: 1,
  presetId: 0, // Default to "Standard ($1)"
};

export const SCORING_PRESETS = [
  {
    names: { 'zh-HK': "標準 (1蚊底)", 'en': "Standard ($1)" },
    descriptions: { 'zh-HK': "1, 2, 4, 8... (0番起糊, 8番封頂)", 'en': "1, 2, 4, 8... (0 min, 8 cap)" },
    rules: {
      unitPrice: 1,
      minFaan: 0,
      maxFaan: 8,
      discarderPaysAll: true
    }
  },
  {
    names: { 'zh-HK': "衛生 (5毫子)", 'en': "Small ($0.5)" },
    descriptions: { 'zh-HK': "0.5, 1, 2, 4... (0番起糊, 8番封頂)", 'en': "0.5, 1, 2, 4... (0 min, 8 cap)" },
    rules: {
      unitPrice: 0.5,
      minFaan: 0,
      maxFaan: 8,
      discarderPaysAll: true
    }
  },
  {
    names: { 'zh-HK': "辣辣上 (2蚊底)", 'en': "High Stakes ($2)" },
    descriptions: { 'zh-HK': "2, 4, 8, 16... (3番起糊, 10番封頂)", 'en': "2, 4, 8, 16... (3 min, 10 cap)" },
    rules: {
      unitPrice: 2,
      minFaan: 3,
      maxFaan: 10,
      discarderPaysAll: true
    }
  },
  {
    names: { 'zh-HK': "三番起糊 (1蚊底)", 'en': "Min 3 Faan ($1)" },
    descriptions: { 'zh-HK': "1, 2, 4, 8... (3番起糊, 8番封頂)", 'en': "1, 2, 4, 8... (3 min, 8 cap)" },
    rules: {
      unitPrice: 1,
      minFaan: 3,
      maxFaan: 8,
      discarderPaysAll: true
    }
  },
  {
    names: { 'zh-HK': "跑馬仔 (5蚊底)", 'en': "Race ($5)" },
    descriptions: { 'zh-HK': "5, 10, 20... (0番起糊, 10番封頂)", 'en': "5, 10, 20... (0 min, 10 cap)" },
    rules: {
      unitPrice: 5,
      minFaan: 0,
      maxFaan: 10,
      discarderPaysAll: true
    }
  }
];

export const MOCK_PLAYERS = [
  { id: 0 as const, name: '雀友 A', score: 0, wind: Wind.East },
  { id: 1 as const, name: '雀友 B', score: 0, wind: Wind.South },
  { id: 2 as const, name: '雀友 C', score: 0, wind: Wind.West },
  { id: 3 as const, name: '雀友 D', score: 0, wind: Wind.North },
];