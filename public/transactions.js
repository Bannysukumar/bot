// Transaction configuration
const TRANSACTION_CONFIG = {
    minDeposit: 2, // Minimum deposit amount in USDT
    minWithdrawal: 5, // Minimum withdrawal amount in USDT
    checkInterval: 30000 // Check transaction status every 30 seconds
};

// Transaction state
let transactionState = {
    pendingDeposits: [],
    pendingWithdrawals: []
};

// Initialize transactions
async function initTransactions() {
    await loadPendingTransactions();
    setInterval(checkTransactionStatus, TRANSACTION_CONFIG.checkInterval);
}

// Load pending transactions
async function loadPendingTransactions() {
    try {
        const [deposits, withdrawals] = await Promise.all([
            fetch('/api/transactions/deposits').then(res => res.json()),
            fetch('/api/transactions/withdrawals').then(res => res.json())
        ]);

        transactionState.pendingDeposits = deposits;
        transactionState.pendingWithdrawals = withdrawals;
        updateTransactionUI();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Submit deposit request
async function submitDeposit(amount, txHash) {
    if (amount < TRANSACTION_CONFIG.minDeposit) {
        alert(`Minimum deposit amount is ${TRANSACTION_CONFIG.minDeposit} USDT`);
        return;
    }

    try {
        const response = await fetch('/api/transactions/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                txHash,
                userId: window.Telegram.WebApp.initDataUnsafe.user.id
            })
        });

        if (!response.ok) throw new Error('Failed to submit deposit');

        const data = await response.json();
        transactionState.pendingDeposits.push(data);
        updateTransactionUI();
        alert('Deposit request submitted successfully!');
        
        // Notify admin panel
        notifyAdmin('deposit', data);
    } catch (error) {
        console.error('Error submitting deposit:', error);
        alert('Failed to submit deposit. Please try again.');
    }
}

// Submit withdrawal request
async function submitWithdrawal(amount, address) {
    if (amount < TRANSACTION_CONFIG.minWithdrawal) {
        alert(`Minimum withdrawal amount is ${TRANSACTION_CONFIG.minWithdrawal} USDT`);
        return;
    }

    try {
        const response = await fetch('/api/transactions/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                address,
                userId: window.Telegram.WebApp.initDataUnsafe.user.id
            })
        });

        if (!response.ok) throw new Error('Failed to submit withdrawal');

        const data = await response.json();
        transactionState.pendingWithdrawals.push(data);
        updateTransactionUI();
        alert('Withdrawal request submitted successfully!');
        
        // Notify admin panel
        notifyAdmin('withdrawal', data);
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        alert('Failed to submit withdrawal. Please try again.');
    }
}

// Check transaction status
async function checkTransactionStatus() {
    try {
        const [deposits, withdrawals] = await Promise.all([
            fetch('/api/transactions/deposits/status').then(res => res.json()),
            fetch('/api/transactions/withdrawals/status').then(res => res.json())
        ]);

        // Update deposit statuses
        transactionState.pendingDeposits = transactionState.pendingDeposits.map(deposit => {
            const updated = deposits.find(d => d.id === deposit.id);
            return updated || deposit;
        });

        // Update withdrawal statuses
        transactionState.pendingWithdrawals = transactionState.pendingWithdrawals.map(withdrawal => {
            const updated = withdrawals.find(w => w.id === withdrawal.id);
            return updated || withdrawal;
        });

        updateTransactionUI();
    } catch (error) {
        console.error('Error checking transaction status:', error);
    }
}

// Update transaction UI
function updateTransactionUI() {
    const depositsList = document.getElementById('pendingDeposits');
    const withdrawalsList = document.getElementById('pendingWithdrawals');

    if (depositsList) {
        depositsList.innerHTML = transactionState.pendingDeposits
            .map(deposit => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <span class="amount">${deposit.amount} USDT</span>
                        <span class="status ${deposit.status}">${deposit.status}</span>
                    </div>
                    <div class="transaction-details">
                        <span class="tx-hash">${deposit.txHash}</span>
                        <span class="time">${new Date(deposit.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
    }

    if (withdrawalsList) {
        withdrawalsList.innerHTML = transactionState.pendingWithdrawals
            .map(withdrawal => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <span class="amount">${withdrawal.amount} USDT</span>
                        <span class="status ${withdrawal.status}">${withdrawal.status}</span>
                    </div>
                    <div class="transaction-details">
                        <span class="address">${withdrawal.address}</span>
                        <span class="time">${new Date(withdrawal.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
    }
}

// Notify admin panel
function notifyAdmin(type, data) {
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('admin-notifications');
        channel.postMessage({
            type: `new-${type}`,
            data: data
        });
    }
}

// Initialize transactions when the page loads
document.addEventListener('DOMContentLoaded', initTransactions); 