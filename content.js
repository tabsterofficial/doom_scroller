// content.js - Enhanced version with warning system and animations

let timerDiv = null;
let currentWarningLevel = 'normal';
let pulseInterval = null;

/**
 * Formats seconds into a more readable "HH:MM:SS" string.
 */
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Updates the real-time clock display.
 */
function updateRealTimeClock() {
    const clockEl = document.getElementById('shamescroll-realtime-clock');
    if (clockEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        clockEl.textContent = timeString;
    }
}

/**
 * Gets motivational message based on warning level
 */
function getMotivationalMessage(warningLevel, timeSpent) {
    const messages = {
        normal: [
            "Time flies when you're scrolling...",
            "Still productive, keep it up!",
            "Every minute counts.",
        ],
        warning: [
            "Maybe time for a break?",
            "Your future self is watching...",
            "30 minutes of scrolling detected!",
            "Consider doing something creative?",
        ],
        danger: [
            "🚨 DANGER ZONE ACTIVATED 🚨",
            "An hour of your life... gone.",
            "This is getting serious...",
            "Your dreams are calling you back.",
        ]
    };
    
    const levelMessages = messages[warningLevel] || messages.normal;
    return levelMessages[Math.floor(Math.random() * levelMessages.length)];
}

/**
 * Creates pulsing animation for warning states
 */
function startPulseAnimation() {
    if (pulseInterval) clearInterval(pulseInterval);
    
    pulseInterval = setInterval(() => {
        if (timerDiv && currentWarningLevel !== 'normal') {
            timerDiv.style.transform = 'scale(1.05)';
            setTimeout(() => {
                if (timerDiv) timerDiv.style.transform = 'scale(1)';
            }, 150);
        }
    }, 2000);
}

/**
 * Stops pulsing animation
 */
function stopPulseAnimation() {
    if (pulseInterval) {
        clearInterval(pulseInterval);
        pulseInterval = null;
    }
    if (timerDiv) {
        timerDiv.style.transform = 'scale(1)';
    }
}

/**
 * Creates and injects the enhanced timer overlay into the page.
 */
