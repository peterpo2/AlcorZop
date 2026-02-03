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
