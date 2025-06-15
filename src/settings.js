// Gestion des paramètres
const Settings = {
    // Paramètres par défaut
    defaultSettings: {
        notifications: {
            enabled: true,
            sound: true,
            desktop: true,
            preview: true
        },
        privacy: {
            lastSeen: 'everyone',
            profilePhoto: 'everyone',
            about: 'everyone',
            status: 'everyone',
            readReceipts: true,
            groups: 'everyone'
        },
        chat: {
            enterToSend: true,
            fontSize: 'medium',
            wallpaper: 'default',
            mediaAutoDownload: true,
            archiveChats: false
        },
        security: {
            twoStepVerification: false,
            showSecurityNotifications: true
        },
        storage: {
            autoDeleteMessages: false,
            deleteAfterDays: 30
        }
    },

    // Obtenir les paramètres actuels
    getCurrentSettings() {
        const saved = localStorage.getItem('whatsappSettings');
        if (saved) {
            try {
                return { ...this.defaultSettings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Erreur lors du chargement des paramètres:', e);
            }
        }
        return this.defaultSettings;
    },

    // Sauvegarder les paramètres
    saveSettings(settings) {
        try {
            localStorage.setItem('whatsappSettings', JSON.stringify(settings));
            this.applySettings(settings);
            showNotification('Paramètres sauvegardés', 'success');
        } catch (e) {
            console.error('Erreur lors de la sauvegarde des paramètres:', e);
            showNotification('Erreur lors de la sauvegarde', 'error');
        }
    },

    // Appliquer les paramètres
    applySettings(settings) {
        // Appliquer la taille de police
        document.documentElement.style.setProperty('--chat-font-size', 
            settings.chat.fontSize === 'small' ? '14px' : 
            settings.chat.fontSize === 'large' ? '18px' : '16px'
        );

        // Appliquer le fond d'écran
        const chatBackground = document.querySelector('.chat-background');
        if (chatBackground && settings.chat.wallpaper !== 'default') {
            chatBackground.style.backgroundImage = `url(${settings.chat.wallpaper})`;
        }
    },

    // Mettre à jour un paramètre spécifique
    updateSetting(category, key, value) {
        const settings = this.getCurrentSettings();
        if (settings[category]) {
            settings[category][key] = value;
            this.saveSettings(settings);
        }
    }
};

// Afficher les paramètres
function showSettings() {
    const settings = Settings.getCurrentSettings();

    const content = `
        <div class="space-y-6">
            <!-- Navigation des onglets -->
            <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button onclick="showSettingsTab('notifications')" id="tab-notifications" class="settings-tab active flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-bell mr-2"></i>Notifications
                </button>
                <button onclick="showSettingsTab('privacy')" id="tab-privacy" class="settings-tab flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-shield-alt mr-2"></i>Confidentialité
                </button>
                <button onclick="showSettingsTab('chat')" id="tab-chat" class="settings-tab flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-comment mr-2"></i>Discussion
                </button>
                <button onclick="showSettingsTab('storage')" id="tab-storage" class="settings-tab flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-database mr-2"></i>Stockage
                </button>
            </div>

            <!-- Contenu des onglets -->
            <div id="settings-content">
                ${generateSettingsContent(settings)}
            </div>

            <!-- Actions -->
            <div class="flex space-x-3 pt-4 border-t">
                <button onclick="saveSettings()" class="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-save mr-2"></i>Sauvegarder
                </button>
                <button onclick="resetSettings()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-medium transition-colors">
                    <i class="fas fa-undo mr-2"></i>Réinitialiser
                </button>
                <button onclick="closeModal('settingsModal')" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors">
                    Fermer
                </button>
            </div>
        </div>
    `;

    showModal('settingsModal', 'Paramètres', content, 'xl');
}

// Générer le contenu des paramètres
function generateSettingsContent(settings) {
    return `
        <!-- Onglet Notifications -->
        <div id="settings-notifications" class="settings-panel">
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Notifications</h4>
                        <p class="text-sm text-gray-600">Recevoir des notifications pour les nouveaux messages</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="notifications-enabled" ${settings.notifications.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Son</h4>
                        <p class="text-sm text-gray-600">Jouer un son pour les notifications</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="notifications-sound" ${settings.notifications.sound ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Notifications bureau</h4>
                        <p class="text-sm text-gray-600">Afficher les notifications sur le bureau</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="notifications-desktop" ${settings.notifications.desktop ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Aperçu du message</h4>
                        <p class="text-sm text-gray-600">Afficher le contenu du message dans la notification</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="notifications-preview" ${settings.notifications.preview ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Onglet Confidentialité -->
        <div id="settings-privacy" class="settings-panel hidden">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Dernière connexion</label>
                    <select id="privacy-lastSeen" class="w-full p-3 border border-gray-300 rounded-lg">
                        <option value="everyone" ${settings.privacy.lastSeen === 'everyone' ? 'selected' : ''}>Tout le monde</option>
                        <option value="contacts" ${settings.privacy.lastSeen === 'contacts' ? 'selected' : ''}>Mes contacts</option>
                        <option value="nobody" ${settings.privacy.lastSeen === 'nobody' ? 'selected' : ''}>Personne</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Photo de profil</label>
                    <select id="privacy-profilePhoto" class="w-full p-3 border border-gray-300 rounded-lg">
                        <option value="everyone" ${settings.privacy.profilePhoto === 'everyone' ? 'selected' : ''}>Tout le monde</option>
                        <option value="contacts" ${settings.privacy.profilePhoto === 'contacts' ? 'selected' : ''}>Mes contacts</option>
                        <option value="nobody" ${settings.privacy.profilePhoto === 'nobody' ? 'selected' : ''}>Personne</option>
                    </select>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Confirmations de lecture</h4>
                        <p class="text-sm text-gray-600">Envoyer des confirmations de lecture</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="privacy-readReceipts" ${settings.privacy.readReceipts ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Onglet Discussion -->
        <div id="settings-chat" class="settings-panel hidden">
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Entrée pour envoyer</h4>
                        <p class="text-sm text-gray-600">Appuyer sur Entrée pour envoyer le message</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="chat-enterToSend" ${settings.chat.enterToSend ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Taille de police</label>
                    <select id="chat-fontSize" class="w-full p-3 border border-gray-300 rounded-lg">
                        <option value="small" ${settings.chat.fontSize === 'small' ? 'selected' : ''}>Petite</option>
                        <option value="medium" ${settings.chat.fontSize === 'medium' ? 'selected' : ''}>Moyenne</option>
                        <option value="large" ${settings.chat.fontSize === 'large' ? 'selected' : ''}>Grande</option>
                    </select>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Téléchargement automatique</h4>
                        <p class="text-sm text-gray-600">Télécharger automatiquement les médias</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="chat-mediaAutoDownload" ${settings.chat.mediaAutoDownload ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Onglet Stockage -->
        <div id="settings-storage" class="settings-panel hidden">
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Suppression automatique</h4>
                        <p class="text-sm text-gray-600">Supprimer automatiquement les anciens messages</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="storage-autoDeleteMessages" ${settings.storage.autoDeleteMessages ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Supprimer après (jours)</label>
                    <input type="number" id="storage-deleteAfterDays" value="${settings.storage.deleteAfterDays}" min="1" max="365" 
                           class="w-full p-3 border border-gray-300 rounded-lg">
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-medium text-gray-800 mb-3">Utilisation du stockage</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>Messages:</span>
                            <span class="font-medium">${Object.values(AppState.appData.messages || {}).flat().length} messages</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Contacts:</span>
                            <span class="font-medium">${AppState.appData.contacts?.length || 0} contacts</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Groupes:</span>
                            <span class="font-medium">${AppState.appData.groups?.length || 0} groupes</span>
                        </div>
                    </div>
                    <button onclick="clearAllData()" class="w-full mt-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-trash mr-2"></i>Effacer toutes les données
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Changer d'onglet dans les paramètres
function showSettingsTab(tabName) {
    // Masquer tous les panneaux
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    // Retirer la classe active de tous les onglets
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Afficher le panneau sélectionné
    const panel = document.getElementById(`settings-${tabName}`);
    if (panel) {
        panel.classList.remove('hidden');
    }
    
    // Activer l'onglet sélectionné
    const tab = document.getElementById(`tab-${tabName}`);
    if (tab) {
        tab.classList.add('active');
    }
}

// Sauvegarder les paramètres
function saveSettings() {
    const settings = Settings.getCurrentSettings();
    
    // Notifications
    settings.notifications.enabled = document.getElementById('notifications-enabled')?.checked || false;
    settings.notifications.sound = document.getElementById('notifications-sound')?.checked || false;
    settings.notifications.desktop = document.getElementById('notifications-desktop')?.checked || false;
    settings.notifications.preview = document.getElementById('notifications-preview')?.checked || false;
    
    // Confidentialité
    settings.privacy.lastSeen = document.getElementById('privacy-lastSeen')?.value || 'everyone';
    settings.privacy.profilePhoto = document.getElementById('privacy-profilePhoto')?.value || 'everyone';
    settings.privacy.readReceipts = document.getElementById('privacy-readReceipts')?.checked || false;
    
    // Discussion
    settings.chat.enterToSend = document.getElementById('chat-enterToSend')?.checked || false;
    settings.chat.fontSize = document.getElementById('chat-fontSize')?.value || 'medium';
    settings.chat.mediaAutoDownload = document.getElementById('chat-mediaAutoDownload')?.checked || false;
    
    // Stockage
    settings.storage.autoDeleteMessages = document.getElementById('storage-autoDeleteMessages')?.checked || false;
    settings.storage.deleteAfterDays = parseInt(document.getElementById('storage-deleteAfterDays')?.value) || 30;
    
    Settings.saveSettings(settings);
}

// Réinitialiser les paramètres
function resetSettings() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
        Settings.saveSettings(Settings.defaultSettings);
        closeModal('settingsModal');
        showSettings(); // Rouvrir avec les paramètres par défaut
    }
}

// Effacer toutes les données
function clearAllData() {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ? Cette action est irréversible.')) {
        localStorage.clear();
        AppState.appData = {
            currentUser: AppState.appData.currentUser,
            contacts: [],
            groups: [],
            messages: {},
            archived: [],
            blocked: []
        };
        AppState.saveData();
        showNotification('Toutes les données ont été effacées', 'success');
        closeModal('settingsModal');
        renderContacts();
    }
}

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    Object.assign(window, {
        showSettings, showSettingsTab, saveSettings, resetSettings, clearAllData, Settings
    });
}