# Gym Tracker

A full-stack gym workout tracker built with **Next.js 16**, **Prisma 7**, **Auth.js v5**, and **Recharts**. Track exercises, body metrics, and view your progress over time with beautiful charts.

---

## Features

- **Google OAuth login** (Apple OAuth ready — just add credentials)
- **30-day sessions** — stay logged in without re-authenticating daily
- **Body metrics tracking** — weight (kg) + body fat % with pencil-icon edit (append-only history)
- **16 built-in exercises** across Upper Body, Lower Body, and Bodyweight categories
- **3 sets × reps + kg** per machine exercise; reps-only for bodyweight
- **Custom exercises** — add your own and persist them
- **Pin & reorder** exercises per user
- **Append-only history** — previous entries are never overwritten
- **Reports page** — weight/body fat trend charts, exercise progress charts, personal records
- **URL-driven filters** — week/month/year + exercise picker, bookmarkable
- **Dark mode** — system preference + manual toggle
- **Responsive** — works on mobile, tablet, and desktop

---

## Navigation Approach

This app uses **two top-level tabs** (Workout / Reports) rendered in the navbar. This is the most ergonomic choice for a two-page app: tabs are always visible, one tap to switch, and they scale well on mobile without requiring a sidebar or hamburger menu.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | TailwindCSS v4 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Auth | Auth.js v5 (`next-auth@beta`) + `@auth/prisma-adapter` |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Validation | Zod 4 |
| Testing | Vitest + React Testing Library |
| Deploy | Vercel (frontend) + Neon (managed Postgres) |
| Local DB | Docker Compose |

---

## Local Setup

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL) OR any Postgres instance

### 1. Clone and install

```bash
cd gym-tracker
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

```bash
# Database — these defaults match docker-compose.yml
DATABASE_URL="postgresql://gymuser:gympass@localhost:5432/gymtracker"

# Auth.js — generate a secret:
# openssl rand -base64 32
AUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (required for login — see step 3)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

### 3. Set up Google OAuth

