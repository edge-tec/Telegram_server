# TeleFlow MTProto — Production-Grade Telegram Auto Responder & Follow-up Platform

An enterprise-ready **Telegram Personal Account Auto Responder and Multi-Step Follow-up Automation Platform** built with **Laravel 12**, **React 18 (TypeScript) with Modern Light Theme**, **Python Telethon MTProto Bridge Daemon**, **MySQL 8 (UUIDs, utf8mb4)**, and **Redis Queue**.

Unlike Bot API solutions, this platform directly connects to **Telegram Personal User Accounts** via the MTProto protocol, reads incoming private messages, provides instant or delayed auto-replies with dynamic variables, executes multi-step drip nurture campaigns, and features a full Conversation CRM Inbox with multimedia support.

---

## 🚀 Key Features

### 1. Telegram Account Integration (MTProto Protocol)
- **No Bot API Limitations**: Connects directly via Telegram MTProto API (`Telethon`).
- **Phone & OTP Verification**: Two-step login modal requiring phone number, API ID, API Hash, SMS/Telegram OTP, and optional 2FA Cloud Password.
- **AES-256-GCM Security**: All sessions, phone numbers, and API credentials are encrypted with AES-256-GCM authenticated encryption before saving to MySQL.
- **Multi-Account Support**: Add unlimited personal Telegram accounts with quick account switching and individual listener controls.

### 2. Real-Time Inbound Message Listener
- Background Python daemon constantly listening for incoming private messages (`events.NewMessage(incoming=True, func=lambda e: e.is_private)`).
- Automatically captures Sender Telegram ID, Username, First/Last Name, and Phone.
- Detects message type: **Text, Photo, Video, Voice Note, Audio, Sticker, GIF, Document**.
- Downloads incoming media assets and securely forwards normalized payloads to the Laravel webhook (`/api/internal/telegram/webhook`).

### 3. Auto-Reply Engine with Delays & Dynamic Variables
- **Dynamic Personalization**: Auto-replaces `{{first_name}}`, `{{last_name}}`, `{{username}}`, `{{phone}}`, `{{current_date}}`, and `{{current_time}}`.
- **Flexible Timing Strategies**:
  - *Instant Reply*
  - *Fixed Delays* (Custom Seconds, Minutes, Hours, or Days)
  - *Random Jitter* (e.g. reply between 20 to 40 seconds to emulate authentic human typing)
- **Multi-format Responses**: Supports Plain Text, Photo + Caption, Video, Voice Notes, Audio files, PDFs, DOCX, and ZIP archives.

### 4. Keyword Auto-Reply System
- Supports multiple comma-separated keywords per rule.
- **Match Types**: Exact Phrase Match or Substring Contains Match.
- Case-sensitive or Case-insensitive evaluation.
- **Priority-Driven**: Configurable integer priorities ensuring critical rules execute first.

### 5. Multi-Step Follow-up Drip Campaigns
- Unlimited multi-step nurture sequences.
- Step timeline builder with individual delay intervals (e.g. Step 1: Instant Welcome; Step 2: 30-min Check-in; Step 3: 6-hour Case Study; Step 4: 24-hour Reminder; Step 5: 3-day Final Check-in).
- **Reply Action Logic**:
  - `Stop Sequence`: Automatically cancels future pending steps if the user replies.
  - `Continue`: Delivers full drip campaign regardless of user messages.
  - `Restart`: Re-enrolls contact from Step 1 upon reply.
  - `Pause`: Temporarily holds pending steps.

### 6. Automated Blacklist & Stop Rules
- Built-in anti-spam safety: if a contact texts `STOP`, `CANCEL`, or `UNSUBSCRIBE`, the engine instantly terminates scheduled messages and restricts further automation.
- Manual blacklist controls in Conversation CRM.

### 7. Conversation CRM Inbox
- Two-column split layout with real-time message stream.
- Inbound and outbound message bubbles with delivery timestamps and status badges.
- Right-hand contact drawer with customer details, custom tag manager, auto-saving agent notes, and live manual reply composer.

### 8. Reusable Media Asset Library
- Upload and manage JPG, PNG, WEBP, GIF, MP4, MOV, MP3, OGG, PDF, DOCX, and ZIP files.
- Visual thumbnail previews, file size formatting, and one-click attachment to any reply template.

### 9. Analytics Dashboard
- KPI overview: Total Incoming Inquiries, Auto Replies Sent, Active Queue Count, Delivery Success Rate.
- Interactive **Recharts**: 7-day Activity Area Chart, Queue Breakdown Donut, and Campaign Conversion Funnel.

---

## 🛠️ Architecture & Tech Stack

