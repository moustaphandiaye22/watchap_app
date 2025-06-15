// Gestion des messages vocaux
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;
let currentStream = null; // Ajout pour gérer le stream

// Initialisation de l'enregistrement vocal
const initVoiceRecording = async () => {
    try {
        // Nettoyer le stream précédent si il existe
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentStream = stream;
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            sendVoiceMessage(audioUrl, getRecordingDuration());
            audioChunks = [];
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('Erreur MediaRecorder:', event.error);
            showNotification('Erreur lors de l\'enregistrement', 'error');
        };
        
        return true;
    } catch (error) {
        console.error('Erreur d\'accès au microphone:', error);
        showNotification('Impossible d\'accéder au microphone', 'error');
        return false;
    }
};

// Démarrer l'enregistrement
const startRecording = async () => {
    if (isRecording) return;
    
    const canRecord = await initVoiceRecording();
    if (!canRecord) return;
    
    isRecording = true;
    recordingStartTime = Date.now();
    audioChunks = [];
    
    try {
        mediaRecorder.start();
        updateRecordingUI(true);
        startRecordingTimer();
        
        // Vibration si supportée
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    } catch (error) {
        console.error('Erreur lors du démarrage de l\'enregistrement:', error);
        isRecording = false;
        showNotification('Impossible de démarrer l\'enregistrement', 'error');
    }
};

// Arrêter l'enregistrement
const stopRecording = () => {
    if (!isRecording || !mediaRecorder) return;
    
    isRecording = false;
    
    try {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    } catch (error) {
        console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
    }
    
    // Arrêter le stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    updateRecordingUI(false);
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
};

// Annuler l'enregistrement
const cancelRecording = () => {
    if (!isRecording) return;
    
    isRecording = false;
    
    try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    } catch (error) {
        console.error('Erreur lors de l\'annulation:', error);
    }
    
    // Arrêter le stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    audioChunks = [];
    updateRecordingUI(false);
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    showNotification('Enregistrement annulé', 'info');
};