1. Go to [Google Cloud Console → APIs → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://yourdomain.com/api/auth/callback/google` (production)
4. Copy the Client ID and Secret into `.env`

### 4. Set up Apple Sign In (optional)

1. Apple Developer account required
2. Create a **Services ID** at [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list/serviceId)
3. Enable "Sign In with Apple" and add your domain + redirect URL
4. Create a private key, note your Team ID + Key ID
5. Set in `.env`:
   ```bash
   AUTH_APPLE_ID="your.services.id"
   AUTH_APPLE_SECRET='{"teamId":"TEAMID","privateKey":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----","keyId":"KEYID"}'
   ```
6. Uncomment the Apple provider in `src/auth.ts` and the Apple button in `src/app/(auth)/login/page.tsx`

### 5. Start the database

```bash
# Start PostgreSQL container
docker compose up -d

# Run migrations
npm run db:migrate

# Seed default exercises (16 exercises)
npm run db:seed
```

### 6. Run the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (runs `prisma migrate deploy` automatically) |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:seed` | Seed default exercises |
| `npm run db:studio` | Open Prisma Studio (DB browser) |
| `npm run db:reset` | Reset database (dev only!) |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Database Schema

```
User ←── Account (OAuth)
     ←── Session
     ←── BodyMetricEntry   (append-only, weightKg + bodyFatPct)
     ←── WorkoutSession    (one per user per day)
               └── ExerciseSet  (append-only, reps + weightKg)
     ←── Exercise          (user custom exercises)
     ←── UserExerciseSetting (pin + reorder per user)

Exercise (isDefault=true = system exercises from seed)
```

**Append-only invariant**: `ExerciseSet` and `BodyMetricEntry` rows are **never updated or deleted**. Each save creates new rows. The UI shows the latest recorded state; full history is preserved for progress tracking.

---

## Deployment to Vercel + Neon

### 1. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) (free tier available)
2. Create a new project
3. Copy the **pooled connection string** (with `?pgbouncer=true&connection_limit=1` appended)

### 2. Deploy to Vercel

```bash
npm install -g vercel
vercel link
vercel env add DATABASE_URL    # Neon pooled connection string
vercel env add AUTH_SECRET     # openssl rand -base64 32
vercel env add NEXTAUTH_URL    # https://your-app.vercel.app
vercel env add AUTH_GOOGLE_ID
vercel env add AUTH_GOOGLE_SECRET
vercel --prod
```

### 3. Seed production data (first deploy only)

```bash
# Pull production env vars locally, then seed
vercel env pull .env.production.local
source .env.production.local && npm run db:seed
```

### 4. Update OAuth redirect URIs

In Google Cloud Console, add:
- `https://your-app.vercel.app/api/auth/callback/google`

---

## Project Structure

```
gym-tracker/
├── prisma/
│   ├── schema.prisma          # All DB models
│   └── seed.ts                # Default exercises seed
├── prisma.config.ts           # Prisma 7 config
├── docker-compose.yml         # Local PostgreSQL
├── src/
│   ├── auth.ts                # Auth.js v5 (Google + Apple)
│   ├── middleware.ts           # Route protection
│   ├── app/
│   │   ├── (auth)/login/      # Login page
│   │   ├── (app)/
│   │   │   ├── layout.tsx     # Protected shell + Navbar
│   │   │   ├── workout/       # Exercise input page
│   │   │   └── reports/       # Charts + PRs page
│   │   └── api/auth/          # Auth.js handler
│   ├── components/
│   │   ├── ui/                # Button, Card, Input, Modal, Toast, Badge
│   │   ├── layout/            # Navbar
│   │   ├── workout/           # ExerciseCard, SetRow, WorkoutForm, AddCustomExercise
│   │   ├── metrics/           # MetricsCards (weight + body fat)
│   │   └── reports/           # WeightTrendChart, ExerciseProgressChart, PRCards, ReportFilters
│   ├── actions/               # Next.js Server Actions
│   ├── lib/
│   │   ├── prisma.ts          # Prisma singleton with PrismaPg adapter
│   │   ├── auth-helpers.ts    # requireAuth(), getCurrentUserId()
│   │   ├── utils.ts           # cn(), date helpers, formatters
│   │   └── services/          # workoutService, metricsService, reportService, exerciseService
│   ├── types/                 # Shared TypeScript types
│   └── constants/             # Exercise group labels
└── .env.example               # Environment variable template
```

---

## Version Control Guidelines (for Claude Code)

These rules apply every time code changes are made in this repo. Follow them even without prior context.

### Branching

- `main` is the stable branch — never commit directly to it for features
- Create a feature branch for every new feature or significant change:
  ```bash
  git checkout main && git pull
  git checkout -b feature/<short-description>
  ```
- Hotfixes (typos, broken builds) can go directly on `main` with a single commit

### When to commit

Commit at these natural checkpoints — not too often, not too rarely:

| Trigger | Example |
|---------|---------|
| A feature is fully working end-to-end | Withings OAuth connect + callback + sync |
| A bug is fixed and verified | BigInt overflow in grpid fixed |
| A schema migration is created | After `prisma migrate dev` |
| A meaningful UI change is complete | Chart range, hydration fix |
| Before switching to a different task | Always commit WIP before context switch |

**Never commit:** broken builds, half-implemented features, `.env` with real secrets, `node_modules/`, `.next/`.

### Commit message format

```
<type>: <short summary (max 72 chars)>

- Bullet describing what changed and why
- Another bullet if multiple areas were touched

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` / `fix` / `chore` / `refactor` / `docs` / `test`

### Merging

After a feature branch is complete and tested:

```bash
git checkout main
git merge feature/<name> --no-ff -m "Merge branch 'feature/<name>'\n\n<summary>"
git branch -d feature/<name>   # delete local branch after merge
```

Use `--no-ff` to preserve branch history in the log.

### Recovering context after memory loss

If starting fresh with no memory of previous work:

```bash
git log --oneline -10          # see what was done
git show HEAD                  # inspect latest commit
git branch -a                  # check open branches
git diff main..HEAD            # if on a feature branch, see what's pending
```

Then read `README.md` (this file) and `MEMORY.md` in `~/.claude/projects/` to restore context.

### What NOT to do

- Do not `git push --force` to `main`
- Do not `git reset --hard` without confirming with the user
- Do not amend commits that have already been merged
- Do not commit `.env` — it is gitignored for a reason

---

## Security

- All server actions call `getCurrentUserId()` first — unauthenticated requests are rejected
- All Prisma queries filter by `userId` — users see only their own data
- `.env` is gitignored; `.env.example` is the committed template
- Auth.js handles CSRF protection via signed tokens
- Input validated with Zod on the server before any DB writes

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Append-only `ExerciseSet` and `BodyMetricEntry` | Preserves full history. Never overwriting means you can chart your entire journey. |
| `WorkoutSession.date` as `@db.Date` | Efficient date-range queries; one logical session per calendar day. |
| Server Actions (not REST API) | Colocates validation + DB calls; automatic CSRF safety; simpler than separate API routes. |
| URL-driven report filters | Bookmarkable, shareable; server components read `searchParams` directly. |
| Database sessions (not JWT) | Required for Prisma adapter; supports multi-device; 30-day TTL = "stay logged in". |
| Prisma 7 with `@prisma/adapter-pg` | Prisma 7 dropped built-in connection management; explicit adapter enables serverless compatibility. |
