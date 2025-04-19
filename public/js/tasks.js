// Function to load tasks from the API
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) {
            throw new Error('Failed to fetch tasks');
        }
        const tasks = await response.json();
        updateTaskCenter(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        // Show error message to user
        const taskList = document.getElementById('task-list');
        if (taskList) {
            taskList.innerHTML = '<div class="error-message">Failed to load tasks. Please try again later.</div>';
        }
    }
}

// Function to update the task center with fetched tasks
function updateTaskCenter(tasks) {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    // Clear existing tasks
    taskList.innerHTML = '';

    // Filter active tasks
    const activeTasks = tasks.filter(task => task.status === 'active');

    if (activeTasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks">No active tasks available.</div>';
        return;
    }

    // Create task cards
    activeTasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.innerHTML = `
            <div class="task-header">
                <span class="task-icon">${getTaskIcon(task.type)}</span>
                <h3>${task.name}</h3>
                <span class="task-reward">${task.reward} GEN</span>
            </div>
            <p class="task-description">${task.description}</p>
            <button class="task-action" onclick="completeTask('${task.id}')">Complete Task</button>
        `;
        taskList.appendChild(taskCard);
    });
}

// Function to get appropriate icon based on task type
function getTaskIcon(type) {
    const icons = {
        'social': '📱',
        'video': '🎥',
        'website': '🌐',
        'other': '📝'
    };
    return icons[type] || icons.other;
}

// Function to handle task completion
async function completeTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to complete task');
        }
        
        // Reload tasks after completion
        loadTasks();
        
        // Show success message
        alert('Task completed successfully!');
    } catch (error) {
        console.error('Error completing task:', error);
        alert('Failed to complete task. Please try again later.');
    }
}

// Make functions globally accessible
window.loadTasks = loadTasks;
window.updateTaskCenter = updateTaskCenter;
window.getTaskIcon = getTaskIcon;
window.completeTask = completeTask; 