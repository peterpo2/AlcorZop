# Developer Documentation

## Overview
This repository contains a Flask web application for managing collapsible panel entries with optional PDF attachments and page-based organization. The app renders a public viewer page and a protected admin page, and stores data in JSON files on disk.

## How The Program Runs
- Entry point: `app.py`
- Framework: Flask (Python)
- Server: Flask dev server started by `python app.py`
- Storage: JSON files on disk for entries and pages
- File uploads: PDF files stored under `uploads/`
- Admin access: HTTP Basic Auth credentials loaded from `cred.json`

## Architecture And Data Flow
- HTTP routes in `app.py` expose:
  - HTML pages for UI.
  - JSON API endpoints used by front-end JavaScript.
- Front-end JavaScript uses `fetch()` to call API endpoints.
- Entries are stored in `entries.json` and loaded on each request.
- Pages are stored in `pages.json` and loaded on each request.
- Uploaded PDFs are saved under `uploads/` and served via `/uploads/<filename>`.

## Key Files
- `app.py`: Flask routes, data loading/saving, upload handling, search.
- `templates/index.html`: Public viewer with panels and search.
- `templates/admin.html`: Admin UI for pages and entries.
- `static/js/main.js`: Panel toggling and search rendering.
- `static/js/admin.js`: Admin CRUD actions and modal logic.
- `static/css/style.css`: UI styling.
- `entries.json`: Entry data store (list of entries).
- `pages.json`: Page data store (list of pages).
- `uploads/`: PDF uploads directory.
- `cred.json`: Basic Auth credentials for `/admin`.
- `Dockerfile`, `docker-compose.yml`: Container build and runtime.

## Data Model
Each entry in `entries.json`:
- `id` (int)
- `title` (str)
- `heading` (str)
- `content` (str)
- `page_id` (int)
- `pdf_file` (str or null)
- `date` (str, `YYYY-MM-DD HH:MM:SS`)

Each page in `pages.json`:
- `id` (int)
- `name` (str)
- `searchable` (bool)

## API Endpoints
Entries:
- `GET /api/entries`
- `POST /api/entries` (multipart form data; optional `pdf_file`)
- `PUT /api/entries/<id>` (JSON or multipart form data)
- `DELETE /api/entries/<id>`

Pages:
- `GET /api/pages`
- `POST /api/pages` (JSON)
- `PUT /api/pages/<id>` (JSON)
- `DELETE /api/pages/<id>`

Search:
- `GET /api/search?q=<query>&page=<page_id>`

Files:
- `GET /uploads/<filename>`

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
- Max upload size: configured in `app.py` via `app.config['MAX_CONTENT_LENGTH']`.
- Admin credentials: stored in `cred.json`.

## Security Notes
- Admin uses HTTP Basic Auth over plaintext unless served behind HTTPS.
- `cred.json` contains credentials in repo; treat as development-only or move to environment variables for production.
- No CSRF protection on admin endpoints.

## Known Issues And Risks (From Code Review)
1. Update entry with no new PDF fails.
   - `PUT /api/entries/<id>` returns `No file part` when no file is uploaded, even though the PDF is optional.
2. Update entry with a new PDF does not save the file.
   - The update route validates file type but never saves the file or sets `pdf_filename`.
3. File size mismatch in code vs UI.
   - `app.py` sets `MAX_CONTENT_LENGTH` to 32MB but the UI and README say 16MB.
4. Potential encoding mismatch in `pages.json`.
   - The file appears to be non-UTF-8 (Windows-1251), but `app.py` reads as UTF-8. This can cause garbled Bulgarian text.
5. Duplicate project folder `panel_system/`.
   - This looks like an older copy. It is not referenced by the root app or Docker setup and may cause confusion.
6. `landing.html` exists but is not routed.
   - There is no Flask route that renders `templates/landing.html`.

## Suggested Improvements
- Fix update endpoint to allow edits without uploading a file and to properly save new PDFs.
- Align max upload size in code, UI, and README.
- Convert `pages.json` to UTF-8 or update loader to handle the file encoding.
- Move admin credentials to environment variables and avoid committing real credentials.
- Add tests for API endpoints and file uploads.

## Troubleshooting
- If pages or entries disappear, check `entries.json` and `pages.json` for valid JSON.
- If uploads fail, confirm `uploads/` exists and is writable.
- If search returns no results, verify that pages have `searchable: true`.

## Developer Notes
- This app is stateful and stores data on disk. For multi-instance deployment, replace JSON storage with a database.
- The Flask server runs in debug mode when launched via `app.py`.


PS C:\Popoff\AlcorZop\AlcorZop>
python tools\import_wayback.py --csv urls.csv --sleep 0.5