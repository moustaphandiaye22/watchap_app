// Variables globales
let currentStep = 'phone';
let activeChat = null;
let appData = {
    currentUser: null,
    contacts: [],
    groups: [],
    messages: {},
    archived: [],
    blocked: []
};

// Fonctions utilitaires pour la gestion des données
function saveData() {
    fetch('http://localhost:3000/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
    })
    .then(res => res.json())
    .then(data => console.log('Sauvegarde réussie', data))
    .catch(err => console.error('Erreur sauvegarde :', err));
}


async function loadData() {
    try {
        const response = await fetch('http://localhost:3000/data');
        const data = await response.json();
        window.appData = { ...window.appData, ...data };
        console.log('Données chargées depuis API:', window.appData);
    } catch (error) {
        console.error('Erreur API, chargement local');
        const saved = localStorage.getItem('whatsappData');
        if (saved) {
            window.appData = { ...window.appData, ...JSON.parse(saved) };
        }
    }
}


function formatTime() {
    return new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Gestion des contacts
function addContact(nom, prenom, numero) {
    const newContact = {
        id: generateId(),
        name: `${prenom} ${nom}`,
        firstName: prenom,
        lastName: nom,
        phone: numero,
        lastMessage: "Contact ajouté",
        time: formatTime(),
        avatar: getRandomAvatar(prenom,nom),
        unread: 0,
        online: Math.random() > 0.5,
        type: 'contact',
        dateAdded: new Date().toISOString()
    };
    
    appData.contacts.push(newContact);
    appData.messages[newContact.id] = [];
    saveData();
    renderContacts();
    
    console.log('Contact ajouté:', newContact);
    return newContact;
}

function getRandomAvatar(firstName,lastName) {
   const f = firstName?.[0]?.toUpperCase() || '';
    const l = lastName?.[0]?.toUpperCase() || '';
    return f + l;
}

// Gestion des groupes
function createGroup(nom, description, membres = [], admin = null) {
    const newGroup = {
        id: generateId(),
        name: nom,
        description: description,
        lastMessage: "Groupe créé",
        time: formatTime(),
        avatar: "👥",
        unread: 0,
        online: false,
        type: 'group',
        members: membres,
        admins: admin ? [admin] : [],
        dateCreated: new Date().toISOString(),
        createdBy: appData.currentUser?.phone || 'unknown'
    };
    
    appData.groups.push(newGroup);
    appData.contacts.push(newGroup); // Ajouter aux contacts pour l'affichage
    appData.messages[newGroup.id] = [{
        id: generateId(),
        text: `Groupe "${nom}" créé`,
        sender: 'system',
        time: formatTime(),
        timestamp: Date.now()
    }];
    
    saveData();
    renderContacts();
    
    console.log('Groupe créé:', newGroup);
    return newGroup;
}

function addMemberToGroup(groupId, contactId) {
    const group = appData.groups.find(g => g.id === groupId);
    const contact = appData.contacts.find(c => c.id === contactId && c.type === 'contact');
    
    if (group && contact && !group.members.includes(contactId)) {
        group.members.push(contactId);
        
        // Ajouter message système
        const systemMessage = {
            id: generateId(),
            text: `${contact.name} a été ajouté au groupe`,
            sender: 'system',
            time: formatTime(),
            timestamp: Date.now()
        };
        
        appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        
        saveData();
        renderContacts();
        if (activeChat?.id === groupId) {
            renderMessages(groupId);
        }
        
        console.log(`Membre ${contact.name} ajouté au groupe ${group.name}`);
    }
}

function removeMemberFromGroup(groupId, contactId) {
    const group = appData.groups.find(g => g.id === groupId);
    const contact = appData.contacts.find(c => c.id === contactId);
    
    if (group && contact) {
        group.members = group.members.filter(id => id !== contactId);
        group.admins = group.admins.filter(id => id !== contactId);
        
        // Ajouter message système
        const systemMessage = {
            id: generateId(),
            text: `${contact.name} a quitté le groupe`,
            sender: 'system',
            time: formatTime(),
            timestamp: Date.now()
        };
        
        appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        
        saveData();
        renderContacts();
        if (activeChat?.id === groupId) {
            renderMessages(groupId);
        }
        
        console.log(`Membre ${contact.name} retiré du groupe ${group.name}`);
    }
}

function makeAdmin(groupId, contactId) {
    const group = appData.groups.find(g => g.id === groupId);
    const contact = appData.contacts.find(c => c.id === contactId);
    
    if (group && contact && group.members.includes(contactId) && !group.admins.includes(contactId)) {
        group.admins.push(contactId);
        
        // Ajouter message système
        const systemMessage = {
            id: generateId(),
            text: `${contact.name} est maintenant administrateur`,
            sender: 'system',
            time: formatTime(),
            timestamp: Date.now()
        };
        
        appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        
        saveData();
        renderContacts();
        if (activeChat?.id === groupId) {
            renderMessages(groupId);
        }
        
        console.log(`${contact.name} est maintenant admin du groupe ${group.name}`);
    }
}

// Gestion de l'archivage
function archiveChat(chatId) {
    if (!appData.archived.includes(chatId)) {
        appData.archived.push(chatId);
        saveData();
        renderContacts();
        console.log(`Chat ${chatId} archivé`);
    }
}

function unarchiveChat(chatId) {
    appData.archived = appData.archived.filter(id => id !== chatId);
    saveData();
    renderContacts();
    console.log(`Chat ${chatId} désarchivé`);
}

function isArchived(chatId) {
    return appData.archived.includes(chatId);
}

// Gestion du blocage
function blockContact(contactId) {
    if (!appData.blocked.includes(contactId)) {
        appData.blocked.push(contactId);
        saveData();
        renderContacts();
        console.log(`Contact ${contactId} bloqué`);
    }
}

function unblockContact(contactId) {
    appData.blocked = appData.blocked.filter(id => id !== contactId);
    saveData();
    renderContacts();
    console.log(`Contact ${contactId} débloqué`);
}

function isBlocked(contactId) {
    return appData.blocked.includes(contactId);
}

// Gestion de la connexion
function handleLogin() {
    const phoneInput = document.getElementById('phoneInput');
    const codeInput = document.getElementById('codeInput');
    
    if (currentStep === 'phone' && phoneInput.value.trim()) {
        showVerifyStep(phoneInput.value);
    } else if (currentStep === 'verify' && codeInput.value.trim()) {
        appData.currentUser = { phone: phoneInput.value };
        saveData();
        showMainApp();
    }
}

function showVerifyStep(phone) {
    currentStep = 'verify';
    document.getElementById('phoneStep').classList.add('hidden');
    document.getElementById('verifyStep').classList.remove('hidden');
    document.getElementById('changeNumberBtn').classList.remove('hidden');
    document.getElementById('loginSubtitle').textContent = 'Entrez le code de vérification';
    document.getElementById('phoneNumber').textContent = `Code envoyé au +221 ${phone}`;
    document.getElementById('loginBtn').textContent = 'Vérifier';
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    renderContacts();
}

function logout() {
    appData.currentUser = null;
    saveData();
    location.reload();
}

// Rendu de l'interface
function renderContacts() {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '';

    // Filtrer les contacts non archivés et non bloqués
    const visibleContacts = appData.contacts.filter(contact => 
        !isArchived(contact.id) && !isBlocked(contact.id)
    );

    visibleContacts.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = `p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
            activeChat?.id === contact.id ? 'bg-green-50 border-r-4 border-green-500' : ''
        }`;
        
        const typeIcon = contact.type === 'group' ? '👥' : contact.avatar;
        const statusIndicator = contact.type === 'contact' && contact.online ? 
            '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>' : '';
        
        contactEl.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="relative">
                    <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl">
                        ${typeIcon}
                    </div>
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
        
        contactEl.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openChat(contact);
            }
        });
        contactsList.appendChild(contactEl);
    });
}

