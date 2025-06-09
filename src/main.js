// Variables globales
let currentStep = 'phone', activeChat = null;
let appData = { currentUser: null, contacts: [], groups: [], messages: {}, archived: [], blocked: [] };

// Utilitaires et validations
const validatePhone = phone => /^[+]?[0-9\s\-\(\)]{8,15}$/.test(phone);
const validateName = name => /^[a-zA-ZÀ-ÿ\s]{2,30}$/.test(name);
const validateText = text => text.trim().length > 0 && text.length <= 1000;
const validateCode = code => /^[0-9]{4,6}$/.test(code);
const sanitizeInput = input => input.trim().replace(/[<>]/g, '');
const showError = (elementId, message) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.borderColor = 'red';
        element.setAttribute('title', message);
        setTimeout(() => { element.style.borderColor = ''; element.removeAttribute('title'); }, 3000);
    }
};

const saveData = () => fetch('http://localhost:3000/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appData) })
    .then(res => res.json()).then(data => console.log('Sauvegarde réussie', data)).catch(err => console.error('Erreur sauvegarde :', err));

const loadData = async () => {
    try {
        const response = await fetch('http://localhost:3000/data');
        appData = { ...appData, ...(await response.json()) };
        console.log('Données chargées depuis API:', appData);
    } catch (error) {
        console.error('Erreur API, chargement local');
        const saved = localStorage.getItem('whatsappData');
        if (saved) appData = { ...appData, ...JSON.parse(saved) };
    }
};

const formatTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);
const getRandomAvatar = (firstName, lastName) => `${firstName?.[0]?.toUpperCase() || ''}${lastName?.[0]?.toUpperCase() || ''}`;

// Gestion contacts avec validation
const addContact = (nom, prenom, numero) => {
    if (!validateName(prenom)) throw new Error('Prénom invalide (2-30 caractères, lettres uniquement)');
    if (!validateName(nom)) throw new Error('Nom invalide (2-30 caractères, lettres uniquement)');
    if (!validatePhone(numero)) throw new Error('Numéro de téléphone invalide');
    if (appData.contacts.some(c => c.phone === numero)) throw new Error('Ce numéro existe déjà');
    
    const newContact = {
        id: generateId(), name: `${sanitizeInput(prenom)} ${sanitizeInput(nom)}`, 
        firstName: sanitizeInput(prenom), lastName: sanitizeInput(nom), phone: sanitizeInput(numero),
        lastMessage: "Contact ajouté", time: formatTime(), avatar: getRandomAvatar(prenom, nom),
        unread: 0, online: Math.random() > 0.5, type: 'contact', dateAdded: new Date().toISOString()
    };
    appData.contacts.push(newContact);
    appData.messages[newContact.id] = [];
    saveData();
    renderContacts();
    console.log('Contact ajouté:', newContact);
    return newContact;
};

const createGroup = (nom, description, membres = [], admin = null) => {
    if (!validateName(nom)) throw new Error('Nom du groupe invalide (2-30 caractères, lettres uniquement)');
    if (description && description.length > 200) throw new Error('Description trop longue (max 200 caractères)');
    if (appData.groups.some(g => g.name.toLowerCase() === nom.toLowerCase())) throw new Error('Un groupe avec ce nom existe déjà');
    if (membres.length > 256) throw new Error('Trop de membres (max 256)');
    
    const newGroup = {
        id: generateId(), name: sanitizeInput(nom), description: sanitizeInput(description), 
        lastMessage: "Groupe créé", time: formatTime(), avatar: "👥", unread: 0, online: false, 
        type: 'group', members: membres, admins: admin ? [admin] : [], 
        dateCreated: new Date().toISOString(), createdBy: appData.currentUser?.phone || 'unknown'
    };
    appData.groups.push(newGroup);
    appData.messages[newGroup.id] = [{
        id: generateId(), text: `Groupe "${nom}" créé`, sender: 'system',
        time: formatTime(), timestamp: Date.now()
    }];
    saveData();
    renderContacts();
    console.log('Groupe créé:', newGroup);
    return newGroup;
};

