// popup.js - Enhanced version with quick actions and streak display

document.addEventListener('DOMContentLoaded', () => {
    const sitesListEl = document.getElementById('sites-list');
    const currentSiteEl = document.getElementById('current-site');
    const statusIndicatorEl = document.getElementById('status-indicator');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const focusModeBtn = document.getElementById('focus-mode-btn');
    const quickStatsEl = document.getElementById('quick-stats');
    const productivityTipEl = document.getElementById('productivity-tip');

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

    function updateQuickStats(siteTime, dailyRecord, streakData) {
        const totalTime = Object.values(siteTime).reduce((sum, time) => sum + time, 0);
        const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
        const currentStreak = streakData ? streakData.current : 0;

        quickStatsEl.innerHTML = `
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-value" id="total-today" style="color: ${getWarningColor(totalTime)}">${formatTime(totalTime)}</span>
                    <span class="stat-label">Today</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="focus-streak" style="color: ${currentStreak > 0 ? '#34D399' : '#9CA3AF'}">${currentStreak}d</span>
                    <span class="stat-label">Streak</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="sessions-today">${focusSessions}</span>
                    <span class="stat-label">Sessions</span>
                </div>
            </div>
        `;
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

    function updateProductivityTip(totalTime, focusSessions) {
        const tips = {
            excellent: "🎉 Amazing focus today! You're building great digital habits.",
            good: "👍 Good balance today. Consider one more focus session.",
            needsWork: "🧘 Take a deep breath. Start with just one 25-minute focus session.",
            danger: "🚨 Time to break the scroll cycle. Start a focus session immediately."
        };

        let category = 'needsWork';
        if (totalTime < 600 && focusSessions > 0) category = 'excellent';
        else if (totalTime < 1800 && focusSessions > 0) category = 'good';
        else if (totalTime > 3600) category = 'danger';

        productivityTipEl.innerHTML = `
            <div class="tip-content">
                <div class="tip-icon">💡</div>
                <div class="tip-text">${tips[category]}</div>
            </div>
        `;
        productivityTipEl.className = `card tip-card tip-${category}`;
    }

    function updateUI() {
        chrome.storage.local.get(['today', 'activeHost', 'focusState', 'dailyRecords', 'streakData'], (result) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching data:", chrome.runtime.lastError);
                return;
            }

            const siteTime = result.today?.sites || {};
            const activeHost = result.activeHost;
            const focusState = result.focusState;
            const streakData = result.streakData;
            const todayDate = new Date().toISOString().split('T')[0];
            const dailyRecord = (result.dailyRecords || {})[todayDate];

            currentSiteEl.textContent = activeHost ? activeHost : 'A productive task!';
            statusIndicatorEl.className = activeHost ? 'status-indicator-online' : 'status-indicator-offline';
            statusIndicatorEl.title = activeHost ? `Tracking ${activeHost}` : 'Not tracking';

            updateFocusButton(focusState);
            updateQuickStats(siteTime, dailyRecord, streakData);

            const totalTime = Object.values(siteTime).reduce((sum, time) => sum + time, 0);
            const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
            updateProductivityTip(totalTime, focusSessions);

            const sortedSites = Object.entries(siteTime).sort(([, a], [, b]) => b - a);
            sitesListEl.innerHTML = '';
            if (sortedSites.length === 0) {
                sitesListEl.innerHTML = `<li class="site-item-empty"><div>🎯 No doomscrolling detected today!</div><small style="color: #34D399; margin-top: 4px;">You're doing amazing!</small></li>`;
            } else {
                sortedSites.forEach(([host, time]) => {
                    const isActive = host === activeHost;
                    sitesListEl.innerHTML += `
                        <li class="site-item">
                            <span class="host ${isActive ? 'active-host' : ''}">${host}</span>
                            <span class="time" style="color: ${getWarningColor(time)}">${formatTime(time)}</span>
                            ${isActive ? '<span class="live-indicator">●</span>' : ''}
                        </li>
                    `;
                });
            }
            currentData = { sites: siteTime, activeHost, focusState, streakData };
        });
    }

    dashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
        window.close();
    });
    
    focusModeBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'focus.html' });
        window.close();
    });

    updateUI();
    const uiInterval = setInterval(updateUI, 1000);
    window.addEventListener('beforeunload', () => clearInterval(uiInterval));
});
