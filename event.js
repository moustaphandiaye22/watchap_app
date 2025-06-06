// Fonction pour charger le JSON
async function loadData() {
    try {
        const response = await fetch('json.json');
        const data = await response.json();
        // Fusionner avec les données existantes
        window.appData = { ...window.appData, ...data };
        console.log('Données chargées:', window.appData);
    } catch (error) {
        console.log('Erreur lors du chargement du JSON, utilisation des données par défaut');
        // Charger depuis localStorage si disponible
        const saved = localStorage.getItem('whatsappData');
        if (saved) {
            window.appData = { ...window.appData, ...JSON.parse(saved) };
        }
    }
}

// Event listeners principaux
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    
    // === ÉVÉNEMENTS DE CONNEXION ===
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    
    document.getElementById('changeNumberBtn').addEventListener('click', () => {
        currentStep = 'phone';
        document.getElementById('phoneStep').classList.remove('hidden');
        document.getElementById('verifyStep').classList.add('hidden');
        document.getElementById('changeNumberBtn').classList.add('hidden');
        document.getElementById('loginSubtitle').textContent = 'Entrez votre numéro de téléphone';
        document.getElementById('loginBtn').textContent = 'Continuer';
    });
    
    // === ÉVÉNEMENTS DE L'INTERFACE PRINCIPALE ===
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    // Envoi de message avec Entrée
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Mise à jour du bouton d'envoi
    document.getElementById('messageInput').addEventListener('input', updateSendButton);
    
    // === ÉVÉNEMENTS DE RECHERCHE ===
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const contacts = document.querySelectorAll('#contactsList > div');
        
        contacts.forEach(contact => {
            const name = contact.querySelector('h3').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                contact.style.display = 'block';
            } else {
                contact.style.display = 'none';
            }
        });
    });
    
    addQuickActionButtons();
});

// Fonction pour ajouter les boutons d'actions rapides
function addQuickActionButtons() {
    const headerActions = document.querySelector('.bg-gray-50 .flex.space-x-2');
    if (headerActions) {
        // Bouton pour ajouter un contact
        const addContactBtn = document.createElement('button');
        addContactBtn.className = 'p-2 hover:bg-gray-200 rounded-full';
        addContactBtn.title = 'Ajouter un contact (Ctrl+N)';
        addContactBtn.innerHTML = '<i class="fas fa-user-plus text-gray-600"></i>';
        addContactBtn.addEventListener('click', showAddContactForm);
        
        // Bouton pour créer un groupe
        const createGroupBtn = document.createElement('button');
        createGroupBtn.className = 'p-2 hover:bg-gray-200 rounded-full';
        createGroupBtn.title = 'Créer un groupe (Ctrl+G)';
        createGroupBtn.innerHTML = '<i class="fas fa-users text-gray-600"></i>';
        createGroupBtn.addEventListener('click', showCreateGroupForm);
        
        // Bouton pour voir les archivés
        const archivedBtn = document.createElement('button');
        archivedBtn.className = 'p-2 hover:bg-gray-200 rounded-full';
        archivedBtn.title = 'Voir les conversations archivées';
        archivedBtn.innerHTML = '<i class="fas fa-archive text-gray-600"></i>';
        archivedBtn.addEventListener('click', showArchivedChats);
        
        // Bouton pour voir les bloqués
        const blockedBtn = document.createElement('button');
        blockedBtn.className = 'p-2 hover:bg-gray-200 rounded-full';
        blockedBtn.title = 'Voir les contacts bloqués';
        blockedBtn.innerHTML = '<i class="fas fa-ban text-gray-600"></i>';
        blockedBtn.addEventListener('click', showBlockedContacts);
        
        // Insérer les boutons avant les boutons existants
        headerActions.insertBefore(addContactBtn, headerActions.firstChild);
        headerActions.insertBefore(createGroupBtn, headerActions.firstChild);
        headerActions.insertBefore(archivedBtn, headerActions.firstChild);
        headerActions.insertBefore(blockedBtn, headerActions.firstChild);
    }
}

