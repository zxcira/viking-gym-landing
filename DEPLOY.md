# Викинг — деплой на Cloudflare Pages

## Зачем
GitHub Pages — статика, `/api/lead` там не работает.
Cloudflare Pages бесплатный и выполняет `functions/api/lead.js`.

## Разовая настройка
1. Регистрация: https://dash.cloudflare.com/sign-up
2. В папке `viking-gym`:
   ```bash
   npx wrangler login
   npx wrangler pages project create viking-gym --production-branch main
   ```
3. Секреты:
   ```bash
   npx wrangler pages secret put TELEGRAM_BOT_TOKEN
   npx wrangler pages secret put TELEGRAM_CHAT_ID
   ```
4. Деплой:
   ```bash
   npx wrangler pages deploy . --project-name=viking-gym --branch=main
   ```

## Проверка
Открыть сайт, заполнить форму, нажать «Отправить заявку» — в Telegram должно прийти сообщение «Новая заявка (Викинг)» с именем, телефоном и интересующей услугой.

## Локально
```bash
node tools/leads-server.mjs
# http://localhost:4182
```
Без Telegram-токенов заявки пишутся в `заявки.csv` и выводятся в консоль.