| Tier | Technology | Description |
|---|---|---|
| **Backend API** | Laravel 12 (PHP 8.4+) | REST API, Sanctum Auth, Eloquent UUID Models, Services, Queue Jobs, Commands |
| **Telegram Client** | Python 3.9+ / Telethon | FastAPI daemon managing MTProto connections and event listeners |
| **Frontend** | React 18, TypeScript, Tailwind CSS | Modern Light Theme SPA, TanStack Query, Recharts, Lucide Icons |
| **Database** | MySQL 8 (utf8mb4, UUIDs) | 15 tables with foreign keys, indexes, and soft deletes |
| **Queue & Cache** | Redis 7 | Background queue execution with exponential backoff retries |

---

## 📁 Repository Structure

```
.
├── backend/                   # Laravel 12 API Application
│   ├── app/
│   │   ├── Console/Commands/  # ProcessScheduledMessages.php (Minute Scheduler)
│   │   ├── Http/Controllers/  # REST API Controllers
│   │   ├── Jobs/              # SendTelegramMessageJob.php (Redis Worker)
│   │   ├── Models/            # Eloquent Models with UUIDs and AES Encryption
│   │   └── Services/          # EncryptionService, BridgeClient, KeywordMatcher, etc.
│   ├── database/migrations/   # Full MySQL 8 schema with UUIDs
│   ├── database/seeders/      # Idempotent DatabaseSeeder with demo records
│   ├── routes/api.php         # REST API endpoints
│   └── tests/Feature/         # Automated test suite
├── telegram-bridge/           # Python MTProto Microservice
│   ├── client_manager.py      # Telethon session and event listener pool
│   ├── server.py              # FastAPI microservice on port 8001
│   ├── security.py            # AES-256-GCM helper routines
│   └── requirements.txt       # telethon, fastapi, uvicorn, pydantic, httpx
├── frontend/                  # React 18 + TypeScript SPA
│   ├── src/
│   │   ├── api/client.ts      # Axios API client & TypeScript interfaces
│   │   ├── components/        # Sidebar, Header, OtpModal
│   │   └── pages/             # Dashboard, Accounts, Inbox, Templates, Campaigns, etc.
│   ├── tailwind.config.js     # Modern Light Theme design tokens
│   └── package.json
├── docker-compose.yml         # MySQL 8, Redis, Backend, Python Bridge
├── start-dev.sh               # One-click launcher for all 3 tiers
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- PHP 8.2+ and Composer
- Node.js 18+ and npm
- Python 3.9+ with `venv`

### 1. Launch Everything with One Command
Run the master development runner from the root directory:
```bash
./start-dev.sh
```

This starts:
1. **Python MTProto Bridge** at `http://127.0.0.1:8001`
2. **Laravel 12 API** at `http://127.0.0.1:8000`
3. **React Modern Light UI** at `http://127.0.0.1:5173`

### 2. Default Login Credentials
- **Email:** `admin@telegram.local`
- **Password:** `Password123!`

---

## 🐳 Docker Deployment (Production)

Deploy the entire production stack using Docker Compose:

```bash
docker compose up -d --build
```

This boots:
- MySQL 8 container with utf8mb4 collation and persistent volume
- Redis 7 container
- Python Telethon MTProto Bridge container
- Laravel 12 Backend with migrations, seeders, and Redis queue workers

---

## 🧪 Running Automated Tests

Run the backend feature and unit test suite:

```bash
cd backend
php artisan test
```

### Verified Test Suite:
- `test_aes_256_gcm_encryption_and_decryption`: Verifies cryptographic integrity of MTProto session tokens.
- `test_variable_replacer_service`: Verifies accurate substitution of dynamic tags (`{{first_name}}`, `{{username}}`, etc.).
- `test_stop_trigger_keyword_detection`: Tests automated blacklisting on `STOP`, `CANCEL`, `UNSUBSCRIBE`.
- `test_keyword_matcher_finds_rule`: Tests rule priority and substring matching.
- `test_inbound_webhook_processes_message`: Verifies end-to-end inbound webhook ingestion.
- `test_analytics_dashboard_endpoint`: Tests dashboard KPI and trends calculation.

---

## 🔒 Security Best Practices
- **AES-256-GCM**: Credentials and MTProto session tokens are encrypted with authenticated AES-256-GCM. Secret values are never exposed in frontend API responses.
- **Internal Webhook Signature**: Communication between the Python MTProto daemon and the Laravel backend is protected with the `X-Bridge-Secret` header.
- **Role-Based Access Control**: Four user tiers: *Super Admin*, *Admin*, *Manager*, and *Support Agent*.
- **Anti-Spam Idempotency**: Scheduled queue jobs use database record locking and retry tracking to prevent duplicate message dispatches.
