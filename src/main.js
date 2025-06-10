
// Options contact
const showContactOptions = contactId => {
    const contact = appData.contacts.find(c => c.id === contactId);
    if (!contact) return;
    const options = [];
    options.push(isArchived(contactId) ? 
        `<button onclick="unarchiveChat('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Désarchiver</button>` :
        `<button onclick="archiveChat('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Archiver</button>`);
    
    if (contact.type === 'contact') {
        options.push(isBlocked(contactId) ?
            `<button onclick="unblockContact('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Débloquer</button>` :
            `<button onclick="blockContact('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Bloquer</button>`);
    }
    
    if (contact.type === 'group') {
        options.push(`<button onclick="showGroupMembers('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Voir les membres</button>`);
        options.push(`<button onclick="showAddMemberForm('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Ajouter un membre</button>`);
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
    const allChats = [...appData.contacts.filter(c => c.type === 'contact'), ...appData.groups];
    const visibleChats = allChats.filter(chat => !isArchived(chat.id) && !isBlocked(chat.id));
    
    visibleChats.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = `p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${activeChat?.id === contact.id ? 'bg-green-50 border-r-4 border-green-500' : ''}`;
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
                            <button onclick="showContactOptions('${contact.id}')" class="p-1 hover:bg-gray-200 rounded">
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
    activeChat = contact;
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('chatArea').classList.remove('hidden');
    document.getElementById('chatAvatar').textContent = contact.type === 'group' ? '👥' : contact.avatar;
    document.getElementById('chatName').textContent = contact.name;
    const statusText = contact.type === 'group' ? 
        `${appData.groups.find(g => g.id === contact.id)?.members.length || 0} membres` :
        contact.online ? 'En ligne' : `Vu pour la dernière fois aujourd'hui à ${formatTime()}`;
    document.getElementById('chatStatus').textContent = statusText;
    renderMessages(contact.id);
    renderContacts();
};

const renderMessages = contactId => {
    const messagesList = document.getElementById('messagesList');
    const messages = appData.messages[contactId] || [];
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
    if (!activeChat) { alert('Aucun chat sélectionné'); return; }
    if (isBlocked(activeChat.id)) { alert('Contact bloqué'); return; }
    
    if (!appData.messages[activeChat.id]) appData.messages[activeChat.id] = [];
    const newMessage = { id: generateId(), text: sanitizeInput(text), sender: 'me', time: formatTime(), timestamp: Date.now() };
    appData.messages[activeChat.id].push(newMessage);
    const contact = appData.contacts.find(c => c.id === activeChat.id);
    if (contact) { contact.lastMessage = text; contact.time = formatTime(); }
    saveData();
    renderMessages(activeChat.id);
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
const showAddContactForm = () => {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="addContactModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg w-96">
                <h3 class="text-lg font-semibold mb-4">Ajouter un contact</h3>
                <input type="text" id="contactFirstName" placeholder="Prénom (2-30 caractères)" maxlength="30" class="w-full p-3 border rounded mb-3" required>
                <input type="text" id="contactLastName" placeholder="Nom (2-30 caractères)" maxlength="30" class="w-full p-3 border rounded mb-3" required>
                <input type="tel" id="contactPhone" placeholder="Numéro (+221xxxxxxxxx)" class="w-full p-3 border rounded mb-4" required>
                <div class="flex space-x-3">
                    <button onclick="submitAddContact()" class="flex-1 bg-green-500 text-white p-3 rounded">Ajouter</button>
                    <button onclick="closeModal('addContactModal')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
                </div>
            </div>
        </div>
    `);
};

const submitAddContact = () => {
    try {
        const firstName = document.getElementById('contactFirstName').value.trim();
        const lastName = document.getElementById('contactLastName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        
        if (!firstName) { showError('contactFirstName', 'Prénom requis'); return; }
        if (!lastName) { showError('contactLastName', 'Nom requis'); return; }
        if (!phone) { showError('contactPhone', 'Numéro requis'); return; }
        
        addContact(lastName, firstName, phone);
        closeModal('addContactModal');
    } catch (error) {
        alert(error.message);
    }
};

const showCreateGroupForm = () => {
    const contactOptions = appData.contacts.filter(c => c.type === 'contact' && !isBlocked(c.id)).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.body.insertAdjacentHTML('beforeend', `
        <div id="createGroupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">Créer un groupe</h3>
                <input type="text" id="groupName" placeholder="Nom du groupe (2-30 caractères)" maxlength="30" class="w-full p-3 border rounded mb-3" required>
                <textarea id="groupDescription" placeholder="Description (max 200 caractères)" maxlength="200" class="w-full p-3 border rounded mb-3 h-20"></textarea>
                <label class="block text-sm font-medium mb-2">Sélectionner les membres (max 256):</label>
                <select id="groupMembers" multiple class="w-full p-3 border rounded mb-3 h-32">${contactOptions}</select>
                <select id="groupAdmin" class="w-full p-3 border rounded mb-4">
                    <option value="">Sélectionner un admin (optionnel)</option>${contactOptions}
                </select>
                <div class="flex space-x-3">
                    <button onclick="submitCreateGroup()" class="flex-1 bg-green-500 text-white p-3 rounded">Créer</button>
                    <button onclick="closeModal('createGroupModal')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
                </div>
            </div>
        </div>
    `);
};

const submitCreateGroup = () => {
    try {
        const name = document.getElementById('groupName').value.trim();
        const description = document.getElementById('groupDescription').value.trim();
        const memberSelect = document.getElementById('groupMembers');
        const adminSelect = document.getElementById('groupAdmin');
        const members = Array.from(memberSelect.selectedOptions).map(option => option.value);
        const admin = adminSelect.value;
        
        if (!name) { showError('groupName', 'Nom du groupe requis'); return; }
        if (members.length === 0) { alert('Sélectionnez au moins un membre'); return; }
        if (admin && !members.includes(admin)) { alert('L\'admin doit être membre du groupe'); return; }
        
        createGroup(name, description, members, admin);
        closeModal('createGroupModal');
    } catch (error) {
        alert(error.message);
    }
};

const closeModal = modalId => { const modal = document.getElementById(modalId); if (modal) modal.remove(); };

// Initialisation
if (typeof window !== 'undefined') {
    Object.assign(window, {
         showContactOptions,
        showAddContactForm, showCreateGroupForm, submitAddContact, submitCreateGroup,
        closeModal, closeContextMenu
    });
}
// Extension pour la gestion des contacts optimisée

function showAllContacts() {
    const contacts = appData?.contacts?.filter(c => c.type === 'contact' || !c.type) || [];
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
                    `<button onclick="unblockContact('${contact.id}'); refreshContactModal()" class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Débloquer</button>` :
                    `<button onclick="blockContact('${contact.id}'); refreshContactModal()" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">Bloquer</button>`}
                ${isArchived(contact.id) ?
                    `<button onclick="unarchiveChat('${contact.id}'); refreshContactModal()" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Désarchiver</button>` :
                    `<button onclick="archiveChat('${contact.id}'); refreshContactModal()" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Archiver</button>`}
                <button onclick="confirmDelete('${contact.id}', '${contact.name}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
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
                <button onclick="executeDelete('${contactId}')" class="flex-1 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">Supprimer</button>
                <button onclick="closeModal('deleteConfirmModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">Annuler</button>
            </div>
        </div>`;
    showModal('deleteConfirmModal', '', html);
}

function executeDelete(contactId) {
    try {
        appData.contacts = appData.contacts.filter(c => c.id !== contactId);
        delete appData.messages[contactId];
        appData.archived = appData.archived.filter(id => id !== contactId);
        appData.blocked = appData.blocked.filter(id => id !== contactId);
        appData.groups?.forEach(group => {
            group.members = group.members.filter(id => id !== contactId);
            group.admins = group.admins.filter(id => id !== contactId);
        });
        
        if (activeChat?.id === contactId) {
            activeChat = null;
            document.getElementById('chatArea')?.classList.add('hidden');
            document.getElementById('welcomeScreen')?.classList.remove('hidden');
        }
        
        saveData();
        renderContacts();
        closeModal('deleteConfirmModal');
        refreshContactModal();
        showNotification('Contact supprimé', 'success');
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}

function refreshContactModal() {
    closeModal('allContactsModal');
    setTimeout(showAllContacts, 100);
}

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'Date inconnue';
}

function addContactsListButton() {
    const header = document.querySelector('.bg-gray-50 .flex.space-x-2');
    if (!header) return;
    
    const btn = document.createElement('button');
    btn.className = 'p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors';
    btn.title = 'Voir tous les contacts (Ctrl+L)';
    btn.innerHTML = '<i class="fas fa-address-book text-white"></i>';
    btn.onclick = showAllContacts;
    
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            showAllContacts();
        }
    });
    
    header.insertBefore(btn, header.firstChild);
}

// Exposer les fonctions et auto-initialisation
Object.assign(window, { showAllContacts, confirmDelete, executeDelete, refreshContactModal, addContactsListButton });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addContactsListButton);
} else {
    addContactsListButton();
}
