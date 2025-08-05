// background.js - Enhanced version with improved features

// --- Configuration ---
const DOOMSCROLL_SITES = [
  'youtube.com', 'reddit.com', 'x.com', 'twitter.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com',
  'pinterest.com', 'snapchat.com', 'twitch.tv', 'discord.com'
];
const FOCUS_DURATION = 25 * 60 * 1000; // 25 minutes in milliseconds
const BLOCK_RULE_ID_START = 1; // Use a starting ID for rules
const WARNING_THRESHOLD = 30 * 60; // 30 minutes warning
const DANGER_THRESHOLD = 60 * 60; // 1 hour danger zone

let activeHost = null;
let timeInterval = null;
let focusState = { isActive: false, endTime: 0, mission: '' };
let warningShown = false;
let streakData = { current: 0, longest: 0, lastFocusDate: null };

// --- Utility Functions ---
function getTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
}

async function dailyRolloverCheck() {
    try {
        const data = await chrome.storage.local.get(['today', 'yesterday', 'streakData']);
        const todayDate = getTodayDateString();
        
        if (!data.today || data.today.date !== todayDate) {
            const newYesterday = data.today || { date: 'none', sites: {} };
            const newToday = { date: todayDate, sites: {} };
            await chrome.storage.local.set({ today: newToday, yesterday: newYesterday });
            warningShown = false;
        }
        
        if (!data.streakData) {
            streakData = { current: 0, longest: 0, lastFocusDate: null };
            await chrome.storage.local.set({ streakData });
        } else {
            streakData = data.streakData;
        }
    } catch (error) {
        console.error("Error during daily rollover:", error);
    }
}

// --- Enhanced Focus Mode Logic ---
async function updateBlockingRules() {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = currentRules.map(rule => rule.id);
    const addRules = [];

    if (focusState.isActive) {
        DOOMSCROLL_SITES.forEach((host, index) => {
            addRules.push({
                id: BLOCK_RULE_ID_START + index,
                priority: 1,
                action: { 
                    type: 'redirect',
                    redirect: { 
                        extensionPath: '/focus.html' // Redirect to a dedicated focus page
                    }
                },
                condition: {
                    // More efficient domain matching
                    urlFilter: `||${host}/`,
                    resourceTypes: ['main_frame']
                }
            });
        });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeRuleIds,
        addRules: addRules
    });

    console.log(addRules.length > 0 ? "Site blocking rules enabled." : "Site blocking rules disabled.");
}

async function startFocusSession(mission) {
    if (focusState.isActive) return;
    
    focusState = { 
        isActive: true, 
        endTime: Date.now() + FOCUS_DURATION, 
        mission: mission,
        startTime: Date.now()
    };
    
    await chrome.storage.local.set({ focusState });
    await updateBlockingRules();
    chrome.alarms.create('focusTimer', { delayInMinutes: 25 });
    broadcastFocusState();
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon128.png',
        title: 'Focus Session Started!',
        message: `Mission: "${mission}". Stay strong for 25 minutes!`
    });
}

async function stopFocusSession(completed = false) {
    if (!focusState.isActive) return;
    
    const completedMission = focusState.mission;
    const sessionDuration = Date.now() - focusState.startTime;
    
    focusState = { isActive: false, endTime: 0, mission: '' };
    await chrome.storage.local.set({ focusState });
    await updateBlockingRules();
    chrome.alarms.clear('focusTimer');

    if (completed) {
        await updateFocusStats(completedMission, sessionDuration);
        await updateStreak(true);
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon128.png',
            title: '🎉 Mission Complete!',
            message: `Great work! You focused for 25 minutes on: "${completedMission}"`
        });
    } else {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon128.png',
            title: 'Focus Session Ended',
            message: 'Don\'t worry, you can try again anytime!'
        });
    }
    
    broadcastFocusState();
}

async function updateFocusStats(mission, duration) {
    const todayDate = getTodayDateString();
    let { dailyRecords = {} } = await chrome.storage.local.get('dailyRecords');
    
    if (!dailyRecords[todayDate]) {
        dailyRecords[todayDate] = { 
            scrollTime: 0, 
            focusSessions: 0, 
            completedMissions: [],
            totalFocusTime: 0
        };
    }
    
    dailyRecords[todayDate].focusSessions += 1;
    dailyRecords[todayDate].completedMissions.push({
        mission,
        duration,
        timestamp: Date.now()
    });
    dailyRecords[todayDate].totalFocusTime += duration;
    
    await chrome.storage.local.set({ dailyRecords });
}