function showContactOptions(contactId) {
    const contact = appData.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const options = [];
    
    if (isArchived(contactId)) {
        options.push(`<button onclick="unarchiveChat('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Désarchiver</button>`);
    } else {
        options.push(`<button onclick="archiveChat('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Archiver</button>`);
    }
    
    if (contact.type === 'contact') {
        if (isBlocked(contactId)) {
            options.push(`<button onclick="unblockContact('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Débloquer</button>`);
        } else {
            options.push(`<button onclick="blockContact('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Bloquer</button>`);
        }
    }
    
    if (contact.type === 'group') {
        options.push(`<button onclick="showGroupMembers('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Voir les membres</button>`);
        options.push(`<button onclick="showAddMemberForm('${contactId}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Ajouter un membre</button>`);
    }
    
    // Créer et afficher le menu contextuel
    showContextMenu(options);
}

function showContextMenu(options) {
    // Supprimer le menu existant s'il y en a un
    const existingMenu = document.getElementById('contextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50';
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
    menu.innerHTML = `
        <div class="py-2">
            ${options.join('')}
            <button onclick="closeContextMenu()" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Fermer</button>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Fermer le menu en cliquant à l'extérieur
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 100);
}

function closeContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.remove();
    }
    document.removeEventListener('click', closeContextMenu);
}

function openChat(contact) {
    activeChat = contact;
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('chatArea').classList.remove('hidden');
    
    // Mettre à jour l'en-tête du chat
    document.getElementById('chatAvatar').textContent = contact.type === 'group' ? '👥' : contact.avatar;
    document.getElementById('chatName').textContent = contact.name;
    
    let statusText = '';
    if (contact.type === 'group') {
        const group = appData.groups.find(g => g.id === contact.id);
        const memberCount = group ? group.members.length : 0;
        statusText = `${memberCount} membres`;
    } else {
        statusText = contact.online ? 'En ligne' : `Vu pour la dernière fois aujourd'hui à ${formatTime()}`;
    }
    
    document.getElementById('chatStatus').textContent = statusText;
    
    renderMessages(contact.id);
    renderContacts(); // Re-render pour mettre à jour la sélection
}

