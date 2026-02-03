from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from functools import wraps
from flask import Response
import json
import os
from datetime import datetime
from werkzeug.utils import secure_filename


app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max request size
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Store PDFs in the Uploads folder (case-insensitive on Windows).
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'Uploads')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}
MAX_PDF_FILES = 5

# Data files
DATA_FILE = 'entries.json'
PAGES_FILE = 'pages.json'

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_entries():
    """Load entries from JSON file"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            entries = json.load(f)
            for entry in entries:
                if 'pdf_files' not in entry:
                    legacy = entry.pop('pdf_file', None)
                    entry['pdf_files'] = [legacy] if legacy else []
            return entries
    return []

def save_entries(entries):
    """Save entries to JSON file"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

def load_pages():
    """Load pages from JSON file"""
    if os.path.exists(PAGES_FILE):
        with open(PAGES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [
        {"id": 1, "name": "Page 1"},
        {"id": 2, "name": "Page 2"},
        {"id": 3, "name": "Page 3"}
    ]

def save_pages(pages):
    """Save pages to JSON file"""
    with open(PAGES_FILE, 'w', encoding='utf-8') as f:
        json.dump(pages, f, ensure_ascii=False, indent=2)

CREDENTIALS_FILE = 'cred.json'

def load_admin_credentials():
    with open(CREDENTIALS_FILE, 'r') as f:
        return json.load(f)

def check_auth(username, password):
    creds = load_admin_credentials()
    return (
        username == creds.get('username') and
        password == creds.get('password')
    )

def authenticate():
    return Response(
        'Authentication required',
        401,
        {'WWW-Authenticate': 'Basic realm="Admin Area"'}
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated


@app.route('/')
def index():
    """Main page showing all entries"""
    page_id = request.args.get('page', '1')
    try:
        page_id = int(page_id)
    except:
        page_id = 1

    entries = load_entries()
    pages = load_pages()

    # Filter entries by page
    page_entries = [e for e in entries if e.get('page_id') == page_id]

    return render_template('index.html', entries=page_entries, pages=pages, current_page=page_id)

@app.route('/admin')
@requires_auth
def admin():
    """Admin page for managing entries"""
    entries = load_entries()
    pages = load_pages()
    return render_template('admin.html', entries=entries, pages=pages)

@app.route('/logout')
def logout():
    """Force browser to drop cached Basic Auth credentials."""
    return Response(
        'Logged out',
        401,
        {'WWW-Authenticate': 'Basic realm="Logged Out"'}
    )

@app.route('/api/entries', methods=['GET'])
def get_entries():
    """API endpoint to get all entries"""
    entries = load_entries()
    return jsonify(entries)

@app.route('/api/entries', methods=['POST'])
def add_entry():
    """API endpoint to add a new entry with optional PDF"""
    entries = load_entries()
    
    # Handle multipart form data
    title = request.form.get('title', '')
    heading = request.form.get('heading', '')
    aop_number = request.form.get('aop_number', '')
    publish_date = request.form.get('publish_date', '')
    content = request.form.get('content', '')
    page_id = int(request.form.get('page_id', 1))
    
    # Handle file upload
    pdf_filenames = []
    files = request.files.getlist('pdf_files')
    if len([f for f in files if f and f.filename]) > MAX_PDF_FILES:
        return jsonify({'success': False, 'error': f'Maximum {MAX_PDF_FILES} PDF files allowed'}), 400
    for file in files:
        if not file or file.filename == '':
            continue
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        pdf_filename = f"{timestamp}_{filename}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
        file.save(save_path)
        pdf_filenames.append(pdf_filename)

    new_entry = {
        'id': max([e['id'] for e in entries], default=0) + 1,
        'title': title,
        'heading': heading,
        'aop_number': aop_number,
        'publish_date': publish_date,
        'content': content,
        'page_id': page_id,
        'pdf_files': pdf_filenames,
        'date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    entries.append(new_entry)
    save_entries(entries)
    
    return jsonify({'success': True, 'entry': new_entry})

@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    """API endpoint to delete an entry"""
    entries = load_entries()
    
    # Find and delete associated PDF file
    for entry in entries:
        if entry['id'] == entry_id and entry.get('pdf_files'):
            for pdf_name in entry.get('pdf_files', []):
                pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_name)
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
            break
    
    entries = [e for e in entries if e['id'] != entry_id]
    save_entries(entries)
    
    return jsonify({'success': True})

@app.route('/api/entries/<int:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    """API endpoint to update an entry"""
    entries = load_entries()
    
    # Handle both JSON and form data
    if request.is_json:
        data = request.json
        title = data.get('title', '')
        heading = data.get('heading', '')
        aop_number = data.get('aop_number', '')
        publish_date = data.get('publish_date', '')
        content = data.get('content', '')
        page_id = data.get('page_id', 1)
        pdf_filenames = None
    else:
        title = request.form.get('title', '')
        heading = request.form.get('heading', '')
        aop_number = request.form.get('aop_number', '')
        publish_date = request.form.get('publish_date', '')
        content = request.form.get('content', '')
        page_id = int(request.form.get('page_id', 1))
        
        # Handle file upload
        pdf_filenames = []
        files = request.files.getlist('pdf_files')
        if len([f for f in files if f and f.filename]) > MAX_PDF_FILES:
            return jsonify({'success': False, 'error': f'Maximum {MAX_PDF_FILES} PDF files allowed'}), 400
        for file in files:
            if not file or file.filename == '':
                continue
            if not allowed_file(file.filename):
                return jsonify({'success': False, 'error': 'Only PDF files allowed'}), 400
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_filename = f"{timestamp}_{filename}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
            file.save(save_path)
            pdf_filenames.append(pdf_filename)
    
    for entry in entries:
        if entry['id'] == entry_id:
            # Delete old PDF if new one is uploaded
            if pdf_filenames:
                for old_name in entry.get('pdf_files', []):
                    old_pdf = os.path.join(app.config['UPLOAD_FOLDER'], old_name)
                    if os.path.exists(old_pdf):
                        os.remove(old_pdf)
            
            entry['title'] = title
            entry['heading'] = heading
            entry['aop_number'] = aop_number
            entry['publish_date'] = publish_date
            entry['content'] = content
            entry['page_id'] = page_id
            if pdf_filenames:
                entry['pdf_files'] = pdf_filenames
            break
    
    save_entries(entries)
    return jsonify({'success': True})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded PDF files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/pages', methods=['GET'])
def get_pages():
    """API endpoint to get all pages"""
    pages = load_pages()
    return jsonify(pages)

@app.route('/api/pages', methods=['POST'])
def add_page():
    """API endpoint to add a new page"""
    data = request.json
    pages = load_pages()
    
    new_page = {
        'id': max([p['id'] for p in pages], default=0) + 1,
        'name': data.get('name', f'Page {len(pages) + 1}'),
        'searchable': data.get('searchable', True)
    }
    
    pages.append(new_page)
    save_pages(pages)
    
    return jsonify({'success': True, 'page': new_page})

@app.route('/api/search')
def search_entries():
    query = request.args.get('q', '').strip().lower()
    page_id = request.args.get('page')

    if not query:
        return jsonify([])

    entries = load_entries()
    pages = load_pages()

    searchable_pages = {
        p['id'] for p in pages if p.get('searchable', False)
    }

    results = []

    for e in entries:
        if e['page_id'] not in searchable_pages:
            continue

        if page_id and str(e['page_id']) != page_id:
            continue

        haystack = f"{e.get('title','')} {e.get('heading','')} {e.get('aop_number','')} {e.get('publish_date','')} {e.get('content','')}".lower()

        if query in haystack:
            results.append(e)

    return jsonify(results)

@app.route('/api/pages/<int:page_id>', methods=['PUT'])
def update_page(page_id):
    """API endpoint to rename a page"""
    data = request.json
    pages = load_pages()
    
    for page in pages:
        if page['id'] == page_id:
            page['name'] = data.get('name', page['name'])
            break
    
    save_pages(pages)
    return jsonify({'success': True})

@app.route('/api/pages/<int:page_id>', methods=['DELETE'])
def delete_page(page_id):
    """API endpoint to delete a page"""
    pages = load_pages()
    entries = load_entries()
    
    # Don't allow deletion if entries exist on this page
    page_entries = [e for e in entries if e.get('page_id') == page_id]
    if page_entries:
        return jsonify({'success': False, 'error': 'Cannot delete page with entries'}), 400
    
    pages = [p for p in pages if p['id'] != page_id]
    save_pages(pages)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
