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
   Or use the run script:
   ```bash
   ./run.sh
   ```

3. Access the application:
   - **Home Page**: http://localhost:5000
   - **Admin Page**: http://localhost:5000/admin

## Project Structure

```
panel_system/
│
├── app.py                      # Main Flask application (backend)
├── requirements.txt            # Python dependencies
├── entries.json               # Data storage (auto-generated)
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

## Features Overview

### 1. Home Page (index.html)
- Displays all entries as collapsible panels
- Each panel has:
  - **Panel Heading**: Main title (always visible)
  - **Panel Title**: Secondary title (inside panel)
  - **Content**: Full text content
  - **Date**: Auto-generated timestamp
- Click any heading to collapse/expand
- Navigation to Admin page

### 2. Admin Page (admin.html)
- **Add New Entry**: Form to create entries
- **Manage Entries**: List of all entries with:
  - Edit button (opens modal)
  - Delete button (with confirmation)
- Modal dialog for editing entries

### 3. Backend API (app.py)
- `GET /` - Home page
- `GET /admin` - Admin page
- `GET /api/entries` - Fetch all entries
- `POST /api/entries` - Add new entry
- `PUT /api/entries/<id>` - Update entry
- `DELETE /api/entries/<id>` - Delete entry

## Sample Data

The system comes with 3 sample entries to demonstrate functionality:
1. Introduction panel
2. Meeting notes example
3. Announcement example

## Customization

### Colors (in style.css)
- Primary color: `#3498db` (blue)
- Secondary color: `#2c3e50` (dark blue-gray)
- Success: `#2ecc71` (green)
- Warning: `#f39c12` (orange)
- Danger: `#e74c3c` (red)

### Panel Behavior
- By default, all panels start expanded
- Modify `main.js` to change initial state

## Data Storage

Entries are stored in `entries.json` with the following structure:
```json
{
  "id": 1,
  "title": "Panel Title",
  "heading": "Panel Heading",
  "content": "Panel content text...",
  "date": "2024-02-02 10:00:00"
}
```

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

## Notes

- The application runs on port 5000 by default
- Data persists between server restarts
- No database required - uses JSON file storage
- Suitable for small to medium-sized content management
