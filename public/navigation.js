// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get current page
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// Handle navigation clicks
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = item.getAttribute('href');
        
        // Add transition animation
        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = targetPage;
        }, 200);
    });
});

// Page load animation
document.body.style.opacity = '0';
window.onload = () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease-in-out';
};

// Update active state
document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('href') === currentPage) {
        item.classList.add('active');
    } else {
        item.classList.remove('active');
    }
}); 