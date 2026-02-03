// Handle form submission for adding new entry with file upload
document.getElementById('add-entry-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('heading', document.getElementById('heading').value);
    formData.append('title', document.getElementById('title').value);
    formData.append('content', document.getElementById('content').value);
    formData.append('page_id', document.getElementById('page_id').value);
    
    // Add file if selected
    const fileInput = document.getElementById('pdf_file');
    if (fileInput.files.length > 0) {
        formData.append('pdf_file', fileInput.files[0]);
    }
    
    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Entry added successfully!');
            location.reload();
        } else {
            alert('Failed to add entry');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while adding the entry');
    }
});

// Delete entry function
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove the entry from the DOM
            document.getElementById(`entry-${entryId}`).remove();
            alert('Entry deleted successfully!');
            
            // Check if there are no more entries
            const entriesList = document.querySelector('.entries-list');
            if (entriesList.children.length === 0) {
                entriesList.innerHTML = '<p class="no-entries">No entries available yet.</p>';
            }
        } else {
            alert('Failed to delete entry');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the entry');
    }
}

// Edit entry function
function editEntry(entryId) {
    // Get the full entry data from the API
    fetch('/api/entries')
        .then(response => response.json())
        .then(entries => {
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                // Populate the edit form
                document.getElementById('edit-id').value = entry.id;
                document.getElementById('edit-heading').value = entry.heading;
                document.getElementById('edit-title').value = entry.title;
                document.getElementById('edit-content').value = entry.content;
                document.getElementById('edit-page_id').value = entry.page_id;
                
                // Show current PDF info
                const pdfInfo = document.getElementById('current-pdf-info');
                if (entry.pdf_file) {
                    pdfInfo.textContent = `Current PDF: ${entry.pdf_file}`;
                } else {
                    pdfInfo.textContent = 'No PDF attached';
                }
                
                // Show the modal
                document.getElementById('edit-modal').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load entry data');
        });
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Handle edit form submission
document.getElementById('edit-entry-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const entryId = document.getElementById('edit-id').value;
    const formData = new FormData();
    formData.append('heading', document.getElementById('edit-heading').value);
    formData.append('title', document.getElementById('edit-title').value);
    formData.append('content', document.getElementById('edit-content').value);
    formData.append('page_id', document.getElementById('edit-page_id').value);
    
    // Add file if selected
    const fileInput = document.getElementById('edit-pdf_file');
    if (fileInput.files.length > 0) {
        formData.append('pdf_file', fileInput.files[0]);
    }
    
    try {
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Entry updated successfully!');
            closeEditModal();
            location.reload();
        } else {
            alert('Failed to update entry');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating the entry');
    }
});

// Close modal when clicking outside of it
window.onclick = function(event) {
    const editModal = document.getElementById('edit-modal');
    const pageModal = document.getElementById('page-modal');
    if (event.target == editModal) {
        closeEditModal();
    }
    if (event.target == pageModal) {
        closePageModal();
    }
}

// Page Management Functions
function showAddPageModal() {
    document.getElementById('page-modal-title').textContent = 'Add New Page';
    document.getElementById('page-id').value = '';
    document.getElementById('page-name').value = '';
    document.getElementById('page-modal').style.display = 'block';
}

function renamePage(pageId, currentName) {
    document.getElementById('page-modal-title').textContent = 'Rename Page';
    document.getElementById('page-id').value = pageId;
    document.getElementById('page-name').value = currentName;
    document.getElementById('page-modal').style.display = 'block';
}

function closePageModal() {
    document.getElementById('page-modal').style.display = 'none';
}

async function deletePage(pageId) {
    if (!confirm('Are you sure you want to delete this page? You can only delete pages with no entries.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/pages/${pageId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Page deleted successfully!');
            location.reload();
        } else {
            alert(result.error || 'Failed to delete page');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the page');
    }
}

// Handle page form submission (add or rename)
document.getElementById('page-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const pageId = document.getElementById('page-id').value;
    const pageName = document.getElementById('page-name').value;
    
    const isEdit = pageId !== '';
    const url = isEdit ? `/api/pages/${pageId}` : '/api/pages';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: pageName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(isEdit ? 'Page renamed successfully!' : 'Page added successfully!');
            closePageModal();
            location.reload();
        } else {
            alert('Failed to save page');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while saving the page');
    }
});

// Filter entries by page
function filterEntries() {
    const selectedPage = document.getElementById('filter-page').value;
    const entries = document.querySelectorAll('.entry-item');
    
    entries.forEach(entry => {
        if (selectedPage === 'all') {
            entry.style.display = 'flex';
        } else {
            const entryPageId = entry.getAttribute('data-page-id');
            if (entryPageId === selectedPage) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        }
    });
}
