// Initialisation au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
    AppState.loadData(); // Utilisation de la fonction de chargement centralisée

    // Connexion
    const loginBtn = document.getElementById("loginBtn");
    const changeNumberBtn = document.getElementById("changeNumberBtn");
    if (loginBtn) loginBtn.addEventListener("click", handleLogin);
    if (changeNumberBtn) {
        changeNumberBtn.addEventListener("click", () => {
            AppState.currentStep = "phone"; // Accès via AppState
            toggleVisibility(["phoneStep"], true);
            toggleVisibility(["verifyStep", "changeNumberBtn"], false);
            const subtitle = document.getElementById("loginSubtitle");
            const btn = document.getElementById("loginBtn");
            if (subtitle) subtitle.textContent = "Entrez votre numéro de téléphone";
            if (btn) btn.textContent = "Continuer";
        
        });
        const currentUser= localStorage.getItem("currentUser")
        if(currentUser) showMainApp();
    }

    // Interface principale
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);

    const input = document.getElementById("messageInput");
    if (input) {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        input.addEventListener("input", updateSendButton);
    }

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

    addQuickActionButtons();
});

// Ajout des boutons d’actions rapides
function addQuickActionButtons() {
    const header = document.querySelector(".bg-gray-50 .flex.space-x-2");
    if (!header) return;

    const buttons = [
        { icon: "fa-user-plus", title: "Ajouter un contact (Ctrl+N)", action: showAddContactForm },
        { icon: "fa-users", title: "Créer un groupe (Ctrl+G)", action: showCreateGroupForm },
        { icon: "fa-archive", title: "Voir les conversations archivées", action: showArchivedChats },
        { icon: "fa-ban", title: "Voir les contacts bloqués", action: showBlockedContacts },
    ];

    buttons.reverse().forEach(({ icon, title, action }) => {
        const btn = document.createElement("button");

        btn.className = "p-2 bg-green-600 hover:bg-green-700 rounded-full";
        btn.title = title;
        btn.innerHTML = `<i class="fas ${icon} text-gray-300"></i>`; // Icône blanche
        btn.addEventListener("click", action);
        header.insertBefore(btn, header.firstChild);
    });
}

// Modales génériques
function showModal(id, title, content, size = 'md') {
    // Fermer toute modal existante
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

    // Fermer en cliquant à l'extérieur
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
        .map(
            (c) => `
        <div class="flex items-center justify-between p-3 border-b">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">${c.type === "group" ? "👥" : c.avatar}</div>
                <span class="font-medium">${c.name}</span>
            </div>
            <button onclick="unarchiveChat(\'${c.id}\'); closeModal(\'archivedModal\'); renderContacts()" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Désarchiver</button>
        </div>`
        )
        .join("");

    showModal("archivedModal", "Conversations archivées", html);
}

// Contacts bloqués
function showBlockedContacts() {
    if (!AppState.appData || !AppState.appData.groups) return;
    const blocked = AppState.appData.contacts?.filter((c) => isBlocked(c.id)) || [];
    if (!blocked.length) return showNotification("Aucun contact bloqué", "info");

    const html = blocked
        .map(
            (c) => `
        <div class="flex items-center justify-between p-3 border-b">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">${c.avatar}</div>
                <span class="font-medium">${c.name}</span>
            </div>
            <button onclick="unblockContact(\'${c.id}\'); closeModal(\'blockedModal\')" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Débloquer</button>
        </div>`
        )
        .join("");

    showModal("blockedModal", "Contacts bloqués", html);
}

// Membres d’un groupe
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
                    <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">${m.avatar}</div>
                    <div>
                        <span class="font-medium">${m.name}</span>
                        ${admin ? 
                            "<span class=\"text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2\">Admin</span>" : 
                            ""}
                    </div>
                </div>
                <div class="flex space-x-2">
                    ${!admin ? 
                        `<button onclick="makeAdmin(\'${groupId}\', \'${id}\'); closeModal(\'groupMembersModal\'); showGroupMembers(\'${groupId}\')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Promouvoir</button>` : 
                        ""}
                    ${removable ? 
                        `<button onclick="removeMemberFromGroup(\'${groupId}\', \'${id}\'); closeModal(\'groupMembersModal\'); showGroupMembers(\'${groupId}\')" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Retirer</button>` : 
                        ""}
                </div>
            </div>`;
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
        <div class="bg-white rounded-lg w-96 p-6">
            <h3 class="text-lg font-semibold mb-4">Ajouter un membre à "${group.name}"</h3>
            <select id="memberToAdd" class="w-full p-3 border rounded mb-4">
                <option value="">Sélectionner un contact</option>
                ${options}
            </select>
            <div class="flex space-x-3">
                <button onclick="addSelectedMember(\'${groupId}\')" class="flex-1 bg-green-500 text-white p-3 rounded hover:bg-green-600">Ajouter</button>
                <button onclick="closeModal(\'addMemberModal\')" class="flex-1 bg-gray-300 p-3 rounded">Annuler</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML("beforeend", `<div id="addMemberModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">${html}</div>`);
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
    const n = document.createElement("div");
    n.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        type === "success" ? "bg-green-500 text-white" :
        type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
    }`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// Cacher/afficher des éléments
function toggleVisibility(ids, show = true) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", !show);
    });
}

// Expose functions to global scope for HTML inline event handlers
if (typeof window !== 'undefined') {
    Object.assign(window, {
        showModal, showArchivedChats, showBlockedContacts, showGroupMembers,
        showAddMemberForm, addSelectedMember, showNotification, toggleVisibility
    });
}

