
// Extension pour la gestion des contacts optimisée

function showAllContacts() {
    const contacts = AppState.appData.contacts.filter(c => c.type === 'contact' || !c.type) || [];
    if (!contacts.length) return showNotification('Aucun contact trouvé', 'info');

    const html = `<div class="space-y-2 max-h-80">${contacts.map(createContactItem).join('')}</div>`;
    showModal('allContactsModal', 'Tous les contacts', html);
}

function createContactItem(contact) {
    const statusBadge = isBlocked(contact.id) ? '<span class="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Bloqué</span>' :
                       isArchived(contact.id) ? '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">Archivé</span>' : '';
    
    return `
        <div class="flex items-center justify-between p-3 border-b hover:bg-gray-50 transition-colors">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-lg">${contact.avatar || '👤'}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                        <h4 class="font-medium text-gray-900 truncate">${contact.name}</h4>
                        ${statusBadge}
                    </div>
                    <p class="text-sm text-gray-500 truncate">${contact.phone || 'Contact'}</p>
                    <p class="text-xs text-gray-400">Ajouté le ${formatDate(contact.dateAdded || contact.dateCreated)}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                ${isBlocked(contact.id) ? 
                    `<button onclick="unblockContact(\'${contact.id}\'); refreshContactModal()" class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Débloquer</button>` :
                    `<button onclick="blockContact(\'${contact.id}\'); refreshContactModal()" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">Bloquer</button>`}
                ${isArchived(contact.id) ?
                    `<button onclick="unarchiveChat(\'${contact.id}\'); refreshContactModal()" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Désarchiver</button>` :
                    `<button onclick="archiveChat(\'${contact.id}\'); refreshContactModal()" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Archiver</button>`}
                <button onclick="confirmDelete(\'${contact.id}\', \'${contact.name}\')" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
}

function confirmDelete(contactId, contactName) {
    const html = `
        <div class="text-center p-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <h4 class="text-lg font-semibold mb-2">Confirmer la suppression</h4>
            <p class="text-gray-600 mb-2">Supprimer le contact "${contactName}" ?</p>
            <p class="text-sm text-red-500 mb-4">Cette action supprimera le contact et tous ses messages.</p>
            <div class="flex space-x-3">
                <button onclick="executeDeleteContact(\'${contactId}\'); closeModal('confirmDeleteModal')" class="flex-1 bg-red-500 text-white p-3 rounded hover:bg-red-600">Supprimer</button>
                <button onclick="closeModal('confirmDeleteModal')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
            </div>
        </div>`;
    showModal('confirmDeleteModal', 'Confirmer la suppression', html);
}

function executeDeleteContact(contactId) {
    // Remove contact from appData.contacts
    AppState.appData.contacts = AppState.appData.contacts.filter(c => c.id !== contactId);
    // Remove messages associated with this contact
    delete AppState.appData.messages[contactId];
    // Remove from archived and blocked lists if present
    AppState.appData.archived = AppState.appData.archived.filter(id => id !== contactId);
    AppState.appData.blocked = AppState.appData.blocked.filter(id => id !== contactId);
    AppState.saveData();
    renderContacts();
    showNotification('Contact supprimé avec succès', 'success');
    refreshContactModal(); // Refresh the modal if it's open
}

