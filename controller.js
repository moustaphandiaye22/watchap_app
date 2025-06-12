// Variables globales
let broadcastMode = false, selectedContacts = new Set(), isDarkTheme = false;
const cache = {};

// Utilitaires
const $ = id => cache[id] ||= document.getElementById(id);
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

// Gestion du thème
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle("dark", isDarkTheme);
    safe(() => localStorage.setItem("whatsappTheme", isDarkTheme ? "dark" : "light"));
    const icon = $("themeIcon");
    if (icon) icon.className = isDarkTheme ? "fas fa-sun" : "fas fa-moon";
}

function loadTheme() {
    isDarkTheme = safe(() => localStorage.getItem("whatsappTheme"), "light") === "dark";
    document.body.classList.toggle("dark", isDarkTheme);
    const icon = $("themeIcon");
    if (icon) icon.className = isDarkTheme ? "fas fa-sun" : "fas fa-moon";
}

// Gestion diffusion
function toggleBroadcastMode() {
    broadcastMode = !broadcastMode;
    selectedContacts.clear();
    
    const btn = $("broadcastBtn"), panel = $("broadcastPanel"), chat = $("chatArea");
    const welcome = $("welcomeScreen"), title = $("welcomeTitle"), subtitle = $("welcomeSubtitle");
    
    if (broadcastMode) {
        btn?.classList.replace("bg-gray-200", "bg-blue-500");
        btn?.classList.replace("text-gray-600", "text-white");
        panel?.classList.remove("hidden");
        chat?.classList.add("hidden");
        welcome?.classList.remove("hidden");
        if (title) title.textContent = "Mode Diffusion";
        if (subtitle) subtitle.textContent = "Sélectionnez les contacts pour diffuser votre message";
        updateMessageInput();
        renderContacts();
    } else {
        btn?.classList.replace("bg-blue-500", "bg-gray-200");
        btn?.classList.replace("text-white", "text-gray-600");
        panel?.classList.add("hidden");
        resetMessageInput();
        renderContacts(); // Utilisation de la fonction globale
        AppState.activeChat = null; // Accès via AppState
    }
    updateBroadcastButton();
}

function updateMessageInput() {
    const input = $("messageInput");
    const btn = document.querySelector("[onclick=\"sendMessage()\"]");
    if (input) input.placeholder = `Diffuser un message (${selectedContacts.size} contact(s) sélectionné(s))`;
    btn?.setAttribute("onclick", broadcastMode ? "sendBroadcastMessage()" : "sendMessage()");
}

function resetMessageInput() {
    const input = $("messageInput");
    const btn = document.querySelector("[onclick=\"sendBroadcastMessage()\"]");
    if (input) input.placeholder = "Tapez votre message...";
    btn?.setAttribute("onclick", "sendMessage()");
}

function toggleContactSelection(contactId) {
    selectedContacts[selectedContacts.has(contactId) ? "delete" : "add"](contactId);
    renderContacts();
    updateMessageInput();
    updateBroadcastButton();
}

function updateBroadcastButton() {
    const btn = $("broadcastBtn");
    if (btn) {
        const count = selectedContacts.size;
        const text = broadcastMode && count > 0 ? `Diffusion (${count})` : "Diffusion";
        btn.innerHTML = `<i class="fas fa-broadcast-tower mr-2"></i>${text}`;
    }
}

function sendBroadcastMessage() {
    const input = $("messageInput");
    const text = input?.value.trim();
    if (!text || !selectedContacts.size || !AppState.appData) return;
    
    const timestamp = Date.now();
    const time = formatTime();
    
    selectedContacts.forEach(contactId => {
        if (!AppState.appData.messages[contactId]) AppState.appData.messages[contactId] = [];
        
        AppState.appData.messages[contactId].push({
            id: generateId(),
            text, sender: "me", time, timestamp, broadcast: true
        });
        
        const contact = AppState.appData.contacts.find(c => c.id === contactId);
        if (contact) Object.assign(contact, { lastMessage: text, time });
    });
    
    AppState.saveData();
    renderContacts();
    input.value = "";
    
    const notification = document.createElement("div");
    notification.className = "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50";
    notification.textContent = `Message diffusé à ${selectedContacts.size} contact(s)`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function selectAllContacts() {
    if (!AppState.appData?.contacts) return;
    AppState.appData.contacts
        .filter(c => !(isArchived(c.id) || isBlocked(c.id)))
        .forEach(c => selectedContacts.add(c.id));
    renderContacts();
    updateMessageInput();
    updateBroadcastButton();
}

function deselectAllContacts() {
    selectedContacts.clear();
    renderContacts();
    updateMessageInput();
    updateBroadcastButton();
}

// Gestion des menus
let openMenu = null;
function toggleDropdown(menuId) {
    const menu = $(menuId);
    if (!menu) return;
    
    if (openMenu && openMenu !== menuId) $(openMenu)?.classList.add("hidden");
    
    const isOpen = !menu.classList.contains("hidden");
    menu.classList.toggle("hidden");
    openMenu = isOpen ? null : menuId;
    
    if (openMenu) {
        setTimeout(() => {
            const closeOnClick = e => {
                if (!menu.contains(e.target) && !e.target.closest(`[onclick*=\"${menuId}\"]`)) {
                    menu.classList.add("hidden");
                    openMenu = null;
                    document.removeEventListener("click", closeOnClick);
                }
            };
            document.addEventListener("click", closeOnClick);
        }, 10);
    }
}



// Object.entries(menuActions).forEach(([name, fn]) => {
//     window[name] = (...args) => { fn(...args); $("broadcastMenu")?.classList.add("hidden"); $("themeMenu")?.classList.add("hidden"); $("settingsMenu")?.classList.add("hidden"); openMenu = null; };
// });

// CSS et initialisation
const darkCSS = `.dark{background-color:#1f2937;color:#f9fafb}.dark .bg-white{background-color:#374151!important;color:#f9fafb}.dark .bg-gray-50{background-color:#4b5563!important}.dark .bg-gray-100{background-color:#6b7280!important}.dark .bg-gray-200{background-color:#9ca3af!important}.dark .text-gray-800{color:#f9fafb!important}.dark .text-gray-600{color:#d1d5db!important}.dark .text-gray-500{color:#9ca3af!important}.dark .border-gray-100{border-color:#4b5563!important}.dark .border-gray-200{border-color:#6b7280!important}.dark input,.dark textarea,.dark select{background-color:#4b5563!important;color:#f9fafb!important;border-color:#6b7280!important}.dark .shadow-sm{box-shadow:0 1px 2px 0 rgba(0,0,0,0.3)!important}`;

function init() {
    if (!$("darkThemeStyles")) {
        const style = document.createElement("style");
        style.id = "darkThemeStyles";
        style.textContent = darkCSS;
        document.head.appendChild(style);
    }
    loadTheme();
    
    // Exposer les fonctions globalement
    Object.assign(window, {
        toggleBroadcastMode, sendBroadcastMessage, selectAllContacts, deselectAllContacts,
        toggleTheme, loadTheme, toggleDropdown, toggleContactSelection
    });
}

// Initialisation
if (typeof window !== "undefined") {
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
}


