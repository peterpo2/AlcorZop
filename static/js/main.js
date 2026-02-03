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
    console.log('Page loaded - panels initialized');
});

let searchTimeout = null;

async function searchEntries(query) {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        const trimmed = query.trim();

        if (trimmed.length === 0) {
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
        container.innerHTML = '<div class="no-entries"><p>Няма намерени резултати.</p></div>';
        return;
    }

    entries.forEach(entry => {
        container.insertAdjacentHTML('beforeend', `
            <div class="panel">
                <div class="panel-heading" onclick="togglePanel(${entry.id})">
                    <h3 class="panel-title">${entry.heading}</h3>
                    <span class="toggle-icon" aria-hidden="true">Ў</span>
                </div>
                <div class="panel-body" id="panel-${entry.id}">
                    <div class="panel-content">
                        ${(entry.aop_number || entry.publish_date) ? `
                            <div class="panel-meta">
                                ${entry.aop_number ? `<p><strong>Номер от АОП:</strong> ${entry.aop_number}</p>` : ''}
                                ${entry.publish_date ? `<p><strong>Дата на публикуване:</strong> ${entry.publish_date}</p>` : ''}
                            </div>
                        ` : ''}
                        <h4>${entry.title}</h4>
                        <p>${entry.content}</p>
                        ${(entry.pdf_files && entry.pdf_files.length) ? `
                            <div class="pdf-attachment">
                                ${entry.pdf_files.map(file => {
                                    const filename = typeof file === 'string' ? file : file.filename;
                                    const label = typeof file === 'string' ? file : (file.label || file.filename);
                                    return `
                                        <a href="/pdf/${filename}" class="pdf-link" target="_blank" rel="noopener">
                                            ${label}
                                        </a>
                                    `;
                                }).join('')}
                            </div>` : ''
                        }
                        <small class="entry-date">Публикувано: ${entry.date}</small>
                    </div>
                </div>
            </div>
        `);
    });
}
