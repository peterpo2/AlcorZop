// Handle form submission for adding new entry
document.getElementById('add-entry-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        heading: document.getElementById('heading').value,
        title: document.getElementById('title').value,
        content: document.getElementById('content').value
    };
    
    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
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
    // Find the entry in the DOM
    const entryElement = document.getElementById(`entry-${entryId}`);
    const heading = entryElement.querySelector('h4').textContent;
    const title = entryElement.querySelector('strong').textContent;
    
    // Get the full content from the entry
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
    const formData = {
        heading: document.getElementById('edit-heading').value,
        title: document.getElementById('edit-title').value,
        content: document.getElementById('edit-content').value
    };
    
    try {
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
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
    const modal = document.getElementById('edit-modal');
    if (event.target == modal) {
        closeEditModal();
    }
}
