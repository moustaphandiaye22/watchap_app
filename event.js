// Chargement des données JSON
async function loadeData() {
    try {
        const response = await fetch('json.json');
        if (!response.ok) throw new Error('Réponse non OK');
        const data = await response.json();
        // CORRECTION: Utiliser appData global au lieu de window.appData
        appData = { ...appData, ...data };
        console.log('Données chargées :', appData);
    } catch (error) {
        console.warn('Erreur lors du chargement du JSON, utilisation des données locales.', error);
        const saved = localStorage.getItem('whatsappData');
        if (saved) {
            try {
                appData = { ...appData, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Erreur lors de la lecture du localStorage:', e);
                appData = {
                    currentUser: null,
                    contacts: [],
                    groups: [],
                    messages: {},
                    archived: [],
                    blocked: []
                };
            }
        } else {
            appData = {
                currentUser: null,
                contacts: [],
                groups: [],
                messages: {},
                archived: [],
                blocked: []
            };
        }
    }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Connexion
    const loginBtn = document.getElementById('loginBtn');
    const changeNumberBtn = document.getElementById('changeNumberBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (changeNumberBtn) {
        changeNumberBtn.addEventListener('click', () => {
            if (typeof currentStep !== 'undefined') {
                currentStep = 'phone';
            }
            toggleVisibility(['phoneStep'], true);
            toggleVisibility(['verifyStep', 'changeNumberBtn'], false);
            const subtitle = document.getElementById('loginSubtitle');
            const btn = document.getElementById('loginBtn');
            if (subtitle) subtitle.textContent = 'Entrez votre numéro de téléphone';
            if (btn) btn.textContent = 'Continuer';
        });
    }

    // Interface principale
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);

    const input = document.getElementById('messageInput');
    if (input) {
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        input.addEventListener('input', updateSendButton);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#contactsList > div').forEach(contact => {
                const name = contact.querySelector('h3')?.textContent.toLowerCase() || '';
                contact.style.display = name.includes(searchTerm) ? 'block' : 'none';
            });
        });
    }

    addQuickActionButtons();
});

// Ajout des boutons d’actions rapides
function addQuickActionButtons() {
    const header = document.querySelector('.bg-gray-50 .flex.space-x-2');
    if (!header) return;

    const buttons = [
        { icon: 'fa-user-plus', title: 'Ajouter un contact (Ctrl+N)', action: showAddContactForm },
        { icon: 'fa-users', title: 'Créer un groupe (Ctrl+G)', action: showCreateGroupForm },
        { icon: 'fa-archive', title: 'Voir les conversations archivées', action: showArchivedChats },
        { icon: 'fa-ban', title: 'Voir les contacts bloqués', action: showBlockedContacts },
    ];

    buttons.reverse().forEach(({ icon, title, action }) => {
        const btn = document.createElement('button');
        // CORRECTION: Couleur du bouton et de l'icône
        btn.className = 'p-2 bg-green-600 hover:bg-green-700 rounded-full';
        btn.title = title;
        btn.innerHTML = `<i class="fas ${icon} text-white"></i>`; // Icône blanche
        btn.addEventListener('click', action);
        header.insertBefore(btn, header.firstChild);
    });
}

