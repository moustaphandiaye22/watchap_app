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
        const phone = phoneInput?.value.trim();
        if (!phone) { showError('phoneInput', 'Numéro requis'); return; }
        if (!validatePhone(phone)) { showError('phoneInput', 'Format de numéro invalide'); return; }
        showVerifyStep(phone);
    } else if (currentStep === 'verify') {
        const code = codeInput?.value.trim();
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

// Expose functions
if (typeof window !== 'undefined') {
    Object.assign(window, {
        addContact, createGroup, addMemberToGroup, removeMemberFromGroup, makeAdmin,
        archiveChat, unarchiveChat, blockContact, unblockContact, handleLogin, logout
    });
}