function renderMessages(contactId) {
    const messagesList = document.getElementById('messagesList');
    const messages = appData.messages[contactId] || [];
    
    messagesList.innerHTML = '';
    
    messages.forEach(message => {
        const messageEl = document.createElement('div');
        
        if (message.sender === 'system') {
            messageEl.className = 'flex justify-center';
            messageEl.innerHTML = `
                <div class="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                    ${message.text}
                </div>
            `;
        } else {
            messageEl.className = `flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`;
            messageEl.innerHTML = `
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'me'
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-800 shadow-sm'
                }">
                    <p>${message.text}</p>
                    <span class="text-xs mt-1 block ${
                        message.sender === 'me' ? 'text-green-100' : 'text-gray-500'
                    }">
                        ${message.time}
                    </span>
                </div>
            `;
        }
        
        messagesList.appendChild(messageEl);
    });
    
    // Scroll vers le bas
    document.getElementById('messagesContainer').scrollTop = document.getElementById('messagesContainer').scrollHeight;
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    if (text && activeChat && !isBlocked(activeChat.id)) {
        if (!appData.messages[activeChat.id]) {
            appData.messages[activeChat.id] = [];
        }
        
        const newMessage = {
            id: generateId(),
            text: text,
            sender: 'me',
            time: formatTime(),
            timestamp: Date.now()
        };
        
        appData.messages[activeChat.id].push(newMessage);
        
        // Mettre à jour le dernier message du contact
        const contact = appData.contacts.find(c => c.id === activeChat.id);
        if (contact) {
            contact.lastMessage = text;
            contact.time = formatTime();
        }
        
        saveData();
        renderMessages(activeChat.id);
        renderContacts();
        messageInput.value = '';
        updateSendButton();
    }
}

