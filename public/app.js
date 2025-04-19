// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('tgId');

// Initialize user data
let userData = null;
let miningInterval = null;

// Format time remaining
function formatTimeRemaining(milliseconds) {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)));
    return `${hours.toString().padStart(2, '0')}H ${minutes.toString().padStart(2, '0')}M ${seconds.toString().padStart(2, '0')}S`;
}

// Update mining timer
function updateMiningTimer(nextMiningTime) {
    const timerElement = document.getElementById('miningTimer');
    const miningButton = document.getElementById('startMining');
    
    function updateTimer() {
        const now = new Date();
        const timeRemaining = new Date(nextMiningTime) - now;
        
        if (timeRemaining <= 0) {
            clearInterval(miningInterval);
            timerElement.querySelector('.timer-value').textContent = '00H 00M 00S';
            miningButton.textContent = 'Start Mining';
            miningButton.disabled = false;
            return;
        }
        
        timerElement.querySelector('.timer-value').textContent = formatTimeRemaining(timeRemaining);
        miningButton.textContent = 'Mining in progress';
        miningButton.disabled = true;
    }
    
    updateTimer();
    miningInterval = setInterval(updateTimer, 1000);
}

// Start mining
async function startMining() {
    try {
        const response = await fetch('/api/mining/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            tg.showAlert(`Mining started! You earned ${data.reward} GEN`);
            updateMiningTimer(data.nextMiningTime);
            await fetchUserData(); // Update balance
        } else {
            if (data.error === 'Mining cooldown') {
                updateMiningTimer(data.nextMiningTime);
                tg.showAlert(`Mining is on cooldown. Please wait ${data.minutesRemaining} minutes.`);
            } else {
                tg.showAlert('Error starting mining. Please try again.');
            }
        }
    } catch (error) {
        console.error('Error starting mining:', error);
        tg.showAlert('Error starting mining. Please try again.');
    }
}

// Check mining status
async function checkMiningStatus() {
    try {
        const response = await fetch(`/api/mining/status/${userId}`);
        const data = await response.json();
        
        if (response.ok) {
            if (!data.canMine) {
                updateMiningTimer(data.nextMiningTime);
            } else {
                const miningButton = document.getElementById('startMining');
                miningButton.textContent = 'Start Mining';
                miningButton.disabled = false;
            }
            
            // Update mining rate display
            document.querySelector('.mining-rate').textContent = `${data.miningRate} GEN / H`;
        }
    } catch (error) {
        console.error('Error checking mining status:', error);
    }
}

// Fetch user data
async function fetchUserData() {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        if (data.success) {
            userData = data.data;
            updateUI();
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

// Update UI with user data
function updateUI() {
    // Update user ID and level
    document.getElementById('userId').textContent = userId;
    
    // Update balance
    const balanceElement = document.querySelector('.balance');
    balanceElement.textContent = userData.balance.toFixed(6);
    
    // Update USDT value (assuming 1 GEN = $0.000013 as shown in the image)
    const usdtValue = userData.balance * 0.000013;
    document.querySelector('.balance-usd').textContent = `=${usdtValue.toFixed(6)} USDT`;
}

// Task Center functionality
async function handleTaskAction(taskType) {
    try {
        const response = await fetch('/api/tasks/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskType })
        });

        const data = await response.json();
        
        if (data.success) {
            // Update user balance
            await fetchUserData();
            
            // Update task progress
            const taskElement = document.querySelector(`[data-task="${taskType}"]`);
            if (taskElement) {
                const progressElement = taskElement.querySelector('.task-progress');
                if (progressElement) {
                    progressElement.textContent = data.progress;
                }
                
                // Disable button if task is completed
                const actionButton = taskElement.querySelector('button');
                if (actionButton && data.completed) {
                    actionButton.disabled = true;
                    actionButton.textContent = 'Completed';
                }
            }
        } else {
            alert(data.message || 'Failed to complete task. Please try again.');
        }
    } catch (error) {
        console.error('Error completing task:', error);
        alert('Failed to complete task. Please try again.');
    }
}

// Handle deposits
async function deposit() {
    const amount = prompt('Enter deposit amount:');
    if (!amount) return;

    try {
        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount: parseFloat(amount),
                txHash: 'manual-deposit' // In a real app, you'd get this from a blockchain transaction
            })
        });
        
        if (response.ok) {
            tg.showAlert('Deposit request submitted! Please wait for approval.');
        }
    } catch (error) {
        console.error('Error submitting deposit:', error);
        tg.showAlert('Error processing deposit. Please try again.');
    }
}

// Handle withdrawals
async function withdraw() {
    const amount = prompt('Enter withdrawal amount:');
    if (!amount) return;

    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount: parseFloat(amount),
                type: 'tokens'
            })
        });
        
        if (response.ok) {
            await fetchUserData();
            tg.showAlert('Withdrawal request submitted! Please wait for approval.');
        }
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        tg.showAlert('Error processing withdrawal. Please try again.');
    }
}

// Handle staking
async function stake() {
    const amount = prompt('Enter amount to stake:');
    if (!amount) return;

    try {
        const response = await fetch('/api/stake', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount: parseFloat(amount)
            })
        });
        
        if (response.ok) {
            await fetchUserData();
            tg.showAlert('Tokens staked successfully!');
        }
    } catch (error) {
        console.error('Error staking tokens:', error);
        tg.showAlert('Error staking tokens. Please try again.');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (userId) {
        fetchUserData();
        checkMiningStatus();
        
        // Add mining button click handler
        const miningButton = document.getElementById('startMining');
        miningButton.addEventListener('click', startMining);
    }

    // Task button event listeners
    const taskButtons = document.querySelectorAll('.follow-btn, .invite-btn');
    taskButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const taskType = e.target.closest('.task-card').dataset.task;
            handleTaskAction(taskType);
        });
    });

    const depositBtns = document.querySelectorAll('.deposit-btn');
    depositBtns.forEach(btn => {
        btn.addEventListener('click', deposit);
    });

    const withdrawBtns = document.querySelectorAll('.withdraw-btn');
    withdrawBtns.forEach(btn => {
        btn.addEventListener('click', withdraw);
    });

    const stakeBtns = document.querySelectorAll('.stake-btn');
    stakeBtns.forEach(btn => {
        btn.addEventListener('click', stake);
    });
}); 