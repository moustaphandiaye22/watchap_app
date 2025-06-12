// Options contact
const showContactOptions = contactId => {
    const contact = AppState.appData.contacts.find(c => c.id === contactId);
    if (!contact) return;
    const options = [];
    options.push(isArchived(contactId) ? 
        `<button onclick="unarchiveChat(\'${contactId}\')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Désarchiver</button>` :
        `<button onclick="archiveChat(\'${contactId}\')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Archiver</button>`);
    
    if (contact.type === 'contact') {
        options.push(isBlocked(contactId) ?
            `<button onclick="unblockContact(\'${contactId}\')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Débloquer</button>` :
            `<button onclick="blockContact(\'${contactId}\')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Bloquer</button>`);
    }
    
    if (contact.type === 'group') {
        options.push(`<button onclick="showGroupMembers(\'${contactId}\')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Voir les membres</button>`);
        options.push(`<button onclick="showAddMemberForm(\'${contactId}\')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Ajouter un membre</button>`);
    }
    showContextMenu(options);
};

const showContextMenu = options => {
    const existingMenu = document.getElementById('contextMenu');
    if (existingMenu) existingMenu.remove();
    const menu = document.createElement('div');
    Object.assign(menu, { id: 'contextMenu', className: 'fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50' });
    Object.assign(menu.style, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
    menu.innerHTML = `<div class="py-2">${options.join('')}<button onclick="closeContextMenu()" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Fermer</button></div>`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', closeContextMenu), 100);
};

const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.remove();
    document.removeEventListener('click', closeContextMenu);
};

