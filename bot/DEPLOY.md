# Deploy Telegram Bot @PokerDiary_Bot

## Requirements
- Node.js 20+
- VPS (Windows/Linux)
- USDT TRC-20 wallet address
- TRONGrid API key (free: https://trongrid.io)

## Setup

1. Copy `.env.example` to `.env` and fill in:
   ```
   BOT_TOKEN=                  # from @BotFather
   USDT_WALLET=                # your TRC-20 wallet (base58)
   TRONGRID_API_KEY=           # optional
   ADMIN_IDS=                  # your Telegram user IDs
   ```

2. Install & start:
   ```bash
   cd bot
   npm install
   npm start
   ```

3. For production:
   ```bash
   npm install -g pm2
   pm2 start index.js --name poker-diary-bot
   pm2 save
   pm2 startup
   ```

## Commands
- `/start` — welcome + referral tracking
- `/buy` — choose plan, get wallet address
- `/confirm <order_id> <txid>` — verify payment
- `/activate <challenge>` — sign offline challenge
- `/mykey` — show licenses
- `/promo <code>` — apply promo
- `/ref` — referral link

## Promo Codes
Add manually via SQL:
```sql
INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at)
VALUES ('WELCOME20', 20, 100, '2027-12-31');
```
