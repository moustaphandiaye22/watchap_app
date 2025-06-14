// Gestion des options de contact
const showContactOptions = contactId => {
    const contact = [...AppState.appData.contacts, ...AppState.appData.groups]
        .find(c => c.id === contactId);
    if (!contact) return;
    
    const options = [];
    
    // Option d'archivage
    options.push(isArchived(contactId) ? 
        `<button onclick="unarchiveChat('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">
            <i class="fas fa-inbox mr-2"></i>Désarchiver
         </button>` :
        `<button onclick="archiveChat('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">
            <i class="fas fa-archive mr-2"></i>Archiver
         </button>`);
    
    // Options spécifiques aux contacts
    if (contact.type === 'contact') {
        options.push(isBlocked(contactId) ?
            `<button onclick="unblockContact('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">
                <i class="fas fa-unlock mr-2"></i>Débloquer
             </button>` :
            `<button onclick="blockContact('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">
                <i class="fas fa-ban mr-2"></i>Bloquer
             </button>`);
    }
    
    // Options spécifiques aux groupes
    if (contact.type === 'group') {
        options.push(`
            <button onclick="showGroupMembers('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">
                <i class="fas fa-users mr-2"></i>Voir les membres
            </button>
        `);
        options.push(`
            <button onclick="showAddMemberForm('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">
                <i class="fas fa-user-plus mr-2"></i>Ajouter un membre
            </button>
        `);
    }
    
    showContextMenu(options);
};

// Menu contextuel
const showContextMenu = options => {
    const existingMenu = document.getElementById('contextMenu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48';
    menu.innerHTML = `
        <div class="py-2">
            ${options.join('')}
            <button onclick="closeContextMenu()" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 border-t">
                <i class="fas fa-times mr-2"></i>Fermer
            </button>
        </div>
    `;
    
    // Positionner le menu au centre de l'écran
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
    
    document.body.appendChild(menu);
    
    // Fermer le menu en cliquant à l'extérieur
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                closeContextMenu();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
};

const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.remove();
    }
};

