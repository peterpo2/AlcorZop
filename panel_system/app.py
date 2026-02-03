from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import os
from datetime import datetime

app = Flask(__name__)

# Data file to store entries
DATA_FILE = 'entries.json'

def load_entries():
    """Load entries from JSON file"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_entries(entries):
    """Save entries to JSON file"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    """Main page showing all entries"""
    entries = load_entries()
    return render_template('index.html', entries=entries)

@app.route('/admin')
def admin():
    """Admin page for managing entries"""
    entries = load_entries()
    return render_template('admin.html', entries=entries)

@app.route('/api/entries', methods=['GET'])
def get_entries():
    """API endpoint to get all entries"""
    entries = load_entries()
    return jsonify(entries)

@app.route('/api/entries', methods=['POST'])
def add_entry():
    """API endpoint to add a new entry"""
    data = request.json
    entries = load_entries()
    
    new_entry = {
        'id': len(entries) + 1,
        'title': data.get('title', ''),
        'heading': data.get('heading', ''),
        'content': data.get('content', ''),
        'date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    entries.append(new_entry)
    save_entries(entries)
    
    return jsonify({'success': True, 'entry': new_entry})

@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    """API endpoint to delete an entry"""
    entries = load_entries()
    entries = [e for e in entries if e['id'] != entry_id]
    save_entries(entries)
    
    return jsonify({'success': True})

@app.route('/api/entries/<int:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    """API endpoint to update an entry"""
    data = request.json
    entries = load_entries()
    
    for entry in entries:
        if entry['id'] == entry_id:
            entry['title'] = data.get('title', entry['title'])
            entry['heading'] = data.get('heading', entry['heading'])
            entry['content'] = data.get('content', entry['content'])
            break
    
    save_entries(entries)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
