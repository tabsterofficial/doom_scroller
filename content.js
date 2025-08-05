// content.js
// This script is injected into every page.

let timerDiv = null;

/**
 * Formats seconds into a more readable "HH:MM:SS" string.
 * @param {number} totalSeconds - The total seconds to format.
 * @returns {string} The formatted time string.
 */
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * NEW: Updates the real-time clock display.
 */
function updateRealTimeClock() {
    const clockEl = document.getElementById('shamescroll-realtime-clock');
    if (clockEl) {
        const now = new Date();
        // Format to HH:MM AM/PM
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        clockEl.textContent = timeString;
    }
}


/**
 * Creates and injects the timer overlay into the page.
 */
function createTimerOverlay() {
    if (document.getElementById('shamescroll-timer-overlay')) {
        return; // Overlay already exists
    }

    timerDiv = document.createElement('div');
    timerDiv.id = 'shamescroll-timer-overlay';
    
    // Using innerHTML to easily structure the element with the new clock and button
    timerDiv.innerHTML = `
        <div class="timer-content">
            <span class="label">Time Wasted</span>
            <span class="time">00:00:00</span>
        </div>
        <div class="clock-content">
            <span id="shamescroll-realtime-clock" class="clock"></span>
        </div>
        <button id="shamescroll-toggle-btn" class="toggle-btn" title="Hide/Show Timer">×</button>
    `;

    document.body.appendChild(timerDiv);

    // Start the real-time clock
    updateRealTimeClock();
    setInterval(updateRealTimeClock, 1000); // Update every second

    // Add event listener for the toggle button
    const toggleBtn = document.getElementById('shamescroll-toggle-btn');
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = timerDiv.classList.toggle('hidden-state');
        chrome.storage.local.set({ isTimerHidden: isHidden });
    });

    // Check storage to see if the timer should be hidden by default
    chrome.storage.local.get('isTimerHidden', (data) => {
        if (data.isTimerHidden) {
            timerDiv.classList.add('hidden-state');
        }
    });
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
}

// Listen for messages from the background script
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
        } else {
            removeTimerOverlay();
        }
    }
});

// Initial check when the script loads
chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATUS' }, (response) => {
    if (response && response.isTracking) {
        if (!timerDiv) {
            createTimerOverlay();
        }
        const timeEl = document.querySelector('#shamescroll-timer-overlay .time');
        if (timeEl) {
            timeEl.textContent = formatTime(response.time);
        }
    }
});
