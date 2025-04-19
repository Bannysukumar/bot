// Mining configuration
const MINING_CONFIG = {
    rate: 2, // 2 tokens per hour
    interval: 1, // 1 hour interval
    checkInterval: 60000 // Check every minute
};

// Mining state
let miningState = {
    isMining: false,
    lastMiningTime: null,
    nextMiningTime: null
};

// Initialize mining
async function initMining() {
    // Load mining state from server
    try {
        const response = await fetch('/api/mining/state');
        if (response.ok) {
            miningState = await response.json();
            updateMiningUI();
        }
    } catch (error) {
        console.error('Error loading mining state:', error);
    }

    // Start checking mining status
    setInterval(checkMiningStatus, MINING_CONFIG.checkInterval);
}

// Check mining status
async function checkMiningStatus() {
    if (!miningState.isMining) return;

    const now = new Date();
    if (now >= new Date(miningState.nextMiningTime)) {
        await claimMiningReward();
    }

    updateMiningUI();
}

// Start mining
async function startMining() {
    try {
        const response = await fetch('/api/mining/start', {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to start mining');

        const data = await response.json();
        miningState = {
            isMining: true,
            lastMiningTime: data.lastMiningTime,
            nextMiningTime: data.nextMiningTime
        };

        updateMiningUI();
        alert('Mining started successfully!');
    } catch (error) {
        console.error('Error starting mining:', error);
        alert('Failed to start mining. Please try again.');
    }
}

// Claim mining reward
async function claimMiningReward() {
    try {
        const response = await fetch('/api/mining/claim', {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to claim mining reward');

        const data = await response.json();
        miningState = {
            isMining: true,
            lastMiningTime: data.lastMiningTime,
            nextMiningTime: data.nextMiningTime
        };

        updateMiningUI();
        alert(`You earned ${MINING_CONFIG.rate} GEN tokens!`);
    } catch (error) {
        console.error('Error claiming mining reward:', error);
        alert('Failed to claim mining reward. Please try again.');
    }
}

// Update mining UI
function updateMiningUI() {
    const miningButton = document.getElementById('miningButton');
    const miningStatus = document.getElementById('miningStatus');
    const nextMiningTime = document.getElementById('nextMiningTime');

    if (miningState.isMining) {
        miningButton.textContent = 'Mining in Progress...';
        miningButton.disabled = true;
        miningStatus.textContent = 'Active';
        miningStatus.className = 'status-active';

        if (miningState.nextMiningTime) {
            const timeLeft = Math.max(0, Math.ceil((new Date(miningState.nextMiningTime) - new Date()) / 1000 / 60));
            nextMiningTime.textContent = `Next reward in ${timeLeft} minutes`;
        }
    } else {
        miningButton.textContent = 'Start Mining';
        miningButton.disabled = false;
        miningStatus.textContent = 'Inactive';
        miningStatus.className = 'status-inactive';
        nextMiningTime.textContent = 'Not mining';
    }
}

// Listen for mining updates
if (window.BroadcastChannel) {
    const channel = new BroadcastChannel('mining-updates');
    channel.onmessage = (event) => {
        if (event.data.type === 'mining-settings-updated') {
            if (event.data.status === 'inactive') {
                miningState.isMining = false;
                updateMiningUI();
            }
        }
    };
}

// Initialize mining when the page loads
document.addEventListener('DOMContentLoaded', initMining); 