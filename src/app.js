const AppState = (() => {
    let appData = { currentUser: null, contacts: [], groups: [], messages: {}, archived: [], blocked: [] };
    let currentStep = 'phone';
    let activeChat = null;

    const saveToLocalStorage = () => {
        try {
            console.log('Données sauvegardées localement.');
        } catch (e) {
            console.error('Erreur lors de la sauvegarde dans le localStorage:', e);
        }
    };

    const loadFromLocalStorage = () => {
        try {
            const saved = localStorage.getItem('whatsappData');
            if (saved) {
                appData = { ...appData, ...JSON.parse(saved) };
                console.log('Données chargées depuis le localStorage.');
            }
        } catch (e) {
            console.error('Erreur lors de la lecture du localStorage:', e);
        }
    };

    const saveData = async () => {
        try {
            const response = await fetch('https://deploiment-server-json.onrender.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appData)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('Sauvegarde réussie via API:', data);
            saveToLocalStorage(); // Toujours sauvegarder localement après API
        } catch (err) {
            console.error('Erreur lors de la sauvegarde via API, sauvegarde locale de secours:', err);
            saveToLocalStorage();
        }
    };

    const loadData = async () => {
        try {
            const response = await fetch('https://deploiment-server-json.onrender.com');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            appData = { ...appData, ...data };
            console.log('Données chargées depuis API:', appData);
            saveToLocalStorage(); // Sauvegarder localement après chargement API
        } catch (error) {
            console.warn('Erreur API, tentative de chargement local:', error);
            loadFromLocalStorage();
        }
    };

    return {
        get appData() { return appData; },
        set appData(newData) { appData = { ...appData, ...newData }; },
        get currentStep() { return currentStep; },
        set currentStep(step) { currentStep = step; },
        get activeChat() { return activeChat; },
        set activeChat(chat) { activeChat = chat; },
        saveData,
        loadData,
        saveToLocalStorage, // Exposer pour un usage direct si nécessaire
        loadFromLocalStorage // Exposer pour un usage direct si nécessaire
    };
})();

// Utilitaires et validations
const validatePhone = phone => /^[+]?[0-9\s\-\(\)]{8,15}$/.test(phone);
const validateName = name => /^[a-zA-ZÀ-ÿ\s]{2,30}$/.test(name);
const validateText = text => text.trim().length > 0 && text.length <= 1000;
const validateCode = code => /^[0-9]{4,6}$/.test(code);
const sanitizeInput = input => input.trim().replace(/[<>]/g, '');

// Amélioration de showError pour utiliser les balises <small> existantes
const showError = (elementId, message) => {
    const inputElement = document.getElementById(elementId);
    const errorElement = document.getElementById(`error${elementId.charAt(0).toUpperCase() + elementId.slice(1)}`);

    if (inputElement) {
        inputElement.classList.add('border-red-500');
        inputElement.classList.remove('border-gray-300');
    }
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    setTimeout(() => {
        if (inputElement) {
            inputElement.classList.remove('border-red-500');
            inputElement.classList.add('border-gray-300');
        }
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.add('hidden');
        }
    }, 3000);
};

const formatTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);
const getRandomAvatar = (firstName, lastName) => `${firstName?.[0]?.toUpperCase() || ''}${lastName?.[0]?.toUpperCase() || ''}`;

// Gestion contacts avec validation
const addContact = (nom, prenom, numero) => {
    if (!validateName(prenom)) throw new Error('Prénom invalide (2-30 caractères, lettres uniquement)');
    if (!validateName(nom)) throw new Error('Nom invalide (2-30 caractères, lettres uniquement)');
    if (!validatePhone(numero)) throw new Error('Numéro de téléphone invalide');
    if (AppState.appData.contacts.some(c => c.phone === numero)) throw new Error('Ce numéro existe déjà');
    
    const newContact = {
        id: generateId(), name: `${sanitizeInput(prenom)} ${sanitizeInput(nom)}`, 
        firstName: sanitizeInput(prenom), lastName: sanitizeInput(nom), phone: sanitizeInput(numero),
        lastMessage: "Contact ajouté", time: formatTime(), avatar: getRandomAvatar(prenom, nom),
        unread: 0, online: Math.random() > 0.5, type: 'contact', dateAdded: new Date().toISOString()
    };
    AppState.appData.contacts.push(newContact);
    AppState.appData.messages[newContact.id] = [];
    AppState.saveData();
    renderContacts();
    console.log('Contact ajouté:', newContact);
    return newContact;
};

const createGroup = (nom, description, membres = [], admin = null) => {
    if (!validateName(nom)) throw new Error('Nom du groupe invalide (2-30 caractères, lettres uniquement)');
    if (description && description.length > 200) throw new Error('Description trop longue (max 200 caractères)');
    if (AppState.appData.groups.some(g => g.name.toLowerCase() === nom.toLowerCase())) throw new Error('Un groupe avec ce nom existe déjà');
    if (membres.length > 256) throw new Error('Trop de membres (max 256)');
    
    const newGroup = {
        id: generateId(), name: sanitizeInput(nom), description: sanitizeInput(description), 
        lastMessage: "Groupe créé", time: formatTime(), avatar: "👥", unread: 0, online: false, 
        type: 'group', members: membres, admins: admin ? [admin] : [], 
        dateCreated: new Date().toISOString(), createdBy: AppState.appData.currentUser?.phone || 'unknown'
    };
    AppState.appData.groups.push(newGroup);
    AppState.appData.messages[newGroup.id] = [{
        id: generateId(), text: `Groupe "${nom}" créé`, sender: 'system',
        time: formatTime(), timestamp: Date.now()
    }];
    AppState.saveData();
    renderContacts();
    console.log('Groupe créé:', newGroup);
    return newGroup;
};