// Fonction pour afficher les conversations archivées
function showArchivedChats() {
    const archivedContacts = appData.contacts.filter(contact => isArchived(contact.id));
    
    if (archivedContacts.length === 0) {
        showNotification('Aucune conversation archivée', 'info');
        return;
    }
    
    const archivedList = archivedContacts.map(contact => `
        <div class="flex items-center justify-between p-3 border-b">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    ${contact.type === 'group' ? '👥' : contact.avatar}
                </div>
                <span class="font-medium">${contact.name}</span>
            </div>
            <button onclick="unarchiveChat('${contact.id}'); closeModal('archivedModal')" 
                    class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                Désarchiver
            </button>
        </div>
    `).join('');
    
    const modalHtml = `
        <div id="archivedModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg w-96 max-h-96 overflow-hidden">
                <div class="p-4 border-b">
                    <h3 class="text-lg font-semibold">Conversations archivées</h3>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    ${archivedList}
                </div>
                <div class="p-4 border-t">
                    <button onclick="closeModal('archivedModal')" 
                            class="w-full bg-gray-300 p-2 rounded">Fermer</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Fonction pour afficher les contacts bloqués
function showBlockedContacts() {
    const blockedContacts = appData.contacts.filter(contact => isBlocked(contact.id));
    
    if (blockedContacts.length === 0) {
        showNotification('Aucun contact bloqué', 'info');
        return;
    }
    
    const blockedList = blockedContacts.map(contact => `
        <div class="flex items-center justify-between p-3 border-b">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    ${contact.avatar}
                </div>
                <span class="font-medium">${contact.name}</span>
            </div>
            <button onclick="unblockContact('${contact.id}'); closeModal('blockedModal')" 
                    class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                Débloquer
            </button>
        </div>
    `).join('');
    
    const modalHtml = `
        <div id="blockedModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg w-96 max-h-96 overflow-hidden">
                <div class="p-4 border-b">
                    <h3 class="text-lg font-semibold">Contacts bloqués</h3>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    ${blockedList}
                </div>
                <div class="p-4 border-t">
                    <button onclick="closeModal('blockedModal')" 
                            class="w-full bg-gray-300 p-2 rounded">Fermer</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Fonction pour afficher les membres d'un groupe
function showGroupMembers(groupId) {
    const group = appData.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const membersList = group.members.map(memberId => {
        const member = appData.contacts.find(c => c.id === memberId);
        if (!member) return '';
        
        const isAdmin = group.admins.includes(memberId);
        const canRemove = group.admins.length > 1 || !isAdmin;
        
        return `
            <div class="flex items-center justify-between p-3 border-b">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        ${member.avatar}
                    </div>
                    <div>
                        <span class="font-medium">${member.name}</span>
                        ${isAdmin ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">Admin</span>' : ''}
                    </div>
                </div>
                <div class="flex space-x-2">
                    ${!isAdmin ? `<button onclick="makeAdmin('${groupId}', '${memberId}'); closeModal('groupMembersModal'); showGroupMembers('${groupId}')" 
                                         class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">
                                    Promouvoir
                                </button>` : ''}
                    ${canRemove ? `<button onclick="removeMemberFromGroup('${groupId}', '${memberId}'); closeModal('groupMembersModal'); showGroupMembers('${groupId}')" 
                                           class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                                    Retirer
                                </button>` : ''}
                </div>
            </div>
        `;
    }).filter(Boolean).join('');
    
    const modalHtml = `
        <div id="groupMembersModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg w-96 max-h-96 overflow-hidden">
                <div class="p-4 border-b">
                    <h3 class="text-lg font-semibold">Membres du groupe "${group.name}"</h3>
                    <p class="text-sm text-gray-600">${group.members.length} membre(s)</p>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    ${membersList}
                </div>
                <div class="p-4 border-t">
                    <button onclick="closeModal('groupMembersModal')" 
                            class="w-full bg-gray-300 p-2 rounded">Fermer</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Fonction pour afficher le formulaire d'ajout de membre
function showAddMemberForm(groupId) {
    const group = appData.groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Contacts qui ne sont pas déjà dans le groupe
    const availableContacts = appData.contacts.filter(contact => 
        contact.type === 'contact' && 
        !group.members.includes(contact.id) && 
        !isBlocked(contact.id)
    );
    
    if (availableContacts.length === 0) {
        showNotification('Tous vos contacts sont déjà dans ce groupe', 'info');
        return;
    }
    
    const contactOptions = availableContacts.map(contact => 
        `<option value="${contact.id}">${contact.name}</option>`
    ).join('');
    
    const modalHtml = `
        <div id="addMemberModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg w-96 p-6">
                <h3 class="text-lg font-semibold mb-4">Ajouter un membre à "${group.name}"</h3>
                <select id="memberToAdd" class="w-full p-3 border rounded mb-4">
                    <option value="">Sélectionner un contact</option>
                    ${contactOptions}
                </select>
                <div class="flex space-x-3">
                    <button onclick="addSelectedMember('${groupId}')" 
                            class="flex-1 bg-green-500 text-white p-3 rounded hover:bg-green-600">
                        Ajouter
                    </button>
                    <button onclick="closeModal('addMemberModal')" 
                            class="flex-1 bg-gray-300 p-3 rounded">
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Fonction pour ajouter le membre sélectionné
function addSelectedMember(groupId) {
    const memberSelect = document.getElementById('memberToAdd');
    const memberId = memberSelect.value;
    
    if (memberId) {
        addMemberToGroup(groupId, memberId);
        closeModal('addMemberModal');
        showNotification('Membre ajouté avec succès', 'success');
    }
}

// Fonction pour afficher les notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'transform 0.3s ease';
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Suppression automatique après 3 secondes
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fonction pour fermer toutes les modales
function closeAllModals() {
    const modals = document.querySelectorAll('[id$="Modal"]');
    modals.forEach(modal => modal.remove());
    
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.remove();
    }
}

// Fonction pour gérer la sélection multiple dans les listes
function handleMultiSelect(selectElement) {
    const options = Array.from(selectElement.selectedOptions);
    const selectedValues = options.map(option => option.value);
    return selectedValues;
}

// Fonction pour filtrer les contacts par statut
function filterContactsByStatus(status) {
    const contactsList = document.getElementById('contactsList');
    const contacts = contactsList.querySelectorAll('div[class*="border-b"]');
    
    contacts.forEach(contactEl => {
        const contactId = contactEl.getAttribute('data-contact-id');
        let shouldShow = false;
        
        switch (status) {
            case 'all':
                shouldShow = !isArchived(contactId) && !isBlocked(contactId);
                break;
            case 'archived':
                shouldShow = isArchived(contactId);
                break;
            case 'blocked':
                shouldShow = isBlocked(contactId);
                break;
            case 'groups':
                const contact = appData.contacts.find(c => c.id === contactId);
                shouldShow = contact && contact.type === 'group' && !isArchived(contactId) && !isBlocked(contactId);
                break;
            case 'contacts':
                const contact2 = appData.contacts.find(c => c.id === contactId);
                shouldShow = contact2 && contact2.type === 'contact' && !isArchived(contactId) && !isBlocked(contactId);
                break;
        }
        
        contactEl.style.display = shouldShow ? 'block' : 'none';
    });
}

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    window.showArchivedChats = showArchivedChats;
    window.showBlockedContacts = showBlockedContacts;
    window.showGroupMembers = showGroupMembers;
    window.showAddMemberForm = showAddMemberForm;
    window.addSelectedMember = addSelectedMember;
    window.showNotification = showNotification;
    window.closeAllModals = closeAllModals;
    window.filterContactsByStatus = filterContactsByStatus;
}