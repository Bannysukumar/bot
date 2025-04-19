// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('tgId');

// Constants
const ADMIN_FEE_PERCENTAGE = 12;
const MIN_SWAP_AMOUNT = 100;
const GEN_PRICE = 0.000013; // Base price in USDT

// DOM Elements
const genBalance = document.getElementById('genBalance');
const usdtBalance = document.getElementById('usdtBalance');
const genValue = document.getElementById('genValue');
const usdtValue = document.getElementById('usdtValue');
const swapAmount = document.getElementById('swapAmount');
const receiveAmount = document.getElementById('receiveAmount');
const feeAmount = document.getElementById('feeAmount');
const swapButton = document.getElementById('swapButton');
const maxButton = document.querySelector('.max-btn');
const historyList = document.getElementById('historyList');
const walletAddress = document.getElementById('walletAddress');
const copyAddressBtn = document.getElementById('copyAddress');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "web-bot-7454c.firebaseapp.com",
  databaseURL: "https://web-bot-7454c-default-rtdb.firebaseio.com",
  projectId: "web-bot-7454c",
  storageBucket: "web-bot-7454c.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database();

// Function to send real-time updates
function sendUpdate(type, data) {
  const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
  rtdb.ref('updates').push({
    userId,
    type,
    data
  });
}

// Calculate swap details
function calculateSwapDetails(amount) {
    const fee = (amount * ADMIN_FEE_PERCENTAGE) / 100;
    const amountAfterFee = amount - fee;
    const usdtAmount = amountAfterFee * GEN_PRICE;
    
    return {
        fee,
        usdtAmount
    };
}

// Update swap details display
function updateSwapDetails() {
    const amount = parseFloat(swapAmount.value) || 0;
    const availableBalance = parseFloat(genBalance.textContent);
    
    // Update available balance display
    document.getElementById('availableBalance').textContent = `${availableBalance.toFixed(6)} GEN`;
    
    if (amount < MIN_SWAP_AMOUNT) {
        receiveAmount.textContent = '0.00 USDT';
        feeAmount.textContent = '0.00 GEN';
        swapButton.disabled = true;
        swapButton.classList.add('disabled');
        return;
    }
    
    if (amount > availableBalance) {
        swapButton.disabled = true;
        swapButton.classList.add('disabled');
        return;
    }
    
    const { fee, usdtAmount } = calculateSwapDetails(amount);
    
    receiveAmount.textContent = `${usdtAmount.toFixed(6)} USDT`;
    feeAmount.textContent = `${fee.toFixed(6)} GEN`;
    swapButton.disabled = false;
    swapButton.classList.remove('disabled');
}

// Handle swap execution
async function executeSwap() {
    const amount = parseFloat(swapAmount.value);
    const availableBalance = parseFloat(genBalance.textContent);
    
    if (!amount || amount < MIN_SWAP_AMOUNT) {
        tg.showAlert(`Minimum swap amount is ${MIN_SWAP_AMOUNT} GEN`);
        return;
    }
    
    if (amount > availableBalance) {
        tg.showAlert('Insufficient GEN balance');
        return;
    }
    
    const { fee, usdtAmount } = calculateSwapDetails(amount);
    
    // Show confirmation dialog
    const confirmed = await tg.showConfirm(
        `Are you sure you want to swap ${amount.toFixed(6)} GEN to ${usdtAmount.toFixed(6)} USDT?\n` +
        `Admin Fee: ${fee.toFixed(6)} GEN (12%)`
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount,
                fee,
                usdtAmount,
                timestamp: new Date().toISOString()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update balances
            genBalance.textContent = data.genBalance.toFixed(6);
            usdtBalance.textContent = data.usdtBalance.toFixed(6);
            updateTokenValues();
            
            // Clear input
            swapAmount.value = '';
            updateSwapDetails();
            
            // Add to transaction history
            addTransactionToList('swap', amount, usdtAmount, fee);
            
            // Send real-time update
            sendUpdate('balance', {
                balance: data.genBalance
            });
            
            tg.showAlert('Swap completed successfully!');
        } else {
            tg.showAlert(data.message || 'Failed to execute swap');
        }
    } catch (error) {
        console.error('Error executing swap:', error);
        tg.showAlert('Error executing swap. Please try again.');
    }
}

// Update token values in USD
function updateTokenValues() {
    const genAmount = parseFloat(genBalance.textContent);
    const usdtAmount = parseFloat(usdtBalance.textContent);
    
    genValue.textContent = `$${(genAmount * GEN_PRICE).toFixed(6)}`;
    usdtValue.textContent = `$${usdtAmount.toFixed(6)}`;
}

// Add transaction to history list
function addTransactionToList(type, amount, usdtAmount, fee) {
    const transaction = document.createElement('div');
    transaction.className = 'transaction-item';
    
    const timestamp = new Date().toLocaleString();
    
    transaction.innerHTML = `
        <div class="transaction-type ${type}">${type.toUpperCase()}</div>
        <div class="transaction-details">
            <div class="amount">${amount.toFixed(6)} GEN</div>
            <div class="usdt-amount">${usdtAmount.toFixed(6)} USDT</div>
            <div class="fee">Fee: ${fee.toFixed(6)} GEN</div>
        </div>
        <div class="transaction-time">${timestamp}</div>
    `;
    
    historyList.insertBefore(transaction, historyList.firstChild);
}

