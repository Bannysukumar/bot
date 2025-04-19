// Mining functionality
class MiningManager {
    constructor() {
        this.isMining = false;
        this.miningInterval = null;
        this.initializeMiningButton();
    }

    initializeMiningButton() {
        const miningButton = document.getElementById('miningButton');
        if (miningButton) {
            miningButton.addEventListener('click', () => this.toggleMining());
        }
    }

    async toggleMining() {
        try {
            if (this.isMining) {
                await this.stopMining();
            } else {
                await this.startMining();
            }
        } catch (error) {
            console.error('Error toggling mining:', error);
            alert('Failed to toggle mining. Please try again.');
        }
    }

    async startMining() {
        try {
            const userId = window.realTimeData?.userId;
            if (!userId) {
                throw new Error('User ID not available');
            }

            const response = await fetch('/api/mining/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start mining');
            }

            const data = await response.json();
            
            // Update UI
            this.isMining = true;
            this.updateMiningStatus(true);
            this.updateNextMiningTime(data.nextMiningTime);
            
            // Start mining animation
            this.startMiningAnimation();
            
            // Schedule next mining
            this.scheduleNextMining(data.nextMiningTime);
            
        } catch (error) {
            console.error('Error starting mining:', error);
            alert(error.message || 'Failed to start mining');
        }
    }

    async stopMining() {
        try {
            // Clear any existing intervals
            if (this.miningInterval) {
                clearInterval(this.miningInterval);
                this.miningInterval = null;
            }

            // Update UI
            this.isMining = false;
            this.updateMiningStatus(false);
            this.stopMiningAnimation();
            
            // Update next mining time
            this.updateNextMiningTime(null);
            
        } catch (error) {
            console.error('Error stopping mining:', error);
            alert('Failed to stop mining');
        }
    }

    updateMiningStatus(isActive) {
        const statusElement = document.getElementById('miningStatus');
        const buttonElement = document.getElementById('miningButton');
        
        if (statusElement) {
            statusElement.textContent = isActive ? 'Active' : 'Inactive';
            statusElement.className = `status-badge status-${isActive ? 'active' : 'inactive'}`;
        }
        
        if (buttonElement) {
            buttonElement.textContent = isActive ? 'Stop Mining' : 'Start Mining';
        }
    }

    updateNextMiningTime(nextTime) {
        const nextMiningTimeElement = document.getElementById('nextMiningTime');
        if (nextMiningTimeElement) {
            if (nextTime) {
                const date = new Date(nextTime);
                nextMiningTimeElement.textContent = date.toLocaleTimeString();
            } else {
                nextMiningTimeElement.textContent = 'Not mining';
            }
        }
    }

    startMiningAnimation() {
        const miningCoin = document.querySelector('.mining-coin');
        const miningRays = document.querySelector('.mining-rays');
        
        if (miningCoin) {
            miningCoin.style.animation = 'pulse 2s infinite';
        }
        
        if (miningRays) {
            miningRays.style.animation = 'rotate 4s linear infinite';
        }
    }

    stopMiningAnimation() {
        const miningCoin = document.querySelector('.mining-coin');
        const miningRays = document.querySelector('.mining-rays');
        
        if (miningCoin) {
            miningCoin.style.animation = 'none';
        }
        
        if (miningRays) {
            miningRays.style.animation = 'none';
        }
    }

    scheduleNextMining(nextTime) {
        if (this.miningInterval) {
            clearInterval(this.miningInterval);
        }

        const nextMiningTime = new Date(nextTime).getTime();
        const now = new Date().getTime();
        const timeUntilNext = nextMiningTime - now;

        if (timeUntilNext > 0) {
            this.miningInterval = setTimeout(() => {
                this.startMining();
            }, timeUntilNext);
        }
    }
}

// Create and export a single instance
window.miningManager = new MiningManager();

// Make startMining globally accessible
window.startMining = function() {
    window.miningManager.startMining();
}; 