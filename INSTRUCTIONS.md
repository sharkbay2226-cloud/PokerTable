# Poker Diary — Инструкции

## Сборка EXE

```bash
npm run build:electron
# Готовый файл: release/Poker Diary Setup *.exe
```

**Актуальная версия:** `0.1.2`

## Загрузка EXE на хостинг (sharkbqo.beget.tech)

```bash
curl -T "release\Poker Diary Setup 0.1.2.exe" ftp://sharkbqo.beget.tech/ --user "sharkbqo_21:qqA1HP5k5ay&"
```

## GitHub Release

1. Push changes to GitHub
2. GitHub Actions соберёт EXE (если настроено)
3. Или собрать локально и загрузить в Releases вручную

## Бот (VPS: 212.8.226.8)

**Просмотр логов:**
```bash
pm2 logs poker-diary-bot
```

**Рестарт:**
```bash
pm2 restart poker-diary-bot
```

**Статус:**
```bash
pm2 status
```

## Отчёты и управление

### 📊 Отчёт (заказы + промокоды + лицензии)

1. На VPS: `curl -sL sharkbqo.beget.tech/report.sh | bash`
2. На ПК: двойной клик по `Report.bat`

### 🏷️ Управление промокодами

1. На ПК: двойной клик по `Manage.bat` — откроется страница http://sharkbqo.beget.tech/manage.php
2. Заполните форму (CODE, Discount %, Max uses, Expires) и нажмите "Add Promo"
3. На VPS выполните (применяет команду):
   ```bash
   curl -sL sharkbqo.beget.tech/m.sh | bash
   ```
4. Обновите страницу в браузере (F5) — промокод появится в таблице

**Примечание:** старый `promo_cmd.json` (команда) не очищается на VPS автоматически. Если баннер "Command pending" остаётся — очистить вручную: записать `{}` в `promo_cmd.json` через FTP.

### 📋 Быстрый просмотр на VPS

```bash
# Промокоды
sqlite3 /opt/PokerTable/bot/bot.db "SELECT * FROM promo_codes"

# Заказы
sqlite3 /opt/PokerTable/bot/bot.db "SELECT * FROM orders ORDER BY id DESC LIMIT 10"

# Все лицензии
sqlite3 /opt/PokerTable/bot/bot.db "SELECT * FROM licenses ORDER BY id DESC LIMIT 10"
```

## USDT Monitor (авто-подтверждение платежей)

Монитор каждые 60 секунд проверяет входящие USDT-переводы на кошелёк.
Если находит транзакцию, совпадающую по сумме с ожидающим заказом — **автоматически** подтверждает и отправляет ключ в Telegram.

**Логи монитора:**
```bash
pm2 logs poker-diary-monitor
```

**Перезапуск:**
```bash
pm2 restart poker-diary-monitor
```

Монитор запускается автоматически при обновлении бота через `update.sh`.

## Обновление бота на VPS

1. Внести изменения в `bot/` локально
2. Создать архив и залить на хостинг:
   ```bash
   cd C:\Projects\PokerTable
   tar -czf bot.tar.gz --exclude=node_modules --exclude=bot.db --exclude=.gitignore -C bot .
   curl -T bot.tar.gz ftp://sharkbqo.beget.tech/ --user "sharkbqo_21:qqA1HP5k5ay&"
   ```
3. На VPS выполнить (одна строка):
   ```bash
   curl -sL sharkbqo.beget.tech/update.sh | bash
   ```

**Примечание:** `update.sh` сохраняет `.env`, удаляет старые файлы, распаковывает архив и перезапускает бота.

## Cloudflare Worker

```bash
cd C:\Projects\PokerTable\worker
npx wrangler deploy
```

Worker URL: https://poker-diary-license.sharkbay2226.workers.dev

## Тестирование полного цикла покупки

1. Откройте https://t.me/PokerDiary_Bot
2. `/buy` → выберите тариф → получите кошелёк и сумму
3. Отправьте USDT (TRC-20) на указанный кошелёк
4. `/confirm <ID_ЗАКАЗА> <TXID>` → бот проверит транзакцию через TRONGrid
5. Получите лицензионный ключ
6. Откройте приложение → Menu → Ввести ключ → Онлайн-активация

## Структура проекта

| Папка | Назначение |
|-------|-----------|
| `src/` | React фронтенд (Vite + Ant Design) |
| `electron/` | Electron main + preload + license |
| `server/` | JSON API сервер (встроенный в EXE) |
| `bot/` | Telegram бот (на VPS, grammy + SQLite) |
| `worker/` | Cloudflare Worker + D1 (лицензии) |

## Файлы на хостинге (sharkbqo.beget.tech)

| Файл | Назначение |
|------|-----------|
| `manage.php` | Веб-форма управления промокодами |
| `m.sh` | Скрипт для VPS: забирает команду, выполняет, загружает результат |
| `worker.mjs` | Node.js скрипт: читает команду, работает с SQLite БД |
| `report.sh` | Скрипт для VPS: генерирует HTML-отчёт и загружает на хостинг |
| `report.mjs` | Генератор HTML-отчёта |
| `update.sh` | Скрипт обновления бота на VPS |
| `bot.tar.gz` | Архив с ботом для деплоя |

## Цены

| Тариф | Цена |
|-------|------|
| Месячная | $5 |
| Годовая | $25 |
| Бессрочная | $50 |

## Ссылки

- Бот: https://t.me/PokerDiary_Bot
- Worker: https://poker-diary-license.sharkbay2226.workers.dev
- GitHub: https://github.com/sharkbay2226-cloud/PokerTable
- Управление промо: http://sharkbqo.beget.tech/manage.php