async function updateStreak(completed) {
    const todayDate = getTodayDateString();
    
    if (completed) {
        if (streakData.lastFocusDate === todayDate) {
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        
        if (streakData.lastFocusDate === yesterdayDate || streakData.current === 0) {
            streakData.current += 1;
        } else {
            streakData.current = 1;
        }
        
        streakData.longest = Math.max(streakData.longest, streakData.current);
        streakData.lastFocusDate = todayDate;
        
        await chrome.storage.local.set({ streakData });
    }
}

function broadcastFocusState() {
    chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATE', focusState }).catch(() => {});
}

function sendTimeToContentScript(host, time, isTracking) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { 
                type: 'SHAME_UPDATE', 
                host, 
                time, 
                isTracking,
                warningLevel: getWarningLevel(time)
            }, () => {
                if (chrome.runtime.lastError) { /* Suppress error */ }
            });
        }
    });
}

function getWarningLevel(timeInSeconds) {
    if (timeInSeconds >= DANGER_THRESHOLD) return 'danger';
    if (timeInSeconds >= WARNING_THRESHOLD) return 'warning';
    return 'normal';
}

async function checkTimeWarnings(host, time) {
    if (time >= WARNING_THRESHOLD && !warningShown) {
        warningShown = true;
        try {
            const response = await fetch(chrome.runtime.getURL('assets/shame-alerts.json'));
            const data = await response.json();
            const randomAlert = data.alerts[Math.floor(Math.random() * data.alerts.length)];
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon128.png',
                title: '⚠️ Time Warning',
                message: randomAlert
            });
        } catch (error) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon128.png',
                title: '⚠️ Time Warning',
                message: `You've been on ${host} for ${Math.floor(time/60)} minutes. Maybe take a break?`
            });
        }
    }
}

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
                dailyRecords[todayDate] = { 
                    scrollTime: 0, 
                    focusSessions: 0, 
                    completedMissions: [],
                    totalFocusTime: 0
                };
            }

            const newTime = (today.sites[host] || 0) + 1;
            today.sites[host] = newTime;
            dailyRecords[todayDate].scrollTime += 1;

            await chrome.storage.local.set({ today, dailyRecords });
            sendTimeToContentScript(host, newTime, true);
            
            await checkTimeWarnings(host, newTime);

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
    warningShown = false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_FOCUS':
            startFocusSession(message.mission);
            break;
        case 'STOP_FOCUS':
            stopFocusSession(false);
            break;
        case 'GET_FOCUS_STATE':
            sendResponse({ focusState });
            break;
        case 'GET_STREAK_DATA':
            sendResponse({ streakData });
            break;
        case 'GET_CURRENT_STATUS':
            if (activeHost) {
                chrome.storage.local.get('today', ({ today }) => {
                    const time = today?.sites?.[activeHost] || 0;
                    sendResponse({ 
                        isTracking: true, 
                        host: activeHost, 
                        time: time,
                        warningLevel: getWarningLevel(time)
                    });
                });
            } else {
                sendResponse({ isTracking: false });
            }
            return true;
        case 'DISMISS_WARNING':
            warningShown = false;
            break;
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'focusTimer') {
        stopFocusSession(true);
    }
});

function handleTabChange(tab) {
    if (focusState.isActive || !tab || !tab.url) {
        stopTracking();
        return;
    }
    
    try {
        const url = new URL(tab.url);
        const hostname = url.hostname;

        const matchedSite = DOOMSCROLL_SITES.find(site =>
            hostname === site || hostname.endsWith('.' + site)
        );

        if (matchedSite) {
            startTracking(matchedSite);
        } else {
            stopTracking();
        }
    } catch (e) {
        stopTracking();
    }
}

chrome.tabs.onActivated.addListener(activeInfo => 
    chrome.tabs.get(activeInfo.tabId, handleTabChange)
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.url) handleTabChange(tab);
});

chrome.windows.onFocusChanged.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0) handleTabChange(tabs[0]);
    });
});

async function initialize() {
    await dailyRolloverCheck();
    const data = await chrome.storage.local.get(['focusState', 'streakData']);
    
    if (data.focusState) {
        focusState = data.focusState;
        if (focusState.isActive && Date.now() > focusState.endTime) {
            await stopFocusSession(true);
        }
    }
    
    if (data.streakData) {
        streakData = data.streakData;
    }
    
    await updateBlockingRules();
}

chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        await initialize();
        if (details.reason === 'install') {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon128.png',
                title: 'Welcome to ShameScroll!',
                message: 'Start tracking your digital wellness journey today.'
            });
        }
    }
});
