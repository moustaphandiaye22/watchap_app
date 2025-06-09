// Variables globales
let broadcastMode = false, selectedContacts = new Set(), isDarkTheme = false;
const cache = {};

// Utilitaires
const $ = id => cache[id] ||= document.getElementById(id);
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

// Gestion du thème
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark', isDarkTheme);
    safe(() => localStorage.setItem('whatsappTheme', isDarkTheme ? 'dark' : 'light'));
    const icon = $('themeIcon');
    if (icon) icon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
}

function loadTheme() {
    isDarkTheme = safe(() => localStorage.getItem('whatsappTheme'), 'light') === 'dark';
    document.body.classList.toggle('dark', isDarkTheme);
    const icon = $('themeIcon');
    if (icon) icon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
}

// Gestion diffusion
function toggleBroadcastMode() {
    broadcastMode = !broadcastMode;
    selectedContacts.clear();
    
    const btn = $('broadcastBtn'), panel = $('broadcastPanel'), chat = $('chatArea');
    const welcome = $('welcomeScreen'), title = $('welcomeTitle'), subtitle = $('welcomeSubtitle');
    
    if (broadcastMode) {
        btn?.classList.replace('bg-gray-200', 'bg-blue-500');
        btn?.classList.replace('text-gray-600', 'text-white');
        panel?.classList.remove('hidden');
        chat?.classList.add('hidden');
        welcome?.classList.remove('hidden');
        if (title) title.textContent = 'Mode Diffusion';
        if (subtitle) subtitle.textContent = 'Sélectionnez les contacts pour diffuser votre message';
        updateMessageInput();
        renderContacts();
    } else {
        btn?.classList.replace('bg-blue-500', 'bg-gray-200');
        btn?.classList.replace('text-white', 'text-gray-600');
        panel?.classList.add('hidden');
        resetMessageInput();
        window.renderContacts?.();
        window.activeChat = null;
    }
    updateBroadcastButton();
}

function updateMessageInput() {
    const input = $('messageInput');
    const btn = document.querySelector('[onclick="sendMessage()"]');
    if (input) input.placeholder = `Diffuser un message (${selectedContacts.size} contact(s) sélectionné(s))`;
    btn?.setAttribute('onclick', broadcastMode ? 'sendBroadcastMessage()' : 'sendMessage()');
}

function resetMessageInput() {
    const input = $('messageInput');
    const btn = document.querySelector('[onclick="sendBroadcastMessage()"]');
    if (input) input.placeholder = 'Tapez votre message...';
    btn?.setAttribute('onclick', 'sendMessage()');
}

// function renderContacts() {
//     const list = $('contactsList');
//     if (!list || !window.appData?.contacts) return;
    
//     const contacts = window.appData.contacts.filter(c => 
//         !(window.isArchived?.(c.id) || window.isBlocked?.(c.id))
//     );
    
//     list.innerHTML = contacts.map(contact => {
//         const selected = selectedContacts.has(contact.id);
//         const icon = contact.type === 'group' ? '👥' : (contact.avatar || '👤');
//         const check = selected ? 'fas fa-check-circle text-blue-500' : 'far fa-circle text-gray-400';
//         const info = contact.type === 'group' ? 
//             `Groupe • ${window.appData.groups?.find(g => g.id === contact.id)?.members.length || 0} membres` :
//             contact.phone || '';
        
//         return `<div class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selected ? 'bg-blue-50 border-r-4 border-blue-500' : ''} dark:border-gray-700 dark:hover:bg-gray-700 dark:bg-gray-800" onclick="toggleContactSelection('${contact.id}')">
//             <div class="flex items-center space-x-3">
//                 <i class="${check} text-lg"></i>
//                 <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl dark:bg-gray-600">${icon}</div>
//                 <div class="flex-1 min-w-0">
//                     <h3 class="font-semibold text-gray-800 truncate dark:text-gray-200">${contact.name || 'Contact'}</h3>
//                     <p class="text-sm text-gray-600 truncate dark:text-gray-400">${info}</p>
//                 </div>
//             </div>
//         </div>`;
//     }).join('');
// }

