// API base URL
const API_URL = 'http://localhost:3000/api';

// Admin configuration
const ADMIN_CONFIG = {
    // Add your Telegram ID here to gain admin access
    // You can get your Telegram ID by messaging @userinfobot
    ADMIN_IDS: ['123456789', '5865652025', 'YOUR_TELEGRAM_ID'], // Admin Telegram IDs
    UPDATE_INTERVAL: 5000, // 5 seconds
    MAX_TRANSACTIONS: 100
};

// Check if user is admin
function isAdmin(userId) {
    return ADMIN_CONFIG.ADMIN_IDS.includes(userId.toString());
}

// Initialize admin panel
async function initAdminPanel() {
    // Load initial data
    await Promise.all([
        loadStats(),
        loadUsers(),
        loadTransactions(),
        loadSettings(),
        loadAdmins(),
        loadStakingPlans(),
        loadTasks()
    ]);

    // Start periodic updates
    setInterval(updateAdminPanel, ADMIN_CONFIG.UPDATE_INTERVAL);
}

// Load and update statistics
async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();
        updateStatsDisplay(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('activeUsers').textContent = stats.activeUsers;
    document.getElementById('totalVolume').textContent = stats.totalVolume.toFixed(2);
    document.getElementById('totalReferrals').textContent = stats.totalReferrals;
}

