// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const totalTimeTodayEl = document.getElementById('total-time-today');
    const productivityScoreEl = document.getElementById('productivity-score');
    const worstOffenderEl = document.getElementById('worst-offender');
    const scrollChartCanvas = document.getElementById('scroll-chart').getContext('2d');
    const weeklyChartCanvas = document.getElementById('weekly-chart').getContext('2d');
    const sitesListEl = document.getElementById('sites-list-detailed');
    const calendarHeatmapEl = document.getElementById('calendar-heatmap');
    const currentStreakEl = document.getElementById('current-streak');

    let scrollChart = null;
    let weeklyChart = null;

    // --- Utility Functions ---
    function getTodayDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    }

    function formatTime(totalSeconds) {
        if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '0s';
        if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        let parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (parts.length === 0 && totalSeconds > 0) parts.push(`${Math.round(totalSeconds % 60)}s`);
        return parts.length > 0 ? parts.join(' ') : '0s';
    }

    function calculateProductivityScore(scrollTime, focusSessions) {
        const scrollHours = scrollTime / 3600;
        const focusHours = (focusSessions * 25) / 60;
        if (scrollHours === 0 && focusHours === 0) return 'N/A';
        const ratio = focusHours / (scrollHours + focusHours);
        const score = Math.round(ratio * 100);
        return isNaN(score) ? 'N/A' : `${score}%`;
    }

    // --- UI Update Functions ---
    function updateStatsCards(todayData, dailyRecord, streakData) {
        const sites = todayData.sites || {};
        const totalTime = Object.values(sites).reduce((sum, time) => sum + time, 0);
        totalTimeTodayEl.textContent = formatTime(totalTime);

        const worst = Object.entries(sites).sort(([, a], [, b]) => b - a)[0];
        worstOffenderEl.textContent = worst ? worst[0] : 'None';

        const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
        productivityScoreEl.textContent = calculateProductivityScore(totalTime, focusSessions);
        
        currentStreakEl.textContent = `${streakData.current || 0} Day${streakData.current !== 1 ? 's' : ''}`;
    }

    function renderTodayChart(todayData) {
        const sites = todayData.sites || {};
        const labels = Object.keys(sites);
        const data = Object.values(sites);
        const chartColors = ['#F87171', '#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#F472B6'];

        if (scrollChart) scrollChart.destroy();
        
        if (labels.length === 0) {
             const ctx = scrollChartCanvas;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6B7280';
            ctx.font = "16px 'Inter', sans-serif";
            ctx.fillText('No scroll data for today.', ctx.canvas.width / 2, ctx.canvas.height / 2);
            ctx.restore();
            return;
        }

        scrollChart = new Chart(scrollChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: '#1F2937',
                    borderWidth: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatTime(ctx.raw)}` } }
                }
            }
        });
    }
    
    function renderWeeklyChart(dailyRecords) {
        const labels = [];
        const scrollData = [];
        const focusData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const record = dailyRecords[dateString];
            scrollData.push(record ? (record.scrollTime || 0) / 60 : 0); // in minutes
            focusData.push(record ? (record.focusSessions || 0) * 25 : 0); // in minutes
        }

        if (weeklyChart) weeklyChart.destroy();

        weeklyChart = new Chart(weeklyChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Scroll Time',
                        data: scrollData,
                        backgroundColor: '#EF4444',
                        borderRadius: 4,
                    },
                    {
                        label: 'Focus Time',
                        data: focusData,
                        backgroundColor: '#34D399',
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        ticks: { color: '#9CA3AF', callback: val => `${val} min` },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        stacked: true,
                        ticks: { color: '#9CA3AF' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#9CA3AF' } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.raw)} minutes` } }
                }
            }
        });
    }

    function renderDetailedSiteList(todayData) {
        const sites = todayData.sites || {};
        const sortedSites = Object.entries(sites).sort(([, a], [, b]) => b - a);

        sitesListEl.innerHTML = '';
        if (sortedSites.length === 0) {
            sitesListEl.innerHTML = '<li class="site-item-empty">No scrolling yet today. Keep it up!</li>';
        } else {
            sortedSites.forEach(([host, time]) => {
                const listItem = document.createElement('li');
                listItem.className = 'site-item';
                listItem.innerHTML = `<span class="host">${host}</span><span class="time">${formatTime(time)}</span>`;
                sitesListEl.appendChild(listItem);
            });
        }
    }

    function generateCalendarHeatmap(dailyRecords) {
        calendarHeatmapEl.innerHTML = '';
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 89);

        for (let i = 0; i < 90; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

            const record = dailyRecords[dateString];
            const scrollTime = record ? record.scrollTime : 0;
            const focusSessions = record ? record.focusSessions : 0;

            let level = 'l0';
            if (scrollTime > 7200) level = 'l4';
            else if (scrollTime > 3600) level = 'l3';
            else if (scrollTime > 1800) level = 'l2';
            else if (scrollTime > 0) level = 'l1';

            const box = document.createElement('div');
            box.className = `cal-box ${level}`;
            box.title = `${dateString}\nScroll: ${formatTime(scrollTime)}\nFocus: ${focusSessions} session(s)`;

            if (focusSessions > 0) {
                const marker = document.createElement('div');
                marker.className = 'focus-marker';
                box.appendChild(marker);
            }
            calendarHeatmapEl.appendChild(box);
        }
    }

    // --- Main Function ---
    async function updateDashboard() {
        try {
            const data = await chrome.storage.local.get(['today', 'dailyRecords', 'streakData']);
            const todayData = data.today || { sites: {} };
            const dailyRecords = data.dailyRecords || {};
            const todayDate = getTodayDateString();
            const todayRecord = dailyRecords[todayDate] || { scrollTime: 0, focusSessions: 0 };
            const streakData = data.streakData || { current: 0, longest: 0 };

            updateStatsCards(todayData, todayRecord, streakData);
            renderTodayChart(todayData);
            renderWeeklyChart(dailyRecords);
            renderDetailedSiteList(todayData);
            generateCalendarHeatmap(dailyRecords);
        } catch (error) {
            console.error("Failed to update dashboard:", error);
            document.body.innerHTML = '<div style="color: white; text-align: center; padding: 50px;">Could not load dashboard data.</div>';
        }
    }

    updateDashboard();
});
