// Navigation functionality
document.addEventListener('DOMContentLoaded', () => {
    // Use the global tg variable
    if (window.tg) {
        // Set theme based on Telegram's color scheme
        document.documentElement.setAttribute('data-theme', tg.colorScheme);
    }

    // Handle navigation item clicks
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const href = item.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });

    // Set active navigation item based on current page
    const currentPath = window.location.pathname;
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && currentPath.includes(href)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}); 