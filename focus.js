// focus.js

document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer-display');
    const missionInputArea = document.getElementById('mission-input-area');
    const missionInput = document.getElementById('mission-input');
    const activeMissionDisplay = document.getElementById('active-mission-display');
    const startBtn = document.getElementById('start-focus-btn');
    const stopBtn = document.getElementById('stop-focus-btn');

    let timerInterval;

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    function updateUI(focusState) {
        if (focusState.isActive) {
            const remaining = Math.round((focusState.endTime - Date.now()) / 1000);
            timerDisplay.textContent = formatTime(remaining > 0 ? remaining : 0);
            
            // Show the active mission
            missionInputArea.style.display = 'none';
            activeMissionDisplay.textContent = `Mission: ${focusState.mission}`;
            activeMissionDisplay.style.display = 'block';

            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            document.body.classList.add('focus-active');
        } else {
            timerDisplay.textContent = "25:00";
            
            // Hide active mission and show input
            missionInputArea.style.display = 'block';
            activeMissionDisplay.style.display = 'none';
            missionInput.value = '';

            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            document.body.classList.remove('focus-active');
        }
    }

    function startTimerUpdates(endTime) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            if (remaining >= 0) {
                timerDisplay.textContent = formatTime(remaining);
            } else {
                clearInterval(timerInterval);
            }
        }, 1000);
    }

    startBtn.addEventListener('click', () => {
        const missionText = missionInput.value.trim();
        if (!missionText) {
            alert("Please define your mission before you begin!");
            return;
        }
        // Send the mission text along with the start request
        chrome.runtime.sendMessage({ type: 'START_FOCUS', mission: missionText });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'STOP_FOCUS' });
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'FOCUS_STATE_UPDATE') {
            updateUI(message.focusState);
            if (message.focusState.isActive) {
                startTimerUpdates(message.focusState.endTime);
            } else {
                if (timerInterval) clearInterval(timerInterval);
            }
        }
    });

    chrome.runtime.sendMessage({ type: 'GET_FOCUS_STATE' }, (response) => {
        if (response && response.focusState) {
            updateUI(response.focusState);
            if (response.focusState.isActive) {
                startTimerUpdates(response.focusState.endTime);
            }
        }
    });
});
