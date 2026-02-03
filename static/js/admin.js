// Handle form submission for adding new entry with file upload
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

document.addEventListener('DOMContentLoaded', setupDateFields);

document.getElementById('add-entry-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('heading', document.getElementById('heading').value);
    formData.append('aop_number', document.getElementById('aop_number').value);
    formData.append('publish_date', document.getElementById('publish_date').value);
    formData.append('title', document.getElementById('title').value);
    formData.append('content', document.getElementById('content').value);
    formData.append('page_id', document.getElementById('page_id').value);

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
            alert('Записът е добавен успешно!');
            location.reload();
        } else {
            alert('Неуспешно добавяне на запис');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Възникна грешка при добавяне на запис');
    }
});

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
            document.getElementById(`entry-${entryId}`).remove();
            alert('Записът е изтрит успешно!');

            const entriesList = document.querySelector('.entries-list');
            if (entriesList.children.length === 0) {
                entriesList.innerHTML = '<p class="no-entries">Няма записи.</p>';
            }
        } else {
            alert('Неуспешно изтриване на запис');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Възникна грешка при изтриване на запис');
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

                const pdfInfo = document.getElementById('current-pdf-info');
                const pdfFiles = Array.isArray(entry.pdf_files) ? entry.pdf_files : (entry.pdf_file ? [entry.pdf_file] : []);
                if (pdfFiles.length > 0) {
                    pdfInfo.textContent = `Текущи PDF файлове: ${pdfFiles.join(', ')}`;
                } else {
                    pdfInfo.textContent = 'Няма прикачен PDF';
                }

                document.getElementById('edit-modal').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Неуспешно зареждане на запис');
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
            pdfInfo.textContent = 'Няма прикачен PDF';
            document.getElementById('edit-pdf_files').value = '';
            alert('Всички PDF файлове са изтрити.');
        } else {
            alert('Неуспешно изтриване на PDF файлове');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Възникна грешка при изтриване на PDF файлове');
    }
}

document.getElementById('edit-entry-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const entryId = document.getElementById('edit-id').value;
    const formData = new FormData();
    formData.append('heading', document.getElementById('edit-heading').value);
    formData.append('aop_number', document.getElementById('edit-aop_number').value);
    formData.append('publish_date', document.getElementById('edit-publish_date').value);
    formData.append('title', document.getElementById('edit-title').value);
    formData.append('content', document.getElementById('edit-content').value);
    formData.append('page_id', document.getElementById('edit-page_id').value);

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
            alert('Записът е обновен успешно!');
            closeEditModal();
            location.reload();
        } else {
            alert('Неуспешно обновяване на запис');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Възникна грешка при обновяване на запис');
    }
});

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
            alert('Страницата е изтрита успешно!');
            location.reload();
        } else {
            alert(result.error || 'Неуспешно изтриване на страница');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Възникна грешка при изтриване на страница');
    }
}

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
            alert(isEdit ? 'Страницата е преименувана успешно!' : 'Страницата е добавена успешно!');
            closePageModal();
            location.reload();
        } else {
            alert('Неуспешно запазване на страница');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Възникна грешка при запазване на страница');
    }
});

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