function toggleContactSelection(contactId) {
    selectedContacts[selectedContacts.has(contactId) ? 'delete' : 'add'](contactId);
    renderContacts();
    updateMessageInput();
    updateBroadcastButton();
}

function updateBroadcastButton() {
    const btn = $('broadcastBtn');
    if (btn) {
        const count = selectedContacts.size;
        const text = broadcastMode && count > 0 ? `Diffusion (${count})` : 'Diffusion';
        btn.innerHTML = `<i class="fas fa-broadcast-tower mr-2"></i>${text}`;
    }
}

function sendBroadcastMessage() {
    const input = $('messageInput');
    const text = input?.value.trim();
    if (!text || !selectedContacts.size || !window.appData) return;
    
    const timestamp = Date.now();
    const time = window.formatTime?.() || new Date().toLocaleTimeString();
    
    selectedContacts.forEach(contactId => {
        if (!window.appData.messages[contactId]) window.appData.messages[contactId] = [];
        
        window.appData.messages[contactId].push({
            id: window.generateId?.() || Date.now() + Math.random(),
            text, sender: 'me', time, timestamp, broadcast: true
        });
        
        const contact = window.appData.contacts.find(c => c.id === contactId);
        if (contact) Object.assign(contact, { lastMessage: text, time });
    });
    
    window.saveData?.();
    renderContacts();
    input.value = '';
    
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = `Message diffusé à ${selectedContacts.size} contact(s)`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function selectAllContacts() {
    if (!window.appData?.contacts) return;
    window.appData.contacts
        .filter(c => !(window.isArchived?.(c.id) || window.isBlocked?.(c.id)))
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
    
    if (openMenu && openMenu !== menuId) $(openMenu)?.classList.add('hidden');
    
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    openMenu = isOpen ? null : menuId;
    
    if (openMenu) {
        setTimeout(() => {
            const closeOnClick = e => {
                if (!menu.contains(e.target) && !e.target.closest(`[onclick*="${menuId}"]`)) {
                    menu.classList.add('hidden');
                    openMenu = null;
                    document.removeEventListener('click', closeOnClick);
                }
            };
            document.addEventListener('click', closeOnClick);
        }, 10);
    }
}

// Actions des menus
const menuActions = {
    createBroadcastList: () => console.log('Créer une nouvelle liste de diffusion'),
    manageBroadcastLists: () => console.log('Gérer les listes de diffusion'),
    setTheme: theme => { console.log('Changer le thème vers:', theme); if ((theme === 'dark') !== isDarkTheme) toggleTheme(); },
    openProfile: () => console.log('Ouvrir le profil'),
    openSettings: () => console.log('Ouvrir les paramètres'),
    openNotifications: () => console.log('Ouvrir les notifications'),
    openPrivacy: () => console.log('Ouvrir la confidentialité'),
    openHelp: () => console.log('Ouvrir l\'aide')
};

Object.entries(menuActions).forEach(([name, fn]) => {
    window[name] = (...args) => { fn(...args); $('broadcastMenu')?.classList.add('hidden'); $('themeMenu')?.classList.add('hidden'); $('settingsMenu')?.classList.add('hidden'); openMenu = null; };
});

// CSS et initialisation
const darkCSS = `.dark{background-color:#1f2937;color:#f9fafb}.dark .bg-white{background-color:#374151!important;color:#f9fafb}.dark .bg-gray-50{background-color:#4b5563!important}.dark .bg-gray-100{background-color:#6b7280!important}.dark .bg-gray-200{background-color:#9ca3af!important}.dark .text-gray-800{color:#f9fafb!important}.dark .text-gray-600{color:#d1d5db!important}.dark .text-gray-500{color:#9ca3af!important}.dark .border-gray-100{border-color:#4b5563!important}.dark .border-gray-200{border-color:#6b7280!important}.dark input,.dark textarea,.dark select{background-color:#4b5563!important;color:#f9fafb!important;border-color:#6b7280!important}.dark .shadow-sm{box-shadow:0 1px 2px 0 rgba(0,0,0,0.3)!important}`;

function init() {
    if (!$('darkThemeStyles')) {
        const style = document.createElement('style');
        style.id = 'darkThemeStyles';
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
if (typeof window !== 'undefined') {
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
}