// Rendu des contacts
const renderContacts = () => {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    
    contactsList.innerHTML = '';
    
    const allChats = [...AppState.appData.contacts, ...AppState.appData.groups];
    const visibleChats = allChats.filter(chat => !isArchived(chat.id) && !isBlocked(chat.id));
    
    visibleChats.forEach(contact => {
        const contactEl = document.createElement('div');
        const isActive = AppState.activeChat?.id === contact.id;
        const typeIcon = contact.type === 'group' ? '👥' : contact.avatar;
        const statusIndicator = contact.type === 'contact' && contact.online ? 
            '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>' : '';
        
        // Classe spéciale pour le mode diffusion
        const broadcastClass = broadcastMode && selectedContacts.has(contact.id) ? 'bg-blue-50 border-blue-200' : '';
        
        contactEl.className = `contact-item p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isActive ? 'active bg-green-50 border-r-4 border-green-500' : ''} ${broadcastClass}`;
        contactEl.dataset.contactId = contact.id;
        
        contactEl.innerHTML = `
            <div class="flex items-center space-x-3">
                ${broadcastMode ? `
                    <div class="flex-shrink-0">
                        <input type="checkbox" ${selectedContacts.has(contact.id) ? 'checked' : ''} 
                               onchange="toggleContactSelection('${contact.id}')"
                               class="w-4 h-4 text-blue-600 rounded">
                    </div>
                ` : ''}
                <div class="relative flex-shrink-0">
                    <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl font-semibold">
                        ${typeIcon}
                    </div>
                    ${statusIndicator}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-gray-800 truncate">${contact.name}</h3>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-500">${contact.time}</span>
                            ${!broadcastMode ? `
                                <button onclick="event.stopPropagation(); showContactOptions('${contact.id}')" 
                                        class="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i class="fas fa-ellipsis-v text-gray-400 text-xs"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <p class="text-sm text-gray-600 truncate">${contact.lastMessage}</p>
                        ${contact.unread > 0 ? `
                            <span class="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                ${contact.unread}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter la classe group pour les effets hover
        contactEl.classList.add('group');
        
        // Événement de clic
        contactEl.addEventListener('click', (e) => {
            if (broadcastMode) {
                // En mode diffusion, ne pas ouvrir le chat
                return;
            }
            
            if (!e.target.closest('button') && !e.target.closest('input')) {
                openChat(contact);
            }
        });
        
        contactsList.appendChild(contactEl);
    });
};

// Ouverture d'un chat
const openChat = contact => {
    AppState.activeChat = contact;
    
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatArea = document.getElementById('chatArea');
    
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (chatArea) chatArea.classList.remove('hidden');
    
    // Mise à jour de l'en-tête du chat
    const chatAvatar = document.getElementById('chatAvatar');
    const chatName = document.getElementById('chatName');
    const chatStatus = document.getElementById('chatStatus');
    
    if (chatAvatar) chatAvatar.textContent = contact.type === 'group' ? '👥' : contact.avatar;
    if (chatName) chatName.textContent = contact.name;
    
    if (chatStatus) {
        let statusText = '';
        if (contact.type === 'group') {
            const group = AppState.appData.groups.find(g => g.id === contact.id);
            statusText = `${group?.members.length || 0} membres`;
        } else {
            statusText = contact.online ? 'En ligne' : `Vu pour la dernière fois aujourd'hui à ${formatTime()}`;
        }
        chatStatus.innerHTML = `
            <span class="status-indicator ${contact.online ? 'status-online' : 'status-offline'}"></span>
            ${statusText}
        `;
    }
    
    // Marquer les messages comme lus
    if (contact.unread > 0) {
        contact.unread = 0;
        AppState.saveData();
    }
    
    renderMessages(contact.id);
    renderContacts();
};

// Rendu des messages
const renderMessages = contactId => {
    const messagesList = document.getElementById('messagesList');
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesList) return;
    
    const messages = AppState.appData.messages[contactId] || [];
    messagesList.innerHTML = '';
    
    messages.forEach(message => {
        const messageEl = document.createElement('div');
        
        if (message.sender === 'system') {
            messageEl.className = 'flex justify-center my-2';
            messageEl.innerHTML = `
                <div class="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                    ${message.text}
                </div>
            `;
        } else {
            const isMe = message.sender === 'me';
            const broadcastIcon = message.broadcast ? ' 📡' : '';
            
            messageEl.className = `flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`;
            messageEl.innerHTML = `
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isMe ? 'chat-bubble-sent text-gray-800' : 'chat-bubble-received text-gray-800'
                }">
                    <p class="break-words">${message.text}${broadcastIcon}</p>
                    <div class="flex items-center justify-end mt-1">
                        <span class="message-time">${message.time}</span>
                        ${isMe ? '<i class="fas fa-check text-blue-500 ml-1 text-xs"></i>' : ''}
                    </div>
                </div>
            `;
        }
        
        messagesList.appendChild(messageEl);
    });
    
    // Faire défiler vers le bas
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
};

// Envoi de message
const sendMessage = () => {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const text = messageInput.value.trim();
    
    if (!text) {
        showError('messageInput', 'Message vide');
        return;
    }
    
    if (!validateText(text)) {
        showError('messageInput', 'Message trop long (max 1000 caractères)');
        return;
    }
    
    if (!AppState.activeChat) {
        showNotification('Aucun chat sélectionné', 'error');
        return;
    }
    
    if (isBlocked(AppState.activeChat.id)) {
        showNotification('Contact bloqué', 'error');
        return;
    }
    
    // Créer le message
    if (!AppState.appData.messages[AppState.activeChat.id]) {
        AppState.appData.messages[AppState.activeChat.id] = [];
    }
    
    const newMessage = {
        id: generateId(),
        text: sanitizeInput(text),
        sender: 'me',
        time: formatTime(),
        timestamp: Date.now()
    };
    
    AppState.appData.messages[AppState.activeChat.id].push(newMessage);
    
    // Mettre à jour le contact/groupe
    const contact = [...AppState.appData.contacts, ...AppState.appData.groups]
        .find(c => c.id === AppState.activeChat.id);
    
    if (contact) {
        contact.lastMessage = text;
        contact.time = formatTime();
    }
    
    AppState.saveData();
    renderMessages(AppState.activeChat.id);
    renderContacts();
    messageInput.value = '';
    updateSendButton();
};