// Rendu
const renderContacts = () => {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '';
    const allChats = [...AppState.appData.contacts.filter(c => c.type === 'contact'), ...AppState.appData.groups];
    const visibleChats = allChats.filter(chat => !isArchived(chat.id) && !isBlocked(chat.id));
    
    visibleChats.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = `p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${AppState.activeChat?.id === contact.id ? 'bg-green-50 border-r-4 border-green-500' : ''}`;
        const typeIcon = contact.type === 'group' ? '👥' : contact.avatar;
        const statusIndicator = contact.type === 'contact' && contact.online ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>' : '';
        contactEl.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="relative">
                    <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl">${typeIcon}</div>
                    ${statusIndicator}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-gray-800 truncate">${contact.name}</h3>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-500">${contact.time}</span>
                            <button onclick="showContactOptions(\'${contact.id}\')" class="p-1 hover:bg-gray-200 rounded">
                                <i class="fas fa-ellipsis-v text-gray-400 text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <p class="text-sm text-gray-600 truncate">${contact.lastMessage}</p>
                        ${contact.unread > 0 ? `<span class="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">${contact.unread}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        contactEl.addEventListener('click', e => { if (!e.target.closest('button')) openChat(contact); });
        contactsList.appendChild(contactEl);
    });
};

const openChat = contact => {
    AppState.activeChat = contact;
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('chatArea').classList.remove('hidden');
    document.getElementById('chatAvatar').textContent = contact.type === 'group' ? '👥' : contact.avatar;
    document.getElementById('chatName').textContent = contact.name;
    const statusText = contact.type === 'group' ? 
        `${AppState.appData.groups.find(g => g.id === contact.id)?.members.length || 0} membres` :
        contact.online ? 'En ligne' : `Vu pour la dernière fois aujourd'hui à ${formatTime()}`;
    document.getElementById('chatStatus').textContent = statusText;
    renderMessages(contact.id);
    renderContacts();
};

const renderMessages = contactId => {
    const messagesList = document.getElementById('messagesList');
    const messages = AppState.appData.messages[contactId] || [];
    messagesList.innerHTML = '';
    
    messages.forEach(message => {
        const messageEl = document.createElement('div');
        if (message.sender === 'system') {
            messageEl.className = 'flex justify-center';
            messageEl.innerHTML = `<div class="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">${message.text}</div>`;
        } else {
            messageEl.className = `flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`;
            messageEl.innerHTML = `
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === 'me' ? 'bg-green-500 text-white' : 'bg-white text-gray-800 shadow-sm'}">
                    <p>${message.text}</p>
                    <span class="text-xs mt-1 block ${message.sender === 'me' ? 'text-green-100' : 'text-gray-500'}">${message.time}</span>
                </div>
            `;
        }
        messagesList.appendChild(messageEl);
    });
    document.getElementById('messagesContainer').scrollTop = document.getElementById('messagesContainer').scrollHeight;
};

const sendMessage = () => {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    if (!text) { showError('messageInput', 'Message vide'); return; }
    if (!validateText(text)) { showError('messageInput', 'Message trop long (max 1000 caractères)'); return; }
    if (!AppState.activeChat) { alert('Aucun chat sélectionné'); return; }
    if (isBlocked(AppState.activeChat.id)) { alert('Contact bloqué'); return; }
    
    if (!AppState.appData.messages[AppState.activeChat.id]) AppState.appData.messages[AppState.activeChat.id] = [];
    const newMessage = { id: generateId(), text: sanitizeInput(text), sender: 'me', time: formatTime(), timestamp: Date.now() };
    AppState.appData.messages[AppState.activeChat.id].push(newMessage);
    const contact = AppState.appData.contacts.find(c => c.id === AppState.activeChat.id);
    if (contact) { contact.lastMessage = text; contact.time = formatTime(); }
    AppState.saveData();
    renderMessages(AppState.activeChat.id);
    renderContacts();
    messageInput.value = '';
    updateSendButton();
};

const updateSendButton = () => {
    const messageInput = document.getElementById('messageInput');
    const sendIcon = document.getElementById('sendIcon');
    sendIcon.className = messageInput.value.trim() ? 'fas fa-paper-plane text-white' : 'fas fa-microphone text-white';
};

// Formulaires avec validation
function showAddContactForm() {
    const content = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input type="text" id="contactFirstName" placeholder="Prénom" maxlength="30" 
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    <small id="errorContactFirstName" class="error-message text-red-500 text-xs"></small>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input type="text" id="contactLastName" placeholder="Nom" maxlength="30" 
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    <small id="errorContactLastName" class="error-message text-red-500 text-xs"></small>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Numéro de téléphone</label>
                <input type="tel" id="contactPhone" placeholder="+221 XX XXX XX XX" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                <small id="errorContactPhone" class="error-message text-red-500 text-xs"></small>
            </div>
            <div class="flex space-x-3 pt-4">
                <button onclick="submitAddContact()" class="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-user-plus mr-2"></i>Ajouter
                </button>
                <button onclick="closeModal('addContactModal')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors">
                    Annuler
                </button>
            </div>
        </div>
    `;
    showModal('addContactModal', 'Ajouter un contact', content, 'lg');
}

const submitAddContact = () => {
    try {
        const firstName = document.getElementById('contactFirstName').value.trim();
        const lastName = document.getElementById('contactLastName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        
        // Clear previous errors
        showError('contactFirstName', '');
        showError('contactLastName', '');
        showError('contactPhone', '');

        let hasError = false;
        if (!firstName) { showError('contactFirstName', 'Prénom requis'); hasError = true; }
        if (!lastName) { showError('contactLastName', 'Nom requis'); hasError = true; }
        if (!phone) { showError('contactPhone', 'Numéro requis'); hasError = true; }
        
        if (hasError) return;

        addContact(lastName, firstName, phone);
        closeModal('addContactModal');
    } catch (error) {
        alert(error.message);
    }
};

function showCreateGroupForm() {
    const contactOptions = AppState.appData.contacts
        .filter(c => c.type === 'contact' && !isBlocked(c.id))
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join('');

    const content = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du groupe</label>
                <input type="text" id="groupName" placeholder="Nom du groupe" maxlength="30" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                <small id="errorGroupName" class="error-message text-red-500 text-xs"></small>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description (optionnelle)</label>
                <textarea id="groupDescription" placeholder="Description du groupe..." maxlength="200" 
                          class="w-full p-3 border border-gray-300 rounded-lg h-20 resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"></textarea>
                <small id="errorGroupDescription" class="error-message text-red-500 text-xs"></small>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Membres du groupe</label>
                <select id="groupMembers" multiple size="6" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    ${contactOptions}
                </select>
                <small id="errorGroupMembers" class="error-message text-red-500 text-xs"></small>
                <p class="text-xs text-gray-500 mt-1">Maintenez Ctrl pour sélectionner plusieurs membres</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Administrateur (optionnel)</label>
                <select id="groupAdmin" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    <option value="">Sélectionner un admin</option>
                    ${contactOptions}
                </select>
                <small id="errorGroupAdmin" class="error-message text-red-500 text-xs"></small>
            </div>
            <div class="flex space-x-3 pt-4">
                <button onclick="submitCreateGroup()" class="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-users mr-2"></i>Créer le groupe
                </button>
                <button onclick="closeModal('createGroupModal')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors">
                    Annuler
                </button>
            </div>
        </div>
    `;
    showModal('createGroupModal', 'Créer un groupe', content, 'lg');
}
const submitCreateGroup = () => {
    try {
        const name = document.getElementById('groupName').value.trim();
        const description = document.getElementById('groupDescription').value.trim();
        const memberSelect = document.getElementById('groupMembers');
        const adminSelect = document.getElementById('groupAdmin');
        const members = Array.from(memberSelect.selectedOptions).map(option => option.value);
        const admin = adminSelect.value;
        
        // Clear previous errors
        showError('groupName', '');
        showError('groupDescription', '');
        showError('groupMembers', '');
        showError('groupAdmin', '');

        let hasError = false;
        if (!name) { showError('groupName', 'Nom du groupe requis'); hasError = true; }
        if (description.length > 200) { showError('groupDescription', 'Description trop longue (max 200 caractères)'); hasError = true; }
        if (members.length === 0) { showError('groupMembers', 'Sélectionnez au moins un membre'); hasError = true; }
        if (admin && !members.includes(admin)) { showError('groupAdmin', 'L\'admin doit être membre du groupe'); hasError = true; }
        
        if (hasError) return;

        createGroup(name, description, members, admin);
        closeModal('createGroupModal');
    } catch (error) {
        alert(error.message);
    }
};

const closeModal = modalId => { const modal = document.getElementById(modalId); if (modal) modal.remove(); };

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
        showContactOptions,
        showAddContactForm, showCreateGroupForm, submitAddContact, submitCreateGroup,
        closeModal, closeContextMenu, renderContacts, openChat, sendMessage, updateSendButton,
        showAllContacts, createContactItem, confirmDelete, executeDeleteContact, refreshContactModal, formatDate
    });
}

// === CRÉATION DE LA SIDEBAR VERTICALE STYLE WHATSAPP WEB ===
function createSidebarMenu() {
    // Supprimer l'ancienne sidebar si elle existe
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

    // Ajuster le margin du contenu principal
    // adjustMainContent();
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
    // Masquer toutes les icônes du header existant
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
// === INIT FINAL ===
window.addEventListener('DOMContentLoaded', () => {
    createSidebarMenu();
    hideTopIcons();
    applyTheme();
});
