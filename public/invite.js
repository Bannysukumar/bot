// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('tgId');

// Task completion status
let taskStatus = {
    telegram: false,
    meta: false,
    facebook: false,
    youtube: false,
    'invite-1': { completed: 0, target: 1 },
    'invite-3': { completed: 0, target: 3 },
    'invite-5': { completed: 0, target: 5 },
    'invite-10': { completed: 0, target: 10 }
};

// Handle social media tasks
async function handleSocialTask(taskType) {
    try {
        const response = await fetch('/api/tasks/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                taskType
            })
        });

        const data = await response.json();
        
        if (data.success) {
            taskStatus[taskType] = true;
            updateTaskUI(taskType);
            tg.showAlert(`Task completed! You earned ${getRewardAmount(taskType)} GEN`);
        } else {
            tg.showAlert(data.message || 'Failed to complete task');
        }
    } catch (error) {
        console.error('Error completing task:', error);
        tg.showAlert('Error completing task. Please try again.');
    }
}

// Handle invite tasks
async function handleInviteTask(taskType) {
    try {
        // Generate invite link
        const response = await fetch('/api/invite/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();
        
        if (data.success) {
            // Share invite link through Telegram
            tg.showPopup({
                title: 'Share Invite Link',
                message: 'Share this link with your friends to earn rewards!',
                buttons: [
                    { type: 'default', text: 'Copy Link', id: 'copy' },
                    { type: 'default', text: 'Share', id: 'share' }
                ]
            }, (buttonId) => {
                if (buttonId === 'copy') {
                    navigator.clipboard.writeText(data.inviteLink);
                    tg.showAlert('Invite link copied to clipboard!');
                } else if (buttonId === 'share') {
                    tg.shareUrl(data.inviteLink);
                }
            });
        } else {
            tg.showAlert('Failed to generate invite link');
        }
    } catch (error) {
        console.error('Error generating invite link:', error);
        tg.showAlert('Error generating invite link. Please try again.');
    }
}

// Get reward amount for task
function getRewardAmount(taskType) {
    const rewards = {
        telegram: 1000,
        meta: 300,
        facebook: 300,
        youtube: 300,
        'invite-1': 200,
        'invite-3': 600,
        'invite-5': 1000,
        'invite-10': 2000
    };
    return rewards[taskType] || 0;
}

// Update task UI
function updateTaskUI(taskType) {
    const taskElement = document.querySelector(`[data-task="${taskType}"]`);
    if (!taskElement) return;

    const button = taskElement.querySelector('button');
    if (taskStatus[taskType] === true) {
        button.disabled = true;
        button.textContent = 'Completed';
    }

    // Update progress for invite tasks
    if (taskType.startsWith('invite-')) {
        const progress = taskElement.querySelector('.progress');
        if (progress) {
            progress.textContent = `${taskStatus[taskType].completed}/${taskStatus[taskType].target}`;
        }
    }
}

// Fetch task status
async function fetchTaskStatus() {
    try {
        const response = await fetch(`/api/tasks/status/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            taskStatus = data.tasks;
            // Update UI for all tasks
            Object.keys(taskStatus).forEach(updateTaskUI);
        }
    } catch (error) {
        console.error('Error fetching task status:', error);
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!userId) return;

    // Fetch initial task status
    fetchTaskStatus();

    // Add click handlers for social tasks
    const socialButtons = document.querySelectorAll('.follow-btn');
    socialButtons.forEach(button => {
        const taskType = button.closest('.task-item').dataset.task;
        button.addEventListener('click', () => handleSocialTask(taskType));
    });

    // Add click handlers for invite tasks
    const inviteButtons = document.querySelectorAll('.invite-btn');
    inviteButtons.forEach(button => {
        const taskType = button.closest('.task-item').dataset.task;
        button.addEventListener('click', () => handleInviteTask(taskType));
    });
}); 