// Mise à jour du bouton d'envoi
const updateSendButton = () => {
    const messageInput = document.getElementById('messageInput');
    const sendIcon = document.getElementById('sendIcon');
    
    if (messageInput && sendIcon) {
        const hasText = messageInput.value.trim().length > 0;
        sendIcon.className = hasText ? 
            'fas fa-paper-plane text-white' : 
            'fas fa-microphone text-white';
    }
};

// Formulaires
function showAddContactForm() {
    const content = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input type="text" id="contactFirstName" placeholder="Prénom" maxlength="30" 
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    <small id="errorContactFirstName" class="error-message text-red-500 text-xs hidden"></small>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input type="text" id="contactLastName" placeholder="Nom" maxlength="30" 
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    <small id="errorContactLastName" class="error-message text-red-500 text-xs hidden"></small>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Numéro de téléphone</label>
                <input type="tel" id="contactPhone" placeholder="+221 XX XXX XX XX" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                <small id="errorContactPhone" class="error-message text-red-500 text-xs hidden"></small>
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
                <small id="errorGroupName" class="error-message text-red-500 text-xs hidden"></small>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description (optionnelle)</label>
                <textarea id="groupDescription" placeholder="Description du groupe..." maxlength="200" 
                          class="w-full p-3 border border-gray-300 rounded-lg h-20 resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"></textarea>
                <small id="errorGroupDescription" class="error-message text-red-500 text-xs hidden"></small>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Membres du groupe</label>
                <select id="groupMembers" multiple size="6" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    ${contactOptions}
                </select>
                <small id="errorGroupMembers" class="error-message text-red-500 text-xs hidden"></small>
                <p class="text-xs text-gray-500 mt-1">Maintenez Ctrl pour sélectionner plusieurs membres</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Administrateur (optionnel)</label>
                <select id="groupAdmin" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                    <option value="">Sélectionner un admin</option>
                    ${contactOptions}
                </select>
                <small id="errorGroupAdmin" class="error-message text-red-500 text-xs hidden"></small>
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

// Soumission des formulaires
const submitAddContact = () => {
    const fields = ['contactFirstName', 'contactLastName', 'contactPhone'];
    const values = fields.map(id => document.getElementById(id)?.value.trim());
    const [firstName, lastName, phone] = values;
    
    // Nettoyer les erreurs précédentes
    fields.forEach(field => {
        const errorEl = document.getElementById(`error${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }
    });
    
    const errors = [];
    if (!firstName) errors.push(['contactFirstName', 'Prénom requis']);
    if (!lastName) errors.push(['contactLastName', 'Nom requis']);
    if (!phone) errors.push(['contactPhone', 'Numéro requis']);
    
    if (errors.length) {
        errors.forEach(([field, message]) => showError(field, message));
        return;
    }
    
    try {
        addContact(lastName, firstName, phone);
        closeModal('addContactModal');
        showNotification('Contact ajouté avec succès', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

const submitCreateGroup = () => {
    const name = document.getElementById('groupName')?.value.trim();
    const description = document.getElementById('groupDescription')?.value.trim();
    const memberSelect = document.getElementById('groupMembers');
    const adminSelect = document.getElementById('groupAdmin');
    const members = Array.from(memberSelect?.selectedOptions || []).map(option => option.value);
    const admin = adminSelect?.value;
    
    // Nettoyer les erreurs précédentes
    ['groupName', 'groupDescription', 'groupMembers', 'groupAdmin'].forEach(field => {
        const errorEl = document.getElementById(`error${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }
    });
    
    const errors = [];
    if (!name) errors.push(['groupName', 'Nom du groupe requis']);
    if (description.length > 200) errors.push(['groupDescription', 'Description trop longue (max 200 caractères)']);
    if (members.length === 0) errors.push(['groupMembers', 'Sélectionnez au moins un membre']);
    if (admin && !members.includes(admin)) errors.push(['groupAdmin', 'L\'admin doit être membre du groupe']);
    
    if (errors.length) {
        errors.forEach(([field, message]) => showError(field, message));
        return;
    }
    
    try {
        createGroup(name, description, members, admin);
        closeModal('createGroupModal');
        showNotification('Groupe créé avec succès', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    Object.assign(window, {
        showContactOptions, showAddContactForm, showCreateGroupForm, 
        submitAddContact, submitCreateGroup, closeContextMenu,
        renderContacts, openChat, sendMessage, updateSendButton
    });
}