// Load and update users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        updateUsersTable(users);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Update users table
function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.balance.toFixed(6)} GEN</td>
            <td>
                <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                    ${user.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="action-btn edit-btn" onclick="editUser('${user.id}')">Edit</button>
                <button class="action-btn edit-btn" onclick="openBalanceModal('${user.id}', ${user.balance})">Manage Balance</button>
                <button class="action-btn cancel-btn" onclick="toggleUserStatus('${user.id}')">${user.active ? 'Deactivate' : 'Activate'}</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load and update transactions
async function loadTransactions() {
    try {
        const response = await fetch('/api/admin/transactions');
        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        const transactions = await response.json();
        updateTransactionsTable(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Update transactions table
function updateTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';

    transactions.slice(0, ADMIN_CONFIG.MAX_TRANSACTIONS).forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tx.type}</td>
            <td>${tx.amount.toFixed(6)} ${tx.currency}</td>
            <td>${tx.userId}</td>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const settings = await response.json();
        updateSettingsDisplay(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Update settings display
function updateSettingsDisplay(settings) {
    // Token settings
    document.getElementById('tokenPrice').value = settings.tokenPrice;
    document.getElementById('adminFee').value = settings.adminFee;
    document.getElementById('minSwapAmount').value = settings.minSwapAmount;

    // Referral settings
    document.getElementById('level1Commission').value = settings.level1Commission;
    document.getElementById('level2Commission').value = settings.level2Commission;

    // Mining settings
    document.getElementById('baseMiningRate').value = settings.baseMiningRate;
    document.getElementById('miningDuration').value = settings.miningDuration;

    // System settings
    document.getElementById('maintenanceMode').value = settings.maintenanceMode;
    document.getElementById('minDeposit').value = settings.minDeposit;
    document.getElementById('minWithdrawal').value = settings.minWithdrawal;
}

// Save all changes
async function saveAllChanges() {
    try {
        const settings = {
            tokenPrice: parseFloat(document.getElementById('tokenPrice').value),
            adminFee: parseFloat(document.getElementById('adminFee').value),
            minSwapAmount: parseInt(document.getElementById('minSwapAmount').value),
            level1Commission: parseFloat(document.getElementById('level1Commission').value),
            level2Commission: parseFloat(document.getElementById('level2Commission').value),
            baseMiningRate: parseFloat(document.getElementById('baseMiningRate').value),
            miningDuration: parseInt(document.getElementById('miningDuration').value),
            maintenanceMode: document.getElementById('maintenanceMode').value === 'true',
            minDeposit: parseFloat(document.getElementById('minDeposit').value),
            minWithdrawal: parseFloat(document.getElementById('minWithdrawal').value)
        };

        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
    }
}

// Edit user
async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        
        const user = await response.json();
        // Open edit modal with user data
        openEditUserModal(user);
    } catch (error) {
        console.error('Error editing user:', error);
    }
}

// Toggle user status
async function toggleUserStatus(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to toggle user status');

        // Refresh users table
        await loadUsers();
    } catch (error) {
        console.error('Error toggling user status:', error);
    }
}

// Update admin panel
async function updateAdminPanel() {
    await Promise.all([
        loadStats(),
        loadUsers(),
        loadTransactions(),
        loadAdmins(),
        loadStakingPlans(),
        loadTasks()
    ]);
}

// Export functions
window.adminPanel = {
    init: initAdminPanel,
    saveAllChanges: saveAllChanges,
    editUser: editUser,
    toggleUserStatus: toggleUserStatus,
    refreshUsers: loadUsers,
    refreshTransactions: loadTransactions
};

// Load all data
async function loadAllData() {
    await loadUsers();
    await loadPendingDeposits();
    await loadPendingWithdrawals();
}

// Load pending deposits
async function loadPendingDeposits() {
    try {
        const response = await fetch(`${API_URL}/admin/deposits`);
        const deposits = await response.json();
        
        const tbody = document.getElementById('depositsTableBody');
        tbody.innerHTML = '';
        
        deposits.forEach(deposit => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${deposit.userId}</td>
                <td>${deposit.amount}</td>
                <td>${deposit.txHash}</td>
                <td>${new Date(deposit.createdAt).toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="approveDeposit('${deposit.id}', '${deposit.userId}', ${deposit.amount})">
                        Approve
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading deposits:', error);
    }
}

// Load pending withdrawals
async function loadPendingWithdrawals() {
    try {
        const response = await fetch(`${API_URL}/admin/withdrawals`);
        const withdrawals = await response.json();
        
        const tbody = document.getElementById('withdrawalsTableBody');
        tbody.innerHTML = '';
        
        withdrawals.forEach(withdrawal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${withdrawal.userId}</td>
                <td>${withdrawal.amount}</td>
                <td>${withdrawal.type}</td>
                <td>${new Date(withdrawal.createdAt).toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="approveWithdrawal('${withdrawal.id}')">
                        Approve
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

// Approve deposit
async function approveDeposit(depositId, userId, amount) {
    try {
        const response = await fetch(`${API_URL}/admin/approve-deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                depositId,
                userId,
                amount
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('Deposit approved successfully');
            loadAllData();
        } else {
            alert('Error approving deposit');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error approving deposit');
    }
}

// Approve withdrawal
async function approveWithdrawal(withdrawalId) {
    try {
        const response = await fetch(`${API_URL}/admin/approve-withdrawal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                withdrawalId
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('Withdrawal approved successfully');
            loadAllData();
        } else {
            alert('Error approving withdrawal');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error approving withdrawal');
    }
}

// Admin Management Functions
async function loadAdmins() {
    try {
        const response = await fetch('/api/admin/admins');
        if (!response.ok) throw new Error('Failed to fetch admins');
        
        const admins = await response.json();
        updateAdminsTable(admins);
    } catch (error) {
        console.error('Error loading admins:', error);
    }
}

function updateAdminsTable(admins) {
    const tbody = document.getElementById('adminsTableBody');
    tbody.innerHTML = '';

    admins.forEach(admin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${admin.id}</td>
            <td>${admin.addedBy}</td>
            <td>${new Date(admin.addedOn).toLocaleString()}</td>
            <td>
                <button class="action-btn cancel-btn" onclick="removeAdmin('${admin.id}')" ${admin.id === webApp.initDataUnsafe.user.id ? 'disabled' : ''}>
                    Remove
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addNewAdmin() {
    document.getElementById('addAdminModal').style.display = 'block';
}

function closeAddAdminModal() {
    document.getElementById('addAdminModal').style.display = 'none';
    document.getElementById('newAdminId').value = '';
}

async function saveNewAdmin() {
    const newAdminId = document.getElementById('newAdminId').value.trim();
    
    if (!newAdminId) {
        alert('Please enter a valid Telegram ID');
        return;
    }

    try {
        const response = await fetch('/api/admin/add-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                adminId: newAdminId,
                addedBy: webApp.initDataUnsafe.user.id
            })
        });

        if (!response.ok) throw new Error('Failed to add admin');

        closeAddAdminModal();
        await loadAdmins();
        alert('Admin added successfully');
    } catch (error) {
        console.error('Error adding admin:', error);
        alert('Failed to add admin. Please try again.');
    }
}

async function removeAdmin(adminId) {
    if (!confirm('Are you sure you want to remove this admin?')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/remove-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adminId })
        });

        if (!response.ok) throw new Error('Failed to remove admin');

        await loadAdmins();
        alert('Admin removed successfully');
    } catch (error) {
        console.error('Error removing admin:', error);
        alert('Failed to remove admin. Please try again.');
    }
}

// Staking Plans Management Functions
async function loadStakingPlans() {
    try {
        const response = await fetch('/api/admin/staking-plans');
        if (!response.ok) throw new Error('Failed to fetch staking plans');
        
        const plans = await response.json();
        updateStakingPlansTable(plans);
    } catch (error) {
        console.error('Error loading staking plans:', error);
    }
}

function updateStakingPlansTable(plans) {
    const tbody = document.getElementById('stakingPlansTableBody');
    tbody.innerHTML = '';

    plans.forEach(plan => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${plan.name}</td>
            <td>${plan.duration}</td>
            <td>${plan.apy}%</td>
            <td>${plan.minAmount} GEN</td>
            <td>
                <span class="status-badge ${plan.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${plan.status}
                </span>
            </td>
            <td>
                <button class="action-btn edit-btn" onclick="editStakingPlan('${plan.id}')">Edit</button>
                <button class="action-btn cancel-btn" onclick="deleteStakingPlan('${plan.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addNewStakingPlan() {
    document.getElementById('addStakingPlanModal').style.display = 'block';
}

function closeAddStakingPlanModal() {
    document.getElementById('addStakingPlanModal').style.display = 'none';
    document.getElementById('planName').value = '';
    document.getElementById('planDuration').value = '';
    document.getElementById('planAPY').value = '';
    document.getElementById('planMinAmount').value = '';
    document.getElementById('planStatus').value = 'active';
}

async function saveNewStakingPlan() {
    const planData = {
        name: document.getElementById('planName').value.trim(),
        duration: parseInt(document.getElementById('planDuration').value),
        apy: parseFloat(document.getElementById('planAPY').value),
        minAmount: parseFloat(document.getElementById('planMinAmount').value),
        status: document.getElementById('planStatus').value
    };

    // Validate inputs
    if (!planData.name || !planData.duration || !planData.apy || !planData.minAmount) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('/api/admin/add-staking-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(planData)
        });

        if (!response.ok) throw new Error('Failed to add staking plan');

        closeAddStakingPlanModal();
        await loadStakingPlans();
        alert('Staking plan added successfully');
        
        // Notify earn page about the update
        notifyEarnPageUpdate();
    } catch (error) {
        console.error('Error adding staking plan:', error);
        alert('Failed to add staking plan. Please try again.');
    }
}

async function deleteStakingPlan(planId) {
    if (!confirm('Are you sure you want to delete this staking plan?')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/delete-staking-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ planId })
        });

        if (!response.ok) throw new Error('Failed to delete staking plan');

        await loadStakingPlans();
        alert('Staking plan deleted successfully');
        
        // Notify earn page about the update
        notifyEarnPageUpdate();
    } catch (error) {
        console.error('Error deleting staking plan:', error);
        alert('Failed to delete staking plan. Please try again.');
    }
}

