# Panel Entry Management System

A Flask web application for managing collapsible panel entries with PDF attachments and multi-page organization.

## Features

- **Dynamic Panel System**: Display entries in collapsible panels
- **Multi-Page Organization**: Create and manage multiple pages with custom names
- **PDF Attachments**: Attach PDF files to any entry
- **Admin Interface**: Add, edit, and delete entries and pages
- **Responsive Design**: Works on desktop and mobile devices
- **Data Persistence**: Entries are stored in JSON files

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and navigate to:
   - Home page: http://localhost:5000
   - Admin page: http://localhost:5000/admin

## Docker

1. Build and start:
```bash
docker compose up --build
```

2. Open:
   - Home page: http://localhost:5000
   - Admin page: http://localhost:5000/admin

Data and uploads are persisted via bind mounts in `docker-compose.yml`.

## Usage

### Viewing Entries (Home Page)
- Use the **page navigation buttons** at the top to switch between pages
- Click on any panel heading to collapse/expand the panel
- Click on PDF links to view attached documents
- All panels start expanded by default

### Managing Pages (Admin Page)
- **Rename Page**: Click "Rename" next to any page
- **Add New Page**: Click "Add New Page" button
- **Delete Page**: Click "Delete" (only works if page has no entries)

### Managing Entries (Admin Page)
- **Add Entry**: 
  - Select which page to add the entry to
  - Fill in the form with heading, title, and content
  - Optionally attach a PDF file (max 16MB)
  - Click "Add Entry"
- **Edit Entry**: Click the "Edit" button on any entry to modify it
- **Delete Entry**: Click the "Delete" button to remove an entry (confirmation required)
- **Filter Entries**: Use the dropdown to view entries from specific pages

## File Structure

```
panel_system/
│
├── app.py                      # Main Flask application (backend)
├── requirements.txt            # Python dependencies
├── entries.json               # Entry data storage
├── pages.json                 # Page configuration storage
├── uploads/                   # PDF file storage directory
├── run.sh                     # Quick start script
├── README.md                  # Documentation
│
├── templates/                 # HTML templates
│   ├── index.html            # Home page with panels
│   └── admin.html            # Admin management page
│
└── static/                    # Static assets
    ├── css/
    │   └── style.css         # All styling
    └── js/
        ├── main.js           # Panel toggle functionality
        └── admin.js          # Admin page functionality
```

## API Endpoints

**Entries:**
- `GET /api/entries` - Get all entries
- `POST /api/entries` - Add a new entry (with optional PDF)
- `PUT /api/entries/<id>` - Update an entry
- `DELETE /api/entries/<id>` - Delete an entry

**Pages:**
- `GET /api/pages` - Get all pages
- `POST /api/pages` - Add a new page
- `PUT /api/pages/<id>` - Rename a page
- `DELETE /api/pages/<id>` - Delete a page (if empty)

**Files:**
- `GET /uploads/<filename>` - Serve uploaded PDF files

## Import from Wayback (urls.csv)

Create a `urls.csv` in the repo root with:

```
url,page_name,subtopic
http://web.archive.org/web/20230127201504/http://zop.bolnicapernik.com/archive/,Архив,
```

Notes:
- `url` and `page_name` are required.
- `subtopic` is optional and is used only if a panel is missing “Началната дата”.
- Broken or missing Wayback pages are logged and skipped.

Run the importer:

```bash
python tools/import_wayback.py --csv urls.csv
```

Optional flags:
- `--dry-run` prints what would be created without posting to the API.
- `--auth-user` and `--auth-pass` for Basic Auth if your API is protected.
- `--sleep 1.0` and `--timeout 60` tune network behavior.

## Panel Structure

Each panel contains:
- **Panel Heading**: The main title shown in the collapsed state
- **Panel Title**: Secondary title inside the expanded panel
- **Content**: The main text content
- **Date**: Automatically generated timestamp
