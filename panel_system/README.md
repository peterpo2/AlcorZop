# Panel Entry Management System

A Flask web application for managing collapsible panel entries, similar to the example website provided.

## Features

- **Dynamic Panel System**: Display entries in collapsible panels
- **Admin Interface**: Add, edit, and delete entries
- **Responsive Design**: Works on desktop and mobile devices
- **Data Persistence**: Entries are stored in a JSON file

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

## Usage

### Viewing Entries (Home Page)
- Click on any panel heading to collapse/expand the panel
- All panels start expanded by default

### Managing Entries (Admin Page)
- **Add Entry**: Fill in the form with heading, title, and content, then click "Add Entry"
- **Edit Entry**: Click the "Edit" button on any entry to modify it
- **Delete Entry**: Click the "Delete" button to remove an entry (confirmation required)

## File Structure

```
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── entries.json          # Data storage (created automatically)
├── templates/
│   ├── index.html        # Home page template
│   └── admin.html        # Admin page template
└── static/
    ├── css/
    │   └── style.css     # Stylesheet
    └── js/
        ├── main.js       # Panel collapse/expand functionality
        └── admin.js      # Admin page functionality
```

## API Endpoints

- `GET /api/entries` - Get all entries
- `POST /api/entries` - Add a new entry
- `PUT /api/entries/<id>` - Update an entry
- `DELETE /api/entries/<id>` - Delete an entry

## Panel Structure

Each panel contains:
- **Panel Heading**: The main title shown in the collapsed state
- **Panel Title**: Secondary title inside the expanded panel
- **Content**: The main text content
- **Date**: Automatically generated timestamp
