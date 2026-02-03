// Function to toggle panel collapse/expand
const log = (...args) => console.log('[main]', ...args);
const logError = (...args) => console.error('[main]', ...args);

let openedAll = false;

function getCollapsibleBodies() {
    return document.querySelectorAll('.panel-body[data-collapsible="true"]');
}

function togglePanel(panelId) {
    const panelBody = document.getElementById(`panel-body-${panelId}`);
    if (!panelBody) {
        return;
    }
    const panelHeading = panelBody.previousElementSibling;

    const isCollapsed = panelBody.classList.contains('collapsed');
    if (isCollapsed) {
        panelBody.classList.remove('collapsed');
        if (panelHeading) {
            panelHeading.classList.remove('collapsed');
        }
    } else {
        panelBody.classList.add('collapsed');
        if (panelHeading) {
            panelHeading.classList.add('collapsed');
        }
    }
    syncToggleAllState();
}

function setAllPanels(open) {
    const bodies = getCollapsibleBodies();
    bodies.forEach(body => {
        const heading = body.previousElementSibling;
        if (open) {
            body.classList.remove('collapsed');
            if (heading) {
                heading.classList.remove('collapsed');
            }
        } else {
            body.classList.add('collapsed');
            if (heading) {
                heading.classList.add('collapsed');
            }
        }
    });
}

function syncToggleAllState() {
    const bodies = Array.from(getCollapsibleBodies());
    const allOpen = bodies.length > 0 && bodies.every(body => !body.classList.contains('collapsed'));
    openedAll = allOpen;
    const btn = document.getElementById('toggle-all-btn');
    if (btn) {
        btn.textContent = openedAll ? 'Скрий всички' : 'Покажи всички';
    }
}

function toggleAllPanels() {
    openedAll = !openedAll;
    setAllPanels(openedAll);
    syncToggleAllState();
}

// Initialize all panels as collapsed on page load
document.addEventListener('DOMContentLoaded', function() {
    setAllPanels(false);
    syncToggleAllState();
    log('Main UI ready');
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
            logError('Search failed', err);
        }
    }, 300);
}

function renderEntries(entries) {
    const container = document.querySelector('.entries-container');
    container.innerHTML = '';

    if (!entries.length) {
        container.innerHTML = '<div class="no-entries"><p>Няма намерени резултати.</p></div>';
        return;
    }

    entries.forEach(entry => {
        const title = entry.title || entry.heading || '';
        const files = Array.isArray(entry.files) ? entry.files : [];
        const pdfFiles = Array.isArray(entry.pdf_files) ? entry.pdf_files : [];
        const pdfMap = new Map();
        pdfFiles.forEach(file => {
            const name = file.name || file.url || '';
            const url = file.url || '';
            if (name && url) {
                pdfMap.set(name, url);
            }
        });

        const filesHtml = files.length ? `
            <ul class="files">
                ${files.map(file => {
                    const name = file.name || file.url || '';
                    const link = pdfMap.get(name);
                    return `
                        <li>
                            ${link ? `<a href="${link}" target="_blank" rel="noopener">${name}</a>` : `${name}`}
                            ${file.published_at ? `<span class="file-meta"> — Публикувано на: ${file.published_at}</span>` : ''}
                        </li>
                    `;
                }).join('')}
            </ul>
        ` : (pdfFiles.length ? `
            <ul class="files">
                ${pdfFiles.map(file => {
                    const name = file.name || file.url || '';
                    const url = file.url || '';
                    return `
                        <li>
                            <a href="${url}" target="_blank" rel="noopener">${name}</a>
                        </li>
                    `;
                }).join('')}
            </ul>
        ` : `<p class="no-files">Няма прикачени файлове.</p>`);

        container.insertAdjacentHTML('beforeend', `
            <div class="panel">
                <div class="panel-heading collapsed" onclick="togglePanel(${entry.id})">
                    <h3 class="panel-title">${title}</h3>
                    <span class="toggle-icon" aria-hidden="true">▾</span>
                </div>
                <div class="panel-body collapsed" data-collapsible="true" id="panel-body-${entry.id}">
                    <div class="panel-content">
                        ${(entry.aop_number || entry.publish_date || entry.internal_number) ? `
                            <div class="panel-meta">
                                ${entry.publish_date ? `<div class="meta-row"><strong>Дата на публикуване:</strong> ${entry.publish_date}</div>` : ''}
                                ${entry.aop_number ? `<div class="meta-row"><strong>Номер от АОП:</strong> ${entry.aop_number}</div>` : ''}
                                ${entry.internal_number ? `<div class="meta-row"><strong>Вътрешен номер:</strong> ${entry.internal_number}</div>` : ''}
                            </div>
                        ` : ''}
                        ${entry.content ? `<pre class="entry-content">${entry.content}</pre>` : ''}
                        <div class="files-section">
                            <h4>Файлове</h4>
                            ${filesHtml}
                        </div>
                        <small class="entry-date">Публикувано: ${entry.date}</small>
                    </div>
                </div>
            </div>
        `);
    });

    setAllPanels(false);
    syncToggleAllState();
}
