// Function to toggle panel collapse/expand
function togglePanel(panelId) {
    const panelBody = document.getElementById(`panel-${panelId}`);
    const panelHeading = panelBody.previousElementSibling;
    
    if (panelBody.classList.contains('collapsed')) {
        panelBody.classList.remove('collapsed');
        panelHeading.classList.remove('collapsed');
    } else {
        panelBody.classList.add('collapsed');
        panelHeading.classList.add('collapsed');
    }
}

// Initialize all panels as expanded on page load
document.addEventListener('DOMContentLoaded', function() {
    // All panels start expanded by default
    console.log('Page loaded - panels initialized');
});
let searchTimeout = null;

async function searchEntries(query) {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        const trimmed = query.trim();

        // If search cleared → reload normal page
        if (trimmed.length < 2) {
            window.location.reload();
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const pageId = params.get('page') || '1';

        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(trimmed)}&page=${pageId}`
            );

            const entries = await response.json();
            renderEntries(entries);
        } catch (err) {
            console.error('Search failed', err);
        }
    }, 300);
}
function renderEntries(entries) {
    const container = document.querySelector('.panels-container');
    container.innerHTML = '';

    if (!entries.length) {
        container.innerHTML = '<p class="no-entries">No matching results.</p>';
        return;
    }

    entries.forEach(entry => {
        container.insertAdjacentHTML('beforeend', `
            <div class="panel">
                <div class="panel-heading" onclick="togglePanel(${entry.id})">
                    <h3 class="panel-title">${entry.heading}</h3>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="panel-body" id="panel-${entry.id}">
                    <div class="panel-content">
                        <h4>${entry.title}</h4>
                        <p>${entry.content}</p>
                        ${entry.pdf_file ? `
                            <div class="pdf-attachment">
                                <a href="/uploads/${entry.pdf_file}" target="_blank" class="pdf-link">
                                    📄 View PDF Document
                                </a>
                            </div>` : ''
                        }
                        <small class="entry-date">Posted: ${entry.date}</small>
                    </div>
                </div>
            </div>
        `);
    });
}