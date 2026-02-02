# Document Portal (Strapi + Next.js)

Production-ready, Docker-first document portal with Strapi v5, Next.js App Router, Postgres, and a PDF viewer.

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only if running services outside Docker)

## Repo layout

- `docker-compose.yml`
- `apps/strapi` (Strapi v5)
- `apps/web` (Next.js 14+ App Router)
- `data` (local dev volumes only)

## Quick start (Docker)

1. Copy env examples and fill secrets:
   - `cp .env.example .env`
   - `cp apps/strapi/.env.example apps/strapi/.env`
   - `cp apps/web/.env.example apps/web/.env`

2. Start everything:

```bash
docker compose up -d --build
```

3. Access services:
   - Web: `http://localhost:3000`
   - Strapi Admin: `http://localhost:1337/admin`
   - Strapi API: `http://localhost:1337/api`

## Strapi admin setup

- On first launch, create the admin user in `/admin`.
- Seed content is created automatically if no pages exist.

### Create content

1. Create a **Page** (title, description, order)
2. Create **Topics** linked to a Page
3. Create **Subtopics** linked to a Topic
4. Create **Documents** linked to a Subtopic and upload a file

### Public permissions

Enable read-only permissions for public role:

1. Go to **Settings** -> **Users & Permissions Plugin** -> **Roles** -> **Public**
2. Check **find** and **findOne** for:
   - `page`, `topic`, `subtopic`, `document`
3. Save

No create/update/delete should be enabled for public role.

## PDF viewer

- The document page uses PDF.js via `react-pdf`.
- A clean pagination UI is provided.
- On mobile or PDF render errors, it falls back to an iframe or download link.

## Search

- Page view: client-side filter for subtopics and document titles.
- `/search`: server-side Strapi query for documents by title.

## Docker notes

### Volumes

- Postgres data: `./data/postgres` -> `/var/lib/postgresql/data`
- Strapi uploads: `./data/strapi-uploads` -> `/app/public/uploads`

### Backup / restore

- Backup: tar/zip the `data` folder.
- Restore: stop containers, replace `data`, then start containers.

## Reverse proxy (nginx example)

Use your existing reverse proxy. Suggested upstreams:

- Web app (public): `http://127.0.0.1:3000`
- Strapi admin + API: `http://127.0.0.1:1337`

Keep `/admin` and `/api` on Strapi.

## Troubleshooting

- **CORS errors**: set `WEB_URL` to the public web URL and restart Strapi.
- **No data in UI**: check Strapi public permissions for find/findOne.
- **Uploads not visible**: confirm volume mount `./data/strapi-uploads` and `public/uploads`.
- **PDF viewer blank**: use the download link or check if file is a PDF.

## Local development (optional)

If you want to run without Docker:

```bash
cd apps/strapi
npm install
npm run develop
```

```bash
cd apps/web
npm install
npm run dev
```

