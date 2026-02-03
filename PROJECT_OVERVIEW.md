# Panel Entry Management System - Project Overview

## Quick Start

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Access the application:
   - Home Page: http://localhost:5000
   - Admin Login: http://localhost:5000/admin

## Project Structure

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

## Features Overview

### 1. Home Page (index.html)
- Displays entries as collapsible panels
- Page navigation and search
- Panels load collapsed by default

### 2. Admin Page (admin.html)
- Login-protected
- Manage entries, pages, and profile
- PDF upload support

### 3. Backend API (app.py)
- Admin-protected JSON endpoints for entries, pages, and profile
- Public search endpoint

## Data Storage

Entries are stored in `entries.json` with the following structure:

```json
{
  "id": 1,
  "title": "Panel Title",
  "heading": "Panel Heading",
  "content": "Panel content text...",
  "page_id": 1,
  "publish_date": "2024-02-02",
  "files": [],
  "pdf_files": [],
  "date": "2024-02-02 10:00:00"
}
```

## Notes

- The application runs on port 5000 by default
- Data persists between server restarts
- No database required (JSON file storage)