// Mise à jour de l'interface d'enregistrement
const updateRecordingUI = (recording) => {
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const recordingIndicator = document.getElementById('recordingIndicator');
    
    if (!sendBtn || !messageInput) {
        console.error('Éléments UI non trouvés');
        return;
    }
    
    if (recording) {
        // Mode enregistrement
        sendBtn.innerHTML = '<i class="fas fa-stop text-white"></i>';
        sendBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        sendBtn.classList.remove('send-button');
        
        messageInput.placeholder = 'Enregistrement en cours...';
        messageInput.disabled = true;
        
        // Afficher l'indicateur d'enregistrement
        if (!recordingIndicator) {
            const indicator = document.createElement('div');
            indicator.id = 'recordingIndicator';
            indicator.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center space-x-2';
            indicator.innerHTML = `
                <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span>Enregistrement: <span id="recordingTime">00:00</span></span>
                <button onclick="cancelRecording()" class="ml-2 hover:bg-red-600 rounded-full p-1" type="button">
                    <i class="fas fa-times text-sm"></i>
                </button>
            `;
            document.body.appendChild(indicator);
        }
    } else {
        // Mode normal
        sendBtn.innerHTML = '<i class="fas fa-microphone text-white"></i>';
        sendBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        sendBtn.classList.add('send-button');
        
        messageInput.placeholder = 'Tapez votre message...';
        messageInput.disabled = false;
        
        // Supprimer l'indicateur d'enregistrement
        const indicator = document.getElementById('recordingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
};

// Timer d'enregistrement
const startRecordingTimer = () => {
    if (recordingTimer) {
        clearInterval(recordingTimer);
    }
    
    recordingTimer = setInterval(() => {
        const duration = getRecordingDuration();
        const timeElement = document.getElementById('recordingTime');
        if (timeElement) {
            timeElement.textContent = formatDuration(duration);
        }
        
        // Limite de 5 minutes
        if (duration >= 300000) {
            stopRecording();
            showNotification('Durée maximale atteinte (5 min)', 'warning');
        }
    }, 100);
};

// Obtenir la durée d'enregistrement
const getRecordingDuration = () => {
    return recordingStartTime ? Date.now() - recordingStartTime : 0;
};

// Formater la durée
const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Envoyer un message vocal
const sendVoiceMessage = (audioUrl, duration) => {
    // Vérifier si AppState existe
    if (typeof AppState === 'undefined') {
        console.error('AppState non défini');
        showNotification('Erreur de l\'application', 'error');
        return;
    }
    
    if (!AppState.activeChat) {
        showNotification('Aucun chat sélectionné', 'error');
        return;
    }
    
    // Vérifier si la fonction isBlocked existe
    if (typeof isBlocked === 'function' && isBlocked(AppState.activeChat.id)) {
        showNotification('Contact bloqué', 'error');
        return;
    }
    
    // Créer le message vocal
    if (!AppState.appData.messages[AppState.activeChat.id]) {
        AppState.appData.messages[AppState.activeChat.id] = [];
    }
    
    const newMessage = {
        id: generateId(),
        type: 'voice',
        audioUrl: audioUrl,
        duration: duration,
        sender: 'me',
        time: formatTime(),
        timestamp: Date.now()
    };
    
    AppState.appData.messages[AppState.activeChat.id].push(newMessage);
    
    // Mettre à jour le contact/groupe
    const contact = [...(AppState.appData.contacts || []), ...(AppState.appData.groups || [])]
        .find(c => c.id === AppState.activeChat.id);
    
    if (contact) {
        contact.lastMessage = '🎤 Message vocal';
        contact.time = formatTime();
    }
    
    // Vérifier si les fonctions existent avant de les appeler
    if (typeof AppState.saveData === 'function') {
        AppState.saveData();
    }
    if (typeof renderMessages === 'function') {
        renderMessages(AppState.activeChat.id);
    }
    if (typeof renderContacts === 'function') {
        renderContacts();
    }
    
    showNotification('Message vocal envoyé', 'success');
};

// Lecture d'un message vocal
const playVoiceMessage = (messageId, audioUrl) => {
    if (!messageId || !audioUrl) {
        console.error('Paramètres manquants pour la lecture audio');
        return;
    }
    
    // Arrêter tous les autres audios
    document.querySelectorAll('audio').forEach(audio => {
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    
    try {
        const audio = new Audio(audioUrl);
        const playBtn = document.querySelector(`[data-message-id="${messageId}"] .play-btn`);
        const progressBar = document.querySelector(`[data-message-id="${messageId}"] .progress-bar`);
        
        audio.addEventListener('loadedmetadata', () => {
            const durationSpan = document.querySelector(`[data-message-id="${messageId}"] .duration`);
            if (durationSpan && audio.duration) {
                durationSpan.textContent = formatDuration(audio.duration * 1000);
            }
        });
        
        audio.addEventListener('timeupdate', () => {
            if (progressBar && audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressBar.style.width = `${progress}%`;
            }
        });
        
        audio.addEventListener('ended', () => {
            if (playBtn) {
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        });
        
        audio.addEventListener('error', (e) => {
            console.error('Erreur de lecture audio:', e);
            showNotification('Erreur de lecture du message vocal', 'error');
        });
        
        if (audio.paused) {
            audio.play().catch(error => {
                console.error('Erreur lors de la lecture:', error);
                showNotification('Impossible de lire le message vocal', 'error');
            });
            if (playBtn) {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        } else {
            audio.pause();
            if (playBtn) {
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    } catch (error) {
        console.error('Erreur lors de la création de l\'audio:', error);
        showNotification('Erreur lors de la lecture', 'error');
    }
};

// Nettoyer les ressources (fonction utilitaire)
const cleanupRecording = () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    isRecording = false;
    audioChunks = [];
    mediaRecorder = null;
};

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    Object.assign(window, {
        startRecording, 
        stopRecording, 
        cancelRecording, 
        playVoiceMessage,
        isRecording,
        cleanupRecording
    });
}