function refreshContactModal() {
    const modal = document.getElementById('allContactsModal');
    if (modal) {
        closeModal('allContactsModal');
        showAllContacts();
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Expose functions to global scope for HTML inline event handlers
if (typeof window !== 'undefined') {
    Object.assign(window, {
        showAllContacts, createContactItem, confirmDelete, executeDeleteContact, refreshContactModal, formatDate
    });
}

// === CRÉATION DE LA SIDEBAR VERTICALE STYLE WHATSAPP WEB ===
function createSidebarMenu() {
    const existingSidebar = document.getElementById('sidebarMenu');
    if (existingSidebar) existingSidebar.remove();

    const sidebar = document.createElement('div');
    sidebar.id = 'sidebarMenu';
    sidebar.className = 'fixed top-0 left-0 h-full w-20 bg-gradient-to-b from-green-600 to-green-700 shadow-xl z-50 flex flex-col justify-between items-center py-6';

    // ==== HAUT : Avatar utilisateur + Boutons principaux ====
    const topSection = document.createElement('div');
    topSection.className = 'flex flex-col items-center space-y-4';

    // Avatar utilisateur
    const avatar = document.createElement('div');
    const userEmoji = localStorage.getItem('userEmoji') || '👤';
    avatar.className = 'w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-xl font-bold cursor-pointer hover:bg-white/30 transition-all duration-200 shadow-lg';
    avatar.textContent = userEmoji;
    avatar.title = 'Mon profil';
    avatar.onclick = showProfileModal;
    topSection.appendChild(avatar);

    // Séparateur
    const separator = document.createElement('div');
    separator.className = 'w-8 h-px bg-white/30 my-2';
    topSection.appendChild(separator);

    const mainButtons = [
        { icon: 'fas fa-comment-dots', action: () => showNotification('Discussions actives', 'info'), title: 'Discussions', isActive: true },
        { icon: 'fas fa-user-plus', action: showAddContactForm, title: 'Ajouter un contact' },
        { icon: 'fas fa-users', action: showCreateGroupForm, title: 'Créer un groupe' },
        { icon: 'fas fa-address-book', action: showAllContacts, title: 'Tous les contacts' }
    ];

    mainButtons.forEach(({ icon, action, title, isActive }) => {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'relative group';

        const btn = document.createElement('button');
        btn.className = `w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isActive 
                ? 'bg-white text-green-600 shadow-lg' 
                : 'text-white/80 hover:bg-white/20 hover:text-white hover:scale-105'
        }`;
        btn.innerHTML = `<i class="${icon} text-lg"></i>`;
        btn.onclick = action;

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10';
        tooltip.textContent = title;

        btnContainer.appendChild(btn);
        btnContainer.appendChild(tooltip);
        topSection.appendChild(btnContainer);
    });

    // ==== BAS : Paramètres, thème, déconnexion ====
    const bottomSection = document.createElement('div');
    bottomSection.className = 'flex flex-col items-center space-y-4';

    const bottomButtons = [
        { icon: 'fas fa-cog', action: showSettingsModal, title: 'Paramètres' },
        { icon: 'fas fa-moon', action: toggleDarkMode, title: 'Mode sombre' },
        { icon: 'fas fa-sign-out-alt', action: confirmLogout, title: 'Déconnexion', danger: true }
    ];

    bottomButtons.forEach(({ icon, action, title, danger }) => {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'relative group';

        const btn = document.createElement('button');
        btn.className = `w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
            danger 
                ? 'text-white/80 hover:bg-red-500/20 hover:text-red-300' 
                : 'text-white/80 hover:bg-white/20 hover:text-white'
        }`;
        btn.innerHTML = `<i class="${icon} text-lg"></i>`;
        btn.onclick = action;

        const tooltip = document.createElement('div');
        tooltip.className = 'absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10';
        tooltip.textContent = title;

        btnContainer.appendChild(btn);
        btnContainer.appendChild(tooltip);
        bottomSection.appendChild(btnContainer);
    });

    sidebar.appendChild(topSection);
    sidebar.appendChild(bottomSection);
    document.body.appendChild(sidebar);
}

// === FONCTIONNALITÉ : MODE SOMBRE ===
function toggleDarkMode() {
    const theme = document.documentElement.classList.toggle('dark') ? 'dark' : 'light';
    document.body.classList.toggle('bg-gray-900');
    document.body.classList.toggle('text-white');
    localStorage.setItem('theme', theme);
}

// === FONCTIONNALITÉ : MASQUER ANCIENNES ICÔNES ===
function hideTopIcons() {
    const selectors = [
        '.top-icons', 
        '.header-icons', 
        '.absolute.right-0', 
        '.chat-header .options',
        '[onclick*="showAddContactForm"]',
        '[onclick*="showCreateGroupForm"]',
        '[onclick*="showAllContacts"]',
        'button[class*="fa-user-plus"]',
        'button[class*="fa-users"]',
        'button[class*="fa-address-book"]',
        'i.fa-user-plus',
        'i.fa-users', 
        'i.fa-address-book'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.closest('#sidebarMenu')) return; // Ne pas masquer les icônes de la sidebar
            el.style.display = 'none';
        });
    });
}

