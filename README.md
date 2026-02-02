# Document Portal (Next.js + Postgres)

Document portal with a custom admin area (Next.js App Router), Prisma + Postgres, and PDF uploads stored on the VPS filesystem.

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only if running services outside Docker)

## Repo layout

- `docker-compose.yml`
- `apps/web` (Next.js App Router + Admin UI)
- `data` (local dev volumes only)

## Quick start (Docker)

1. Copy env examples and update secrets:
   - `cp .env.example .env`
   - `cp apps/web/.env.example apps/web/.env`

2. Start everything:

```bash
docker compose up -d --build
```

3. Run Prisma migrations + seed (first time only):

```bash
docker compose exec web npx prisma migrate deploy
docker compose exec web npx prisma db seed
```

4. Access services:
   - Web: `http://localhost:3000`
   - Admin (default): `http://localhost:3000/admin` or `ADMIN_PATH` if set

## Environment variables

These are the primary environment variables required to run the project:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_PATH`
- `UPLOAD_DIR`
- `MAX_UPLOAD_MB`

Additional recommended variables:

- `SESSION_TTL_DAYS` (defaults to 7)
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

## Admin portal

- All admin routes live under `ADMIN_PATH` (defaults to `/admin`).
- The admin portal is protected by password hashing + DB-backed sessions stored as hashed tokens.
- Login is rate-limited in-memory for development. For production, place the app behind a reverse proxy and enable a shared rate limiter.

## Content model

- Page -> Topic -> Subtopic -> Document (PDF)
- Documents store metadata in Postgres and files on disk in `UPLOAD_DIR`.

## Public site

- Home lists Pages ordered by `order`.
- `/p/[pageSlug]` shows Topics/Subtopics with expandable sections.
- `/doc/[docSlug]` shows a dedicated document page and streams PDFs from disk.
- `/search` searches across page/topic/subtopic/document titles.

## Docker notes

### Volumes

- Postgres data: `./data/postgres` -> `/var/lib/postgresql/data`
- Uploads: `./data/uploads` -> `/data/uploads`

### One-time migration step

By default, the Docker container runs `prisma migrate deploy` on start. For local development you can also run:

```bash
docker compose exec web npx prisma migrate deploy
```

### Commands

```bash
docker compose up -d --build
docker compose down -v
```

## Local development (optional)

```bash
cd apps/web
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```
