# Gym Tracker — Architecture & Technical Reference

> Last updated: 2026-03-15

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Development Environment](#development-environment)
4. [Production Environment](#production-environment)
5. [Project Structure](#project-structure)
6. [Authentication](#authentication)
7. [Database](#database)
8. [Server Actions Pattern](#server-actions-pattern)
9. [Key Services & Integrations](#key-services--integrations)
10. [Environment Variables](#environment-variables)
11. [Deployment](#deployment)
12. [Critical Gotchas & Invariants](#critical-gotchas--invariants)

---

## Overview

Gym Tracker is a full-stack web application built with **Next.js 16 (App Router)**. Everything — UI, API logic, authentication, database access — lives in one TypeScript codebase. There is no separate backend server; Next.js handles both the React frontend and server-side logic via Server Components and Server Actions.

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | App Router, `src/` directory |
| Language | TypeScript | ^5 | Strict mode |
| UI | React | 19.2.3 | Server + Client Components |
| Styling | TailwindCSS | v4 | CSS-first config (`@import "tailwindcss"`) |
| Dark mode | TailwindCSS v4 | — | `@variant dark (&:where(.dark, .dark *))` |
| Icons | lucide-react | ^0.576.0 | — |
| ORM | Prisma | 7.4.2 | Uses driver adapter, no `url` in datasource |
| DB Driver | `@prisma/adapter-pg` + `pg` | 7.4.2 / 8.19.0 | Required for Prisma 7 |
| Auth | Auth.js (next-auth) | v5 beta | JWT sessions, PrismaAdapter |
| Validation | Zod | v4.3.6 | Use `.issues` not `.errors` |
| Charts | Recharts | ^3.7.0 | Reports page |
| State/fetch | TanStack Query | ^5 | Client-side data fetching |
| Runtime | Node.js | >=22.0.0 | — |

---

## Development Environment

### Prerequisites
- Node.js >= 22
- Homebrew PostgreSQL 16 (`brew services start postgresql@16`)
- Docker is **not** used — Postgres runs natively via Homebrew

> Note: A `docker-compose.yml` exists in the repo but is not used locally. Homebrew Postgres is running directly on port 5432.

### Local Database
```
Host:     localhost:5432
User:     gymuser
Password: gympass
Database: gymtracker
```
`gymuser` has `CREATEDB` permission — required for Prisma to create the shadow database during `migrate dev`.

### Running Locally
```bash
brew services start postgresql@16   # ensure Postgres is running
npm run dev                          # starts Next.js on http://localhost:3000
```

### Database Commands
```bash
npm run db:migrate   # prisma migrate dev — create + apply new migrations
npm run db:push      # prisma db push — quick schema sync (no migration file)
npm run db:studio    # prisma studio — GUI to browse/edit data
npm run db:seed      # run prisma/seed.ts
npm run db:reset     # reset DB and re-run all migrations
```

### Auth Redirect URIs (local)
- Google OAuth: `http://localhost:3000/api/auth/callback/google`
- Withings OAuth: `http://localhost:3000/api/withings/callback`

---

## Production Environment

### Hosting — Vercel
- Auto-deploys on push to `main`
- Each Server Action and API Route runs as an isolated **serverless function**
- Environment variables configured in Vercel dashboard (Settings → Environment Variables)
- Node.js runtime (not Edge) for all data-fetching paths

### Database — Neon (Serverless Postgres)
- Provider: [neon.tech](https://neon.tech)
- Region: `eu-central-1` (Frankfurt)
- Scales to zero between requests; wakes on first connection
- Uses a **direct** (non-pooled) connection string — no PgBouncer
  - PgBouncer pooled URLs are incompatible with Prisma advisory locks (used during `migrate deploy`)
  - Connection string format: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

### Prisma Migration on Deploy
Migrations run automatically after every production build via the `postbuild` script:
```json
"postbuild": "[ \"$VERCEL\" = \"1\" ] && PRISMA_ADVISORY_LOCK_TIMEOUT_MS=30000 DATABASE_URL=${DIRECT_URL:-$DATABASE_URL} prisma migrate deploy || true"
```
- `PRISMA_ADVISORY_LOCK_TIMEOUT_MS=30000` — increases lock timeout to 30s (default 10s causes timeouts on Neon cold starts)
- `DATABASE_URL=${DIRECT_URL:-$DATABASE_URL}` — uses `DIRECT_URL` if set (non-pooled), otherwise falls back to `DATABASE_URL`
- `|| true` — prevents a failed migration from breaking the entire deploy

If a migration was already manually applied (e.g. via `psql`), resolve it without re-running:
```bash
DATABASE_URL="..." npx prisma migrate resolve --applied <migration_name>
```

---

## Project Structure

```
gym-tracker/
├── prisma/
│   ├── schema.prisma          # Database schema (single source of truth)
│   ├── migrations/            # Versioned SQL migration files
│   ├── seed.ts                # Seed script (default exercises)
│   └── config.ts              # Prisma config (seed path)
│
├── src/
│   ├── auth.ts                # Full Auth.js config (Node.js, uses PrismaAdapter)
│   ├── auth.config.ts         # Edge-safe Auth.js config (no Prisma, used by proxy)
│   ├── proxy.ts               # Next.js 16 middleware (Edge Runtime, auth guard)
│   │
│   ├── app/
│   │   ├── (app)/             # Protected routes (layout requires auth)
│   │   │   ├── workout/       # Workout logging page
│   │   │   ├── planner/       # Calendar workout planner
│   │   │   ├── reports/       # Charts & progress tracking
│   │   │   ├── profile/       # User profile (username, height, photo)
│   │   │   ├── requests/      # Bug reports & feature requests (users)
│   │   │   ├── admin/         # Admin panel (role=ADMIN only)
│   │   │   └── layout.tsx     # Shared layout (navbar, session context)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # Auth.js route handler
│   │   │   ├── withings/            # Withings OAuth + callback
│   │   │   ├── v1/                  # REST API (exercises, workouts, metrics)
│   │   │   └── health/              # Health check endpoint
│   │   └── login/             # Public login page
│   │
│   ├── actions/               # Next.js Server Actions ("use server")
│   │   ├── exercise.ts        # CRUD for exercises + user settings
│   │   ├── workout.ts         # Log workouts, fetch history
│   │   ├── planner.ts         # Planned workouts
│   │   ├── user.ts            # Profile updates
│   │   ├── admin.ts           # User management, impersonation
│   │   └── requests.ts        # Bug/feature request submissions
│   │
│   ├── components/
│   │   ├── layout/            # Navbar, theme toggle
│   │   ├── workout/           # Workout form, exercise cards, tracking mode
│   │   ├── planner/           # Calendar views (week/month/year/all)
│   │   ├── profile/           # Profile edit form, setup modal
│   │   ├── requests/          # Request submit form, admin request list
│   │   └── ui/                # Shared UI primitives
│   │
│   ├── lib/
│   │   ├── prisma.ts          # Singleton PrismaClient (with PrismaPg adapter)
│   │   ├── auth-helpers.ts    # getCurrentUserId, requireAdmin, getSessionContext
│   │   ├── withings.ts        # Withings API client
│   │   └── utils.ts           # cn() utility (clsx + tailwind-merge)
│   │
│   ├── services/              # Business logic (called by actions)
│   │   ├── exerciseService.ts
│   │   ├── workoutService.ts
│   │   ├── plannerService.ts
│   │   └── requestService.ts
│   │
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types (ActionResult, etc.)
│   │
│   ├── constants/
│   │   └── exercises.ts       # MuscleGroup enum + default exercise list
│   │                          # (defined here, NOT from Prisma — keeps client bundles safe)
│   └── generated/
│       └── prisma/            # Auto-generated Prisma client (gitignored)
│
├── ARCHITECTURE.md            # This file
├── BUGSANDREQUESTS.md         # Auto-written when admin accepts a request
├── .env                       # Local environment variables (gitignored)
└── package.json
```

---

## Authentication

Auth.js v5 (`next-auth@beta`) with JWT sessions and Google OAuth.

### Split Config Pattern
Auth.js is configured in two files to work with Next.js 16's Edge Runtime:

| File | Runtime | Purpose |
|---|---|---|
| `src/auth.config.ts` | Edge-safe | Provider config + route guards. No Prisma, no Node.js built-ins. Used by `proxy.ts`. |
| `src/auth.ts` | Node.js only | Extends `auth.config.ts`, adds `PrismaAdapter` to persist sessions/accounts. Used in server components and actions. |

### Session Flow
1. User clicks "Sign in with Google" → redirected to Google OAuth
2. Google redirects back to `/api/auth/callback/google`
3. Auth.js creates/updates `User` + `Account` rows in DB via PrismaAdapter
4. A signed **JWT** is stored in an HttpOnly cookie (30-day expiry)
5. Every request: `proxy.ts` validates the JWT on the Edge, redirects to `/login` if invalid

### Getting the Current User
```ts
import { getCurrentUserId } from "@/lib/auth-helpers";

const userId = await getCurrentUserId();  // throws/redirects if not logged in
```

`getCurrentUserId` also handles **admin impersonation**: if the logged-in user is `ADMIN` and has the `gymtracker_impersonate` cookie set, it returns the target user's ID instead.

### Roles
- `USER` — default, can access all app routes
- `ADMIN` — can access `/admin/*`, impersonate users, manage requests
- Role is stored on the `User` table (`role` field, default `"USER"`)

---

## Database

### Prisma 7 Setup
Prisma 7 no longer reads `DATABASE_URL` from the datasource block directly. Instead it uses a **driver adapter**:

```ts
// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

The `prisma.ts` module also implements the **singleton pattern** to avoid creating multiple connections in development (Next.js hot-reloads would otherwise open a new connection per file save).

### Schema — Key Tables

| Table | Description |
|---|---|
| `User` | Core user record. Includes `username`, `heightCm`, `profileImageBase64`, `role`. |
| `Account` | OAuth accounts linked to a user (Auth.js managed). |
| `Session` | Active sessions (Auth.js managed, used in DB strategy — currently JWT). |
| `Exercise` | Exercise library. `isDefault=true` = global; `createdByUserId` set = user-created. |
| `UserExerciseSetting` | Per-user overrides: `isPinned`, `isHidden`, `sortOrder`, `preferredSets`. |
| `WorkoutSession` | One record per day worked out. |
| `ExerciseSet` | **Append-only.** Individual sets (reps + weight) within a session. |
| `BodyMetricEntry` | **Append-only.** Weight, body fat %, muscle mass. Source: `"manual"` or `"withings"`. |
| `PlannedWorkout` | A single planned workout day on the calendar. |
| `PlannedWorkoutSeries` | Recurring workout rule (weekdays or interval-based). |
| `UserSorryToken` | Monthly "excuse" tokens for missed planned workouts. |
| `UserRequest` | Bug reports and feature requests submitted by users. |
| `WithingsConnection` | OAuth tokens for a user's Withings account. |

### Append-Only Invariant
`ExerciseSet` and `BodyMetricEntry` are **insert-only**. The service layer never calls `.update()` or `.delete()` on these tables. Corrections are made by inserting a new record (the latest value wins). This preserves full history.

### Prisma Client Import
```ts
// Always import from the generated path:
import { PrismaClient } from "@/generated/prisma/client";

// Never import Prisma types in client components — use src/types/index.ts instead.
```

---

## Server Actions Pattern

All data mutations and fetches are done via **Next.js Server Actions** (`"use server"` files in `src/actions/`). There is no separate REST API for app data (the `api/v1/` routes are for external integrations only).

### Standard Pattern
```ts
"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

const Schema = z.object({ ... });

export async function doSomething(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();       // auth check
    const parsed = Schema.safeParse(data);         // validation
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
      //                                    ^^^^^^ Zod v4: use .issues, not .errors
    }
    await prisma.someModel.create({ data: { userId, ...parsed.data } });
    revalidatePath("/relevant-page");
    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong." };
  }
}
```

### ActionResult Type
```ts
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
```

---

## Key Services & Integrations

### Withings
Body composition scale integration. Flow:
1. User clicks "Connect Withings" → `/api/withings/connect` redirects to Withings OAuth
2. Withings redirects to `/api/withings/callback` → tokens stored in `WithingsConnection`
3. User clicks "Sync" → server action fetches measurements via Withings API → inserts into `BodyMetricEntry`
4. Deduplication: `withingsMeasureGrpId` prevents re-inserting the same measurement on re-sync

### Admin Impersonation
Admins can view the app as any user:
1. Admin visits `/admin` → clicks "Impersonate" next to a user
2. `gymtracker_impersonate` cookie is set with the target user's ID (8h expiry)
3. `getCurrentUserId()` returns the target user's ID for all data operations
4. Banner shown at top of every page while impersonating
5. "Stop impersonating" clears the cookie

### Bug/Feature Requests
Users submit bugs or feature requests at `/requests`. Admins triage at `/admin/requests`. When an admin sets a request to `ACCEPTED`, it is automatically appended to `BUGSANDREQUESTS.md` at the project root — making it readable by Claude Code for implementation.

---

## Environment Variables

### Required in all environments

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for JWT signing (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |

### Optional

| Variable | Description |
|---|---|
| `DIRECT_URL` | Non-pooled DB URL (used by migrations if set). Falls back to `DATABASE_URL`. |
| `NEXTAUTH_URL` | Base URL of the app (required locally, auto-set on Vercel) |
| `AUTH_APPLE_ID` | Apple Sign In service ID (not yet configured) |
| `AUTH_APPLE_SECRET` | Apple Sign In private key JSON |
| `WITHINGS_CLIENT_ID` | Withings OAuth app client ID |
| `WITHINGS_CLIENT_SECRET` | Withings OAuth app client secret |
| `WITHINGS_REDIRECT_URI` | Withings OAuth callback URL |

### Generating `AUTH_SECRET`
```bash
openssl rand -base64 32
```

---

## Deployment

### Automatic Deploy (Vercel)
Push to `main` → Vercel runs `next build` → `postbuild` runs migrations → deploy goes live.

### Manual Migration (if needed)
If you need to apply a migration manually (e.g. after a failed deploy):
```bash
# Apply the SQL yourself via psql, then tell Prisma it's done:
DATABASE_URL="your-production-url" npx prisma migrate resolve --applied <migration_folder_name>
```

### Adding a New Migration
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate + apply migration locally:
npm run db:migrate
# → prompts for migration name, creates prisma/migrations/<timestamp>_<name>/migration.sql
# 3. Commit the migration file alongside schema changes
# 4. Push to main → Vercel auto-applies it on deploy
```

---

## Critical Gotchas & Invariants

### Prisma 7 — No `url` in datasource
```prisma
// CORRECT — Prisma 7 with driver adapter
datasource db {
  provider = "postgresql"
  // no url field — connection passed via PrismaPg adapter in code
}
```
Adding `url = env("DATABASE_URL")` will cause a conflict with the adapter.

### Zod v4 — Use `.issues` not `.errors`
```ts
// CORRECT
parsed.error.issues[0]?.message

// WRONG — .errors does not exist in Zod v4
parsed.error.errors[0]?.message
```

### Client Component Safety
Never import `@/generated/prisma/client` in a client component (`"use client"`). It pulls in Node.js built-ins and will break the client bundle. Define shared enums/types in:
- `src/constants/exercises.ts` — MuscleGroup enum
- `src/types/index.ts` — all shared interfaces

### MuscleGroup Enum
`MuscleGroup` is defined in `src/constants/exercises.ts` as a plain JavaScript object, **not** imported from the Prisma client. This is intentional — it makes the enum usable in both server and client components without bundling Prisma's Node.js dependencies into the browser.

### Neon Advisory Lock Timeout
`prisma migrate deploy` acquires a Postgres advisory lock. Neon's serverless cold-starts + the default 10s timeout cause `P1002` errors in production. The `postbuild` script sets `PRISMA_ADVISORY_LOCK_TIMEOUT_MS=30000` to mitigate this.

### Auth.js Split Config
`proxy.ts` (Edge Runtime) **must** only import from `src/auth.config.ts`. Importing from `src/auth.ts` (which uses `PrismaAdapter`) will crash the Edge Runtime because Prisma uses Node.js built-ins.

### Next.js 16 — `proxy.ts` not `middleware.ts`
Next.js 16 renamed the middleware file. The route guard lives in `src/proxy.ts`, not `src/middleware.ts`.

### Singleton Prisma Client
In development, Next.js hot-reloads modules on every change. Without the global singleton pattern in `src/lib/prisma.ts`, every save would open a new DB connection, exhausting the connection pool within minutes.
