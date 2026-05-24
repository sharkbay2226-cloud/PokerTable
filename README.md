# Poker Diary

Десктопное приложение для учёта покерных сессий с системой лицензирования, оплатой в USDT и Telegram-ботом.

## Возможности

- Учёт сессий, турниров и банкролла
- Тёмная/светлая тема
- Русский/английский интерфейс (i18n)
- Экспорт в Excel (комнаты, турниры, сессии, операции)
- Импорт/экспорт сессий (JSON)
- Пресеты покерных комнат
- Система лицензий (14-дневный триал, месячная/годовая/бессрочная активация)
- Оплата USDT TRC-20 через Telegram бота
- Авто-подтверждение платежей (USDT Monitor)
- Реферальная программа (20% от покупки реферала)

## Технологии

- **Фронтенд**: React 18, TypeScript, Ant Design 5, Vite
- **Бэкенд**: Node.js JSON API сервер
- **Десктоп**: Electron, electron-builder (NSIS установщик)
- **Лицензирование**: Cloudflare Workers + D1, Ed25519 офлайн-активация
- **Оплата**: Telegram Bot (grammy + pm2), TRONGrid USDT верификация
- **Мониторинг**: USDT Monitor (авто-сканирование TRONGrid)
- **Базы данных**: sql.js (бот SQLite), JSON (приложение), D1 Cloudflare (лицензии)

## Разработка

```bash
npm install
npm run dev              # режим браузера (мок-лицензирование)
npm run dev:electron     # Electron + Vite hot reload
npm run build            # сборка фронтенда
npm run build:electron   # сборка фронтенда + обфускация license.cjs + упаковка EXE
```

## Бот

Telegram-бот для оплаты и управления лицензиями: [@PokerDiary_Bot](https://t.me/PokerDiary_Bot)

```bash
cd bot
cp .env.example .env  # заполнить секреты
npm install
node index.js         # бот (polling)
node monitor.mjs      # USDT Monitor (ping every 60s)
```

## Готовый установщик

Скачать последнюю версию: https://github.com/sharkbay2226-cloud/PokerTable/releases/latest

Прямая ссылка (хостинг): http://sharkbqo.beget.tech/Poker%20Diary%20Setup%200.1.3.exe

## Цены

| Тариф | Цена |
|-------|------|
| Месячная | $5 |
| Годовая | $25 |
| Бессрочная | $50 |

## Лицензия

Коммерческий продукт. Лицензии доступны через [@PokerDiary_Bot](https://t.me/PokerDiary_Bot).
