# StackPulse - Implementation Plan

Scope: this repo is the **backend** (Express 5 + TypeScript + Sequelize v7 + MySQL, see the status note below). Sections 1-2 cover reverting the starter template, sections 3-9 the backend, section 10 the frontend (separate repo `stackpulse-web`), section 11 delivery.

> **Implementation status and deviations.** The backend is implemented. Where the text below says PostgreSQL, the build uses **MySQL** through Sequelize models, matching the starter template's database (the brief allows this choice). Other differences from this plan:
>
> - Models and migrations are in `src/database/` (sequelize-cli for migrations); tags are stored as a JSON column instead of `text[]`.
> - The weekly commit series is zero-filled in code (`recentWeekStarts`) instead of using `generate_series`.
> - `developers.repos_etag` is stored so the repository list can be revalidated with `If-None-Match` (only for accounts with 100 or fewer repos).
> - The 24h commit refresh was dropped; commits are re-fetched only when a repository's `pushedAt` changes.
> - Range DELETEs were replaced by key-based deletes plus `updateOnDuplicate` upserts, because concurrent enrichment deadlocked on InnoDB gap locks.
> - Refresh-token reuse detection has a short grace window so a double submit from two tabs does not revoke the whole family.
> - The health endpoint is `GET /api/v1/health` and reports database status.
> - Local development only: `docker-compose.yml` is optional (Homebrew MySQL works too), the frontend uses the Vite proxy.

---

## 1. Template audit (what exists today and what is wrong with it)

The starter is a "Hotel" CRUD on **MySQL**. Layering is good and worth keeping: `router -> controller -> service -> repository`, Zod schemas, `AppError` classes, correlation-id logging via `AsyncLocalStorage`, `#` import alias, husky + lint-staged.

