// background.js

// --- Configuration ---
const DOOMSCROLL_SITES = [
  'youtube.com', 'reddit.com', 'x.com', 'twitter.com',
  'facebook.com', 'instagram.com', 'tiktok.com',
];
const FOCUS_DURATION = 25 * 60 * 1000; // 25 minutes in milliseconds
const BLOCK_RULE_ID = 1;

let activeHost = null;
let timeInterval = null;
let focusState = { isActive: false, endTime: 0 };

// --- Utility Functions ---
function getTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
}

async function dailyDataUpdate(updateFn) {
    try {
        const todayDate = getTodayDateString();
        let { dailyRecords = {} } = await chrome.storage.local.get('dailyRecords');
        if (!dailyRecords[todayDate]) {
            dailyRecords[todayDate] = { scrollTime: 0, focusSessions: 0 };
        }
        updateFn(dailyRecords[todayDate]);
        await chrome.storage.local.set({ dailyRecords });
    } catch (error) {
        console.error("Error updating daily data:", error);
    }
}

async function dailyRolloverCheck() {
    const data = await chrome.storage.local.get(['today', 'yesterday']);
    const todayDate = getTodayDateString();
    if (!data.today || data.today.date !== todayDate) {
        const newYesterday = data.today || { date: 'none', sites: {} };
        const newToday = { date: todayDate, sites: {} };
        await chrome.storage.local.set({ today: newToday, yesterday: newYesterday });
    }
}

// --- Focus Mode Logic ---
async function updateBlockingRules() {
    await chrome.declarativeNetRequest.removeDynamicRules({ removeRuleIds: [BLOCK_RULE_ID] });
    if (focusState.isActive) {
        await chrome.declarativeNetRequest.addDynamicRules({
            addRules: [{
                id: BLOCK_RULE_ID,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    urlFilter: `||*${DOOMSCROLL_SITES.join('*^||*')}*`,
                    resourceTypes: ['main_frame']
                }
            }]
        });
    }
}

async function startFocusSession() {
    if (focusState.isActive) return;
    focusState = { isActive: true, endTime: Date.now() + FOCUS_DURATION };
    await chrome.storage.local.set({ focusState });
    await updateBlockingRules();
    chrome.alarms.create('focusTimer', { delayInMinutes: 25 });
    broadcastFocusState();
}

async function stopFocusSession(completed = false) {
    if (!focusState.isActive) return;
    focusState = { isActive: false, endTime: 0 };
    await chrome.storage.local.set({ focusState });
    await updateBlockingRules();
    chrome.alarms.clear('focusTimer');
    if (completed) {
        await dailyDataUpdate(record => record.focusSessions += 1);
        chrome.notifications.create({ type: 'basic', iconUrl: 'assets/icon128.png', title: 'Focus Session Complete!', message: 'Great job! Time for a short break.' });
    }
    broadcastFocusState();
}

function broadcastFocusState() {
    chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATE', focusState });
}

function sendTimeToContentScript(host, time, isTracking) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SHAME_UPDATE', host, time, isTracking }, () => {
                if (chrome.runtime.lastError) { /* Suppress error */ }
            });
        }
    });
}

// --- Time Tracking Logic (Corrected) ---
async function startTracking(host) {
    if (activeHost === host) return;
    stopTracking(); // Ensure any old timers are cleared

    activeHost = host;
    await chrome.storage.local.set({ activeHost: host });
    await dailyRolloverCheck(); // Check for new day once at the start

    timeInterval = setInterval(async () => {
        try {
            // More robust way to get and update data
            const { today } = await chrome.storage.local.get('today');
            
            const currentSites = today && today.sites ? today.sites : {};
            const newTime = (currentSites[host] || 0) + 1;
            
            const newTodayObject = {
                date: today ? today.date : getTodayDateString(),
                sites: {
                    ...currentSites,
                    [host]: newTime
                }
            };

            await chrome.storage.local.set({ today: newTodayObject });
            await dailyDataUpdate(record => { record.scrollTime += 1; });
            
            // Send the update to the content script
            sendTimeToContentScript(host, newTime, true);
        } catch (error) {
            console.error("Error in tracking interval:", error);
            stopTracking(); // Stop on error to prevent issues
        }
    }, 1000);
}

function stopTracking() {
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
    if (activeHost) {
        sendTimeToContentScript(activeHost, 0, false);
        activeHost = null;
        chrome.storage.local.set({ activeHost: null });
    }
}

// --- Event Listeners ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_FOCUS') startFocusSession();
    else if (message.type === 'STOP_FOCUS') stopFocusSession(false);
    else if (message.type === 'GET_FOCUS_STATE') sendResponse({ focusState });
    else if (message.type === 'GET_CURRENT_STATUS') {
        if (activeHost) {
            chrome.storage.local.get('today', ({ today }) => {
                const time = today && today.sites ? today.sites[activeHost] || 0 : 0;
                sendResponse({ isTracking: true, host: activeHost, time: time });
            });
        } else {
            sendResponse({ isTracking: false });
        }
        return true; // Required for async response
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'focusTimer') stopFocusSession(true);
});

function handleTabChange(tab) {
    if (focusState.isActive || !tab || !tab.url) {
        stopTracking();
        return;
    }
    try {
        const url = new URL(tab.url);
        const isDoomScroll = DOOMSCROLL_SITES.some(site => url.hostname.includes(site));
        if (isDoomScroll) {
            startTracking(url.hostname);
        } else {
            stopTracking();
        }
    } catch (e) {
        stopTracking();
    }
}

chrome.tabs.onActivated.addListener(activeInfo => chrome.tabs.get(activeInfo.tabId, handleTabChange));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.url) handleTabChange(tab);
});
chrome.windows.onFocusChanged.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0) handleTabChange(tabs[0]);
    });
});

// --- Initialization ---
async function initialize() {
    await dailyRolloverCheck();
    const data = await chrome.storage.local.get('focusState');
    if (data.focusState) focusState = data.focusState;
    updateBlockingRules();
}

chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);
