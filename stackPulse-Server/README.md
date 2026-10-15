# StackPulse API

Backend for StackPulse: look up GitHub developers, compare them side by side, and (when logged in) pin and annotate repositories and save comparisons. The React frontend lives in the sibling `stackpulse-web` repo.

Stack: Node 22, Express 5, TypeScript, Sequelize v7 (MySQL), Zod, JWT access tokens with rotating refresh tokens in an httpOnly cookie, Vitest + Supertest.

## Quick start

Prerequisites: Node 22+ and MySQL 8+ (local install, or `docker compose up -d`).

```bash
npm install
cp .env.example .env.development      # set JWT_ACCESS_SECRET and, ideally, GITHUB_TOKEN
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS stackpulse_dev; CREATE DATABASE IF NOT EXISTS stackpulse_test;"
npm run db:migrate
npm run db:migrate:test
npm run db:seed                       # optional: demo user + sample data (needs network)
npm run dev                           # http://localhost:3005
```

The seeded demo login is `demo@stackpulse.dev` / `stackpulse-demo`.

Without `GITHUB_TOKEN` GitHub allows 60 requests per hour, which is enough for a quick look but not for repeated comparisons. A token with no scopes raises that to 5,000.

## Scripts

| Script                                   | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| `npm run dev`                            | API with file watching                     |
| `npm test` / `npm run test:run`          | Vitest (watch / single run)                |
| `npm run lint`, `npm run type-check`     | ESLint, `tsc --noEmit`                     |
| `npm run db:migrate` / `db:migrate:undo` | Apply or revert migrations (sequelize-cli) |
| `npm run db:migrate:test`                | Migrate the test database                  |
| `npm run db:seed`                        | Demo user, developers, pins, a comparison  |
| `npm run migration:generate -- <name>`   | New migration file                         |

Tests use the `stackpulse_test` database and a fake GitHub (`src/tests/fakeGithub.ts`), so they never call the network.

## Environment variables

| Variable                                              | Purpose                                         |
| ----------------------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`, `PORT`, `LOG_LEVEL`                       | Runtime                                         |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_NAME_TEST`       | MySQL connection and database names             |
| `DB_USERNAME`, `DB_PASSWORD`                          | MySQL credentials                               |
| `JWT_ACCESS_SECRET` (32+ chars), `JWT_ACCESS_TTL_SEC` | Access token signing and lifetime               |
| `REFRESH_TTL_DAYS`, `COOKIE_SECURE`                   | Refresh cookie lifetime, `Secure` flag          |
| `CORS_ORIGIN`                                         | Frontend origin (credentials allowed)           |
| `GITHUB_TOKEN`, `GITHUB_API_URL`                      | GitHub access (token optional)                  |
| `GITHUB_PROFILE_TTL_MIN`                              | How long a profile is fresh before revalidation |
| `GITHUB_TOP_K_REPOS`, `GITHUB_CONCURRENCY`            | Enrichment sample size and parallel request cap |

## API overview

All routes are under `/api/v1`. Success: `{ "success": true, "data": ..., "meta"?: ... }`. Error: `{ "success": false, "message", "correlationId", "details"? }`.

| Method and path                                            | Auth         | Purpose                                                 |
| ---------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `GET /health`                                              | no           | Liveness and database status                            |
| `POST /auth/signup`, `/auth/login`                         | no           | Create account / sign in; returns access token + cookie |
| `POST /auth/refresh`, `/auth/logout`; `GET /auth/me`       | cookie / yes | Rotate refresh token, sign out, current user            |
| `GET /developers/:username`                                | yes          | Profile + metrics; enrichment continues in background   |
| `POST /developers/:username/refresh`                       | yes          | Force a revalidation of a developer                     |
| `GET /developers/recent`                                   | yes          | Recently looked-up developers                           |
| `GET /developers/:username/repos`                          | yes          | Paginated, sortable, filterable repositories            |
| `GET /compare?usernames=a,b,c`                             | yes          | 2 to 5 developers, partial results, per-metric leaders  |
| `GET/POST /pins`, `GET/PATCH/DELETE /pins/:id`             | yes          | Pinned repos with notes and tags                        |
| `GET/POST /comparisons`, `GET/PUT/DELETE /comparisons/:id` | yes          | Saved comparisons (membership only, metrics are live)   |

## Design notes and trade-offs

- **GitHub rate limits.** A cold profile costs about 2 + K requests (K = top repositories sampled for languages and commits); a warm one costs 0. The database is the cache: TTL freshness, ETag revalidation (304s are free), commits re-fetched only when `pushedAt` changes, stale data served for up to 7 days if GitHub fails, a per-process request gate, single-flight de-duplication of concurrent loads, and a tracker for `X-RateLimit-*` headers that pauses enrichment when quota is low.
- **Two-phase load.** The profile returns immediately with core metrics; commits and languages are filled in by a background job (`enrichmentStatus`: pending, running, ready, partial, failed) and resumed after a restart.
- **Sampling.** Languages and commit activity are computed from the most recently pushed K repositories, trading accuracy for request budget. GraphQL would remove most of this cost and is the natural next step.
- **Privacy.** Developer data is shared public data; pins and comparisons are private and every query is scoped by `userId`. Another user's resource returns 404, not 403.
- **Auth.** Short-lived access token plus a rotating, hashed refresh token in an httpOnly cookie with reuse detection (a short grace window tolerates double submits from two tabs). Passwords use argon2.
- **MySQL, not PostgreSQL.** The brief suggests PostgreSQL; this project uses MySQL to match the starter template. Equivalent features were rebuilt in code: zero-filled weekly series, JSON tags, and key-based upserts instead of range deletes (InnoDB gap locks deadlocked under concurrent enrichment).
- **Database as cache, not Redis.** One datastore, durable, and aggregates are queryable. Redis would be added for multi-instance rate-limit state and shared single-flight.
- **In-process enrichment queue.** Simple and good enough for one instance; a durable queue (BullMQ or similar) would be needed to scale out.
- **Deliberately omitted.** Email verification, password reset, OAuth login, deployment config, GraphQL.