// === MODAL PARAMÈTRES ===
function showSettingsModal() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const isDark = currentTheme === 'dark';
    const userName = localStorage.getItem('userName') || 'Utilisateur';
    const userEmoji = localStorage.getItem('userEmoji') || '👤';

    const html = `
        <div class="space-y-4">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl">${userEmoji}</div>
                <input id="settingsUserName" class="flex-1 border p-2 rounded" value="${userName}" placeholder="Votre nom">
            </div>

            <div class="flex justify-between items-center">
                <span>Mode sombre</span>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="toggleTheme" class="sr-only" ${isDark ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 relative transition duration-300">
                        <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                    </div>
                </label>
            </div>

            <div class="flex justify-between items-center">
                <span>Notifications</span>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="toggleNotif" class="sr-only" checked>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 relative transition duration-300">
                        <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                    </div>
                </label>
            </div>

            <div class="flex justify-between items-center opacity-50 cursor-not-allowed">
                <span>Langue</span>
                <select class="border p-2 rounded bg-gray-100" disabled>
                    <option>Français</option>
                </select>
            </div>

            <div class="flex space-x-3">
                <button onclick="saveSettings()" class="flex-1 bg-green-500 text-white p-2 rounded">Enregistrer</button>
                <button onclick="closeModal('settingsModal')" class="flex-1 bg-gray-300 p-2 rounded">Annuler</button>
            </div>
        </div>
    `;

    showModal('settingsModal', 'Paramètres', html);
}

function saveSettings() {
    const newName = document.getElementById('settingsUserName')?.value || 'Utilisateur';
    const theme = document.getElementById('toggleTheme')?.checked ? 'dark' : 'light';
    const emoji = '👤';

    localStorage.setItem('userName', newName);
    localStorage.setItem('userEmoji', emoji);
    localStorage.setItem('theme', theme);

    applyTheme();
    closeModal('settingsModal');
    showNotification('Paramètres enregistrés', 'success');
}

// === APPLIQUER LE THÈME AU CHARGEMENT ===
function applyTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('bg-gray-900', theme === 'dark');
    document.body.classList.toggle('text-white', theme === 'dark');
}
function showProfileModal() {
    const userName = localStorage.getItem('userName') || 'Utilisateur';
    const userEmoji = localStorage.getItem('userEmoji') || '👤';
    
    const content = `
        <div class="text-center space-y-4">
            <div class="w-24 h-24 rounded-full bg-green-500 text-white flex items-center justify-center text-4xl mx-auto shadow-lg">
                ${userEmoji}
            </div>
            <h3 class="text-xl font-semibold text-gray-800">${userName}</h3>
            <p class="text-gray-600">En ligne</p>
            <button onclick="showSettingsModal(); closeModal('profileModal')" 
                    class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors">
                Modifier le profil
            </button>
        </div>
    `;
    showModal('profileModal', 'Mon profil', content, 'sm');
}
function confirmLogout() {
    const content = `
        <div class="text-center space-y-4">
            <i class="fas fa-sign-out-alt text-red-500 text-4xl"></i>
            <h4 class="text-lg font-semibold">Confirmer la déconnexion</h4>
            <p class="text-gray-600">Êtes-vous sûr de vouloir vous déconnecter ?</p>
            <div class="flex space-x-3">
                <button onclick="logout()" class="flex-1 bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-colors">
                    Se déconnecter
                </button>
                <button onclick="closeModal('logoutModal')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg transition-colors">
                    Annuler
                </button>
            </div>
        </div>
    `;
    showModal('logoutModal', 'Déconnexion', content, 'sm');  
}
// function logout() {
//     const sidebar = document.getElementById('sidebarMenu');
//     if (sidebar) {
//         sidebar.style.display='none';
//     }
//      closeModal('logoutModal');
//     showNotification('Déconnexion réussie', 'success');
// }

// if (typeof window !== 'undefined') {
//     window.logout = logout;
// }
// === INIT FINAL ===
window.addEventListener('DOMContentLoaded', () => {
    createSidebarMenu();
    hideTopIcons();
    applyTheme();
});