| #   | Finding                                                                                                                                                                                                  | Action                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Everything Hotel-related (controller, dto, repository, router, schema, service, model, migration)                                                                                                        | Delete                                                            |
| 2   | MySQL: `@sequelize/mysql`, `mysql2`, `MySqlDialect`, raw MySQL DDL (`AUTO_INCREMENT`, `ON UPDATE CURRENT_TIMESTAMP`), `dialect: "mysql"` in config                                                       | Replace with PostgreSQL (`@sequelize/postgres`, `pg`)             |
| 3   | `src/database/models/index.js` is a stale sequelize-cli v6 generated CJS file, requires `config/database.js` which does not exist, and the package is `"type": "module"`                                 | Delete                                                            |
| 4   | Two Sequelize majors installed: `sequelize@6` (used by sequelize-cli and the migration's `QueryInterface` type) and `@sequelize/core@7` (used by models)                                                 | Keep v6 only as a **devDependency for the CLI**; app code uses v7 |
| 5   | `database.config.ts` both exports CLI config **and** instantiates Sequelize + imports models; the CLI therefore boots the whole ORM just to read credentials                                             | Split into `database.config.ts` (pure config) and `sequelize.ts`  |
| 6   | `models/hotel.ts` creates a stray `new Sequelize({ dialect: MySqlDialect })` that is never used                                                                                                          | Gone with the model; new models never construct Sequelize         |
| 7   | Config only has `development`; `connectDB` always reads `config.development`                                                                                                                             | Select by `NODE_ENV`, support `DATABASE_URL`                      |
| 8   | `"start": "node .env.production dist/server.js"` is invalid                                                                                                                                              | `node --env-file=.env.production dist/server.js`                  |
| 9   | `package.json` name is `express-practice`; no `.env.example`; env vars read ad hoc via `process.env`                                                                                                     | Rename to `stackpulse-api`, add zod-validated `src/config/env.ts` |
| 10  | SQL logging at `info` level (`logging: (...msg) => logger.info(msg)`)                                                                                                                                    | Log at `debug`, off outside development                           |
| 11  | `validateSchema` only validates `req.body`, discards the parsed (coerced/trimmed) result, and takes `ZodObject<any, any>`                                                                                | Validate `{ body, query, params }` and write parsed values back   |
| 12  | `errorHandler` does not translate `ZodError`, Sequelize `UniqueConstraintError`/`ForeignKeyConstraintError`, or JWT errors; success envelope is `{ success, data }` but errors are `{ status, message }` | Map known errors to `AppError`; unify error envelope              |
| 13  | No `helmet`, `cors`, rate limiting, health endpoint, graceful shutdown, 404 handler                                                                                                                      | Add (section 4.4)                                                 |
| 14  | `tsconfig.json` has `"types": []` while code uses Node globals; `exactOptionalPropertyTypes` can fight Sequelize typings                                                                                 | Set `"types": ["node"]`; relax the flag only if it blocks         |
| 15  | Confirm `logger.middleware.ts` never logs request bodies or the `Authorization`/`Cookie` headers (passwords and tokens will now flow through)                                                            | Review and redact                                                 |

Not-a-bug reminders: Express 5 forwards rejected async handlers to the error middleware, so no `asyncHandler` wrapper is needed.

---

## 2. Revert / re-base steps (do these first, as separate commits)

**Commit 1 - `chore: remove hotel starter code`**

Delete:

- `src/controller/hotel.controller.ts`
- `src/dto/hotel.dto.ts`
- `src/repository/hotel.repository.ts`
- `src/router/v1/hotel.router.ts`
- `src/schemas/hotel.schema.ts`
- `src/service/hotel.service.ts`
- `src/database/models/hotel.ts`
- `src/database/models/index.js`
- `src/database/migrations/20260925084623-add-hotel.ts`

Edit: `src/router/v1/index.ts` (drop the hotel mount, leave an empty `v1Router`), `src/server.ts` (remove the "Hello World" route), `src/config/database.config.ts` (drop the `Hotel` import and `models: [Hotel]`).

**Commit 2 - `chore: switch database layer to PostgreSQL`**

```
npm rm @sequelize/mysql mysql2 @types/winston
npm rm sequelize && npm i -D sequelize         # v6 for sequelize-cli only
npm i @sequelize/postgres pg
```

- `database.types.ts`: `Dialect` -> `"postgres"`; add `development | test | production`.
- `database.config.ts`: pure config, Postgres defaults (port 5432, `DATABASE_URL` override, `ssl` for production).
- New `src/config/sequelize.ts`: builds the `Sequelize` instance with `PostgresDialect`, `models: [...]`, `logging` at `debug`; exports `sequelize` and `connectDB()`.
- `sequalize.config.cjs` (typo in the filename; rename to `sequelize.config.cjs` and update `.sequelizerc`) keeps loading `database.config.ts` through `tsx/cjs`.
- Add `docker-compose.yml` with `postgres:16` (+ a `stackpulse_test` database) and `.env.example`.

**Commit 3 - `chore: project hygiene`**

- Rename package to `stackpulse-api`; fix `start`; add `db:migrate`, `db:migrate:undo`, `db:migrate:undo:all`, `migration:generate` scripts using sequelize-cli.
- Add `src/config/env.ts` (zod-parsed env; process exits on invalid config).
- tsconfig `types`, `.gitignore` for `.env*` (keep `.env.example`), `.prettierignore` for `dist`.

**Commit 4 - first assignment migration** - see section 3.3.

Migration convention (keep the template's raw-SQL style, it is the least version-coupled): files in `src/database/migrations/` named `YYYYMMDDHHmmss-<name>.ts`, `up`/`down` use `queryInterface.sequelize.query` inside a transaction. Fresh timestamps (the existing one is dated `20260925`, so the new ones must sort after it only if it is kept; it is being deleted).

---

## 3. Data model (PostgreSQL)

### 3.1 Design decisions

- **Developer data is shared and public**; **user data is private**. `developers`, `repos`, `repo_languages`, `repo_commit_weeks` are a global cache keyed by GitHub identity so two users looking up `torvalds` cost one fetch. `pins` and `comparisons` are always scoped by `user_id`.
- snake_case columns (`underscored: true` on models), `timestamptz` everywhere.
- `users.id` is `uuid` (non-enumerable); GitHub-derived tables use `bigint` surrogate ids plus the immutable `github_id` (usernames can be renamed).
- `citext` for `email` and `github_username` -> case-insensitive uniqueness without `lower()` indexes.
- Pin tags as `text[]` with a GIN index instead of a join table: tags are free-form labels owned by one pin, never queried relationally, and a join table would add a table and two writes for no benefit. Trade-off: no global tag rename.
- Weekly commit buckets stored per repo (`repo_commit_weeks`) so a repo can be recomputed idempotently; developer-level series is a `SUM ... GROUP BY week_start`.
- Language bytes stored per repo (`repo_languages`) for the same reason.

### 3.2 Tables

```
users
  id              uuid PK default gen_random_uuid()
  email           citext NOT NULL UNIQUE
  password_hash   text NOT NULL
  created_at, updated_at  timestamptz NOT NULL default now()

refresh_tokens
  id              uuid PK
  user_id         uuid FK users ON DELETE CASCADE
  token_hash      text NOT NULL UNIQUE          -- sha256 of the opaque token
  expires_at      timestamptz NOT NULL
  revoked_at      timestamptz NULL
  replaced_by     uuid NULL                     -- rotation chain / reuse detection
  created_at      timestamptz
  INDEX (user_id)

developers
  id                 bigint identity PK
  github_id          bigint NOT NULL UNIQUE
  github_username    citext NOT NULL UNIQUE
  name, bio, company, location, blog, html_url   text NULL
  avatar_url         text NOT NULL
  followers, following, public_repos  integer NOT NULL default 0
  github_created_at  timestamptz
  profile_etag       text NULL                  -- conditional request
  repos_etag         text NULL                  -- ETag of page 1 of /repos
  fetched_at         timestamptz NOT NULL       -- last successful profile sync
  repos_fetched_at   timestamptz NULL
  enrichment_status  text NOT NULL default 'pending'   -- pending | running | ready | partial | failed
  enriched_at        timestamptz NULL
  created_at, updated_at

repos
  id                 bigint identity PK
  github_id          bigint NOT NULL UNIQUE
  developer_id       bigint FK developers ON DELETE CASCADE
  name, full_name    text NOT NULL
  description        text NULL
  html_url           text NOT NULL
  is_fork, is_archived  boolean NOT NULL default false
  stars, forks, open_issues  integer NOT NULL default 0
  primary_language   text NULL
  pushed_at          timestamptz NULL
  github_created_at  timestamptz
  languages_fetched_at timestamptz NULL
  commits_fetched_at   timestamptz NULL
  created_at, updated_at
  UNIQUE (developer_id, name)
  INDEX (developer_id, stars DESC)
  INDEX (developer_id, pushed_at DESC)

repo_languages
  repo_id    bigint FK repos ON DELETE CASCADE
  language   text NOT NULL
  bytes      bigint NOT NULL
  PK (repo_id, language)

repo_commit_weeks
  repo_id     bigint FK repos ON DELETE CASCADE
  week_start  date NOT NULL                     -- Monday, UTC
  commits     integer NOT NULL
  PK (repo_id, week_start)

pins
  id          bigint identity PK
  user_id     uuid FK users ON DELETE CASCADE
  repo_id     bigint FK repos ON DELETE CASCADE
  note        text NULL                         -- CHECK length <= 2000
  tags        text[] NOT NULL default '{}'      -- CHECK cardinality <= 10
  created_at, updated_at
  UNIQUE (user_id, repo_id)
  INDEX (user_id, created_at DESC)
  GIN INDEX (tags)

comparisons
  id          bigint identity PK
  user_id     uuid FK users ON DELETE CASCADE
  name        text NOT NULL                     -- CHECK length 1..100
  created_at, updated_at
  UNIQUE (user_id, name)
  INDEX (user_id, created_at DESC)

comparison_developers
  comparison_id  bigint FK comparisons ON DELETE CASCADE
  developer_id   bigint FK developers ON DELETE CASCADE
  position       smallint NOT NULL              -- column order in the compare view
  PK (comparison_id, developer_id)
```

Notes:

- A saved comparison stores **which developers**, not metric values; metrics are computed live from the cache so they stay fresh.
- `ON DELETE CASCADE` from `repos`/`developers` to pins/comparison rows: if a repo disappears from GitHub, the sync deletes it and the pin goes too. Alternative (soft-delete repos) is a stated trade-off; keep it simple.
- "At least 2 developers" for a comparison is enforced in the service/Zod schema (a DB constraint across rows would need a trigger).

### 3.3 Migrations (ordered, each reversible)

| File                                        | Contents                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `20261014090000-enable-extensions.ts`       | `CREATE EXTENSION IF NOT EXISTS citext; pgcrypto;`                           |
| `20261014090100-create-users-auth.ts`       | `users`, `refresh_tokens`                                                    |
| `20261014090200-create-github-cache.ts`     | `developers`, `repos`, `repo_languages`, `repo_commit_weeks` + indexes       |
| `20261014090300-create-pins-comparisons.ts` | `pins`, `comparisons`, `comparison_developers` + indexes + CHECK constraints |

Each `down` drops in reverse FK order. Verify with `db:migrate && db:migrate:undo:all && db:migrate` before committing.

### 3.4 Models (`src/database/models/`)

One v7 decorator-style model per table (`User`, `RefreshToken`, `Developer`, `Repo`, `RepoLanguage`, `RepoCommitWeek`, `Pin`, `Comparison`, `ComparisonDeveloper`), registered in `sequelize.ts`. Associations declared with `@HasMany` / `@BelongsTo` / `@BelongsToMany`. Models are thin; query logic lives in repositories (existing convention).

---

## 4. Backend foundation

### 4.1 Dependencies to add

| Purpose     | Package                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| Postgres    | `pg`, `@sequelize/postgres`                                                                  |
| Auth        | `argon2` (fallback `bcryptjs` if native build is a problem), `jsonwebtoken`, `cookie-parser` |
| Hardening   | `helmet`, `cors`, `express-rate-limit`                                                       |
| Concurrency | `p-limit`                                                                                    |
| Tests       | `vitest`, `supertest`, `@types/supertest`, `@types/jsonwebtoken`, `@types/cookie-parser`     |

GitHub client: use Node's built-in `fetch` (Node 22) rather than Octokit; we need direct control over `ETag`/`If-None-Match`, `Link` pagination, and `X-RateLimit-*` headers.

### 4.2 Folder additions

```
src/
  config/        env.ts, sequelize.ts, database.config.ts, logger.ts
  integrations/github/
    github.client.ts       fetch wrapper: auth header, ETag, pagination, rate-limit state, retries
    github.types.ts        raw API response types
    github.mapper.ts       API -> DB row mapping
    rateLimit.ts           shared RateLimitState (remaining, reset, secondary-limit backoff)
  controller/    auth, developer, compare, pin, comparison
  service/       auth, developerSync, metrics, compare, pin, comparison
  repository/    user, refreshToken, developer, repo, pin, comparison
  schemas/       zod: auth, developer, pin, comparison
  middleware/    auth.middleware.ts, notFound.middleware.ts (+ existing)
  utils/         jwt.ts, singleflight.ts, hash.ts, app.errors.ts (+ Unauthorized/Forbidden/Conflict/TooManyRequests/BadGateway)
  tests/         unit + integration
```

### 4.3 API conventions

- Mounted at `/api/v1`, plural resource names (`/developers`, not `/developer`).
- Success: `{ success: true, data, meta? }`. Error: `{ success: false, message, correlationId, details? }` (change `error.middleware.ts` accordingly).
- Pagination: `?page=&limit=` (limit max 100) returning `meta: { page, limit, total }`.
- Validation: reworked `validateSchema({ body?, query?, params? })` assigning parsed output back to the request.

### 4.4 Hardening

- `helmet()`, `cors({ origin: env.CORS_ORIGIN, credentials: true })`, `express.json({ limit: "100kb" })`, `trust proxy` in production.
- Rate limits: auth routes 10/min/IP; general API 120/min/user; `POST /developers/:u/refresh` 1 per developer per 5 min per user.
- `GET /health` (checks DB), 404 handler, graceful shutdown on `SIGTERM` (close server, drain enrichment queue, `sequelize.close()`).
- Map `UniqueConstraintError -> 409`, `ForeignKeyConstraintError -> 400/409`, `ZodError -> 400`, `JsonWebTokenError/TokenExpiredError -> 401`.

---

## 5. Authentication

Decision: **email + password**, short-lived access JWT + rotating opaque refresh token.

- Signup: Zod (email format, password 8-72 chars), `argon2id` hash, create user, issue tokens. Duplicate email -> 409 (generic wording on login failures to avoid user enumeration).
- Access token: JWT (HS256, 15 min, `sub = user.id`), returned in the response body, held **in memory** on the client.
- Refresh token: 32 random bytes, delivered as `httpOnly; Secure; SameSite` cookie scoped to `/api/v1/auth`; only its SHA-256 is stored in `refresh_tokens`. Every refresh rotates (old row `revoked_at`, `replaced_by` set); presenting a revoked token revokes the whole chain.
- `auth.middleware.ts`: verifies bearer token, sets `req.user = { id }`. Extend Express `Request` typing via a `src/types/express.d.ts`.
- **Privacy rule:** every pin/comparison repository method takes `userId` as a mandatory parameter and includes it in the `WHERE`. A row belonging to another user returns **404**, not 403.
- Stretch if short on time: drop refresh tokens and use a 7-day access JWT in an httpOnly cookie. State the trade-off in the notes.

| Method | Path            | Auth   | Notes                    |
| ------ | --------------- | ------ | ------------------------ |
| POST   | `/auth/signup`  | no     | 201, sets refresh cookie |
| POST   | `/auth/login`   | no     |                          |
| POST   | `/auth/refresh` | cookie | rotates                  |
| POST   | `/auth/logout`  | cookie | revokes, clears cookie   |
| GET    | `/auth/me`      | yes    |                          |

---

## 6. GitHub integration and the rate-limit strategy (the key design area)

### 6.1 Request budget

For a prolific developer (300 repos): profile 1 + repo pages 3 = **4 calls** for the base profile. Languages (1/repo) and commits (1-3/repo) are the expensive part: all repos would be ~600+ calls per developer, so a 5-developer compare would burn most of an hour's 5,000 quota cold. Plan:

| Data                            | Source                                                                                                        | Calls               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| Profile                         | `GET /users/{u}`                                                                                              | 1                   |
| Repos (stars, primary language) | `GET /users/{u}/repos?per_page=100&sort=pushed`                                                               | ceil(n/100)         |
| Language breakdown              | `GET /repos/{o}/{r}/languages` for **top K repos only**                                                       | K (default 15)      |
| Commit activity                 | `GET /repos/{o}/{r}/commits?author={u}&since={52w}&per_page=100` for top K recently-pushed **non-fork** repos | <= K x 3 (page cap) |

"Top K" = non-fork, non-archived repos ordered by `stars DESC, pushed_at DESC`, plus any repo pushed in the last 12 months until K is reached (K configurable via env). The response states clearly that language and commit figures are based on the top K repos (`meta.sampledRepos`). Fork exclusion for sums is a query parameter (`includeForks`, default false).

Rejected alternative (documented in notes): the GraphQL API can return profile, repos, languages and `contributionsCollection` in one call, which is far cheaper, but the assignment lists REST endpoints; mention it as the first optimization if scale mattered. Another alternative, `/stats/participation`, returns 202 while GitHub computes it, which makes latency unpredictable.

### 6.2 Layered caching (PostgreSQL is the cache)

1. **Freshness windows** on the developer row: `fetched_at` < 1 h -> serve from DB with zero GitHub calls.
2. **Conditional requests** after the TTL: send `If-None-Match` with the stored `profile_etag`/`repos_etag`. A `304` does **not** count against the primary rate limit for authenticated requests and only bumps `fetched_at`.
3. **Change-detection for per-repo data:** re-fetch a repo's languages only if `repos.pushed_at > languages_fetched_at`; commits if `pushed_at > commits_fetched_at` or older than 24 h. Unchanged repos cost nothing.
4. **Stale-while-revalidate / stale-if-error:** if GitHub is rate limited or erroring and we have any cached row (< 7 d), serve it with `meta.stale = true`.
5. **Single-flight:** `utils/singleflight.ts` keeps `Map<username, Promise>`; concurrent requests (two users, or a compare plus a profile load) for the same developer share one sync.
6. **Bounded concurrency:** one global `p-limit(5)` for outbound GitHub calls (respects secondary rate limits that punish bursts).
7. **Optional in-process LRU** for the assembled profile response (30 s) to absorb repeated hits; skip if time is short.

### 6.3 Rate-limit awareness

`rateLimit.ts` records `x-ratelimit-remaining` / `x-ratelimit-reset` from every response.

- remaining < 10 % of limit: skip enrichment (return base profile, `enrichment_status = partial`).
- remaining = 0: do not call GitHub; serve stale or return `429` with `Retry-After` derived from `reset`.
- `403/429` with `Retry-After` (secondary limit): pause the queue until then; retry once with exponential backoff, otherwise mark the developer `partial`.
- `GITHUB_TOKEN` is required in env (fine-grained PAT, public read, no scopes); startup warns if absent (60/h mode).

### 6.4 Two-phase load (fast first paint)

- **Phase 1 (synchronous, within the request):** profile + repos list -> persisted -> response returns immediately with `enrichment_status`.
- **Phase 2 (background):** enrichment (languages + commits for top K) runs through the limited queue; status moves `pending -> running -> ready | partial | failed`.
- Frontend polls `GET /developers/:u` every 2 s while status is `pending|running` (SSE is a stretch).
- On boot, re-enqueue developers stuck in `pending|running` (process restart safety). A real job queue (pg-boss, BullMQ) is a documented upgrade path; in-process is sufficient here.

### 6.5 Edge cases

- Username validated against GitHub's pattern before any call; `404` from GitHub -> `NotFoundError` (+ 5-minute negative cache in memory).
- Organizations are accepted (same endpoints) and flagged by `type`.
- Empty repository (`409` on commits) -> 0 commits, not an error.
- Repo deleted/renamed upstream -> removed on next repos sync (diff by `github_id`).
- Zero repos, private-only accounts -> valid profile with empty metrics.
- Upserts by `github_id` in a transaction (`bulkCreate({ updateOnDuplicate })`) so retries are idempotent.

---

## 7. Metrics (computed in SQL, `metrics.service.ts`)

Per developer (default excludes forks):

| Metric            | Definition                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `totalStars`      | `SUM(repos.stars)`                                                                                                              |
| `repoCount`       | `COUNT(repos)` (cross-check with `public_repos`)                                                                                |
| `followers`       | from developer row                                                                                                              |
| `avgStarsPerRepo` | totalStars / repoCount                                                                                                          |
| `topRepos`        | top 5 by stars                                                                                                                  |
| `languages`       | `SUM(bytes)` by language over `repo_languages`, as % ; falls back to `repos.primary_language` counts for repos not yet enriched |
| `commits52w`      | `SUM(repo_commit_weeks.commits)` for last 52 weeks                                                                              |
| `weeklyCommits`   | 52-point series via `generate_series` left-joined so empty weeks are zero                                                       |
| `activeRepos90d`  | repos with `pushed_at` in the last 90 days                                                                                      |
| `languageCount`   | distinct languages                                                                                                              |

Compare adds, per metric, the `leaderUsername` (ties allowed) so the frontend can highlight winners without logic duplication.

---

## 8. REST API

All routes under `/api/v1`; everything except `/auth/signup|login|refresh` and `/health` requires auth.

### Developers

| Method | Path                            | Description                                                                                                                               |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/developers/:username`         | Ensure synced; returns profile + metrics + `enrichmentStatus` + `meta { stale, fetchedAt, sampledRepos }`                                 |
| GET    | `/developers/:username/repos`   | Paged list; `sort=stars\|pushed\|name`, `language=`, `includeForks=`, `page`, `limit`; includes `pinned` and `pinId` for the current user |
| POST   | `/developers/:username/refresh` | Force re-sync (cooldown enforced)                                                                                                         |
| GET    | `/developers/recent`            | Most recently synced developers already in the DB (free autocomplete, no GitHub calls)                                                    |

### Compare

| Method | Path                       | Description                                                                                                                              |
| ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/compare?usernames=a,b,c` | 2-5 usernames, deduplicated, resolved in parallel; **partial results** with per-developer `error`/`status` instead of failing everything |

### Pins (repos the user pinned, with notes/tags)

| Method | Path        | Description                                                   |
| ------ | ----------- | ------------------------------------------------------------- |
| POST   | `/pins`     | `{ repoId, note?, tags? }`; duplicate -> 409                  |
| GET    | `/pins`     | `?tag=&developer=&page=&limit=`, joined with repo + developer |
| GET    | `/pins/:id` | Own pin only                                                  |
| PATCH  | `/pins/:id` | Update note/tags                                              |
| DELETE | `/pins/:id` | 204                                                           |

### Saved comparisons

| Method | Path               | Description                                                      |
| ------ | ------------------ | ---------------------------------------------------------------- |
| POST   | `/comparisons`     | `{ name, usernames[2..5] }`; ensures developers exist (via sync) |
| GET    | `/comparisons`     | List with developer avatars/usernames                            |
| GET    | `/comparisons/:id` | Hydrated with live compare metrics                               |
| PUT    | `/comparisons/:id` | Rename and/or replace the developer set (transactional)          |
| DELETE | `/comparisons/:id` | 204                                                              |

### Misc

`GET /health` -> `{ status, db }`. Optionally publish an OpenAPI/Swagger JSON, or at minimum a `docs/api.http` file.

---

## 9. Testing and quality

- **Unit:** metrics SQL helpers/aggregation, username validator, GitHub client (mock `fetch`: pagination via `Link`, 304 handling, rate-limit header parsing, 403 secondary limit), singleflight (N callers -> 1 upstream call), freshness decisions.
- **Integration (supertest + `stackpulse_test` DB, GitHub client mocked):** signup/login/refresh/logout; pin and comparison CRUD; **cross-user access returns 404** for read, update and delete; compare with partial failure; cache hit makes zero upstream calls.
- `npm test` runs vitest; `type-check`, `lint`, `format:check` stay green via husky.
- Seed script (`src/database/seeders`) with a demo user for the video.

---

## 10. Frontend plan (separate repo `stackpulse-web`)

### 10.1 Stack

Vite + React 18 + TypeScript, React Router, **TanStack Query** (server state, caching, polling), Tailwind CSS + shadcn/ui (accessible primitives), **Recharts** (responsive charts), react-hook-form + zod (shared validation style), lucide-react icons, `ky` or a small `fetch` wrapper.

### 10.2 Structure

```
src/
  app/            router.tsx, providers.tsx (QueryClient, AuthProvider)
  api/            client.ts (base URL, auth header, refresh-on-401 single flight), auth.ts, developers.ts, compare.ts, pins.ts, comparisons.ts
  features/
    auth/         LoginPage, SignupPage, useAuth, ProtectedRoute
    search/       SearchBar (debounced, validates username, recent suggestions)
    profile/      ProfilePage, ProfileHeader, MetricCards, LanguageDonut, CommitSparkline, RepoList, RepoCard
    compare/      ComparePage, DeveloperPicker (2-5 chips), ComparisonTable, charts (grouped bar, language stacked bar, weekly line), SaveComparisonDialog
    pins/         PinsPage, PinButton, PinEditor (note + tag input)
    comparisons/  SavedComparisonsPage, rename/delete menu
  components/     layout (AppShell, mobile nav), ui/ (shadcn), EmptyState, ErrorState, Skeletons, StaleBadge
  lib/            format.ts (numbers, dates), colors.ts (stable per-language / per-developer colors)
```

### 10.3 Routes

`/login`, `/signup`, `/` (search + recent + pins preview), `/d/:username` (profile), `/compare?u=a&u=b` (URL is the state, shareable), `/pins`, `/comparisons`, `/comparisons/:id`.

### 10.4 Behaviour details

- **Auth:** access token held in memory; refresh cookie via `credentials: "include"`; on a 401 the client performs one shared refresh then replays the request; failure -> redirect to `/login`. Dev uses the Vite proxy to avoid CORS/cookie issues. The project is local-only, so no production hosting or cross-site cookie setup is planned.
- **Profile loading:** render the base profile immediately; if `enrichmentStatus` is `pending|running`, show skeletons for language/commit widgets and poll every 2 s via `refetchInterval`; show a "cached N min ago" badge when `meta.stale`. Handle 404 (not found), 429 (rate limited, show retry time), network errors.
- **Compare:** selection state kept in the URL; partial-failure columns render an inline error but the rest still compare; winner cell highlighted per row using `leaderUsername`; "Save comparison" opens a name dialog (disabled until >= 2 developers).
- **Pins:** star/pin toggle on every repo row; optimistic update with rollback; note + tag editor (chips, max 10); filter by tag on `/pins`.
- **Optimistic UI and caching:** query keys `["developer", username]`, `["compare", sortedUsernames]`; `staleTime` ~60 s so navigating back is instant.

### 10.5 Mobile responsiveness (explicit requirement)

- Mobile-first Tailwind; target widths 360 / 768 / 1280; test in devtools device mode and on a real phone.
- App shell: bottom tab bar on `< md` (Search, Compare, Pins, Saved), top nav on `>= md`.
- **Profile:** metric cards 2-col grid on phones, 4-col on desktop; header stacks avatar over text.
- **Repo list:** card list on mobile (name, stars, language dot, updated), table on `>= md`; sort/filter in a bottom sheet on phones.
- **Compare table:** sticky first column (metric labels) with horizontal scroll; developer columns have a minimum width and the avatar/username header sticks; alternatively a stacked per-metric card layout below `sm`. Charts in `ResponsiveContainer` with reduced ticks and legends under the chart on small screens.
- Tap targets >= 44 px, `viewport` meta set, no hover-only interactions, dialogs become full-height sheets on phones.
- Accessibility basics: labels, focus rings, color not the only differentiator in charts (patterns/labels).

### 10.6 Frontend deliverables

README with env (`VITE_API_URL`, `VITE_PROXY_TARGET`) and scripts for running locally against the local API. No deployment (local dev only).

---

## 11. Delivery

### 11.1 Suggested order of work and commit history

1. `chore: remove hotel starter code` (section 2)
2. `chore: switch database layer to PostgreSQL`
3. `chore: env validation, docker compose, project hygiene`
4. `feat(db): extensions, users and refresh_tokens migrations`
5. `feat(db): github cache tables migration (developers, repos, languages, commit weeks)`
6. `feat(db): pins and comparisons migration`
7. `feat(db): sequelize models and associations`
8. `feat(api): validation middleware rework, error mapping, security middleware, health`
9. `feat(auth): signup, login, refresh, logout, me + auth middleware`
10. `feat(github): client with ETag, pagination, rate-limit state, tests`
11. `feat(developers): base sync (profile + repos), single-flight, freshness logic`
12. `feat(developers): enrichment queue (languages + commits), status lifecycle`
13. `feat(metrics): metric queries + developer profile endpoints`
14. `feat(compare): compare endpoint with partial results`
15. `feat(pins): pins CRUD with ownership scoping + tests`
16. `feat(comparisons): saved comparisons CRUD + tests`
17. `test: integration suite, seeder`
18. `docs: README, API docs, notes`
19. Frontend repo commits mirror: scaffold -> auth -> search/profile -> compare -> pins/comparisons -> responsive pass.

Priority if time is tight: **P0** auth with refresh-token rotation, base sync + caching + single-flight, profile metrics, compare, pins/comparisons CRUD, mobile-responsive UI, README + notes + video. **P1** enrichment commits/languages polish, rate limiting, tests breadth. **P2** SSE, LRU, OpenAPI, GraphQL variant.

### 11.2 README must include

Prereqs (Node 22, MySQL 8+), `cp .env.example .env.development`, optionally `docker compose up -d`, `npm run db:migrate`, `npm run dev`, scripts table, and env vars:

| Variable                                                             | Purpose                  |
| -------------------------------------------------------------------- | ------------------------ |
| `NODE_ENV`, `PORT`                                                   | runtime                  |
| `DB_HOST/PORT/NAME/NAME_TEST/USERNAME/PASSWORD`                      | MySQL                    |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`                                | access token             |
| `REFRESH_TTL_DAYS`, `COOKIE_SECURE`                                  | refresh cookie           |
| `CORS_ORIGIN`                                                        | frontend origin          |
| `GITHUB_TOKEN`                                                       | GitHub PAT (5,000 req/h) |
| `GITHUB_PROFILE_TTL_MIN`, `GITHUB_TOP_K_REPOS`, `GITHUB_CONCURRENCY` | cache/enrichment tuning  |

### 11.3 Notes document (trade-offs to state)

- Why PostgreSQL as the cache instead of Redis (one datastore, durable, queryable aggregates) and when Redis would be added.
- Why top-K sampling for languages/commits and its accuracy cost; GraphQL as the next step.
- Request-budget table (section 6.1) with cold vs warm numbers.
- Shared public data vs private user data and the 404-on-foreign-resource rule.
- Tags as `text[]`; saved comparisons store membership not snapshots.
- In-process queue vs a durable job queue.
- Refresh-token rotation vs simpler session; what is deliberately omitted (email verification, password reset, OAuth).

### 11.4 Demo video checklist

Signup/login -> search a prolific user (show instant base profile then enrichment filling in) -> repeat search (instant, cached) -> compare 3 developers (table + charts) -> pin a repo with note/tags -> save and reopen a comparison -> phone-size walkthrough -> brief look at rate-limit headers/logs showing the 304/cache hits.

---

## 12. Open decisions to confirm before starting

1. ~~Migrations tool~~ **Decided:** keep `sequelize-cli` (v6 as devDependency, CLI only).
2. ~~Auth~~ **Decided:** refresh-token flow is required (short-lived access token + rotating httpOnly refresh cookie with reuse detection).
3. ~~Deploy target~~ **Decided:** local development only, no deployment. Postgres via Docker Compose; the frontend uses the Vite proxy so cookies stay same-origin and no production CORS/`SameSite=None` setup is needed.
4. Default `K` for enrichment (15 proposed) and whether forks should count toward stars by default (proposed: no).
