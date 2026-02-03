# Developer Documentation

## Overview
This repository contains a Flask web application for managing collapsible panel entries with optional PDF attachments and page-based organization. The app renders a public viewer page and a protected admin page, and stores data in JSON files on disk.

## How The Program Runs
- Entry point: `app.py`
- Framework: Flask (Python)
- Server: Flask dev server started by `python app.py`
- Storage: JSON files on disk for entries, pages, and profile content
- File uploads: PDF files stored under `uploads/`
- Admin access: session-based login using credentials from `cred.json`
- Logs: `logs/app.log` (rotating file handler)

## Architecture And Data Flow
- HTTP routes in `app.py` expose:
  - HTML pages for UI.
  - JSON API endpoints used by front-end JavaScript.
- Front-end JavaScript uses `fetch()` to call API endpoints.
- Entries are stored in `entries.json` and loaded on each request.
- Pages are stored in `pages.json` and loaded on each request.
- Profile content is stored in `profile.json`.
- Uploaded PDFs are saved under `uploads/` and served via `/uploads/<filename>`.

## Key Files
- `app.py`: Flask routes, data loading/saving, upload handling, search, logging.
- `templates/index.html`: Public viewer with panels and search.
- `templates/admin.html`: Admin UI for pages, entries, and profile management.
- `templates/admin_login.html`: Admin login form.
- `templates/pdf_viewer.html`: PDF viewer page.
- `static/js/main.js`: Panel toggling and search rendering.
- `static/js/admin.js`: Admin CRUD actions and modal logic.
- `static/css/style.css`: UI styling.
- `entries.json`: Entry data store (list of entries).
- `pages.json`: Page configuration store (list of pages).
- `profile.json`: Buyer profile store.
- `uploads/`: PDF uploads directory.
- `cred.json`: Admin credentials.
- `Dockerfile`, `docker-compose.yml`: Container build and runtime.

## Data Model

Each entry in `entries.json`:
- `id` (int)
- `title` (str)
- `heading` (str)
- `content` (str)
- `page_id` (int)
- `publish_date` (str)
- `aop_number` (str)
- `internal_number` (str)
- `files` (list of {name, url, published_at})
- `pdf_files` (list of {name, url, filename?})
- `date` (str, `YYYY-MM-DD HH:MM:SS`)

Each page in `pages.json`:
- `id` (int)
- `name` (str)
- `searchable` (bool)

Profile in `profile.json`:
- `title` (str)
- `body` (str)
- `files` (list of {name, url, filename?})

## API Endpoints

Admin-protected (session or Basic Auth):
- `GET /api/entries`
- `POST /api/entries`
- `PUT /api/entries/<id>`
- `DELETE /api/entries/<id>`
- `DELETE /api/entries/<id>/pdfs`
- `GET /api/pages`
- `POST /api/pages`
- `PUT /api/pages/<id>`
- `DELETE /api/pages/<id>`
- `GET /api/profile`
- `PUT /api/profile`
- `DELETE /api/profile/pdfs/<filename>`

Public:
- `GET /api/search?q=<query>&page=<page_id>`
- `GET /uploads/<filename>`
- `GET /pdf/<filename>`

## Running Locally
1. Install dependencies:
   - `pip install -r requirements.txt`
2. Run:
   - `python app.py`
3. Open:
   - `http://localhost:5000`
   - `http://localhost:5000/admin`

## Running With Docker
1. Build and start:
   - `docker compose up --build`
2. Open:
   - `http://localhost:5000`
   - `http://localhost:5000/admin`

## Configuration
- Upload folder: `uploads/` (created automatically).
- Max upload size: configured in `app.py` via `app.config['MAX_CONTENT_LENGTH']` (32MB).
- Admin credentials: stored in `cred.json`.
- Admin session uses a non-permanent cookie by default.

## Logging
- File: `logs/app.log`
- Includes request timing, CRUD actions, and file operations.

## Security Notes
- Admin credentials are stored in `cred.json` (development-only).
- No CSRF protection on admin endpoints.
- For production, serve behind HTTPS and move credentials to environment variables.

## Known Issues And Risks
- `landing.html` exists but is not routed.
- JSON file storage is not safe for concurrent writes across multiple processes.

## Troubleshooting
- If pages or entries disappear, check `entries.json` and `pages.json` for valid JSON.
- If uploads fail, confirm `uploads/` exists and is writable.
- If search returns no results, verify that pages have `searchable: true`.

## Developer Notes
- This app is stateful and stores data on disk. For multi-instance deployment, replace JSON storage with a database.
- The Flask server runs in debug mode when launched via `app.py`.
