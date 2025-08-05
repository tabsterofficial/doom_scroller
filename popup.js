// popup.js - Enhanced version with quick actions and streak display

document.addEventListener('DOMContentLoaded', () => {
    const sitesListEl = document.getElementById('sites-list');
    const currentSiteEl = document.getElementById('current-site');
    const statusIndicatorEl = document.getElementById('status-indicator');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const focusModeBtn = document.getElementById('focus-mode-btn');

    let currentData = { sites: {}, activeHost: null, focusState: null, streakData: null };

    function formatTime(totalSeconds) {
        if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '0s';
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        let parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        return parts.join(' ');
    }

    function getWarningColor(time) {
        if (time >= 3600) return '#EF4444'; // Red for 1+ hour
        if (time >= 1800) return '#F59E0B'; // Yellow for 30+ minutes
        if (time >= 600) return '#34D399';  // Green for 10+ minutes
        return '#9CA3AF'; // Gray for less
    }

    function createQuickStats() {
        // Add quick stats section if it doesn't exist
        if (!document.getElementById('quick-stats')) {
            const statsSection = document.createElement('section');
            statsSection.id = 'quick-stats';
            statsSection.className = 'card quick-stats-card';
            statsSection.innerHTML = `
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-value" id="total-today">0s</span>
                        <span class="stat-label">Today</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="focus-streak">0</span>
                        <span class="stat-label">Streak</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="sessions-today">0</span>
                        <span class="stat-label">Sessions</span>
                    </div>
                </div>
            `;
            
            // Insert after the current status card
            const currentStatusCard = document.querySelector('.current-status-card');
            currentStatusCard.insertAdjacentElement('afterend', statsSection);
        }
    }

    function updateQuickStats(siteTime, dailyRecord, streakData) {
        const totalTime = Object.values(siteTime).reduce((sum, time) => sum + time, 0);
        const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
        const currentStreak = streakData ? streakData.current : 0;

        document.getElementById('total-today').textContent = formatTime(totalTime);
        document.getElementById('focus-streak').textContent = `${currentStreak}d`;
        document.getElementById('sessions-today').textContent = focusSessions;

        // Update colors based on performance
        const totalEl = document.getElementById('total-today');
        const streakEl = document.getElementById('focus-streak');
        
        totalEl.style.color = getWarningColor(totalTime);
        streakEl.style.color = currentStreak > 0 ? '#34D399' : '#9CA3AF';
    }

    function updateFocusButton(focusState) {
        if (focusState && focusState.isActive) {
            focusModeBtn.textContent = '⏱️ Focus Active';
            focusModeBtn.className = 'button-base button-success';
            focusModeBtn.title = `Mission: ${focusState.mission}`;
        } else {
            focusModeBtn.textContent = 'Enter Focus Mode';
            focusModeBtn.className = 'button-base button-primary';
            focusModeBtn.title = 'Start a 25-minute focus session';
        }
    }

    function createProductivityTip() {
        // Add productivity tip if not exists
        if (!document.getElementById('productivity-tip')) {
            const tipSection = document.createElement('section');
            tipSection.id = 'productivity-tip';
            tipSection.className = 'card tip-card';
            tipSection.innerHTML = `
                <div class="tip-content">
                    <div class="tip-icon">💡</div>
                    <div class="tip-text" id="tip-text">Loading tip...</div>
                </div>
            `;
            
            // Insert before footer
            const footer = document.querySelector('.shamescroll-footer');
            footer.insertAdjacentElement('beforebegin', tipSection);
        }
    }

    function updateProductivityTip(totalTime, focusSessions) {
        const tips = {
            excellent: [
                "🎉 Amazing focus today! You're building great digital habits.",
                "⭐ Your discipline is paying off. Keep up the fantastic work!",
                "🚀 You're in the zone! This is how productivity looks."
            ],
            good: [
                "👍 Good balance today. Consider adding one more focus session.",
                "💪 You're doing well! Small improvements lead to big changes.",
                "🎯 Nice work! Try extending your next focus session by 5 minutes."
            ],
            needsWork: [
                "🧘 Take a deep breath. Start with just one 25-minute focus session.",
                "🌱 Every expert was once a beginner. Your journey starts now.",
                "⏰ Set a timer for 10 minutes of productive work right now."
            ],
            danger: [
                "🚨 Time to break the scroll cycle. Start a focus session immediately.",
                "⚡ Your future self is counting on you. Choose focus over scroll.",
                "🎪 The dopamine circus can wait. Your goals cannot."
            ]
        };

        let category = 'needsWork';
        if (totalTime < 600 && focusSessions > 0) category = 'excellent';
        else if (totalTime < 1800 && focusSessions > 0) category = 'good';
        else if (totalTime > 3600) category = 'danger';

        const tipArray = tips[category];
        const randomTip = tipArray[Math.floor(Math.random() * tipArray.length)];
        
        const tipEl = document.getElementById('tip-text');
        if (tipEl) {
            tipEl.textContent = randomTip;
            tipEl.parentElement.parentElement.className = `card tip-card tip-${category}`;
        }
    }

    function updateUI() {
        chrome.storage.local.get(['today', 'activeHost', 'focusState', 'dailyRecords', 'streakData'], (result) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching data:", chrome.runtime.lastError);
                return;
            }

            const siteTime = result.today && result.today.sites ? result.today.sites : {};
            const activeHost = result.activeHost;
            const focusState = result.focusState;
            const streakData = result.streakData;
            
            // Get today's daily record
            const todayDate = new Date().toISOString().split('T')[0];
            const dailyRecords = result.dailyRecords || {};
            const dailyRecord = dailyRecords[todayDate];

            // Update current site status
            if (activeHost) {
                currentSiteEl.textContent = activeHost;
                statusIndicatorEl.className = 'status-indicator-online';
                statusIndicatorEl.title = `Currently tracking ${activeHost}`;
            } else {
                currentSiteEl.textContent = 'A productive task!';
                statusIndicatorEl.className = 'status-indicator-offline';
                statusIndicatorEl.title = 'Not currently tracking any sites';
            }

            // Update focus button state
            updateFocusButton(focusState);

            // Update quick stats
            updateQuickStats(siteTime, dailyRecord, streakData);

            // Update productivity tip
            const totalTime = Object.values(siteTime).reduce((sum, time) => sum + time, 0);
            const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
            updateProductivityTip(totalTime, focusSessions);

            // Update main sites list
            const sortedSites = Object.entries(siteTime).sort(([, a], [, b]) => b - a);

            sitesListEl.innerHTML = '';
            if (sortedSites.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'site-item-empty';
                emptyItem.innerHTML = `
                    <div>🎯 No doomscrolling detected today!</div>
                    <small style="color: #34D399; margin-top: 4px;">You're doing amazing!</small>
                `;
                sitesListEl.appendChild(emptyItem);
            } else {
                sortedSites.forEach(([host, time]) => {
                    const siteItem = document.createElement('li');
                    siteItem.className = 'site-item';
                    const isActive = host === activeHost;
                    const warningColor = getWarningColor(time);
                    
                    siteItem.innerHTML = `
                        <span class="host ${isActive ? 'active-host' : ''}">${host}</span>
                        <span class="time" style="color: ${warningColor}">${formatTime(time)}</span>
                        ${isActive ? '<span class="live-indicator">●</span>' : ''}
                    `;
                    sitesListEl.appendChild(siteItem);
                });
            }

            // Store current data for other functions
            currentData = { sites: siteTime, activeHost, focusState, streakData };
        });
    }

    // Add enhanced CSS
    const style = document.createElement('style');
    style.textContent = `
        .quick-stats-card {
            margin: 1rem 0;
            padding: 0.75rem;
        }
        
        .stats-row {
            display: flex;
            justify-content: space-around;
            align-items: center;
        }
        
        .stat-item {
            text-align: center;
            flex: 1;
        }
        
        .stat-value {
            display: block;
            font-size: 1.1rem;
            font-weight: 700;
            color: #4F46E5;
        }
        
        .stat-label {
            font-size: 0.75rem;
            color: #9CA3AF;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .tip-card {
            margin: 0.5rem 0;
            padding: 0.75rem;
            border-left: 4px solid #4F46E5;
        }
        
        .tip-excellent { border-left-color: #34D399; }
        .tip-good { border-left-color: #3B82F6; }
        .tip-needsWork { border-left-color: #F59E0B; }
        .tip-danger { border-left-color: #EF4444; }
        
        .tip-content {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
        }
        
        .tip-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        
        .tip-text {
            font-size: 0.875rem;
            line-height: 1.4;
            color: #D1D5DB;
        }
        
        .active-host {
            color: #34D399 !important;
            font-weight: 600;
        }
        
        .live-indicator {
            color: #34D399;
            font-size: 0.8rem;
            margin-left: 0.25rem;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .button-success {
            background-color: #059669 !important;
            color: white;
        }
        
        .button-success:hover {
            background-color: #047857 !important;
        }
        
        .site-item-empty {
            text-align: center;
            padding: 1.5rem 1rem;
        }
        
        .site-item-empty small {
            display: block;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);

    // Initialize enhanced components
    createQuickStats();
    createProductivityTip();
    
    // Initial UI update
    updateUI();
    
    // Update every second for real-time data
    const uiInterval = setInterval(updateUI, 1000);

    // Event listeners
    dashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
        window.close();
    });
    
    focusModeBtn.addEventListener('click', () => {
        if (currentData.focusState && currentData.focusState.isActive) {
            // If focus is active, show current session info
            chrome.tabs.create({ url: 'focus.html' });
        } else {
            // Start new focus session
            chrome.tabs.create({ url: 'focus.html' });
        }
        window.close();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'd':
                    e.preventDefault();
                    dashboardBtn.click();
                    break;
                case 'f':
                    e.preventDefault();
                    focusModeBtn.click();
                    break;
            }
        }
    });

    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
        if (uiInterval) clearInterval(uiInterval);
    });
});