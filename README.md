# ElderlyConnect

A senior-friendly learning and health companion web app. Built for an end-semester project.

## What it does

- **Step-by-step tutorials** for popular apps: WhatsApp, YouTube, Email, Facebook, Chrome
- **AI Tutor chat** with voice input + text-to-speech (English, Telugu, Hindi)
- **Reminders** for medication, exercise, breaks
- **Health metrics** dashboard (heart rate, steps, blood oxygen, sleep)
- **Achievements & learning progress** tracking
- **Privacy education** section to keep seniors safe online
- **SOS help button** floating on every page
- **Senior-optimized UI**: large fonts, big touch targets, high contrast, dark mode, 3 languages

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind, shadcn/ui, wouter, TanStack Query |
| Backend | Express, TypeScript, express-session |
| Database | MySQL 8 via `mysql2` + Drizzle ORM |
| Auth | Username + password (scrypt hash), session cookies |
| Voice | Web Speech API (browser-native, no external service) |

## Prerequisites

- Node.js 20+
- MySQL 8 (or any MySQL 5.7+)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the MySQL database & user

Open the MySQL CLI as root and run:

```sql
CREATE DATABASE elderlyconnect;
CREATE USER 'elderly_app'@'localhost' IDENTIFIED BY 'elderly2026';
GRANT ALL ON elderlyconnect.* TO 'elderly_app'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your DB credentials:

```
DATABASE_URL=mysql://elderly_app:elderly2026@localhost:3306/elderlyconnect
SESSION_SECRET=replace-with-a-long-random-string-min-32-chars
PORT=5000
```

### 4. Push the schema to MySQL

```bash
npm run db:push
```

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:5000 — create an account on the **Sign Up** tab, log in, and the dashboard will be pre-seeded with sample reminders, health metrics, achievements, and a completed WhatsApp tutorial.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server with Vite HMR on port 5000 |
| `npm run build` | Build the production bundle into `dist/` |
| `npm start` | Run the production build (requires `npm run build` first) |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Sync the Drizzle schema to MySQL |
| `npm run seed <username>` | Add sample data to an existing user |

## Project structure

```
ElderlyConnect/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components (shadcn, SOSButton, etc.)
│       ├── contexts/       # AuthContext, LanguageContext
│       ├── data/           # i18n translations
│       ├── lib/            # queryClient, utils
│       └── pages/          # 11 routed pages
├── server/
│   ├── app.ts              # Express + session setup
│   ├── auth.ts             # scrypt password hashing
│   ├── db.ts               # MySQL pool + drizzle
│   ├── routes.ts           # All API routes
│   ├── storage.ts          # DbStorage (MySQL-backed)
│   ├── index-dev.ts        # Dev entry
│   ├── index-prod.ts       # Prod entry
│   └── seed.ts             # CLI seed script
├── shared/
│   └── schema.ts           # Drizzle schema (single source of truth)
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## API endpoints

### Public
- `POST /api/users/register` — create account, returns user
- `POST /api/users/login` — start session, returns user
- `POST /api/auth/logout` — destroy session
- `GET  /api/auth/me` — current user (401 if not logged in)
- `POST /api/ai-tutor` — chat with the knowledge-base tutor

### Authenticated (session cookie required)
- `PATCH /api/users/me` — update language / audio settings
- `GET  /api/conversations` — list this user's saved chat sessions
- `POST /api/conversations` — save a new chat session
- `GET  /api/conversations/:id` — get one
- `PATCH /api/conversations/:id` — update (e.g. add messages)
- `DELETE /api/conversations/:id` — delete
- `GET  /api/progress` — list learning progress rows
- `POST /api/progress` — start a tutorial
- `PATCH /api/progress/:id` — mark complete
- `GET  /api/health` — latest health metrics snapshot
- `POST /api/health` — record a new reading
- `GET  /api/reminders` — list reminders
- `POST /api/reminders` — create one
- `PATCH /api/reminders/:id` — mark done/undone
- `GET  /api/achievements` — list earned achievements
- `POST /api/achievements` — award one
- `POST /api/seed` — populate this user with sample data

## Deployment

1. Provision a MySQL database (any host).
2. Set `DATABASE_URL` and `SESSION_SECRET` env vars on the host.
3. `npm run build` then `npm start`.
4. The server listens on `0.0.0.0:5000` (or the `PORT` env var).

Works on: any VPS, Replit, Railway, Render, Fly.io, AWS, etc.

## Security

- Passwords are hashed with **scrypt** (Node built-in, no native deps).
- Sessions are stored server-side (in-memory via `memorystore` for single-process deploys; swap in `express-mysql-session` for multi-process).
- All authenticated routes check `req.session.userId` — there is no way to access another user's data.
- Cookies are `httpOnly`, `sameSite=lax`, `secure` in production.
- `.env` is git-ignored; only `.env.example` is committed.

## Demo credentials

After running `npm run db:push`, create any account via the **Sign Up** form. The dashboard is auto-seeded with sample data on first registration.

## License

MIT
