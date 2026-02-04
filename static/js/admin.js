const log = (...args) => console.log('[admin]', ...args);
const logError = (...args) => console.error('[admin]', ...args);

function syncDateField(field) {
    const input = field.querySelector('input');
    if (!input) {
        return;
    }
    field.classList.toggle('has-value', Boolean(input.value));
}

function setupDateFields() {
    document.querySelectorAll('.date-field').forEach(field => {
        const input = field.querySelector('input');
        if (!input) {
            return;
        }
        const update = () => syncDateField(field);
        input.addEventListener('input', update);
        input.addEventListener('change', update);
        update();
    });
}

function setupCollapsibles() {
    document.querySelectorAll('.admin-section[data-collapsible="true"]').forEach(section => {
        const toggle = section.querySelector('.section-toggle');
        const body = section.querySelector('.section-body');
        const isCollapsed = section.dataset.collapsed === 'true';
        const applyState = collapsed => {
            section.classList.toggle('collapsed', collapsed);
            if (toggle) {
                toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                toggle.textContent = collapsed ? 'Покажи' : 'Скрий';
            }
            if (body) {
                body.style.display = collapsed ? 'none' : '';
            }
        };
        applyState(isCollapsed);
        if (toggle) {
            toggle.addEventListener('click', () => {
                const currentlyCollapsed = section.classList.contains('collapsed');
                section.dataset.collapsed = currentlyCollapsed ? 'false' : 'true';
                applyState(!currentlyCollapsed);
            });
        }
    });
}

function setupProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) {
        return;
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const title = document.getElementById('profile-title').value.trim();
        const body = document.getElementById('profile-body').value.trim();
        if (!title || !body) {
            alert('Моля, попълнете заглавие и съдържание.');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('body', body);
            const labelInput = document.getElementById('profile-pdf-label');
            if (labelInput) {
                formData.append('pdf_label', labelInput.value || '');
            }
            const fileInput = document.getElementById('profile-pdf-files');
            if (fileInput && fileInput.files.length > 0) {
                Array.from(fileInput.files).forEach(file => {
                    formData.append('pdf_files', file);
                });
            }
            const response = await fetch('/api/profile', {
                method: 'PUT',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert('Профилът е обновен успешно.');
                if (fileInput) {
                    fileInput.value = '';
                }
                if (labelInput) {
                    labelInput.value = '';
                }
                if (result.profile && result.profile.files) {
                    renderProfileFiles(result.profile.files);
                }
            } else {
                alert(result.error || 'Неуспешно обновяване на профил.');
            }
        } catch (error) {
            logError('Profile update failed', error);
            alert('Възникна грешка при обновяване на профил.');
        }
    });
}

