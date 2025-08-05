// dashboard.js - Enhanced version with streak tracking and better analytics

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const totalTimeTodayEl = document.getElementById('total-time-today');
    const productivityScoreEl = document.getElementById('productivity-score');
    const worstOffenderEl = document.getElementById('worst-offender');
    const scrollChartCanvas = document.getElementById('scroll-chart').getContext('2d');
    const sitesListEl = document.getElementById('sites-list-detailed');
    const calendarHeatmapEl = document.getElementById('calendar-heatmap');

    let scrollChart = null;
    let streakData = { current: 0, longest: 0, lastFocusDate: null };

    // --- Enhanced Utility Functions ---

    /**
     * Formats total seconds into a human-readable string (e.g., 1h 25m 3s).
     */
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

    /**
     * Enhanced productivity score calculation
     */
    function calculateProductivityScore(scrollTime, focusSessions, totalFocusTime = 0) {
        const scrollHours = scrollTime / 3600;
        const focusHours = totalFocusTime / (1000 * 3600); // Convert from milliseconds
        
        if (scrollHours === 0 && focusHours === 0) return 'N/A';
        
        // Enhanced calculation considering both time and session count
        const timeRatio = focusHours / (scrollHours + focusHours);
        const sessionBonus = Math.min(focusSessions * 5, 20); // Up to 20% bonus for sessions
        const score = Math.round((timeRatio * 80) + sessionBonus);
        
        if (isNaN(score)) return 'N/A';
        return `${Math.min(score, 100)}%`;
    }

    /**
     * Gets productivity status and color based on score
     */
    function getProductivityStatus(score) {
        const numScore = parseInt(score);
        if (isNaN(numScore)) return { status: 'Unknown', color: 'text-gray' };
        if (numScore >= 80) return { status: 'Excellent', color: 'text-green' };
        if (numScore >= 60) return { status: 'Good', color: 'text-blue' };
        if (numScore >= 40) return { status: 'Fair', color: 'text-yellow' };
        return { status: 'Needs Work', color: 'text-red' };
    }

    // --- Enhanced UI Update Functions ---

    /**
     * Creates and adds streak info to the stats grid
     */
    function addStreakStats() {
        const statsGrid = document.querySelector('.stats-grid');
        
        // Add streak card if it doesn't exist
        if (!document.getElementById('streak-card')) {
            const streakCard = document.createElement('div');
            streakCard.id = 'streak-card';
            streakCard.className = 'stat-card';
            streakCard.innerHTML = `
                <h2 class="stat-title">Focus Streak</h2>
                <p id="current-streak" class="stat-value text-green">0 days</p>
                <div class="streak-info">
                    <small>Longest: <span id="longest-streak">0</span> days</small>
                </div>
            `;
            statsGrid.appendChild(streakCard);
        }
    }

    /**
     * Updates the enhanced statistics cards.
     */
    function updateStatsCards(todayData, dailyRecord) {
        const sites = todayData.sites || {};
        const totalTime = Object.values(sites).reduce((sum, time) => sum + time, 0);
        totalTimeTodayEl.textContent = formatTime(totalTime);

        // Find the worst offender
        const worst = Object.entries(sites).sort(([, a], [, b]) => b - a)[0];
        worstOffenderEl.textContent = worst ? worst[0] : 'None yet 👍';

        // Update enhanced productivity score
        const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
        const totalFocusTime = dailyRecord ? dailyRecord.totalFocusTime || 0 : 0;
        const score = calculateProductivityScore(totalTime, focusSessions, totalFocusTime);
        const { status, color } = getProductivityStatus(score);
        
        productivityScoreEl.textContent = score;
        productivityScoreEl.className = `stat-value ${color}`;
        
        // Add status indicator
        let statusEl = productivityScoreEl.parentElement.querySelector('.productivity-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'productivity-status';
            statusEl.style.fontSize = '0.75rem';
            statusEl.style.color = '#9CA3AF';
            statusEl.style.marginTop = '0.25rem';
            productivityScoreEl.parentElement.appendChild(statusEl);
        }
        statusEl.textContent = status;

        // Update streak information
        const currentStreakEl = document.getElementById('current-streak');
        const longestStreakEl = document.getElementById('longest-streak');
        if (currentStreakEl && longestStreakEl) {
            currentStreakEl.textContent = `${streakData.current} days`;
            longestStreakEl.textContent = streakData.longest;
        }
    }

    /**
     * Renders enhanced doughnut chart with better colors and animations
     */
    function renderTodayChart(todayData) {
        const sites = todayData.sites || {};
        const labels = Object.keys(sites);
        const data = Object.values(sites);

        const chartColors = [
            '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
            '#84CC16', '#22C55E', '#10B981', '#14B8A6',
            '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
            '#8B5CF6', '#A855F7', '#C084FC', '#EC4899'
        ];

        if (scrollChart) {
            scrollChart.destroy();
        }

        if (labels.length === 0) {
            const ctx = scrollChartCanvas;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6B7280';
            ctx.font = "16px 'Inter', sans-serif";
            ctx.fillText('No scroll data for today.', ctx.canvas.width / 2, ctx.canvas.height / 2 - 10);
            ctx.fillStyle = '#34D399';
            ctx.fillText('🎉 Great job staying focused!', ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
            ctx.restore();
            return;
        }

        scrollChart = new Chart(scrollChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Time Wasted',
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: '#1F2937',
                    borderWidth: 3,
                    hoverBorderWidth: 5,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${formatTime(context.raw)} (${percentage}%)`;
                            }
                        },
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleColor: '#F9FAFB',
                        bodyColor: '#D1D5DB',
                        borderColor: '#374151',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Renders enhanced detailed list with progress bars
     */
    function renderDetailedSiteList(todayData) {
        const sites = todayData.sites || {};
        const sortedSites = Object.entries(sites).sort(([, a], [, b]) => b - a);
        const maxTime = sortedSites.length > 0 ? sortedSites[0][1] : 1;

        sitesListEl.innerHTML = '';

        if (sortedSites.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'site-item-empty';
            emptyItem.innerHTML = `
                <div class="empty-state">
                    <div>🎯 No doomscrolling detected today!</div>
                    <small>Keep up the great work!</small>
                </div>
            `;
            sitesListEl.appendChild(emptyItem);
        } else {
            sortedSites.forEach(([host, time], index) => {
                const percentage = (time / maxTime) * 100;
                const listItem = document.createElement('li');
                listItem.className = 'site-item enhanced-site-item';
                listItem.innerHTML = `
                    <div class="site-info">
                        <span class="host">${host}</span>
                        <span class="time">${formatTime(time)}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    <div class="site-rank">#${index + 1}</div>
                `;
                sitesListEl.appendChild(listItem);
            });
        }
    }

    /**
     * Enhanced calendar heatmap with focus session indicators
     */
    function generateCalendarHeatmap(dailyRecords) {
        calendarHeatmapEl.innerHTML = '';
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 89);

        // Add legend
        const legend = document.createElement('div');
        legend.className = 'calendar-legend';
        legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-text">Less</span>
                <div class="legend-colors">
                    <div class="legend-box l0"></div>
                    <div class="legend-box l1"></div>
                    <div class="legend-box l2"></div>
                    <div class="legend-box l3"></div>
                    <div class="legend-box l4"></div>
                </div>
                <span class="legend-text">More</span>
            </div>
            <div class="legend-focus">⭐ = Focus session completed</div>
        `;
        calendarHeatmapEl.appendChild(legend);

        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';

        for (let i = 0; i < 90; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

            const record = dailyRecords[dateString];
            const scrollTime = record ? record.scrollTime : 0;
            const focusSessions = record ? record.focusSessions : 0;

            let level = 'l0';
            if (scrollTime > 7200) level = 'l4'; // 2+ hours
            else if (scrollTime > 3600) level = 'l3'; // 1+ hour
            else if (scrollTime > 1800) level = 'l2'; // 30+ minutes
            else if (scrollTime > 600) level = 'l1'; // 10+ minutes

            const box = document.createElement('div');
            box.className = `cal-box ${level}`;
            box.title = `${dateString}\nScroll Time: ${formatTime(scrollTime)}\nFocus Sessions: ${focusSessions}`;

            if (focusSessions > 0) {
                const marker = document.createElement('div');
                marker.className = 'focus-marker';
                marker.textContent = '⭐';
                marker.title = `${focusSessions} focus session(s) completed`;
                box.appendChild(marker);
            }

            calendarGrid.appendChild(box);
        }

        calendarHeatmapEl.appendChild(calendarGrid);
    }

    // --- Enhanced Main Function ---
    async function updateDashboard() {
        try {
            // Add loading state
            document.body.classList.add('loading');
            
            const data = await chrome.storage.local.get(['today', 'dailyRecords', 'streakData']);
            const todayData = data.today || { sites: {} };
            const dailyRecords = data.dailyRecords || {};
            const todayDate = new Date().toISOString().split('T')[0];
            const todayRecord = dailyRecords[todayDate] || { 
                scrollTime: 0, 
                focusSessions: 0,
                totalFocusTime: 0
            };

            // Update streak data
            if (data.streakData) {
                streakData = data.streakData;
            }

            // Add streak stats card
            addStreakStats();

            // Update all UI components
            updateStatsCards(todayData, todayRecord);
            renderTodayChart(todayData);
            renderDetailedSiteList(todayData);
            generateCalendarHeatmap(dailyRecords);

            // Remove loading state
            document.body.classList.remove('loading');

        } catch (error) {
            console.error("Failed to update dashboard:", error);
            document.body.innerHTML = `
                <div class="error-container">
                    <h1>⚠️ Dashboard Error</h1>
                    <p>Could not load dashboard data. Please try refreshing the page.</p>
                    <button onclick="window.location.reload()" class="button-base button-primary">
                        Refresh Dashboard
                    </button>
                </div>
            `;
        }
    }

    // Add enhanced CSS
    const style = document.createElement('style');
    style.textContent = `
        .loading { opacity: 0.7; pointer-events: none; }
        
        .enhanced-site-item {
            position: relative;
            padding: 1rem;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
            margin-bottom: 0.5rem;
            transition: transform 0.2s ease;
        }
        
        .enhanced-site-item:hover {
            transform: translateX(4px);
            background: rgba(0, 0, 0, 0.3);
        }
        
        .site-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .progress-bar-container {
            height: 4px;
            background: rgba(75, 85, 99, 0.3);
            border-radius: 2px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #EF4444, #F97316);
            border-radius: 2px;
            transition: width 0.5s ease;
        }
        
        .site-rank {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            font-size: 0.75rem;
            color: #6B7280;
            font-weight: 600;
        }
        
        .calendar-legend {
            margin-bottom: 1rem;
            font-size: 0.875rem;
            color: #9CA3AF;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        
        .legend-colors {
            display: flex;
            gap: 2px;
        }
        
        .legend-box {
            width: 12px;
            height: 12px;
            border-radius: 2px;
        }
        
        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(13, 1fr);
            gap: 4px;
        }
        
        .empty-state {
            text-align: center;
            padding: 2rem;
        }
        
        .empty-state small {
            color: #34D399;
            font-weight: 500;
        }
        
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 2rem;
        }
        
        .streak-info {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: #6B7280;
        }
    `;
    document.head.appendChild(style);

    // Initial load with animation
    setTimeout(updateDashboard, 100);
    
    // Update every 30 seconds for real-time data
    setInterval(updateDashboard, 30000);
});