// Fetch user balances
async function fetchBalances() {
    try {
        const response = await fetch(`/api/balances/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            genBalance.textContent = data.genBalance.toFixed(6);
            usdtBalance.textContent = data.usdtBalance.toFixed(6);
            updateTokenValues();
        }
    } catch (error) {
        console.error('Error fetching balances:', error);
    }
}

// Fetch transaction history
async function fetchTransactionHistory() {
    try {
        const response = await fetch(`/api/transactions/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            historyList.innerHTML = '';
            data.transactions.forEach(transaction => {
                addTransactionToList(
                    transaction.type,
                    transaction.amount,
                    transaction.usdtAmount,
                    transaction.fee
                );
            });
        }
    } catch (error) {
        console.error('Error fetching transaction history:', error);
    }
}

// Copy wallet address
function copyWalletAddress() {
    navigator.clipboard.writeText(walletAddress.textContent)
        .then(() => {
            tg.showAlert('Wallet address copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy wallet address:', err);
        });
}

// Modal handling functions
function showDepositModal() {
    const modal = document.getElementById('depositModal');
    modal.style.display = 'block';
}

function showWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

// Deposit functions
function copyDepositAddress() {
    const depositAddress = document.getElementById('depositAddress');
    navigator.clipboard.writeText(depositAddress.value)
        .then(() => {
            tg.showAlert('Deposit address copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy deposit address:', err);
        });
}

async function handleDepositSubmit(event) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const transactionHash = document.getElementById('transactionHash').value;

    if (!amount || amount < 2) {
        tg.showAlert('Minimum deposit amount is 2 USDT');
        return;
    }

    if (!transactionHash) {
        tg.showAlert('Please enter your transaction hash');
        return;
    }

    try {
        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount,
                transactionHash,
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();
        
        if (data.success) {
            tg.showAlert('Deposit submitted successfully!');
            closeModal('depositModal');
            fetchBalances();
            addTransactionToList('deposit', amount, 0, 0);
        } else {
            tg.showAlert(data.message || 'Failed to submit deposit');
        }
    } catch (error) {
        console.error('Error submitting deposit:', error);
        tg.showAlert('Error submitting deposit. Please try again.');
    }
}

// Withdraw functions
async function handleWalletBinding(event) {
    event.preventDefault();
    const walletAddress = document.getElementById('bindWalletAddress').value;

    if (!walletAddress) {
        tg.showAlert('Please enter your BEP20 wallet address');
        return;
    }

    try {
        const response = await fetch('/api/bind-wallet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                walletAddress
            })
        });

        const data = await response.json();
        
        if (data.success) {
            document.getElementById('walletBindingSection').style.display = 'none';
            document.getElementById('withdrawFormSection').style.display = 'block';
            document.getElementById('boundWalletAddress').textContent = walletAddress;
        } else {
            tg.showAlert(data.message || 'Failed to bind wallet');
        }
    } catch (error) {
        console.error('Error binding wallet:', error);
        tg.showAlert('Error binding wallet. Please try again.');
    }
}

async function handleWithdrawSubmit(event) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const availableBalance = parseFloat(usdtBalance.textContent);

    if (!amount || amount < 5) {
        tg.showAlert('Minimum withdrawal amount is 5 USDT');
        return;
    }

    if (amount > availableBalance) {
        tg.showAlert('Insufficient USDT balance');
        return;
    }

    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount,
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();
        
        if (data.success) {
            tg.showAlert('Withdrawal submitted successfully!');
            closeModal('withdrawModal');
            fetchBalances();
            addTransactionToList('withdraw', amount, 0, 1); // 1 USDT fee
        } else {
            tg.showAlert(data.message || 'Failed to submit withdrawal');
        }
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        tg.showAlert('Error submitting withdrawal. Please try again.');
    }
}

// Event Listeners
swapAmount.addEventListener('input', updateSwapDetails);
maxButton.addEventListener('click', () => {
    swapAmount.value = genBalance.textContent;
    updateSwapDetails();
});
swapButton.addEventListener('click', executeSwap);
copyAddressBtn.addEventListener('click', copyWalletAddress);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (userId) {
        fetchBalances();
        fetchTransactionHistory();
        
        // Set up periodic updates
        setInterval(fetchBalances, 30000); // Update every 30 seconds

        // Modal close buttons
        document.querySelector('.close-modal').addEventListener('click', () => closeModal('depositModal'));
        document.querySelector('.close-modal-withdraw').addEventListener('click', () => closeModal('withdrawModal'));

        // Deposit form
        document.getElementById('depositForm').addEventListener('submit', handleDepositSubmit);

        // Withdraw form
        document.getElementById('bindWalletBtn').addEventListener('click', handleWalletBinding);
        document.getElementById('withdrawForm').addEventListener('submit', handleWithdrawSubmit);

        // MAX buttons
        document.querySelector('.max-withdraw-btn').addEventListener('click', () => {
            const withdrawAmount = document.getElementById('withdrawAmount');
            const availableBalance = parseFloat(usdtBalance.textContent);
            withdrawAmount.value = availableBalance;
            document.getElementById('receiveWithdrawAmount').textContent = (availableBalance - 1).toFixed(6); // Subtract 1 USDT fee
        });
    }
}); 