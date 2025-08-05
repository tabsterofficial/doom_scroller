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
let focusState = { isActive: false, endTime: 0, mission: '' };

// --- Utility Functions ---
function getTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
}

async function dailyRolloverCheck() {
    try {
        const data = await chrome.storage.local.get(['today', 'yesterday']);
        const todayDate = getTodayDateString();
        if (!data.today || data.today.date !== todayDate) {
            const newYesterday = data.today || { date: 'none', sites: {} };
            const newToday = { date: todayDate, sites: {} };
            await chrome.storage.local.set({ today: newToday, yesterday: newYesterday });
        }
    } catch (error) {
        console.error("Error during daily rollover:", error);
    }
}

// --- Focus Mode Logic (Corrected) ---
async function updateBlockingRules() {
    const addRules = [];
    if (focusState.isActive) {
        addRules.push({
            id: BLOCK_RULE_ID,
            priority: 1,
            action: { type: 'block' },
            condition: {
                // This regex is more robust for matching domains
                regexFilter: DOOMSCROLL_SITES.map(host => `^https?://([a-z0-9-]+\\.)*${host.replace('.', '\\.')}/.*`).join('|'),
                resourceTypes: ['main_frame']
            }
        });
    }

    // The correct function is updateDynamicRules, which handles both adding and removing.
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [BLOCK_RULE_ID], // Always attempt to remove the old rule
        addRules: addRules              // Add new rules if focus is active
    });

    if (addRules.length > 0) {
        console.log("Site blocking rules enabled.");
    } else {
        console.log("Site blocking rules disabled.");
    }
}


async function startFocusSession(mission) {
    if (focusState.isActive) return;
    focusState = { isActive: true, endTime: Date.now() + FOCUS_DURATION, mission: mission };
    await chrome.storage.local.set({ focusState });
    await updateBlockingRules();
    chrome.alarms.create('focusTimer', { delayInMinutes: 25 });
    broadcastFocusState();
}

async function stopFocusSession(completed = false) {
    if (!focusState.isActive) return;
    const completedMission = focusState.mission;
    focusState = { isActive: false, endTime: 0, mission: '' };

    await chrome.storage.local.set({ focusState });
    await updateBlockingRules();
    chrome.alarms.clear('focusTimer');

    if (completed) {
        const todayDate = getTodayDateString();
        let { dailyRecords = {} } = await chrome.storage.local.get('dailyRecords');
        if (!dailyRecords[todayDate]) {
            dailyRecords[todayDate] = { scrollTime: 0, focusSessions: 0, completedMissions: [] };
        }
        dailyRecords[todayDate].focusSessions += 1;
        dailyRecords[todayDate].completedMissions.push(completedMission);
        await chrome.storage.local.set({ dailyRecords });

        chrome.notifications.create({ type: 'basic', iconUrl: 'assets/icon128.png', title: 'Mission Complete!', message: `You focused for 25 minutes on: "${completedMission}"` });
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

// --- Time Tracking Logic ---
async function startTracking(host) {
    if (activeHost === host) return;
    stopTracking();

    activeHost = host;
    await chrome.storage.local.set({ activeHost: host });

    timeInterval = setInterval(async () => {
        try {
            await dailyRolloverCheck();
            const todayDate = getTodayDateString();
            let { today, dailyRecords = {} } = await chrome.storage.local.get(['today', 'dailyRecords']);

            if (!today || today.date !== todayDate || typeof today.sites !== 'object') {
                today = { date: todayDate, sites: {} };
            }
            
            if (!dailyRecords[todayDate]) {
                dailyRecords[todayDate] = { scrollTime: 0, focusSessions: 0, completedMissions: [] };
            }

            const newTime = (today.sites[host] || 0) + 1;
            today.sites[host] = newTime;
            dailyRecords[todayDate].scrollTime += 1;

            await chrome.storage.local.set({ today, dailyRecords });
            
            sendTimeToContentScript(host, newTime, true);

        } catch (error) {
            console.error("Error in tracking interval:", error);
            stopTracking();
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
    if (message.type === 'START_FOCUS') startFocusSession(message.mission);
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
        return true;
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
        const isDoomScroll = DOOMSCROLL_SITES.some(site => url.hostname === site || url.hostname.endsWith('.' + site));
        if (isDoomScroll) {
            const primaryHost = DOOMSCROLL_SITES.find(site => url.hostname === site || url.hostname.endsWith('.' + site));
            startTracking(primaryHost);
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
    await updateBlockingRules();
}

chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        await initialize();
    }
});
