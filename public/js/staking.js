// Staking functionality
async function loadUserStakes() {
    try {
        const response = await fetch('/api/staking/user-stakes');
        if (!response.ok) {
            throw new Error('Failed to fetch user stakes');
        }
        const stakes = await response.json();
        updateStakesDisplay(stakes);
    } catch (error) {
        console.error('Error loading user stakes:', error);
        // Show error message to user
        const stakesContainer = document.getElementById('userStakes');
        if (stakesContainer) {
            stakesContainer.innerHTML = '<div class="error-message">Failed to load stakes</div>';
        }
    }
}

function updateStakesDisplay(stakes) {
    const stakesContainer = document.getElementById('userStakes');
    if (!stakesContainer) return;

    if (stakes.length === 0) {
        stakesContainer.innerHTML = '<div class="no-stakes">No active stakes</div>';
        return;
    }

    stakesContainer.innerHTML = stakes.map(stake => `
        <div class="stake-card">
            <div class="stake-header">
                <h3>${stake.planName}</h3>
                <span class="stake-status ${stake.status}">${stake.status}</span>
            </div>
            <div class="stake-details">
                <div class="stake-amount">
                    <span class="label">Amount:</span>
                    <span class="value">${stake.amount} GEN</span>
                </div>
                <div class="stake-duration">
                    <span class="label">Duration:</span>
                    <span class="value">${stake.duration} days</span>
                </div>
                <div class="stake-apy">
                    <span class="label">APY:</span>
                    <span class="value">${stake.apy}%</span>
                </div>
                <div class="stake-start">
                    <span class="label">Start Date:</span>
                    <span class="value">${new Date(stake.startDate).toLocaleDateString()}</span>
                </div>
                <div class="stake-end">
                    <span class="label">End Date:</span>
                    <span class="value">${new Date(stake.endDate).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="stake-actions">
                <button class="unstake-btn" onclick="unstake('${stake.id}')" ${stake.status !== 'active' ? 'disabled' : ''}>
                    Unstake
                </button>
            </div>
        </div>
    `).join('');
}

async function loadStakingPlans() {
    try {
        const response = await fetch('/api/staking/plans');
        if (!response.ok) {
            throw new Error('Failed to fetch staking plans');
        }
        const plans = await response.json();
        updateStakingPlansDisplay(plans);
    } catch (error) {
        console.error('Error loading staking plans:', error);
        // Show error message to user
        const plansContainer = document.getElementById('stakingPlans');
        if (plansContainer) {
            plansContainer.innerHTML = '<div class="error-message">Failed to load staking plans</div>';
        }
    }
}

function updateStakingPlansDisplay(plans) {
    const plansContainer = document.getElementById('stakingPlans');
    if (!plansContainer) return;

    plansContainer.innerHTML = plans.map(plan => `
        <div class="plan-card">
            <div class="plan-header">
                <h3>${plan.name}</h3>
                <span class="plan-apy">${plan.apy}% APY</span>
            </div>
            <div class="plan-details">
                <div class="plan-duration">
                    <span class="label">Duration:</span>
                    <span class="value">${plan.duration} days</span>
                </div>
                <div class="plan-min">
                    <span class="label">Min Amount:</span>
                    <span class="value">${plan.minAmount} GEN</span>
                </div>
                <div class="plan-max">
                    <span class="label">Max Amount:</span>
                    <span class="value">${plan.maxAmount} GEN</span>
                </div>
            </div>
            <div class="plan-actions">
                <button class="stake-btn" onclick="openStakeModal('${plan.id}')">
                    Stake Now
                </button>
            </div>
        </div>
    `).join('');
}

// Make functions available globally
window.loadUserStakes = loadUserStakes;
window.loadStakingPlans = loadStakingPlans; 