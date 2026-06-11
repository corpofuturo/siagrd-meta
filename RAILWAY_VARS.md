# Variables de entorno — Railway

## Obligatorias (el servidor no arranca sin estas)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL Railway (postgres://...) |
| `JWT_SECRET` | Secreto para firmar JWT (mín. 32 chars) |

## Firebase Cloud Messaging (notificaciones PUSH)

| Variable | Descripción |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo de la cuenta de servicio Firebase (escape como string) |

## Telegram (notificaciones canal TELEGRAM)

| Variable | Descripción |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram (obtenido via @BotFather) |
| `TELEGRAM_CHAT_ID` | ID del chat / canal destino |

## WhatsApp Business API (notificaciones canal WHATSAPP)

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_TOKEN` | Token de acceso de la API de WhatsApp Business (Meta) |
| `WHATSAPP_PHONE_ID` | ID del número de teléfono registrado en Meta |
| `WHATSAPP_RECIPIENT_PHONE` | Número destino por defecto (formato internacional, ej. 573001234567) |

## Opcionales

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto HTTP | `3000` |
| `NODE_ENV` | `production` / `development` | `development` |
