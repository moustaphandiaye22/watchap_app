// Gestion des messages vocaux
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;

// Initialisation de l'enregistrement vocal
const initVoiceRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    
    mediaRecorder.start();
    updateRecordingUI(true);
    startRecordingTimer();
    
    // Vibration si supportée
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
};

// Arrêter l'enregistrement
const stopRecording = () => {
    if (!isRecording || !mediaRecorder) return;
    
    isRecording = false;
    mediaRecorder.stop();
    
    // Arrêter le stream
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    updateRecordingUI(false);
    clearInterval(recordingTimer);
    
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
};

// Annuler l'enregistrement
const cancelRecording = () => {
    if (!isRecording) return;
    
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Arrêter le stream
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    audioChunks = [];
    updateRecordingUI(false);
    clearInterval(recordingTimer);
    
    showNotification('Enregistrement annulé', 'info');
};

// Mise à jour de l'interface d'enregistrement
const updateRecordingUI = (recording) => {
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const recordingIndicator = document.getElementById('recordingIndicator');
    
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
                <button onclick="cancelRecording()" class="ml-2 hover:bg-red-600 rounded-full p-1">
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
    if (!AppState.activeChat) {
        showNotification('Aucun chat sélectionné', 'error');
        return;
    }
    
    if (isBlocked(AppState.activeChat.id)) {
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
    const contact = [...AppState.appData.contacts, ...AppState.appData.groups]
        .find(c => c.id === AppState.activeChat.id);
    
    if (contact) {
        contact.lastMessage = '🎤 Message vocal';
        contact.time = formatTime();
    }
    
    AppState.saveData();
    renderMessages(AppState.activeChat.id);
    renderContacts();
    
    showNotification('Message vocal envoyé', 'success');
};

// Lecture d'un message vocal
const playVoiceMessage = (messageId, audioUrl) => {
    // Arrêter tous les autres audios
    document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    
    const audio = new Audio(audioUrl);
    const playBtn = document.querySelector(`[data-message-id="${messageId}"] .play-btn`);
    const progressBar = document.querySelector(`[data-message-id="${messageId}"] .progress-bar`);
    
    audio.addEventListener('loadedmetadata', () => {
        const durationSpan = document.querySelector(`[data-message-id="${messageId}"] .duration`);
        if (durationSpan) {
            durationSpan.textContent = formatDuration(audio.duration * 1000);
        }
    });
    
    audio.addEventListener('timeupdate', () => {
        if (progressBar) {
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
    
    if (audio.paused) {
        audio.play();
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    } else {
        audio.pause();
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
};

// Exposition des fonctions globales
if (typeof window !== 'undefined') {
    Object.assign(window, {
        startRecording, stopRecording, cancelRecording, playVoiceMessage,
        isRecording
    });
}