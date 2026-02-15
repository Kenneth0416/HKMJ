# 港麻記帳 HKMJ Scorer

<div align="center">

**專業香港麻雀計分工具 | Professional Hong Kong Mahjong Scoring Calculator**

[![Made with React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[🌐 Live Demo](https://hkmj.app) · [🐛 Report Bug](https://github.com/Kenneth0416/HKMJ/issues) · [✨ Request Feature](https://github.com/Kenneth0416/HKMJ/issues)

</div>

---

## 🀄 關於 | About

**港麻記帳** 是一款專為香港舊式麻雀（HKMJ）設計的計分工具。無論你是雀友還是新手，都能輕鬆使用！

**HKMJ Scorer** is a professional scoring calculator designed specifically for Hong Kong Old Style Mahjong. Perfect for both seasoned players and beginners!

## ✨ 功能特色 | Features

| 功能 | Feature | 描述 |
|------|---------|------|
| 🧮 **自動計分** | Auto Scoring | 輸入番數，自動計算籌碼 |
| 📝 **籌碼記帳** | Chips Tracking | 即時追蹤每位玩家的籌碼變動 |
| ⚙️ **自訂規則** | Custom Rules | 可調整底分、起糊、封頂等參數 |
| 📊 **歷史紀錄** | Game History | 完整紀錄每局結果，可隨時查看或刪除 |
| 🔄 **快速範本** | Quick Presets | 預設多種常見牌局設定 |
| 🌐 **雙語支援** | Bilingual | 支援繁體中文及 English |

## 🎯 適合人群 | Who is this for?

- 🀄 香港麻雀愛好者 | HK Mahjong enthusiasts
- 👥 家庭聚會、朋友聚餐 | Family gatherings, friend meetups
- 🆕 想學習港麻計分的新手 | Beginners learning HKMJ scoring
- 📱 需要隨時計分的雀友 | Players who need on-the-go scoring

## 🚀 快速開始 | Quick Start

### 線上使用 | Online
直接訪問 [hkmj.app](https://hkmj.app) 即可使用，無需下載！

### 本地運行 | Run Locally

```bash
# Clone the repository
git clone https://github.com/Kenneth0416/HKMJ.git

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📖 港麻計分規則 | HKMJ Scoring Rules

### 計分公式 | Formula
```
籌碼 = 底 × 2^(番數 - 1)
Chips = Base × 2^(Faan - 1)
```

### 常見番數 | Common Faan Values

| 番數 | 牌型 Examples |
|------|---------------|
| 1番 | 無花、正花、番子刻 |
| 3番 | 混一色、對對糊、小三元 |
| 5番 | 清一色、大三元 |
| 8/10番 (爆棚) | 字一色、十三么 |

### 食糊類型 | Win Types
- **自摸 Self-Draw**: 三家賠 | All 3 opponents pay
- **出衝 Discard**: 出衝者包賠 | Discarder pays all

## 🛠️ 技術棧 | Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Storage**: LocalStorage (離線可用 | Works offline)

## 📱 支援平台 | Supported Platforms

- ✅ 網頁瀏覽器 (Chrome, Safari, Firefox, Edge)
- ✅ 手機瀏覽器 (iOS Safari, Android Chrome)
- ✅ 離線使用 (PWA ready)

## 🤝 貢獻 | Contributing

歡迎提交 Issue 和 Pull Request！

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use for personal or commercial purposes.

---

<div align="center">

**🀄 祝各位雀運亨通！Good luck at the Mahjong table! 🀄**

Made with ❤️ by [Kenneth](https://github.com/Kenneth0416)

</div>