async function editStakingPlan(planId) {
    try {
        const response = await fetch(`/api/admin/staking-plan/${planId}`);
        if (!response.ok) throw new Error('Failed to fetch staking plan');
        
        const plan = await response.json();
        // Open edit modal with plan data
        openEditStakingPlanModal(plan);
    } catch (error) {
        console.error('Error editing staking plan:', error);
    }
}

function notifyEarnPageUpdate() {
    // Broadcast a message to all open earn pages
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('staking-updates');
        channel.postMessage({ type: 'plans-updated' });
    }
}

// Task Management Functions
async function loadTasks() {
    try {
        const response = await fetch('/api/admin/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const tasks = await response.json();
        updateTasksTable(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function updateTasksTable(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = '';

    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.name}</td>
            <td>${task.reward} GEN</td>
            <td>
                <span class="status-badge ${task.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${task.status}
                </span>
            </td>
            <td>
                <button class="action-btn edit-btn" onclick="editTask('${task.id}')">Edit</button>
                <button class="action-btn cancel-btn" onclick="deleteTask('${task.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addNewTask() {
    document.getElementById('addTaskModal').style.display = 'block';
}

function closeAddTaskModal() {
    document.getElementById('addTaskModal').style.display = 'none';
    document.getElementById('taskName').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskReward').value = '';
    document.getElementById('taskType').value = 'social';
    document.getElementById('taskStatus').value = 'active';
}

async function saveNewTask() {
    const taskData = {
        name: document.getElementById('taskName').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        reward: parseFloat(document.getElementById('taskReward').value),
        type: document.getElementById('taskType').value,
        status: document.getElementById('taskStatus').value
    };

    // Validate inputs
    if (!taskData.name || !taskData.description || !taskData.reward) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch('/api/admin/add-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) throw new Error('Failed to add task');

        closeAddTaskModal();
        await loadTasks();
        alert('Task added successfully');
        
        // Notify index page about the update
        notifyTaskUpdate();
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/delete-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskId })
        });

        if (!response.ok) throw new Error('Failed to delete task');

        await loadTasks();
        alert('Task deleted successfully');
        
        // Notify index page about the update
        notifyTaskUpdate();
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task. Please try again.');
    }
}