// Modales génériques
function showModal(id, title, contentHtml) {
    const modal = document.getElementById(id);
    if (modal) modal.remove(); // supprime modal existant avec le même ID

    const template = `
        <div id="${id}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg w-96 max-h-96 overflow-hidden">
                <div class="p-4 border-b">
                    <h3 class="text-lg font-semibold">${title}</h3>
                </div>
                <div class="max-h-64 overflow-y-auto">${contentHtml}</div>
                <div class="p-4 border-t">
                    <button onclick="closeModal('${id}')" class="w-full bg-gray-300 p-2 rounded">Fermer</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', template);
}



// Conversations archivées
function showArchivedChats() {
    // CORRECTION: Vérifier appData directement
    if (!appData || !appData.contacts) return;
    
    // CORRECTION: Combiner contacts et groupes archivés
    const allChats = [...appData.contacts, ...appData.groups];
    const archived = allChats.filter(c => isArchived(c.id)) || [];
    
    if (!archived.length) return showNotification('Aucune conversation archivée', 'info');

    const html = archived.map(c => `
        <div class="flex items-center justify-between p-3 border-b">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">${c.type === 'group' ? '👥' : c.avatar}</div>
                <span class="font-medium">${c.name}</span>
            </div>
            <button onclick="unarchiveChat('${c.id}'); closeModal('archivedModal'); renderContacts()" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Désarchiver</button>
        </div>`).join('');

    showModal('archivedModal', 'Conversations archivées', html);
}

// Contacts bloqués
function showBlockedContacts() {
    if (!appData || !appData.groups) return;
    const blocked = appData.contacts?.filter(c => isBlocked(c.id)) || [];
    if (!blocked.length) return showNotification('Aucun contact bloqué', 'info');

    const html = blocked.map(c => `
        <div class="flex items-center justify-between p-3 border-b">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">${c.avatar}</div>
                <span class="font-medium">${c.name}</span>
            </div>
            <button onclick="unblockContact('${c.id}'); closeModal('blockedModal')" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Débloquer</button>
        </div>`).join('');

    showModal('blockedModal', 'Contacts bloqués', html);
}

// Membres d’un groupe
function showGroupMembers(groupId) {
       
    if (!appData || !appData.groups) return;
    const group = appData.groups?.find(g => g.id === groupId);
    if (!group) return;

    const members = group.members.map(id => {
        const m = appData.contacts?.find(c => c.id === id);
        if (!m) return '';
        const admin = group.admins.includes(id);
        const removable = group.admins.length > 1 || !admin;

        return `
            <div class="flex items-center justify-between p-3 border-b">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">${m.avatar}</div>
                    <div>
                        <span class="font-medium">${m.name}</span>
                        ${admin ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">Admin</span>' : ''}
                    </div>
                </div>
                <div class="flex space-x-2">
                    ${!admin ? `<button onclick="makeAdmin('${groupId}', '${id}'); closeModal('groupMembersModal'); showGroupMembers('${groupId}')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Promouvoir</button>` : ''}
                    ${removable ? `<button onclick="removeMemberFromGroup('${groupId}', '${id}'); closeModal('groupMembersModal'); showGroupMembers('${groupId}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Retirer</button>` : ''}
                </div>
            </div>`;
    }).filter(Boolean).join('');

    const title = `Membres du groupe "${group.name}"<p class="text-sm text-gray-600">${group.members.length} membre(s)</p>`;
    showModal('groupMembersModal', title, members);
}

// Formulaire d'ajout de membre
function showAddMemberForm(groupId) {
    const group = appData.groups?.find(g => g.id === groupId);
    if (!group) return;

    const contacts = appData.contacts?.filter(c => c.type === 'contact' && !group.members.includes(c.id) && !isBlocked(c.id)) || [];
    if (!contacts.length) return showNotification('Tous vos contacts sont déjà dans ce groupe', 'info');

    const options = contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const html = `
        <div class="bg-white rounded-lg w-96 p-6">
            <h3 class="text-lg font-semibold mb-4">Ajouter un membre à "${group.name}"</h3>
            <select id="memberToAdd" class="w-full p-3 border rounded mb-4">
                <option value="">Sélectionner un contact</option>
                ${options}
            </select>
            <div class="flex space-x-3">
                <button onclick="addSelectedMember('${groupId}')" class="flex-1 bg-green-500 text-white p-3 rounded hover:bg-green-600">Ajouter</button>
                <button onclick="closeModal('addMemberModal')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', `<div id="addMemberModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">${html}</div>`);
}

function addSelectedMember(groupId) {
    const select = document.getElementById('memberToAdd');
    if (select && select.value) {
        addMemberToGroup(groupId, select.value);
        closeModal('addMemberModal');
        showNotification('Membre ajouté avec succès', 'success');
    }
}

// Notifications
function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
    }`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// Cacher/afficher des éléments
function toggleVisibility(ids, show = true) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !show);
    });
}