// Gestion membres groupe
const addMemberToGroup = (groupId, contactId) => {
    const group = appData.groups.find(g => g.id === groupId);
    const contact = appData.contacts.find(c => c.id === contactId && c.type === 'contact');
    if (group && contact && !group.members.includes(contactId)) {
        group.members.push(contactId);
        const systemMessage = { id: generateId(), text: `${contact.name} a été ajouté au groupe`, sender: 'system', time: formatTime(), timestamp: Date.now() };
        appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        saveData();
        renderContacts();
        if (activeChat?.id === groupId) renderMessages(groupId);
        console.log(`Membre ${contact.name} ajouté au groupe ${group.name}`);
    }
};

const removeMemberFromGroup = (groupId, contactId) => {
    const group = appData.groups.find(g => g.id === groupId);
    const contact = appData.contacts.find(c => c.id === contactId);
    if (group && contact) {
        group.members = group.members.filter(id => id !== contactId);
        group.admins = group.admins.filter(id => id !== contactId);
        const systemMessage = { id: generateId(), text: `${contact.name} a quitté le groupe`, sender: 'system', time: formatTime(), timestamp: Date.now() };
        appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        saveData();
        renderContacts();
        if (activeChat?.id === groupId) renderMessages(groupId);
        console.log(`Membre ${contact.name} retiré du groupe ${group.name}`);
    }
};

const makeAdmin = (groupId, contactId) => {
    const group = appData.groups.find(g => g.id === groupId);
    const contact = appData.contacts.find(c => c.id === contactId);
    if (group && contact && group.members.includes(contactId) && !group.admins.includes(contactId)) {
        group.admins.push(contactId);
        const systemMessage = { id: generateId(), text: `${contact.name} est maintenant administrateur`, sender: 'system', time: formatTime(), timestamp: Date.now() };
        appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        saveData();
        renderContacts();
        if (activeChat?.id === groupId) renderMessages(groupId);
        console.log(`${contact.name} est maintenant admin du groupe ${group.name}`);
    }
};

// Archivage et blocage
const archiveChat = chatId => { if (!appData.archived.includes(chatId)) { appData.archived.push(chatId); saveData(); renderContacts(); console.log(`Chat ${chatId} archivé`); } };
const unarchiveChat = chatId => { appData.archived = appData.archived.filter(id => id !== chatId); saveData(); renderContacts(); console.log(`Chat ${chatId} désarchivé`); };
const isArchived = chatId => appData.archived.includes(chatId);
const blockContact = contactId => { if (!appData.blocked.includes(contactId)) { appData.blocked.push(contactId); saveData(); renderContacts(); console.log(`Contact ${contactId} bloqué`); } };
const unblockContact = contactId => { appData.blocked = appData.blocked.filter(id => id !== contactId); saveData(); renderContacts(); console.log(`Contact ${contactId} débloqué`); };
const isBlocked = contactId => appData.blocked.includes(contactId);

// Connexion avec validation
const handleLogin = () => {
    const phoneInput = document.getElementById('phoneInput');
    const codeInput = document.getElementById('codeInput');
    
    if (currentStep === 'phone') {
        const phone = phoneInput?.value.trim(); // Vérification null
        if (!phone) { showError('phoneInput', 'Numéro requis'); return; }
        if (!validatePhone(phone)) { showError('phoneInput', 'Format de numéro invalide'); return; }
        showVerifyStep(phone);
    } else if (currentStep === 'verify') {
        const code = codeInput?.value.trim(); // Vérification null
        if (!code) { showError('codeInput', 'Code requis'); return; }
        if (!validateCode(code)) { showError('codeInput', 'Code invalide (4-6 chiffres)'); return; }
        appData.currentUser = { phone: phoneInput?.value }; 
        saveData();
        showMainApp();
    }
};

const showVerifyStep = phone => {
    currentStep = 'verify';
    document.getElementById('phoneStep').classList.add('hidden');
    document.getElementById('verifyStep').classList.remove('hidden');
    document.getElementById('changeNumberBtn').classList.remove('hidden');
    document.getElementById('loginSubtitle').textContent = 'Entrez le code de vérification';
    document.getElementById('phoneNumber').textContent = `Code envoyé au +221 ${phone}`;
    document.getElementById('loginBtn').textContent = 'Vérifier';
};

const showMainApp = () => {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    renderContacts();
};

const logout = () => { appData.currentUser = null; saveData(); location.reload(); };

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
        addContact, createGroup, addMemberToGroup, removeMemberFromGroup, makeAdmin,
        archiveChat, unarchiveChat, blockContact, unblockContact, showContactOptions,
        showAddContactForm, showCreateGroupForm, submitAddContact, submitCreateGroup,
        closeModal, closeContextMenu
    });
}