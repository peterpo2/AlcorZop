from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, Response, session, g
from functools import wraps
import json
import os
from datetime import datetime
import html
import logging
from logging.handlers import RotatingFileHandler
import re
from time import perf_counter
from urllib.parse import urlparse
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename


app = Flask(__name__)
app.json.ensure_ascii = False
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max request size
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Store PDFs in the uploads folder (case-sensitive on Linux/Docker).
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY') or os.environ.get('SECRET_KEY') or os.urandom(24)
app.secret_key = app.config['SECRET_KEY']

LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

def configure_logging():
    log_path = os.path.join(LOG_DIR, 'app.log')
    handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=5, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')
    handler.setFormatter(formatter)
    if not any(isinstance(h, RotatingFileHandler) for h in app.logger.handlers):
        app.logger.setLevel(logging.INFO)
        app.logger.addHandler(handler)
        app.logger.propagate = True

configure_logging()

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}
MAX_PDF_FILES = 5
MAX_PROFILE_PDF_FILES = 10
PROFILE_LOGO_FILENAME = 'profile-logo.png'

# Data files
DATA_FILE = 'entries.json'
PAGES_FILE = 'pages.json'
PROFILE_FILE = 'profile.json'

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


def load_json_file(path, default):
    if not os.path.exists(path):
        app.logger.info('data.load.missing path=%s', path)
        return default
    try:
        with open(path, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        app.logger.error('data.load.error path=%s error=%s', path, exc)
        return default
    except Exception:
        app.logger.exception('data.load.exception path=%s', path)
        return default


def save_json_file(path, payload):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        count = len(payload) if isinstance(payload, list) else 'n/a'
        app.logger.info('data.save path=%s count=%s', path, count)
    except Exception:
        app.logger.exception('data.save.failed path=%s', path)
        raise

@app.before_request
def start_timer():
    g.request_start = perf_counter()


@app.after_request
def log_request(response):
    start = getattr(g, 'request_start', None)
    duration = perf_counter() - start if start else 0.0
    app.logger.info('http %s %s %s %.3fs', request.method, request.path, response.status_code, duration)
    if request.path.startswith('/admin') or request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
    return response


@app.errorhandler(Exception)
def handle_exception(error):
    if isinstance(error, HTTPException):
        return error
    app.logger.exception('unhandled error')
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
    return error

def load_entries():
    """Load entries from JSON file"""
    entries = load_json_file(DATA_FILE, [])
    if not isinstance(entries, list):
        app.logger.error('entries.invalid type=%s', type(entries))
        return []
    changed = False
    for entry in entries:
        if normalize_pdf_items(entry):
            changed = True
        if cleanup_entry_fields(entry):
            changed = True
    if changed:
        save_entries(entries)
        app.logger.info('entries.normalized count=%s', len(entries))
    return entries

def extract_local_pdf_filename(value):
    if not value:
        return None
    if isinstance(value, dict):
        candidate = value.get('filename') or value.get('file')
        if candidate:
            return candidate
        value = value.get('url') or ''
    if isinstance(value, str):
        if value.startswith('/pdf/'):
            return value.split('/pdf/', 1)[1]
        parsed = urlparse(value)
        if parsed.path.startswith('/pdf/'):
            return parsed.path.split('/pdf/', 1)[1]
    return None

def normalize_pdf_items(entry):
    """Normalize stored PDF files to a list of dicts.

    Supports legacy uploads (filename/label) and Wayback links (name/url).
    """
    before = entry.get('pdf_files') if 'pdf_files' in entry else entry.get('pdf_file')
    pdf_items = []
    if 'pdf_files' in entry:
        raw = entry.get('pdf_files', [])
        if isinstance(raw, list):
            items = raw
        else:
            items = [raw]
        for item in items:
            if isinstance(item, dict):
                url = item.get('url') or ''
                name = item.get('name') or item.get('label') or ''
                filename = item.get('filename') or item.get('file')
                if not filename and url:
                    filename = extract_local_pdf_filename(url)
                if url or name or filename:
                    payload = {'name': name, 'url': url}
                    if filename:
                        payload['filename'] = filename
                    pdf_items.append(payload)
            elif isinstance(item, str):
                filename = item
                pdf_items.append({'name': filename, 'url': f"/pdf/{filename}", 'filename': filename})
    else:
        legacy = entry.pop('pdf_file', None)
        if legacy:
            pdf_items.append({'name': legacy, 'url': f"/pdf/{legacy}", 'filename': legacy})
    entry['pdf_files'] = pdf_items
    return before != pdf_items

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

def normalize_text(value):
    return " ".join((value or "").split())

def normalize_for_compare(value):
    return normalize_text(value).casefold()

def cleanup_entry_fields(entry):
    changed = False
    aop_number = entry.get('aop_number', '')
    if aop_number:
        date_like = re.search(r"\\b[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}\\b", aop_number)
        if date_like or not any(ch.isdigit() for ch in aop_number):
            entry['aop_number'] = ''
            changed = True

    title = entry.get('title', '')
    heading = entry.get('heading', '')
    if title and heading and normalize_for_compare(title) == normalize_for_compare(heading):
        entry['heading'] = ''
        changed = True

    before_files = entry.get('files')
    normalize_files_items(entry)
    if entry.get('files') != before_files:
        changed = True
    return changed

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

def normalize_incoming_pdf_links(items):
    links = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        name = item.get('name') or item.get('label') or ''
        url = item.get('url') or ''
        if name or url:
            payload = {'name': name, 'url': url}
            filename = extract_local_pdf_filename(url)
            if filename:
                payload['filename'] = filename
            links.append(payload)
    return links

def save_entries(entries):
    """Save entries to JSON file"""
    save_json_file(DATA_FILE, entries)

def load_pages():
    """Load pages from JSON file"""
    pages = load_json_file(PAGES_FILE, [])
    if not pages:
        return [
            {"id": 1, "name": "Page 1", "searchable": True},
            {"id": 2, "name": "Page 2", "searchable": True},
            {"id": 3, "name": "Page 3", "searchable": True},
        ]
    if not isinstance(pages, list):
        app.logger.error('pages.invalid type=%s', type(pages))
        return []
    changed = False
    cleaned_pages = []
    for page in pages:
        page_name = normalize_for_compare(page.get('name', ''))
        if page_name == 'page_name':
            changed = True
            app.logger.warning('pages.cleanup removed_invalid_page id=%s name=%s', page.get('id'), page.get('name'))
            continue
        if 'searchable' not in page:
            page['searchable'] = True
            changed = True
        cleaned_pages.append(page)
    if changed:
        pages = cleaned_pages
        save_pages(pages)
    return pages

def save_pages(pages):
    """Save pages to JSON file"""
    save_json_file(PAGES_FILE, pages)

def default_profile():
    return {
        "title": "Профил на купувача – МБАЛ „Рахила Ангелова“ – гр. Перник",
        "body": (
            "\n"
            "МБАЛ „Рахила Ангелова“ АД гр. Перник съхранява и обогатява "
            "традициите на 110-годишната си история. Днес тя е модерно "
            "здравно заведение, което предлага квалифицирана болнична "
            "диагностична, лечебна и рехабилитационна помощ на нуждаещите се "
            "от активно лечение.\n"
            "\n"
            "УПРАВЛЕНИЕ:\n"
            "Д-р Анатоли Митов\n"
            "Изпълнителен директор на МБАЛ „Рахила Ангелова“, гр. Перник\n"
            "тел.: 076 / 601 360\n"
            "\n"
            "Д-р Симеон Станков\n"
            "Заместник-директор „Медицински дейности“\n"
            "тел.: 076 / 601 360\n"
            "\n"
            "ЮРИСТИ:\n"
            "\n"
            "АДРЕС:\n"
            "Лечебното заведение се намира на адрес:\n"
            "гр. Перник, ул. „Брезник“ №2, ПК 2300\n"
            "\n"
            "Електронна поща:\n"
            "mbalpk@abv.bg"
        ),
        "files": []
    }

def normalize_profile_body(text):
    body = (text or "")
    # Handle double-escaped HTML (e.g., &amp;lt;br&amp;gt;).
    for _ in range(2):
        unescaped = html.unescape(body)
        if unescaped == body:
            break
        body = unescaped
    body = body.replace("\r\n", "\n").replace("\r", "\n")
    body = re.sub(r"&lt;\s*br\s*/?\s*&gt;", "\n", body, flags=re.IGNORECASE)
    body = re.sub(r"<br\\s*/?>", "\n", body, flags=re.IGNORECASE)
    body = re.sub(r"</(p|h1|h2|h3|h4|h5|h6)>", "\n", body, flags=re.IGNORECASE)
    body = re.sub(r"<[^>]+>", "", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body

def load_profile():
    data = load_json_file(PROFILE_FILE, {})
    if isinstance(data, dict) and data.get('title') and data.get('body'):
        normalized_body = normalize_profile_body(data.get('body', ''))
        files = data.get('files')
        if not isinstance(files, list):
            files = []
        data['files'] = files
        if normalized_body != data.get('body'):
            data['body'] = normalized_body
            save_profile(data)
        return data
    return default_profile()

def save_profile(profile):
    profile = {
        'title': profile.get('title', ''),
        'body': normalize_profile_body(profile.get('body', '')),
        'files': profile.get('files', [])
    }
    save_json_file(PROFILE_FILE, profile)

CREDENTIALS_FILE = 'cred.json'

def load_admin_credentials():
    creds = load_json_file(CREDENTIALS_FILE, {})
    if not isinstance(creds, dict):
        app.logger.error('creds.invalid type=%s', type(creds))
        return {}
    return creds

def check_auth(username, password):
    creds = load_admin_credentials()
    return (
        username == creds.get('username') and
        password == creds.get('password')
    )

def is_basic_auth_valid():
    auth = request.authorization
    return bool(auth and check_auth(auth.username, auth.password))

def is_session_auth():
    return session.get('admin_authenticated') is True

def set_admin_session(username: str):
    session.permanent = False
    session['admin_authenticated'] = True
    session['admin_user'] = username
    session['admin_login_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def clear_admin_session():
    session.pop('admin_authenticated', None)
    session.pop('admin_user', None)
    session.pop('admin_login_at', None)

def requires_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if is_session_auth() or is_basic_auth_valid():
            return f(*args, **kwargs)
        app.logger.warning('auth.denied path=%s', request.path)
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        return redirect(url_for('admin_login', next=request.full_path))
    return decorated


@app.route('/')
def index():
    """Main page showing all entries"""
    page_arg = request.args.get('page')
    is_main_page = page_arg is None
    page_id = None
    if page_arg is not None:
        try:
            page_id = int(page_arg)
        except:
            page_id = 1

    entries = load_entries()
    pages = load_pages()
    profile = load_profile()
    profile_logo_url = None
    logo_path = os.path.join(app.config['UPLOAD_FOLDER'], PROFILE_LOGO_FILENAME)
    if os.path.isfile(logo_path):
        profile_logo_url = url_for('uploaded_file', filename=PROFILE_LOGO_FILENAME)

    # Filter entries by page when a page is selected. Otherwise show all.
    if page_id is None:
        page_entries = entries
    else:
        page_entries = [e for e in entries if e.get('page_id') == page_id]
    app.logger.info('index page_id=%s entries=%s', page_id or 'all', len(page_entries))

    return render_template(
        'index.html',
        entries=page_entries,
        pages=pages,
        current_page=page_id,
        is_main_page=is_main_page,
        profile=profile,
        profile_logo_url=profile_logo_url
    )

@app.route('/page/<int:page_id>')
def page_view(page_id):
    """Shortcut route to view a specific page."""
    return redirect(url_for('index', page=page_id))

def safe_next_url(target):
    if not target:
        return None
    if target.startswith('/') and not target.startswith('//'):
        return target
    return None


@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    error = None
    next_url = safe_next_url(request.args.get('next') or request.form.get('next'))
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = (request.form.get('password') or '').strip()
        if check_auth(username, password):
            set_admin_session(username)
            app.logger.info('auth.login.success user=%s', username)
            return redirect(next_url or url_for('admin'))
        app.logger.warning('auth.login.failed user=%s', username)
        error = '????????? ????????????? ??? ??? ??????.'
    return render_template('admin_login.html', error=error, next=next_url or '')


@app.route('/admin')
def admin():
    """Admin page for managing entries"""
    if not is_session_auth():
        return redirect(url_for('admin_login', next=request.full_path))
    entries = load_entries()
    pages = load_pages()
    profile = load_profile()
    app.logger.info('admin.view user=%s', session.get('admin_user'))
    return render_template('admin.html', entries=entries, pages=pages, profile=profile)


@app.route('/logout', methods=['GET', 'POST'])
def logout():
    """Clear admin session and optionally force Basic Auth logout."""
    clear_admin_session()
    app.logger.info('auth.logout')
    if request.method == 'POST':
        resp = Response('', 204)
    else:
        resp = redirect(url_for('admin_login'))
    resp.headers['WWW-Authenticate'] = 'Basic realm="Logged Out"'
    return resp

@app.route('/api/entries', methods=['GET'])
@requires_admin
def get_entries():
    """API endpoint to get all entries"""
    entries = load_entries()
    return jsonify(entries)

@app.route('/api/entries', methods=['POST'])
@requires_admin
def add_entry():
    """API endpoint to add a new entry with optional PDF"""
    entries = load_entries()
    
    # Handle multipart form data
    title = normalize_text(request.form.get('title', ''))
    heading = normalize_text(request.form.get('heading', ''))
    aop_number = request.form.get('aop_number', '')
    publish_date = request.form.get('publish_date', '')
    start_date = request.form.get('start_date', '')
    internal_number = request.form.get('internal_number', '')
    source_url = request.form.get('source_url', '')
    imported_at = request.form.get('imported_at', '')
    content = request.form.get('content', '')
    files_raw = request.form.get('files', '')
    pdf_links_raw = request.form.get('pdf_links', '')
    page_id_raw = request.form.get('page_id', '').strip()
    page_id = int(page_id_raw) if page_id_raw.isdigit() else 0
    pdf_label = request.form.get('pdf_label', '').strip()

    if not title or page_id <= 0:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
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

    pdf_links = []
    if pdf_links_raw:
        try:
            pdf_links = json.loads(pdf_links_raw)
            if not isinstance(pdf_links, list):
                pdf_links = []
        except json.JSONDecodeError:
            pdf_links = []
    pdf_links = normalize_incoming_pdf_links(pdf_links)

    for item in pdf_items:
        filename = item.get('filename')
        label = item.get('label') or filename
        if filename:
            pdf_links.append({'name': label, 'url': f"/pdf/{filename}", 'filename': filename})

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
        'pdf_files': pdf_links,
        'source_url': source_url,
        'imported_at': imported_at,
        'page_id': page_id,
        'date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    cleanup_entry_fields(new_entry)
    
    entries.append(new_entry)
    save_entries(entries)
    app.logger.info('entries.add id=%s page_id=%s pdfs=%s', new_entry.get('id'), page_id, len(pdf_links))

    return jsonify({'success': True, 'entry': new_entry})

@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
@requires_admin
def delete_entry(entry_id):
    """API endpoint to delete an entry"""
    entries = load_entries()
    
    # Find and delete associated PDF file
    for entry in entries:
        if entry['id'] == entry_id and entry.get('pdf_files'):
            for pdf_item in entry.get('pdf_files', []):
                pdf_name = extract_local_pdf_filename(pdf_item)
                if not pdf_name:
                    continue
                pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_name)
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    app.logger.info('entries.delete.pdf filename=%s', pdf_name)
            break
    
    entries = [e for e in entries if e['id'] != entry_id]
    save_entries(entries)
    app.logger.info('entries.delete id=%s', entry_id)

    return jsonify({'success': True})

@app.route('/api/entries/<int:entry_id>', methods=['PUT'])
@requires_admin
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
        files_list = normalize_incoming_files(data.get('files', []))
        pdf_links_provided = 'pdf_links' in data
        pdf_links = normalize_incoming_pdf_links(data.get('pdf_links', []))
        source_url = data.get('source_url', '')
        imported_at = data.get('imported_at', '')
        page_id = data.get('page_id', 1)
    else:
        title = request.form.get('title', '')
        heading = request.form.get('heading', '')
        aop_number = request.form.get('aop_number', '')
        publish_date = request.form.get('publish_date', '')
        start_date = request.form.get('start_date', '')
        internal_number = request.form.get('internal_number', '')
        content = request.form.get('content', '')
        files_raw = request.form.get('files', '')
        pdf_links_raw = request.form.get('pdf_links', '')
        pdf_links_provided = bool(pdf_links_raw)
        files_list = []
        if files_raw:
            try:
                files_list = json.loads(files_raw)
                if not isinstance(files_list, list):
                    files_list = []
            except json.JSONDecodeError:
                files_list = []
        files_list = normalize_incoming_files(files_list)
        pdf_links = []
        if pdf_links_raw:
            try:
                pdf_links = json.loads(pdf_links_raw)
                if not isinstance(pdf_links, list):
                    pdf_links = []
            except json.JSONDecodeError:
                pdf_links = []
        pdf_links = normalize_incoming_pdf_links(pdf_links)
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
            if pdf_links_provided:
                entry['pdf_files'] = pdf_links
            entry['source_url'] = source_url
            entry['imported_at'] = imported_at
            entry['page_id'] = page_id
            if pdf_items:
                for item in pdf_items:
                    filename = item.get('filename')
                    label = item.get('label') or filename
                    if filename:
                        entry['pdf_files'] = (entry.get('pdf_files') or []) + [
                            {'name': label, 'url': f"/pdf/{filename}", 'filename': filename}
                        ]
            cleanup_entry_fields(entry)
            break
    
    save_entries(entries)
    app.logger.info('entries.update id=%s page_id=%s', entry_id, page_id)
    return jsonify({'success': True})

@app.route('/api/entries/<int:entry_id>/pdfs', methods=['DELETE'])
@requires_admin
def delete_entry_pdfs(entry_id):
    """Remove all PDFs for a given entry"""
    entries = load_entries()
    for entry in entries:
        if entry['id'] == entry_id:
            for pdf_item in entry.get('pdf_files', []):
                pdf_name = extract_local_pdf_filename(pdf_item)
                if not pdf_name:
                    continue
                pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_name)
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    app.logger.info('entries.delete.pdf filename=%s', pdf_name)
            entry['pdf_files'] = []
            break
    save_entries(entries)
    app.logger.info('entries.delete_pdfs id=%s', entry_id)
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
@requires_admin
def get_pages():
    """API endpoint to get all pages"""
    pages = load_pages()
    return jsonify(pages)

@app.route('/api/profile', methods=['GET'])
@requires_admin
def get_profile():
    return jsonify(load_profile())

@app.route('/api/profile', methods=['PUT'])
@requires_admin
def update_profile():
    if request.is_json:
        data = request.json or {}
        title = (data.get('title') or '').strip()
        body = (data.get('body') or '').strip()
        files = data.get('files') or []
        if not title or not body:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        profile = {'title': title, 'body': body, 'files': files}
        save_profile(profile)
        app.logger.info('profile.update files=%s', len(files))
        return jsonify({'success': True, 'profile': profile})

    title = (request.form.get('title') or '').strip()
    body = (request.form.get('body') or '').strip()
    if not title or not body:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    profile = load_profile()
    pdf_label = (request.form.get('pdf_label') or '').strip()
    files = request.files.getlist('pdf_files')
    existing_files = profile.get('files', [])
    incoming_count = len([f for f in files if f and f.filename])
    if len(existing_files) + incoming_count > MAX_PROFILE_PDF_FILES:
        return jsonify({'success': False, 'error': f'Maximum {MAX_PROFILE_PDF_FILES} PDF files allowed'}), 400

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
        label = build_pdf_label(pdf_label, label_index, total_files) or filename
        existing_files.append({
            'name': label,
            'filename': pdf_filename,
            'url': f"/pdf/{pdf_filename}"
        })
        label_index += 1

    profile = {'title': title, 'body': body, 'files': existing_files}
    save_profile(profile)
    app.logger.info('profile.update files=%s', len(existing_files))
    return jsonify({'success': True, 'profile': profile})

@app.route('/api/profile/pdfs/<filename>', methods=['DELETE'])
@requires_admin
def delete_profile_pdf(filename):
    if not allowed_file(filename):
        return jsonify({'success': False, 'error': 'Invalid file'}), 400
    profile = load_profile()
    files = profile.get('files', [])
    removed = False
    updated_files = []
    for item in files:
        if isinstance(item, dict) and item.get('filename') == filename:
            removed = True
            continue
        updated_files.append(item)
    if removed:
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    profile['files'] = updated_files
    save_profile(profile)
    app.logger.info('profile.delete_pdf filename=%s removed=%s', filename, removed)
    return jsonify({'success': True, 'removed': removed})

@app.route('/api/pages', methods=['POST'])
@requires_admin
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
    app.logger.info('pages.add id=%s name=%s', new_page.get('id'), new_page.get('name'))

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

    app.logger.info('search query=%s results=%s page_id=%s', query, len(results), page_id or '')
    return jsonify(results)

@app.route('/api/pages/<int:page_id>', methods=['PUT'])
@requires_admin
def update_page(page_id):
    """API endpoint to rename a page"""
    data = request.json
    pages = load_pages()
    
    for page in pages:
        if page['id'] == page_id:
            page['name'] = data.get('name', page['name'])
            break
    
    save_pages(pages)
    app.logger.info('pages.update id=%s', page_id)
    return jsonify({'success': True})

@app.route('/api/pages/<int:page_id>', methods=['DELETE'])
@requires_admin
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
    app.logger.info('pages.delete id=%s', page_id)

    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
