# StackPulse Web

Frontend for StackPulse: look up GitHub developers, compare them side by side, pin repositories with notes and tags, and save comparisons. It talks to the StackPulse REST API (`/api/v1`).

## Stack

Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Router, TanStack Query, Recharts, react-hook-form + zod.

## Getting started

Requires Node 22+ and a running StackPulse backend.

```bash
npm install
cp .env.example .env
npm run dev
```

| Variable            | Purpose                                                                     | Default                 |
| ------------------- | --------------------------------------------------------------------------- | ----------------------- |
| `VITE_API_URL`      | API base URL used by the browser. Use a full URL when the API is on another origin. | `/api/v1`               |
| `VITE_PROXY_TARGET` | Backend origin the dev server proxies `/api` to. Dev only.                  | `http://localhost:3000` |

In development the Vite proxy forwards `/api` to the backend, so the refresh cookie stays same-origin. This project is for local development only and is not deployed.

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: type-check and build to `dist/`
- `npm run lint`: ESLint
- `npm run preview`: serve the production build locally

## Features

- **Auth:** signup and login. The access token is kept in memory only; the refresh token is an httpOnly cookie and is used transparently on 401.
- **Search and profile (`/`, `/d/:username`):** profile, metric cards, language breakdown, weekly commit chart, and a filterable, sortable, paginated repository list. Languages and commits are enriched in the background, and the page polls until they are ready.
- **Compare (`/compare?u=a&u=b`):** two to five developers. Selection lives in the URL so it can be shared. Table with per-metric leaders and charts for stars, followers, commits, languages and commit trend.
- **Pins (`/pins`):** pin any repository, add a note (up to 2000 characters) and up to 10 tags, filter by tag. Pinning is optimistic and rolls back on failure.
- **Saved comparisons (`/comparisons`, `/comparisons/:id`):** save, reopen with fresh metrics, rename and delete.
- **Responsive:** bottom navigation, card lists and a horizontally scrollable comparison table on small screens.

## Structure

```
src/
  api/          typed API client, endpoint hooks, response types (types.ts is the contract)
  app/          providers and routes (page routes are lazy-loaded)
  components/   layout and shadcn/ui primitives
  features/     auth, search, profile, compare, pins, comparisons
  lib/          formatting, colours, helpers
```
