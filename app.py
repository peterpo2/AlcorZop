from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from functools import wraps
from flask import Response
import json
import os
from datetime import datetime
from werkzeug.utils import secure_filename


app = Flask(__name__)
app.json.ensure_ascii = False
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max request size
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Store PDFs in the uploads folder (case-sensitive on Linux/Docker).
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}
MAX_PDF_FILES = 5

# Data files
DATA_FILE = 'entries.json'
PAGES_FILE = 'pages.json'

# Create uploads directory if it doesn't exist (and migrate legacy folder if present)
legacy_uploads = os.path.join(BASE_DIR, 'Uploads')
if os.path.isdir(legacy_uploads) and not os.path.isdir(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    for name in os.listdir(legacy_uploads):
        src = os.path.join(legacy_uploads, name)
        dst = os.path.join(app.config['UPLOAD_FOLDER'], name)
        if os.path.isfile(src) and not os.path.exists(dst):
            os.replace(src, dst)
else:
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_entries():
    """Load entries from JSON file"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            entries = json.load(f)
            for entry in entries:
                normalize_pdf_items(entry)
                normalize_files_items(entry)
            return entries
    return []

def normalize_pdf_items(entry):
    """Normalize stored PDF files to a list of {filename, label} dicts."""
    pdf_items = []
    if 'pdf_files' in entry:
        for item in entry.get('pdf_files', []):
            if isinstance(item, dict):
                filename = item.get('filename') or item.get('file')
                label = item.get('label') or item.get('name')
                if filename:
                    pdf_items.append({'filename': filename, 'label': label or None})
            elif isinstance(item, str):
                pdf_items.append({'filename': item, 'label': None})
    else:
        legacy = entry.pop('pdf_file', None)
        if legacy:
            pdf_items.append({'filename': legacy, 'label': None})
    entry['pdf_files'] = pdf_items

def normalize_files_items(entry):
    """Normalize structured files to a list of {name, url, published_at} dicts."""
    files = []
    raw = entry.get('files', [])
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                name = item.get('name') or item.get('file_name') or item.get('title') or ''
                url = item.get('url') or item.get('href') or ''
                published = item.get('published_at') or item.get('published') or item.get('date') or ''
                if name or url or published:
                    files.append({
                        'name': name,
                        'url': url,
                        'published_at': published
                    })
    entry['files'] = files

def build_pdf_label(raw_label, index, total):
    if not raw_label:
        return None
    if total <= 1:
        return raw_label
    return f"{raw_label} ({index})"

def normalize_incoming_files(items):
    files = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        name = item.get('name') or item.get('file_name') or item.get('title') or ''
        url = item.get('url') or item.get('href') or ''
        published = item.get('published_at') or item.get('published') or item.get('date') or ''
        if name or url or published:
            files.append({
                'name': name,
                'url': url,
                'published_at': published
            })
    return files

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

@app.route('/page/<int:page_id>')
def page_view(page_id):
    """Shortcut route to view a specific page."""
    return redirect(url_for('index', page=page_id))

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
    start_date = request.form.get('start_date', '')
    internal_number = request.form.get('internal_number', '')
    source_url = request.form.get('source_url', '')
    imported_at = request.form.get('imported_at', '')
    content = request.form.get('content', '')
    files_raw = request.form.get('files', '')
    page_id = int(request.form.get('page_id', 1))
    pdf_label = request.form.get('pdf_label', '').strip()
    
    # Handle file upload
    pdf_items = []
    files = request.files.getlist('pdf_files')
    if len([f for f in files if f and f.filename]) > MAX_PDF_FILES:
        return jsonify({'success': False, 'error': f'Maximum {MAX_PDF_FILES} PDF files allowed'}), 400
    total_files = len([f for f in files if f and f.filename])
    label_index = 1
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
        label = build_pdf_label(pdf_label, label_index, total_files)
        pdf_items.append({'filename': pdf_filename, 'label': label})
        label_index += 1

    files_list = []
    if files_raw:
        try:
            files_list = json.loads(files_raw)
            if not isinstance(files_list, list):
                files_list = []
        except json.JSONDecodeError:
            files_list = []
    files_list = normalize_incoming_files(files_list)

    new_entry = {
        'id': max([e['id'] for e in entries], default=0) + 1,
        'title': title,
        'heading': heading,
        'aop_number': aop_number,
        'publish_date': publish_date,
        'start_date': start_date,
        'internal_number': internal_number,
        'content': content,
        'files': files_list,
        'source_url': source_url,
        'imported_at': imported_at,
        'page_id': page_id,
        'pdf_files': pdf_items,
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
            for pdf_item in entry.get('pdf_files', []):
                pdf_name = pdf_item.get('filename') if isinstance(pdf_item, dict) else pdf_item
                if not pdf_name:
                    continue
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
        start_date = data.get('start_date', '')
        internal_number = data.get('internal_number', '')
        content = data.get('content', '')
        files_list = data.get('files', [])
        source_url = data.get('source_url', '')
        imported_at = data.get('imported_at', '')
        page_id = data.get('page_id', 1)
        pdf_filenames = None
    else:
        title = request.form.get('title', '')
        heading = request.form.get('heading', '')
        aop_number = request.form.get('aop_number', '')
        publish_date = request.form.get('publish_date', '')
        start_date = request.form.get('start_date', '')
        internal_number = request.form.get('internal_number', '')
        content = request.form.get('content', '')
        files_raw = request.form.get('files', '')
    files_list = []
    if files_raw:
        try:
            files_list = json.loads(files_raw)
            if not isinstance(files_list, list):
                files_list = []
        except json.JSONDecodeError:
            files_list = []
        files_list = normalize_incoming_files(files_list)
        source_url = request.form.get('source_url', '')
        imported_at = request.form.get('imported_at', '')
        page_id = int(request.form.get('page_id', 1))
        pdf_label = request.form.get('pdf_label', '').strip()
        
        # Handle file upload
        pdf_items = []
        files = request.files.getlist('pdf_files')
        existing_count = 0
        for entry in entries:
            if entry['id'] == entry_id:
                existing_count = len(entry.get('pdf_files', []))
                break
        incoming_count = len([f for f in files if f and f.filename])
        if existing_count + incoming_count > MAX_PDF_FILES:
            return jsonify({'success': False, 'error': f'Maximum {MAX_PDF_FILES} PDF files allowed'}), 400
        total_files = len([f for f in files if f and f.filename])
        label_index = 1
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
            label = build_pdf_label(pdf_label, label_index, total_files)
            pdf_items.append({'filename': pdf_filename, 'label': label})
            label_index += 1
    
    for entry in entries:
        if entry['id'] == entry_id:
            # Delete old PDF if new one is uploaded
            entry['title'] = title
            entry['heading'] = heading
            entry['aop_number'] = aop_number
            entry['publish_date'] = publish_date
            entry['start_date'] = start_date
            entry['internal_number'] = internal_number
            entry['content'] = content
            entry['files'] = files_list
            entry['source_url'] = source_url
            entry['imported_at'] = imported_at
            entry['page_id'] = page_id
            if pdf_items:
                entry['pdf_files'] = entry.get('pdf_files', []) + pdf_items
            break
    
    save_entries(entries)
    return jsonify({'success': True})

@app.route('/api/entries/<int:entry_id>/pdfs', methods=['DELETE'])
def delete_entry_pdfs(entry_id):
    """Remove all PDFs for a given entry"""
    entries = load_entries()
    for entry in entries:
        if entry['id'] == entry_id:
            for pdf_item in entry.get('pdf_files', []):
                pdf_name = pdf_item.get('filename') if isinstance(pdf_item, dict) else pdf_item
                if not pdf_name:
                    continue
                pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_name)
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
            entry['pdf_files'] = []
            break
    save_entries(entries)
    return jsonify({'success': True})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded PDF files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/pdf/<filename>')
def pdf_viewer(filename):
    """Render a viewer page for a PDF file"""
    if not allowed_file(filename):
        return redirect(url_for('index'))
    pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.isfile(pdf_path):
        return redirect(url_for('index'))
    return render_template('pdf_viewer.html', filename=filename)

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

        files_text = ""
        for f in e.get('files', []) or []:
            name = f.get('name', '') if isinstance(f, dict) else ''
            url = f.get('url', '') if isinstance(f, dict) else ''
            published = f.get('published_at', '') if isinstance(f, dict) else ''
            files_text += f" {name} {url} {published}"

        haystack = (
            f"{e.get('title','')} "
            f"{e.get('heading','')} "
            f"{e.get('aop_number','')} "
            f"{e.get('publish_date','')} "
            f"{e.get('internal_number','')} "
            f"{e.get('content','')} "
            f"{files_text}"
        ).lower()

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
