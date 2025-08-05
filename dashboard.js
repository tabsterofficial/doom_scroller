// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const totalTimeTodayEl = document.getElementById('total-time-today');
    const productivityScoreEl = document.getElementById('productivity-score');
    const worstOffenderEl = document.getElementById('worst-offender');
    const scrollChartCanvas = document.getElementById('scroll-chart').getContext('2d');
    const sitesListEl = document.getElementById('sites-list-detailed');
    const calendarHeatmapEl = document.getElementById('calendar-heatmap');

    let scrollChart = null;

    // --- Utility Functions ---

    /**
     * Formats total seconds into a human-readable string (e.g., 1h 25m 3s).
     * @param {number} totalSeconds - The total seconds to format.
     * @returns {string} The formatted time string.
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
     * Calculates a productivity score.
     * @param {number} scrollTime - Time spent scrolling in seconds.
     * @param {number} focusSessions - Number of completed focus sessions.
     * @returns {string} The calculated score.
     */
    function calculateProductivityScore(scrollTime, focusSessions) {
        const scrollHours = scrollTime / 3600;
        const focusHours = focusSessions * (25 / 60);
        if (scrollHours === 0 && focusHours === 0) return 'N/A';
        const ratio = focusHours / (scrollHours + focusHours);
        const score = Math.round(ratio * 100);
        if (isNaN(score)) return 'N/A';
        return `${score}%`;
    }

    // --- UI Update Functions ---

    /**
     * Updates the top statistics cards.
     * @param {object} todayData - Today's site data.
     * @param {object} dailyRecord - Today's daily record.
     */
    function updateStatsCards(todayData, dailyRecord) {
        const sites = todayData.sites || {};
        const totalTime = Object.values(sites).reduce((sum, time) => sum + time, 0);
        totalTimeTodayEl.textContent = formatTime(totalTime);

        // Find the worst offender
        const worst = Object.entries(sites).sort(([, a], [, b]) => b - a)[0];
        worstOffenderEl.textContent = worst ? worst[0] : 'None';

        // Update productivity score
        const focusSessions = dailyRecord ? dailyRecord.focusSessions : 0;
        productivityScoreEl.textContent = calculateProductivityScore(totalTime, focusSessions);
    }

    /**
     * Renders the doughnut chart for today's scroll time breakdown.
     * @param {object} todayData - Today's site data.
     */
    function renderTodayChart(todayData) {
        const sites = todayData.sites || {};
        const labels = Object.keys(sites);
        const data = Object.values(sites);

        const chartColors = [
            '#F87171', '#60A5FA', '#FBBF24', '#34D399',
            '#A78BFA', '#F472B6', '#FDE68A'
        ];

        if (scrollChart) {
            scrollChart.destroy();
        }

        if (labels.length === 0) {
            // You can add a message in the canvas if there's no data
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
                    label: 'Time Wasted',
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: '#1F2937',
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${formatTime(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Renders the detailed list of time spent per site.
     * @param {object} todayData - Today's site data.
     */
    function renderDetailedSiteList(todayData) {
        const sites = todayData.sites || {};
        const sortedSites = Object.entries(sites).sort(([, a], [, b]) => b - a);

        sitesListEl.innerHTML = ''; // Clear the list

        if (sortedSites.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'site-item-empty';
            emptyItem.textContent = 'No data yet. Go waste some time!';
            sitesListEl.appendChild(emptyItem);
        } else {
            sortedSites.forEach(([host, time]) => {
                const listItem = document.createElement('li');
                listItem.className = 'site-item';
                listItem.innerHTML = `
                    <span class="host">${host}</span>
                    <span class="time">${formatTime(time)}</span>
                `;
                sitesListEl.appendChild(listItem);
            });
        }
    }

    /**
     * Generates the calendar heatmap for the last 90 days.
     * @param {object} dailyRecords - All daily records.
     */
    function generateCalendarHeatmap(dailyRecords) {
        calendarHeatmapEl.innerHTML = ''; // Clear previous calendar
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 89); // 90 days total

        for (let i = 0; i < 90; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

            const record = dailyRecords[dateString];
            const scrollTime = record ? record.scrollTime : 0;
            const focusSessions = record ? record.focusSessions : 0;

            // Determine color based on scroll time
            let level = 'l0'; // Default blue (good)
            if (scrollTime > 3600 * 2) level = 'l4'; // Red (very high)
            else if (scrollTime > 3600) level = 'l3'; // Orange
            else if (scrollTime > 1800) level = 'l2'; // Yellow
            else if (scrollTime > 0) level = 'l1'; // Green (low)

            const box = document.createElement('div');
            box.className = `cal-box ${level}`;
            box.title = `${dateString}\nScroll: ${formatTime(scrollTime)}\nFocus Sessions: ${focusSessions}`;

            if (focusSessions > 0) {
                const marker = document.createElement('div');
                marker.className = 'focus-marker';
                marker.title = `${focusSessions} focus session(s) completed.`;
                box.appendChild(marker);
            }

            calendarHeatmapEl.appendChild(box);
        }
    }

    // --- Main Function ---
    async function updateDashboard() {
        try {
            const data = await chrome.storage.local.get(['today', 'dailyRecords']);
            const todayData = data.today || { sites: {} };
            const dailyRecords = data.dailyRecords || {};
            const todayDate = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`;
            const todayRecord = dailyRecords[todayDate] || { scrollTime: 0, focusSessions: 0 };

            updateStatsCards(todayData, todayRecord);
            renderTodayChart(todayData);
            renderDetailedSiteList(todayData);
            generateCalendarHeatmap(dailyRecords);
        } catch (error) {
            console.error("Failed to update dashboard:", error);
            // Display an error message to the user
            document.body.innerHTML = '<div class="error-message">Could not load dashboard data. Please try again later.</div>';
        }
    }

    // Initial load
    updateDashboard();
});