function renderProfileFiles(files) {
    const container = document.querySelector('.profile-files-group');
    if (!container) {
        return;
    }
    const list = container.querySelector('.profile-files-list');
    const empty = container.querySelector('.profile-no-files');
    if (list) {
        list.remove();
    }
    if (empty) {
        empty.remove();
    }
    if (!files || files.length === 0) {
        const p = document.createElement('p');
        p.className = 'no-files profile-no-files';
        p.textContent = 'Няма прикачени файлове.';
        container.appendChild(p);
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'files profile-files-list';
    files.forEach(file => {
        const li = document.createElement('li');
        if (file.filename) {
            li.dataset.filename = file.filename;
        }
        const link = document.createElement('a');
        link.href = file.url || '#';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = file.name || file.filename || file.url || 'PDF';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-small btn-delete profile-file-delete';
        btn.textContent = 'Изтрий';
        li.appendChild(link);
        li.appendChild(btn);
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

function setupProfileFileDeletes() {
    const container = document.querySelector('.profile-files-group');
    if (!container) {
        return;
    }
    container.addEventListener('click', async event => {
        const button = event.target.closest('.profile-file-delete');
        if (!button) {
            return;
        }
        const item = button.closest('li');
        const filename = item ? item.dataset.filename : '';
        if (!filename) {
            return;
        }
        if (!confirm('Сигурни ли сте, че искате да изтриете този PDF?')) {
            return;
        }
        try {
            const response = await fetch(`/api/profile/pdfs/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                if (item) {
                    item.remove();
                }
                const remaining = container.querySelectorAll('li');
                if (remaining.length === 0) {
                    renderProfileFiles([]);
                }
            } else {
                alert(result.error || 'Неуспешно изтриване на PDF.');
            }
        } catch (error) {
            logError('Profile PDF delete failed', error);
            alert('Възникна грешка при изтриване на PDF.');
        }
    });
}

function setupTermsForm() {
    const form = document.getElementById('terms-form');
    if (!form) {
        return;
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const name = document.getElementById('terms-name').value.trim();
        const description = document.getElementById('terms-description').value.trim();
        const fileInput = document.getElementById('terms-file');
        if (!name || !description) {
            alert('Моля, попълнете име на файл и описание.');
            return;
        }
        if (!fileInput || fileInput.files.length < 1) {
            alert('Моля, качете поне един PDF/Word файл.');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            Array.from(fileInput.files).forEach(file => {
                formData.append('files', file);
            });
            const response = await fetch('/api/terms', {
                method: 'PUT',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert('Общите условия са обновени успешно.');
                form.reset();
                if (result.terms && result.terms.files) {
                    renderTermsFiles(result.terms.files);
                }
            } else {
                alert(result.error || 'Неуспешно обновяване на общите условия.');
            }
        } catch (error) {
            logError('Terms update failed', error);
            alert('Възникна грешка при обновяване на общите условия.');
        }
    });
}

function renderTermsFiles(files) {
    const container = document.querySelector('.terms-files-group');
    if (!container) {
        return;
    }
    const list = container.querySelector('.terms-files-list');
    const empty = container.querySelector('.terms-no-files');
    if (list) {
        list.remove();
    }
    if (empty) {
        empty.remove();
    }
    if (!files || files.length === 0) {
        const p = document.createElement('p');
        p.className = 'no-files terms-no-files';
        p.textContent = 'Няма прикачени файлове.';
        container.appendChild(p);
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'files terms-files-list';
    files.forEach(file => {
        const li = document.createElement('li');
        if (file.filename) {
            li.dataset.filename = file.filename;
        }
        const link = document.createElement('a');
        link.href = file.url || '#';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = file.name || file.filename || file.url || 'PDF';
        li.appendChild(link);
        if (file.description) {
            const description = document.createElement('span');
            description.textContent = ` ${file.description}`;
            li.appendChild(description);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-small btn-delete terms-file-delete';
        btn.textContent = 'Изтрий';
        li.appendChild(btn);
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

function setupTermsFileDeletes() {
    const container = document.querySelector('.terms-files-group');
    if (!container) {
        return;
    }
    container.addEventListener('click', async event => {
        const button = event.target.closest('.terms-file-delete');
        if (!button) {
            return;
        }
        const item = button.closest('li');
        const filename = item ? item.dataset.filename : '';
        if (!filename) {
            return;
        }
        if (!confirm('Сигурни ли сте, че искате да изтриете този файл?')) {
            return;
        }
        try {
            const response = await fetch(`/api/terms/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                if (item) {
                    item.remove();
                }
                const remaining = container.querySelectorAll('li');
                if (remaining.length === 0) {
                    renderTermsFiles([]);
                }
            } else {
                alert(result.error || 'Неуспешно изтриване на файла.');
            }
        } catch (error) {
            logError('Terms file delete failed', error);
            alert('Възникна грешка при изтриване на файла.');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupDateFields();
    setupCollapsibles();
    setupProfileForm();
    setupProfileFileDeletes();
    setupTermsForm();
    setupTermsFileDeletes();
    log('Admin UI ready');
});

const addForm = document.getElementById('add-entry-form');
if (addForm) {
    addForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('heading', document.getElementById('heading').value);
        formData.append('aop_number', document.getElementById('aop_number').value);
        formData.append('publish_date', document.getElementById('publish_date').value);
        formData.append('title', document.getElementById('title').value);
        formData.append('content', document.getElementById('content').value);
        formData.append('page_id', document.getElementById('page_id').value);
        formData.append('pdf_label', document.getElementById('pdf_label').value);

        const fileInput = document.getElementById('pdf_files');
        if (fileInput.files.length > 0) {
            Array.from(fileInput.files).forEach(file => {
                formData.append('pdf_files', file);
            });
        }

        try {
            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('Записът е добавен успешно.');
                location.reload();
            } else {
                alert(result.error || 'Неуспешно добавяне на запис.');
            }
        } catch (error) {
            logError('Add entry failed', error);
            alert('Възникна грешка при добавяне на запис.');
        }
    });
}

async function deleteEntry(entryId) {
    if (!confirm('Сигурни ли сте, че искате да изтриете този запис?')) {
        return;
    }

    try {
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            const entryEl = document.getElementById(`entry-${entryId}`);
            if (entryEl) {
                entryEl.remove();
            }
            alert('Записът е изтрит успешно.');

            const entriesList = document.querySelector('.entries-list');
            if (entriesList && entriesList.children.length === 0) {
                entriesList.innerHTML = '<p class="no-entries">Няма записи.</p>';
            }
        } else {
            alert(result.error || 'Неуспешно изтриване на запис.');
        }
    } catch (error) {
        logError('Delete entry failed', error);
        alert('Възникна грешка при изтриване на запис.');
    }
}

function editEntry(entryId) {
    fetch('/api/entries')
        .then(response => response.json())
        .then(entries => {
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                document.getElementById('edit-id').value = entry.id;
                document.getElementById('edit-heading').value = entry.heading;
                document.getElementById('edit-aop_number').value = entry.aop_number || '';
                const editPublishDate = document.getElementById('edit-publish_date');
                editPublishDate.value = entry.publish_date || '';
                editPublishDate.dispatchEvent(new Event('change', { bubbles: true }));
                document.getElementById('edit-title').value = entry.title;
                document.getElementById('edit-content').value = entry.content;
                document.getElementById('edit-page_id').value = entry.page_id;
                document.getElementById('edit-pdf_label').value = '';

                const pdfInfo = document.getElementById('current-pdf-info');
                const pdfFiles = Array.isArray(entry.pdf_files) ? entry.pdf_files : [];
                if (pdfFiles.length > 0) {
                    const displayNames = pdfFiles.map(item => {
                        if (typeof item === 'string') {
                            return item;
                        }
                        return item.name || item.filename || item.url || 'PDF';
                    });
                    pdfInfo.textContent = `Текущи PDF файлове: ${displayNames.join(', ')}`;
                } else {
                    pdfInfo.textContent = 'Няма прикачени PDF файлове.';
                }

                document.getElementById('edit-modal').style.display = 'block';
            }
        })
        .catch(error => {
            logError('Load entry failed', error);
            alert('Неуспешно зареждане на запис.');
        });
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

async function removeAllPdfs() {
    const entryId = document.getElementById('edit-id').value;
    if (!entryId) {
        return;
    }
    if (!confirm('Сигурни ли сте, че искате да изтриете всички PDF файлове?')) {
        return;
    }
    try {
        const response = await fetch(`/api/entries/${entryId}/pdfs`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            const pdfInfo = document.getElementById('current-pdf-info');
            pdfInfo.textContent = 'Няма прикачени PDF файлове.';
            document.getElementById('edit-pdf_files').value = '';
            alert('Всички PDF файлове са изтрити.');
        } else {
            alert(result.error || 'Неуспешно изтриване на PDF файлове.');
        }
    } catch (error) {
        logError('Delete PDFs failed', error);
        alert('Възникна грешка при изтриване на PDF файлове.');
    }
}

const editForm = document.getElementById('edit-entry-form');
if (editForm) {
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const entryId = document.getElementById('edit-id').value;
        const formData = new FormData();
        formData.append('heading', document.getElementById('edit-heading').value);
        formData.append('aop_number', document.getElementById('edit-aop_number').value);
        formData.append('publish_date', document.getElementById('edit-publish_date').value);
        formData.append('title', document.getElementById('edit-title').value);
        formData.append('content', document.getElementById('edit-content').value);
        formData.append('page_id', document.getElementById('edit-page_id').value);
        formData.append('pdf_label', document.getElementById('edit-pdf_label').value);

        const fileInput = document.getElementById('edit-pdf_files');
        if (fileInput.files.length > 0) {
            Array.from(fileInput.files).forEach(file => {
                formData.append('pdf_files', file);
            });
        }

        try {
            const response = await fetch(`/api/entries/${entryId}`, {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('Записът е обновен успешно.');
                closeEditModal();
                location.reload();
            } else {
                alert(result.error || 'Неуспешно обновяване на запис.');
            }
        } catch (error) {
            logError('Update entry failed', error);
            alert('Възникна грешка при обновяване на запис.');
        }
    });
}

window.onclick = function(event) {
    const editModal = document.getElementById('edit-modal');
    const pageModal = document.getElementById('page-modal');
    if (event.target == editModal) {
        closeEditModal();
    }
    if (event.target == pageModal) {
        closePageModal();
    }
};

function showAddPageModal() {
    document.getElementById('page-modal-title').textContent = 'Нова страница';
    document.getElementById('page-id').value = '';
    document.getElementById('page-name').value = '';
    document.getElementById('page-modal').style.display = 'block';
}

function renamePage(pageId, currentName) {
    document.getElementById('page-modal-title').textContent = 'Преименуване на страница';
    document.getElementById('page-id').value = pageId;
    document.getElementById('page-name').value = currentName;
    document.getElementById('page-modal').style.display = 'block';
}

function closePageModal() {
    document.getElementById('page-modal').style.display = 'none';
}

async function deletePage(pageId) {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази страница? Може да изтриете само страници без записи.')) {
        return;
    }

    try {
        const response = await fetch(`/api/pages/${pageId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('Страницата е изтрита успешно.');
            location.reload();
        } else {
            alert(result.error || 'Неуспешно изтриване на страница.');
        }
    } catch (error) {
        logError('Delete page failed', error);
        alert('Възникна грешка при изтриване на страница.');
    }
}

const pageForm = document.getElementById('page-form');
if (pageForm) {
    pageForm.addEventListener('submit', async function(e) {
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
                alert(isEdit ? 'Страницата е преименувана успешно.' : 'Страницата е добавена успешно.');
                closePageModal();
                location.reload();
            } else {
                alert(result.error || 'Неуспешно запазване на страница.');
            }
        } catch (error) {
            logError('Save page failed', error);
            alert('Възникна грешка при запазване на страница.');
        }
    });
}

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
