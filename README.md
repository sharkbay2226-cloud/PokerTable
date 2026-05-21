# Poker Diary

Desktop application for tracking poker sessions with licensing, USDT payments, and Telegram bot integration.

## Features

- Track poker sessions, tournaments, and bankroll
- Dark/light theme
- Russian/English interface (i18n)
- Export to Excel (rooms, tournaments, sessions, bankroll)
- Import/export sessions (JSON)
- Preset poker rooms
- Licensing system (14-day trial, yearly/lifetime activation)
- USDT TRC-20 payments via Telegram bot

## Tech Stack

- **Frontend**: React 18, TypeScript, Ant Design 5, Vite
- **Backend**: Node.js JSON API server
- **Desktop**: Electron, electron-builder (NSIS installer)
- **Licensing**: Cloudflare Workers + D1, Ed25519 offline activation
- **Payments**: Telegram Bot (grammy), TRONGrid USDT verification
- **Database**: sql.js (bot), JSON file (app), D1 (licenses)

## Development

```bash
npm install
npm run dev        # browser mode (mock licensing)
npm run dev:electron  # Electron + Vite hot reload
npm run build      # build frontend
npm run build:electron  # build frontend + package EXE
```

## Bot

Telegram bot for payments and license management.

```bash
cd bot
cp .env.example .env  # fill in your secrets
npm install
node index.js
```

## License

Commercial product. Yearly ($30) and lifetime ($100) licenses available via [@PokerDiary_Bot](https://t.me/PokerDiary_Bot).
