# Poker Diary

Десктопное приложение для учёта покерных сессий с системой лицензирования, оплатой в USDT и Telegram-ботом.

## Возможности

- Учёт сессий, турниров и банкролла
- Тёмная/светлая тема
- Русский/английский интерфейс (i18n)
- Экспорт в Excel (комнаты, турниры, сессии, операции)
- Импорт/экспорт сессий (JSON)
- Пресеты покерных комнат
- Система лицензий (14-дневный триал, годовая/бессрочная активация)
- Оплата USDT TRC-20 через Telegram бота

## Технологии

- **Фронтенд**: React 18, TypeScript, Ant Design 5, Vite
- **Бэкенд**: Node.js JSON API сервер
- **Десктоп**: Electron, electron-builder (NSIS установщик)
- **Лицензирование**: Cloudflare Workers + D1, Ed25519 офлайн-активация
- **Оплата**: Telegram Bot (grammy), TRONGrid USDT верификация
- **Базы данных**: sql.js (бот), JSON (приложение), D1 (лицензии)

## Разработка

```bash
npm install
npm run dev              # режим браузера (мок-лицензирование)
npm run dev:electron     # Electron + Vite hot reload
npm run build            # сборка фронтенда
npm run build:electron   # сборка фронтенда + упаковка EXE
```

## Бот

Telegram-бот для оплаты и управления лицензиями: [@PokerDiary_Bot](https://t.me/PokerDiary_Bot)

```bash
cd bot
cp .env.example .env  # заполнить секреты
npm install
node index.js
```

## Готовый установщик

Скачать последнюю версию: https://github.com/sharkbay2226-cloud/PokerTable/releases/latest

## Лицензия

Коммерческий продукт. Годовая ($30) и бессрочная ($100) лицензии доступны через [@PokerDiary_Bot](https://t.me/PokerDiary_Bot).