function updateSendButton() {
    const messageInput = document.getElementById('messageInput');
    const sendIcon = document.getElementById('sendIcon');
    
    if (messageInput.value.trim()) {
        sendIcon.className = 'fas fa-paper-plane text-white';
    } else {
        sendIcon.className = 'fas fa-microphone text-white';
    }
}

// Fonctions pour les formulaires
function showAddContactForm() {
    const formHtml = `
        <div id="addContactModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg w-96">
                <h3 class="text-lg font-semibold mb-4">Ajouter un contact</h3>
                <input type="text" id="contactFirstName" placeholder="Prénom" class="w-full p-3 border rounded mb-3">
                <input type="text" id="contactLastName" placeholder="Nom" class="w-full p-3 border rounded mb-3">
                <input type="tel" id="contactPhone" placeholder="Numéro de téléphone" class="w-full p-3 border rounded mb-4">
                <div class="flex space-x-3">
                    <button onclick="submitAddContact()" class="flex-1 bg-green-500 text-white p-3 rounded">Ajouter</button>
                    <button onclick="closeModal('addContactModal')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', formHtml);
}

function submitAddContact() {
    const firstName = document.getElementById('contactFirstName').value.trim();
    const lastName = document.getElementById('contactLastName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    
    if (firstName && lastName && phone) {
        addContact(lastName, firstName, phone);
        closeModal('addContactModal');
    }
}

function showCreateGroupForm() {
    const contactOptions = appData.contacts
        .filter(c => c.type === 'contact' && !isBlocked(c.id))
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join('');
    
    const formHtml = `
        <div id="createGroupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">Créer un groupe</h3>
                <input type="text" id="groupName" placeholder="Nom du groupe" class="w-full p-3 border rounded mb-3">
                <textarea id="groupDescription" placeholder="Description (optionnel)" class="w-full p-3 border rounded mb-3 h-20"></textarea>
                <label class="block text-sm font-medium mb-2">Sélectionner les membres:</label>
                <select id="groupMembers" multiple class="w-full p-3 border rounded mb-3 h-32">
                    ${contactOptions}
                </select>
                <select id="groupAdmin" class="w-full p-3 border rounded mb-4">
                    <option value="">Sélectionner un admin (optionnel)</option>
                    ${contactOptions}
                </select>
                <div class="flex space-x-3">
                    <button onclick="submitCreateGroup()" class="flex-1 bg-green-500 text-white p-3 rounded">Créer</button>
                    <button onclick="closeModal('createGroupModal')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', formHtml);
}

function submitCreateGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const memberSelect = document.getElementById('groupMembers');
    const adminSelect = document.getElementById('groupAdmin');
    
    const members = Array.from(memberSelect.selectedOptions).map(option => option.value);
    const admin = adminSelect.value;
    
    if (name) {
        createGroup(name, description, members, admin);
        closeModal('createGroupModal');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Initialisation au chargement de la page
if (typeof window !== 'undefined') {
    window.addContact = addContact;
    window.createGroup = createGroup;
    window.addMemberToGroup = addMemberToGroup;
    window.removeMemberFromGroup = removeMemberFromGroup;
    window.makeAdmin = makeAdmin;
    window.archiveChat = archiveChat;
    window.unarchiveChat = unarchiveChat;
    window.blockContact = blockContact;
    window.unblockContact = unblockContact;
    window.showContactOptions = showContactOptions;
    window.showAddContactForm = showAddContactForm;
    window.showCreateGroupForm = showCreateGroupForm;
    window.submitAddContact = submitAddContact;
    window.submitCreateGroup = submitCreateGroup;
    window.closeModal = closeModal;
    window.closeContextMenu = closeContextMenu;
}