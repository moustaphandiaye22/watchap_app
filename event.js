// Initialisation des événements
document.addEventListener("DOMContentLoaded", () => {
    AppState.loadData();

    // Vérifier si l'utilisateur est déjà connecté
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
        try {
            AppState.appData.currentUser = JSON.parse(currentUser);
            showMainApp();
        } catch (e) {
            console.error('Erreur lors du chargement de l\'utilisateur:', e);
        }
    }

    // Événements de connexion
    const loginBtn = document.getElementById("loginBtn");
    const changeNumberBtn = document.getElementById("changeNumberBtn");
    
    if (loginBtn) loginBtn.addEventListener("click", handleLogin);
    
    if (changeNumberBtn) {
        changeNumberBtn.addEventListener("click", () => {
            AppState.currentStep = "phone";
            toggleVisibility(["phoneStep"], true);
            toggleVisibility(["verifyStep", "changeNumberBtn"], false);
            const subtitle = document.getElementById("loginSubtitle");
            const btn = document.getElementById("loginBtn");
            if (subtitle) subtitle.textContent = "Entrez votre numéro de téléphone";
            if (btn) btn.textContent = "Continuer";
        });
    }

    // Événements de l'interface principale
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);

    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (broadcastMode) {
                    sendBroadcastMessage();
                } else {
                    sendMessage();
                }
            }
        });
        messageInput.addEventListener("input", updateSendButton);
    }

    // Recherche de contacts
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll("#contactsList > div").forEach((contact) => {
                const name = contact.querySelector("h3")?.textContent.toLowerCase() || "";
                contact.style.display = name.includes(searchTerm) ? "block" : "none";
            });
        });
    }

    // Filtres de contacts
    setupContactFilters();
    addQuickActionButtons();
});

// Configuration des filtres de contacts
function setupContactFilters() {
    const filterButtons = {
        'allButton': () => true,
        'readButton': (contact) => contact.unread === 0,
        'unreadButton': (contact) => contact.unread > 0,
        'groupButton': (contact) => contact.type === 'group'
    };

    Object.keys(filterButtons).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                // Retirer la classe active de tous les boutons
                Object.keys(filterButtons).forEach(id => {
                    document.getElementById(id)?.classList.remove('active');
                });
                
                // Ajouter la classe active au bouton cliqué
                button.classList.add('active');
                
                // Appliquer le filtre
                filterContacts(filterButtons[buttonId]);
            });
        }
    });
}

// Filtrage des contacts
function filterContacts(filterFn) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;

    const contacts = contactsList.querySelectorAll('.contact-item');
    contacts.forEach(contactEl => {
        const contactId = contactEl.dataset.contactId;
        if (!contactId) return;

        const contact = [...AppState.appData.contacts, ...AppState.appData.groups]
            .find(c => c.id === contactId);
        
        if (contact && filterFn(contact)) {
            contactEl.style.display = 'block';
        } else {
            contactEl.style.display = 'none';
        }
    });
}

// Ajout des boutons d'actions rapides
function addQuickActionButtons() {
    const header = document.querySelector(".whatsapp-gray .flex.items-center.space-x-2");
    if (!header) return;

    const buttons = [
        { icon: "fa-archive", title: "Voir les conversations archivées", action: showArchivedChats },
        { icon: "fa-ban", title: "Voir les contacts bloqués", action: showBlockedContacts },
    ];

    buttons.reverse().forEach(({ icon, title, action }) => {
        const btn = document.createElement("button");
        btn.className = "p-2 hover:bg-gray-200 rounded-full transition-colors duration-150";
        btn.title = title;
        btn.innerHTML = `<i class="fas ${icon} text-gray-600"></i>`;
        btn.addEventListener("click", action);
        header.appendChild(btn);
    });
}

// Modales génériques
function showModal(id, title, content, size = 'md') {
    const existingModal = document.getElementById(id);
    if (existingModal) existingModal.remove();

    const sizeClasses = {
        'sm': 'w-80 max-w-sm',
        'md': 'w-96 max-w-md', 
        'lg': 'w-[32rem] max-w-2xl',
        'xl': 'w-[40rem] max-w-4xl'
    };

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="${sizeClasses[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
            <div class="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-500 to-green-600">
                <h3 class="text-xl font-semibold text-white">${title}</h3>
                <button onclick="closeModal('${id}')" class="text-white/80 hover:text-white text-xl transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(id);
    });
}

