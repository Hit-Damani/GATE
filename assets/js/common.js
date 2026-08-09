/**
 * GATE 2027 Dashboard Common Controller
 * Handles global layouts, mobile drawer navigation, clock, and vector icons
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Date & Time clock
    initHeaderClock();

    // 2. Initialize Mobile Sidebar Drawer Toggles
    initMobileSidebar();

    // 3. Render Lucide SVG Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

/**
 * Initializes the clock and date in the top bar.
 * Updates the time every second.
 */
function initHeaderClock() {
    const dateEl = document.getElementById('header-date');
    const timeEl = document.getElementById('header-time');

    if (!dateEl || !timeEl) return;

    const updateDateTime = () => {
        const now = new Date();
        dateEl.textContent = window.GateUtils.formatDate(now);
        timeEl.textContent = window.GateUtils.formatTime(now);
    };

    updateDateTime();
    setInterval(updateDateTime, 1000);
}

/**
 * Handles sliding sidebar actions on mobile widths
 */
function initMobileSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const overlay = document.getElementById('sidebar-overlay-el');

    if (!toggleBtn || !overlay) return;

    // Toggle menu
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
    });

    // Close menu when clicking backdrop overlay
    overlay.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
    });

    // Close menu when navigating on mobile
    const menuLinks = document.querySelectorAll('.sidebar-menu .menu-item');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    });

    // Close menu if window resizes to desktop width
    window.addEventListener('resize', () => {
        if (window.innerWidth > 820) {
            document.body.classList.remove('sidebar-open');
        }
    });
}
