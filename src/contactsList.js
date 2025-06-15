// Gestion de la liste des contacts
const ContactsList = {
    // Afficher la liste complète des contacts
    showContactsList() {
        const contacts = AppState.appData.contacts || [];
        const groups = AppState.appData.groups || [];
        
        const contactsHtml = contacts.map(contact => `
            <div class="contact-list-item p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="openContactDetails('${contact.id}')">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl font-semibold">
                            ${contact.avatar}
                        </div>
                        ${contact.online ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>' : ''}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800">${contact.name}</h3>
                        <p class="text-sm text-gray-600">${contact.phone}</p>
                        <p class="text-xs text-gray-500">${contact.online ? 'En ligne' : 'Hors ligne'}</p>
                    </div>
                    <div class="flex flex-col items-end space-y-1">
                        <button onclick="event.stopPropagation(); startChatWithContact('${contact.id}')" 
                                class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs transition-colors">
                            <i class="fas fa-comment mr-1"></i>Chat
                        </button>
                        <button onclick="event.stopPropagation(); showContactOptions('${contact.id}')" 
                                class="text-gray-400 hover:text-gray-600 p-1">
                            <i class="fas fa-ellipsis-v text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        const groupsHtml = groups.map(group => `
            <div class="contact-list-item p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="openGroupDetails('${group.id}')">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl">
                        👥
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800">${group.name}</h3>
                        <p class="text-sm text-gray-600">${group.members.length} membre(s)</p>
                        <p class="text-xs text-gray-500">${group.description || 'Aucune description'}</p>
                    </div>
                    <div class="flex flex-col items-end space-y-1">
                        <button onclick="event.stopPropagation(); startChatWithContact('${group.id}')" 
                                class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs transition-colors">
                            <i class="fas fa-comment mr-1"></i>Chat
                        </button>
                        <button onclick="event.stopPropagation(); showContactOptions('${group.id}')" 
                                class="text-gray-400 hover:text-gray-600 p-1">
                            <i class="fas fa-ellipsis-v text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        const content = `
            <div class="space-y-4">
                <!-- Barre de recherche -->
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="contactsSearchInput" placeholder="Rechercher un contact..." 
                           class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                           oninput="filterContactsList()">
                </div>

                <!-- Onglets -->
                <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    <button onclick="showContactsTab('contacts')" id="contacts-tab-contacts" class="contacts-tab active flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors">
                        <i class="fas fa-user mr-2"></i>Contacts (${contacts.length})
                    </button>
                    <button onclick="showContactsTab('groups')" id="contacts-tab-groups" class="contacts-tab flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors">
                        <i class="fas fa-users mr-2"></i>Groupes (${groups.length})
                    </button>
                </div>

                <!-- Liste des contacts -->
                <div id="contacts-list-content" class="max-h-96 overflow-y-auto custom-scrollbar">
                    <div id="contacts-panel" class="contacts-panel">
                        ${contacts.length > 0 ? contactsHtml : '<div class="text-center py-8 text-gray-500">Aucun contact</div>'}
                    </div>
                    <div id="groups-panel" class="contacts-panel hidden">
                        ${groups.length > 0 ? groupsHtml : '<div class="text-center py-8 text-gray-500">Aucun groupe</div>'}
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex space-x-3 pt-4 border-t">
                    <button onclick="showAddContactForm()" class="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                        <i class="fas fa-user-plus mr-2"></i>Ajouter un contact
                    </button>
                    <button onclick="showCreateGroupForm()" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors">
                        <i class="fas fa-users mr-2"></i>Créer un groupe
                    </button>
                    <button onclick="closeModal('contactsListModal')" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors">
                        Fermer
                    </button>
                </div>
            </div>
        `;

        showModal('contactsListModal', 'Contacts et Groupes', content, 'lg');
    },

    // Filtrer la liste des contacts
    filterContacts(searchTerm) {
        const items = document.querySelectorAll('.contact-list-item');
        items.forEach(item => {
            const name = item.querySelector('h3')?.textContent.toLowerCase() || '';
            const phone = item.querySelector('p')?.textContent.toLowerCase() || '';
            const visible = name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
            item.style.display = visible ? 'block' : 'none';
        });
    }
};

// Changer d'onglet dans la liste des contacts
function showContactsTab(tabName) {
    // Masquer tous les panneaux
    document.querySelectorAll('.contacts-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    // Retirer la classe active de tous les onglets
    document.querySelectorAll('.contacts-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Afficher le panneau sélectionné
    const panel = document.getElementById(`${tabName}-panel`);
    if (panel) {
        panel.classList.remove('hidden');
    }
    
    // Activer l'onglet sélectionné
    const tab = document.getElementById(`contacts-tab-${tabName}`);
    if (tab) {
        tab.classList.add('active');
    }
}

// Filtrer la liste des contacts
function filterContactsList() {
    const searchInput = document.getElementById('contactsSearchInput');
    if (searchInput) {
        ContactsList.filterContacts(searchInput.value);
    }
}

// Démarrer un chat avec un contact
function startChatWithContact(contactId) {
    const contact = [...AppState.appData.contacts, ...AppState.appData.groups]
        .find(c => c.id === contactId);
    
    if (contact) {
        closeModal('contactsListModal');
        openChat(contact);
    }
}

// Afficher les détails d'un contact
function openContactDetails(contactId) {
    const contact = AppState.appData.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const content = `
        <div class="space-y-6">
            <!-- Photo et nom -->
            <div class="text-center">
                <div class="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center text-6xl font-bold mx-auto mb-4">
                    ${contact.avatar}
                </div>
                <h2 class="text-2xl font-bold text-gray-800">${contact.name}</h2>
                <p class="text-gray-600">${contact.phone}</p>
                <div class="flex items-center justify-center mt-2">
                    <span class="status-indicator ${contact.online ? 'status-online' : 'status-offline'}"></span>
                    <span class="text-sm text-gray-500 ml-2">${contact.online ? 'En ligne' : 'Hors ligne'}</span>
                </div>
            </div>

            <!-- Informations -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-medium text-gray-800 mb-3">Informations</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Nom complet:</span>
                        <span class="font-medium">${contact.name}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Téléphone:</span>
                        <span class="font-medium">${contact.phone}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Ajouté le:</span>
                        <span class="font-medium">${new Date(contact.dateAdded).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Messages:</span>
                        <span class="font-medium">${AppState.appData.messages[contact.id]?.length || 0}</span>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-2 gap-3">
                <button onclick="startChatWithContact('${contact.id}')" class="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-comment mr-2"></i>Envoyer un message
                </button>
                <button onclick="callContact('${contact.id}')" class="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-phone mr-2"></i>Appeler
                </button>
                <button onclick="blockContact('${contact.id}'); closeModal('contactDetailsModal')" class="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-ban mr-2"></i>Bloquer
                </button>
                <button onclick="closeModal('contactDetailsModal')" class="bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors">
                    Fermer
                </button>
            </div>
        </div>
    `;

    showModal('contactDetailsModal', 'Détails du contact', content, 'md');
}

// Afficher les détails d'un groupe
function openGroupDetails(groupId) {
    const group = AppState.appData.groups.find(g => g.id === groupId);
    if (!group) return;

    const members = group.members.map(memberId => {
        const member = AppState.appData.contacts.find(c => c.id === memberId);
        return member ? member.name : 'Membre inconnu';
    }).join(', ');

    const content = `
        <div class="space-y-6">
            <!-- Photo et nom du groupe -->
            <div class="text-center">
                <div class="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center text-6xl mx-auto mb-4">
                    👥
                </div>
                <h2 class="text-2xl font-bold text-gray-800">${group.name}</h2>
                <p class="text-gray-600">${group.members.length} membre(s)</p>
            </div>

            <!-- Description -->
            ${group.description ? `
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-medium text-gray-800 mb-2">Description</h3>
                    <p class="text-gray-600">${group.description}</p>
                </div>
            ` : ''}

            <!-- Informations -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-medium text-gray-800 mb-3">Informations</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Créé le:</span>
                        <span class="font-medium">${new Date(group.dateCreated).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Créé par:</span>
                        <span class="font-medium">${group.createdBy}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Messages:</span>
                        <span class="font-medium">${AppState.appData.messages[group.id]?.length || 0}</span>
                    </div>
                </div>
            </div>

            <!-- Membres -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-medium text-gray-800 mb-3">Membres</h3>
                <p class="text-sm text-gray-600">${members}</p>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-2 gap-3">
                <button onclick="startChatWithContact('${group.id}')" class="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-comment mr-2"></i>Ouvrir le groupe
                </button>
                <button onclick="showGroupMembers('${group.id}')" class="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-users mr-2"></i>Voir les membres
                </button>
                <button onclick="archiveChat('${group.id}'); closeModal('groupDetailsModal')" class="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-archive mr-2"></i>Archiver
                </button>
                <button onclick="closeModal('groupDetailsModal')" class="bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition-colors">
                    Fermer
                </button>
            </div>
        </div>
    `;

    showModal('groupDetailsModal', 'Détails du groupe', content, 'md');
}

// Appeler un contact (simulation)
function callContact(contactId) {
    const contact = AppState.appData.contacts.find(c => c.id === contactId);
    if (contact) {
        showNotification(`Appel vers ${contact.name}...`, 'info');
        // Ici vous pourriez intégrer une vraie fonctionnalité d'appel
    }
}

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    Object.assign(window, {
        showContactsTab, filterContactsList, startChatWithContact, 
        openContactDetails, openGroupDetails, callContact, ContactsList
    });
}