function createTimerOverlay() {
    if (document.getElementById('shamescroll-timer-overlay')) {
        return;
    }

    timerDiv = document.createElement('div');
    timerDiv.id = 'shamescroll-timer-overlay';
    
    timerDiv.innerHTML = `
        <div class="timer-content">
            <div class="timer-main">
                <span class="label">Time Wasted</span>
                <span class="time">00:00:00</span>
            </div>
            <div class="motivational-message" id="motivational-message">
                Time flies when you're scrolling...
            </div>
        </div>
        <div class="clock-content">
            <span id="shamescroll-realtime-clock" class="clock"></span>
        </div>
        <button id="shamescroll-toggle-btn" class="toggle-btn" title="Hide/Show Timer">×</button>
        <button id="shamescroll-dismiss-btn" class="dismiss-btn" title="Dismiss Warning" style="display: none;">✓</button>
    `;

    // Add enhanced styles
    const style = document.createElement('style');
    style.textContent = `
        #shamescroll-timer-overlay { 
            position: fixed !important; 
            bottom: 20px !important; 
            right: 20px !important; 
            background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)) !important;
            color: #F9FAFB !important; 
            border-radius: 16px !important; 
            z-index: 999999 !important; 
            border: 1px solid #374151 !important; 
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important; 
            backdrop-filter: blur(10px) !important; 
            -webkit-backdrop-filter: blur(10px) !important; 
            display: flex !important; 
            align-items: stretch !important; 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; 
            overflow: hidden !important;
            max-width: 400px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        #shamescroll-timer-overlay.warning-state {
            border-color: #F59E0B !important;
            box-shadow: 0 20px 25px -5px rgba(245, 158, 11, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
        }
        
        #shamescroll-timer-overlay.danger-state {
            border-color: #EF4444 !important;
            box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
        }
        
        .timer-content { 
            display: flex !important; 
            flex-direction: column !important;
            padding: 12px 16px !important; 
            transition: all 0.3s ease-in-out !important; 
            flex: 1 !important;
        }
        
        .timer-main {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin-bottom: 4px !important;
        }
        
        .timer-content .label { 
            color: #9CA3AF !important; 
            font-size: 11px !important; 
            text-transform: uppercase !important; 
            font-weight: 600 !important;
            letter-spacing: 0.5px !important;
        }
        
        .timer-content .time { 
            color: #F87171 !important; 
            font-weight: 700 !important; 
            font-size: 18px !important; 
            font-family: 'Courier New', Monaco, monospace !important;
        }
        
        .warning-state .timer-content .time {
            color: #F59E0B !important;
        }
        
        .danger-state .timer-content .time {
            color: #EF4444 !important;
            animation: pulse-danger 2s infinite !important;
        }
        
        @keyframes pulse-danger {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .motivational-message {
            font-size: 10px !important;
            color: #6B7280 !important;
            font-style: italic !important;
            max-width: 200px !important;
            line-height: 1.3 !important;
        }
        
        .warning-state .motivational-message {
            color: #D97706 !important;
        }
        
        .danger-state .motivational-message {
            color: #DC2626 !important;
            font-weight: 600 !important;
        }
        
        .clock-content { 
            padding: 12px 14px !important; 
            border-left: 1px solid #374151 !important; 
            display: flex !important; 
            align-items: center !important; 
            transition: all 0.3s ease-in-out !important; 
        }
        
        .clock { 
            font-family: -apple-system, system-ui, sans-serif !important; 
            font-size: 16px !important; 
            font-weight: 600 !important; 
            color: #9CA3AF !important; 
        }
        
        .toggle-btn, .dismiss-btn { 
            background: #4B5563 !important; 
            border: none !important; 
            color: white !important; 
            cursor: pointer !important; 
            font-size: 16px !important; 
            line-height: 1 !important; 
            padding: 8px 10px !important; 
            align-self: stretch !important; 
            transition: all 0.2s ease-in-out !important; 
            border-left: 1px solid #374151 !important;
        }
        
        .toggle-btn:hover, .dismiss-btn:hover { 
            background: #6B7280 !important; 
        }
        
        .dismiss-btn {
            background: #059669 !important;
        }
        
        .dismiss-btn:hover {
            background: #047857 !important;
        }
        
        #shamescroll-timer-overlay.hidden-state { 
            padding: 0 !important; 
        }
        
        #shamescroll-timer-overlay.hidden-state .timer-content,
        #shamescroll-timer-overlay.hidden-state .clock-content { 
            max-width: 0 !important; 
            padding: 12px 0 !important; 
            opacity: 0 !important; 
            border-left: none !important; 
        }
        
        #shamescroll-timer-overlay.hidden-state .toggle-btn { 
            transform: rotate(45deg) !important; 
            border-left: none !important;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(timerDiv);

    // Start the real-time clock
    updateRealTimeClock();
    setInterval(updateRealTimeClock, 1000);

    // Add event listeners
    const toggleBtn = document.getElementById('shamescroll-toggle-btn');
    const dismissBtn = document.getElementById('shamescroll-dismiss-btn');
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = timerDiv.classList.toggle('hidden-state');
        chrome.storage.local.set({ isTimerHidden: isHidden });
    });
    
    dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: 'DISMISS_WARNING' });
        updateWarningState('normal');
        dismissBtn.style.display = 'none';
    });

    // Check storage for hidden state
    chrome.storage.local.get('isTimerHidden', (data) => {
        if (data.isTimerHidden) {
            timerDiv.classList.add('hidden-state');
        }
    });
}

/**
 * Updates the warning state of the timer
 */
function updateWarningState(warningLevel) {
    if (!timerDiv) return;
    
    currentWarningLevel = warningLevel;
    
    // Remove existing warning classes
    timerDiv.classList.remove('warning-state', 'danger-state');
    
    // Add appropriate warning class
    if (warningLevel === 'warning') {
        timerDiv.classList.add('warning-state');
        startPulseAnimation();
        document.getElementById('shamescroll-dismiss-btn').style.display = 'block';
    } else if (warningLevel === 'danger') {
        timerDiv.classList.add('danger-state');
        startPulseAnimation();
        document.getElementById('shamescroll-dismiss-btn').style.display = 'block';
    } else {
        stopPulseAnimation();
        document.getElementById('shamescroll-dismiss-btn').style.display = 'none';
    }
}

/**
 * Updates the motivational message
 */
function updateMotivationalMessage(warningLevel, timeSpent) {
    const messageEl = document.getElementById('motivational-message');
    if (messageEl) {
        messageEl.textContent = getMotivationalMessage(warningLevel, timeSpent);
    }
}

/**
 * Removes the timer overlay from the page.
 */
function removeTimerOverlay() {
    const existingTimer = document.getElementById('shamescroll-timer-overlay');
    if (existingTimer) {
        existingTimer.remove();
        timerDiv = null;
    }
    stopPulseAnimation();
}

// Enhanced message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHAME_UPDATE') {
        if (message.isTracking) {
            if (!timerDiv) {
                createTimerOverlay();
            }
            
            const timeEl = document.querySelector('#shamescroll-timer-overlay .time');
            if (timeEl) {
                timeEl.textContent = formatTime(message.time);
            }
            
            // Update warning state and motivational message
            const warningLevel = message.warningLevel || 'normal';
            updateWarningState(warningLevel);
            updateMotivationalMessage(warningLevel, message.time);
            
        } else {
            removeTimerOverlay();
        }
    }
});

// Enhanced initial check when the script loads
chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATUS' }, (response) => {
    if (response && response.isTracking) {
        if (!timerDiv) {
            createTimerOverlay();
        }
        
        const timeEl = document.querySelector('#shamescroll-timer-overlay .time');
        if (timeEl) {
            timeEl.textContent = formatTime(response.time);
        }
        
        const warningLevel = response.warningLevel || 'normal';
        updateWarningState(warningLevel);
        updateMotivationalMessage(warningLevel, response.time);
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopPulseAnimation();
});