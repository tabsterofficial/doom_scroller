// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const sitesListEl = document.getElementById('sites-list');
    const currentSiteEl = document.getElementById('current-site');
    const statusIndicatorEl = document.getElementById('status-indicator');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const focusModeBtn = document.getElementById('focus-mode-btn');

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

    function updateUI() {
        chrome.storage.local.get(['today', 'activeHost'], (result) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching data:", chrome.runtime.lastError);
                return;
            }
            const siteTime = result.today && result.today.sites ? result.today.sites : {};
            const activeHost = result.activeHost;

            if (activeHost) {
                currentSiteEl.textContent = activeHost;
                statusIndicatorEl.className = 'status-indicator-online';
            } else {
                currentSiteEl.textContent = 'A productive task!';
                statusIndicatorEl.className = 'status-indicator-offline';
            }

            const sortedSites = Object.entries(siteTime).sort(([, a], [, b]) => b - a);

            sitesListEl.innerHTML = '';
            if (sortedSites.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'site-item-empty';
                emptyItem.textContent = 'No doomscrolling detected... for now.';
                sitesListEl.appendChild(emptyItem);
            } else {
                sortedSites.forEach(([host, time]) => {
                    const siteItem = document.createElement('li');
                    siteItem.className = 'site-item';
                    siteItem.innerHTML = `<span class="host">${host}</span><span class="time">${formatTime(time)}</span>`;
                    sitesListEl.appendChild(siteItem);
                });
            }
        });
    }

    updateUI();
    const uiInterval = setInterval(updateUI, 1000);

    dashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });
    
    focusModeBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'focus.html' });
    });
});
