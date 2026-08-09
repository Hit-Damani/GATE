/**
 * GATE 2027 Core UI Navigation & Clock Engine
 */
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('page-loaded');
    initClockService();
    initSidebarDrawerService();
});

function initClockService() {
    const timeEl = document.getElementById('header-time');
    const dateEl = document.getElementById('header-date');
    if (!timeEl || !dateEl) return;

    const updateClock = () => {
        const now = new Date();
        if (window.GateUtils) {
            timeEl.textContent = window.GateUtils.formatTime(now);
            dateEl.textContent = window.GateUtils.formatDate(now);
        } else {
            timeEl.textContent = now.toLocaleTimeString();
            dateEl.textContent = now.toLocaleDateString();
        }
    };

    updateClock();
    setInterval(updateClock, 1000);
}

function initSidebarDrawerService() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const overlay = document.getElementById('sidebar-overlay-el');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-open');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    }
}