async function editTask(taskId) {
    try {
        const response = await fetch(`/api/admin/task/${taskId}`);
        if (!response.ok) throw new Error('Failed to fetch task');
        
        const task = await response.json();
        // Open edit modal with task data
        openEditTaskModal(task);
    } catch (error) {
        console.error('Error editing task:', error);
    }
}

function notifyTaskUpdate() {
    // Broadcast a message to all open index pages
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('task-updates');
        channel.postMessage({ type: 'tasks-updated' });
    }
}

// Balance Management Functions
function openBalanceModal(userId, currentBalance) {
    document.getElementById('balanceModal').style.display = 'block';
    document.getElementById('balanceUserId').value = userId;
    document.getElementById('currentBalance').value = currentBalance;
    document.getElementById('balanceAmount').value = '';
    document.getElementById('balanceReason').value = '';
    document.getElementById('balanceAction').value = 'add';
}

function closeBalanceModal() {
    document.getElementById('balanceModal').style.display = 'none';
}

async function updateUserBalance() {
    const userId = document.getElementById('balanceUserId').value;
    const currentBalance = parseFloat(document.getElementById('currentBalance').value);
    const action = document.getElementById('balanceAction').value;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    const reason = document.getElementById('balanceReason').value.trim();

    // Validate inputs
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    if (!reason) {
        alert('Please enter a reason for the balance change');
        return;
    }

    // Calculate new balance
    let newBalance;
    if (action === 'add') {
        newBalance = currentBalance + amount;
    } else {
        if (amount > currentBalance) {
            alert('Cannot subtract more than current balance');
            return;
        }
        newBalance = currentBalance - amount;
    }

    try {
        const response = await fetch('/api/admin/update-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                amount: action === 'add' ? amount : -amount,
                reason,
                newBalance
            })
        });

        if (!response.ok) throw new Error('Failed to update balance');

        closeBalanceModal();
        await loadUsers();
        alert('Balance updated successfully');
        
        // Notify user about balance update
        notifyUserBalanceUpdate(userId);
    } catch (error) {
        console.error('Error updating balance:', error);
        alert('Failed to update balance. Please try again.');
    }
}

function notifyUserBalanceUpdate(userId) {
    // Broadcast a message to all open pages
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('balance-updates');
        channel.postMessage({ 
            type: 'balance-updated',
            userId: userId
        });
    }
}

// Token Price Management Functions
async function updateTokenPrice() {
    const newPrice = parseFloat(document.getElementById('tokenPrice').value);
    
    if (!newPrice || newPrice <= 0) {
        alert('Please enter a valid token price');
        return;
    }

    try {
        const response = await fetch('/api/admin/update-token-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                newPrice,
                updatedBy: webApp.initDataUnsafe.user.id
            })
        });

        if (!response.ok) throw new Error('Failed to update token price');

        alert('Token price updated successfully');
        
        // Notify all pages about the price update
        notifyTokenPriceUpdate(newPrice);
    } catch (error) {
        console.error('Error updating token price:', error);
        alert('Failed to update token price. Please try again.');
    }
}

function notifyTokenPriceUpdate(newPrice) {
    // Broadcast a message to all open pages
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('token-price-updates');
        channel.postMessage({ 
            type: 'price-updated',
            newPrice: newPrice
        });
    }
}

// Mining Management Functions
async function updateMiningSettings() {
    const miningStatus = document.getElementById('miningStatus').value;
    
    try {
        const response = await fetch('/api/admin/update-mining-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                miningRate: 2, // Fixed at 2 tokens per hour
                miningInterval: 1, // Fixed at 1 hour
                status: miningStatus,
                updatedBy: webApp.initDataUnsafe.user.id
            })
        });

        if (!response.ok) throw new Error('Failed to update mining settings');

        alert('Mining settings updated successfully');
        
        // Notify all pages about the mining settings update
        notifyMiningSettingsUpdate(miningStatus);
    } catch (error) {
        console.error('Error updating mining settings:', error);
        alert('Failed to update mining settings. Please try again.');
    }
}

function notifyMiningSettingsUpdate(status) {
    // Broadcast a message to all open pages
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('mining-updates');
        channel.postMessage({ 
            type: 'mining-settings-updated',
            status: status
        });
    }
}

// Initialize
loadAllData(); 