// Gestion membres groupe
const addMemberToGroup = (groupId, contactId) => {
    const group = AppState.appData.groups.find(g => g.id === groupId);
    const contact = AppState.appData.contacts.find(c => c.id === contactId && c.type === 'contact');
    if (group && contact && !group.members.includes(contactId)) {
        group.members.push(contactId);
        const systemMessage = { id: generateId(), text: `${contact.name} a été ajouté au groupe`, sender: 'system', time: formatTime(), timestamp: Date.now() };
        AppState.appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        AppState.saveData();
        renderContacts();
        if (AppState.activeChat?.id === groupId) renderMessages(groupId);
        console.log(`Membre ${contact.name} ajouté au groupe ${group.name}`);
    }
};

const removeMemberFromGroup = (groupId, contactId) => {
    const group = AppState.appData.groups.find(g => g.id === groupId);
    const contact = AppState.appData.contacts.find(c => c.id === contactId);
    if (group && contact) {
        group.members = group.members.filter(id => id !== contactId);
        group.admins = group.admins.filter(id => id !== contactId);
        const systemMessage = { id: generateId(), text: `${contact.name} a quitté le groupe`, sender: 'system', time: formatTime(), timestamp: Date.now() };
        AppState.appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        AppState.saveData();
        renderContacts();
        if (AppState.activeChat?.id === groupId) renderMessages(groupId);
        console.log(`Membre ${contact.name} retiré du groupe ${group.name}`);
    }
};

const makeAdmin = (groupId, contactId) => {
    const group = AppState.appData.groups.find(g => g.id === groupId);
    const contact = AppState.appData.contacts.find(c => c.id === contactId);
    if (group && contact && group.members.includes(contactId) && !group.admins.includes(contactId)) {
        group.admins.push(contactId);
        const systemMessage = { id: generateId(), text: `${contact.name} est maintenant administrateur`, sender: 'system', time: formatTime(), timestamp: Date.now() };
        AppState.appData.messages[groupId].push(systemMessage);
        group.lastMessage = systemMessage.text;
        group.time = formatTime();
        AppState.saveData();
        renderContacts();
        if (AppState.activeChat?.id === groupId) renderMessages(groupId);
        console.log(`${contact.name} est maintenant admin du groupe ${group.name}`);
    }
};

// Archivage et blocage
const archiveChat = chatId => { if (!AppState.appData.archived.includes(chatId)) { AppState.appData.archived.push(chatId); AppState.saveData(); renderContacts(); console.log(`Chat ${chatId} archivé`); } };
const unarchiveChat = chatId => { AppState.appData.archived = AppState.appData.archived.filter(id => id !== chatId); AppState.saveData(); renderContacts(); console.log(`Chat ${chatId} désarchivé`); };
const isArchived = chatId => AppState.appData.archived.includes(chatId);
const blockContact = contactId => { if (!AppState.appData.blocked.includes(contactId)) { AppState.appData.blocked.push(contactId); AppState.saveData(); renderContacts(); console.log(`Contact ${contactId} bloqué`); } };
const unblockContact = contactId => { AppState.appData.blocked = AppState.appData.blocked.filter(id => id !== contactId); AppState.saveData(); renderContacts(); console.log(`Contact ${contactId} débloqué`); };
const isBlocked = contactId => AppState.appData.blocked.includes(contactId);

// Connexion avec validation
const handleLogin = () => {
    const phoneInput = document.getElementById('phoneInput');
    const codeInput = document.getElementById('codeInput');
    
    if (AppState.currentStep === 'phone') {
        const phone = phoneInput?.value.trim();
        if (!phone) { showError('phoneInput', 'Numéro requis'); return; }
        if (!validatePhone(phone)) { showError('phoneInput', 'Format de numéro invalide'); return; }
        showVerifyStep(phone);
    } else if (AppState.currentStep === 'verify') {
        const code = codeInput?.value.trim();
        if (!code) { showError('codeInput', 'Code requis'); return; }
        if (!validateCode(code)) { showError('codeInput', 'Code invalide (4-6 chiffres)'); return; }
        AppState.appData.currentUser = { phone: phoneInput?.value }; 
        AppState.saveData();
                    localStorage.setItem('currentUser', JSON.stringify(AppState.appData.currentUser));

        showMainApp(); 
    }
};

const showVerifyStep = phone => {
    AppState.currentStep = 'verify';
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

const logout = () => { AppState.appData.currentUser = null; AppState.saveData();localStorage.removeItem("currentUser"); location.reload(); };

// Expose functions
if (typeof window !== 'undefined') {
    Object.assign(window, {
        addContact, createGroup, addMemberToGroup, removeMemberFromGroup, makeAdmin,
        archiveChat, unarchiveChat, blockContact, unblockContact, handleLogin, logout,
        isArchived, isBlocked, AppState, generateId, formatTime, sanitizeInput, validateText, showError
    });
}


