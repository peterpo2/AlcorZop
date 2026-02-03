# Panel Entry Management System

A Flask web application for managing collapsible panel entries with PDF attachments and multi-page organization.

## Features

- Collapsible public panels with page navigation and search.
- Admin interface for pages, entries, and profile content.
- PDF uploads for entries and the buyer profile.
- JSON-based storage (no database required).
- Activity logging to `logs/app.log`.

## Installation

1. Install dependencies:

```bash
pip install -r requirements.txt
```

## Running The Application

1. Start the Flask server:

```bash
python app.py
```

2. Open your browser:

- Home page: http://localhost:5000
- Admin login: http://localhost:5000/admin

## Admin Login

- Credentials are loaded from `cred.json`.
- The admin session is not permanent and is cleared when the browser/tab closes.
- A logout beacon is sent when the admin page unloads. You will be asked to log in again on the next visit.

## Docker

1. Build and start:

```bash
docker compose up --build
```

2. Open:

- Home page: http://localhost:5000
- Admin login: http://localhost:5000/admin

Data and uploads are persisted via bind mounts in `docker-compose.yml`.

## Usage

### Viewing Entries (Home Page)

- Use the page navigation buttons at the top to switch between pages.
- Click any panel heading to expand or collapse.
- Search is scoped to the current page.

### Managing Pages (Admin)

- Rename, add, or delete pages.
- Pages can only be deleted when they have no entries.

### Managing Entries (Admin)

- Add entries with heading, title, content, and date.
- Attach up to 5 PDF files per entry.
- Edit or delete existing entries.

### Buyer Profile (Admin)

- Edit the profile title and body text.
- Upload up to 10 PDF files.

## File Structure

```
app.py
requirements.txt
entries.json
pages.json
profile.json
uploads/
logs/
templates/
static/
```

## Limits

- Max request size: 32MB (`app.config['MAX_CONTENT_LENGTH']`).
- Entry PDFs: up to 5 files.
- Profile PDFs: up to 10 files.

## API Endpoints

Admin-protected endpoints (session or Basic Auth):

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

Public endpoints:

- `GET /api/search?q=<query>&page=<page_id>`
- `GET /uploads/<filename>`
- `GET /pdf/<filename>`

## Import From Wayback (urls.csv)

Create a `urls.csv` in the repo root with:

```
url,page_name,subtopic
http://web.archive.org/web/20230127201504/http://zop.bolnicapernik.com/archive/,?????,
```

Notes:
- `url` and `page_name` are required.
- `subtopic` is optional and is used only if a panel is missing "????????? ????".

Run the importer:

```bash
python tools/import_wayback.py --csv urls.csv
```

Optional flags:
- `--dry-run` prints what would be created without posting to the API.
- `--auth-user` and `--auth-pass` for Basic Auth if your API is protected.
- `--sleep 1.0` and `--timeout 60` tune network behavior.