// Conversations archivées
function showArchivedChats() {
    if (!AppState.appData || !AppState.appData.contacts) return;

    const allChats = [...AppState.appData.contacts, ...AppState.appData.groups];
    const archived = allChats.filter((c) => isArchived(c.id)) || [];

    if (!archived.length) return showNotification("Aucune conversation archivée", "info");

    const html = archived
        .map((c) => `
            <div class="flex items-center justify-between p-3 border-b">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        ${c.type === "group" ? "👥" : c.avatar}
                    </div>
                    <span class="font-medium">${c.name}</span>
                </div>
                <button onclick="unarchiveChat('${c.id}'); closeModal('archivedModal'); renderContacts()" 
                        class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    Désarchiver
                </button>
            </div>
        `)
        .join("");

    showModal("archivedModal", "Conversations archivées", html);
}

// Contacts bloqués
function showBlockedContacts() {
    if (!AppState.appData || !AppState.appData.contacts) return;
    
    const blocked = AppState.appData.contacts?.filter((c) => isBlocked(c.id)) || [];
    if (!blocked.length) return showNotification("Aucun contact bloqué", "info");

    const html = blocked
        .map((c) => `
            <div class="flex items-center justify-between p-3 border-b">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        ${c.avatar}
                    </div>
                    <span class="font-medium">${c.name}</span>
                </div>
                <button onclick="unblockContact('${c.id}'); closeModal('blockedModal')" 
                        class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                    Débloquer
                </button>
            </div>
        `)
        .join("");

    showModal("blockedModal", "Contacts bloqués", html);
}

// Membres d'un groupe
function showGroupMembers(groupId) {
    if (!AppState.appData || !AppState.appData.groups) return;
    
    const group = AppState.appData.groups?.find((g) => g.id === groupId);
    if (!group) return;

    const members = group.members
        .map((id) => {
            const m = AppState.appData.contacts?.find((c) => c.id === id);
            if (!m) return "";
            
            const admin = group.admins.includes(id);
            const removable = group.admins.length > 1 || !admin;

            return `
                <div class="flex items-center justify-between p-3 border-b">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            ${m.avatar}
                        </div>
                        <div>
                            <span class="font-medium">${m.name}</span>
                            ${admin ? 
                                '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">Admin</span>' : 
                                ''}
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        ${!admin ? 
                            `<button onclick="makeAdmin('${groupId}', '${id}'); closeModal('groupMembersModal'); showGroupMembers('${groupId}')" 
                                     class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">
                                Promouvoir
                             </button>` : ''}
                        ${removable ? 
                            `<button onclick="removeMemberFromGroup('${groupId}', '${id}'); closeModal('groupMembersModal'); showGroupMembers('${groupId}')" 
                                     class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                                Retirer
                             </button>` : ''}
                    </div>
                </div>
            `;
        })
        .filter(Boolean)
        .join("");

    const title = `Membres du groupe "${group.name}"<p class="text-sm text-gray-600">${group.members.length} membre(s)</p>`;
    showModal("groupMembersModal", title, members);
}

// Formulaire d'ajout de membre
function showAddMemberForm(groupId) {
    const group = AppState.appData.groups?.find((g) => g.id === groupId);
    if (!group) return;

    const contacts = AppState.appData.contacts?.filter(
        (c) => c.type === "contact" && !group.members.includes(c.id) && !isBlocked(c.id)
    ) || [];
    
    if (!contacts.length) return showNotification("Tous vos contacts sont déjà dans ce groupe", "info");

    const options = contacts.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    const html = `
        <div class="space-y-4">
            <h3 class="text-lg font-semibold">Ajouter un membre à "${group.name}"</h3>
            <select id="memberToAdd" class="w-full p-3 border rounded">
                <option value="">Sélectionner un contact</option>
                ${options}
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
    `;
    
    showModal('addMemberModal', 'Ajouter un membre', html);
}

function addSelectedMember(groupId) {
    const select = document.getElementById("memberToAdd");
    if (select && select.value) {
        addMemberToGroup(groupId, select.value);
        closeModal("addMemberModal");
        showNotification("Membre ajouté avec succès", "success");
    }
}

// Notifications
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        type === "success" ? "bg-green-500 text-white" :
        type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Utilitaires d'affichage
function toggleVisibility(ids, show = true) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", !show);
    });
}

// Fermeture de modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    Object.assign(window, {
        showModal, showArchivedChats, showBlockedContacts, showGroupMembers,
        showAddMemberForm, addSelectedMember, showNotification, toggleVisibility,
        closeModal
    });
}