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
    const widgetsEl = document.querySelector('.topbar-widgets');

    if (widgetsEl && !document.getElementById('header-countdown-widget')) {
        const timerWidget = document.createElement('div');
        timerWidget.className = 'topbar-countdown';
        timerWidget.id = 'header-countdown-widget';
        timerWidget.title = 'Countdown to Est. Completion (15 Dec 2026)';
        timerWidget.innerHTML = `
            <span class="countdown-time" id="header-countdown-time">0h 00m 00s</span>
        `;
        widgetsEl.insertBefore(timerWidget, widgetsEl.firstChild);
    }

    const countdownTimeEl = document.getElementById('header-countdown-time');
    const targetDate = new Date(2026, 11, 15, 23, 59, 59);

    const updateClock = () => {
        const now = new Date();
        if (timeEl && dateEl) {
            if (window.GateUtils) {
                timeEl.textContent = window.GateUtils.formatTime(now);
                dateEl.textContent = window.GateUtils.formatDate(now);
            } else {
                timeEl.textContent = now.toLocaleTimeString();
                dateEl.textContent = now.toLocaleDateString();
            }
        }

        if (countdownTimeEl) {
            const diff = targetDate.getTime() - now.getTime();
            if (diff <= 0) {
                countdownTimeEl.textContent = '0d 0h 00m 00s';
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                const formattedMins = String(minutes).padStart(2, '0');
                const formattedSecs = String(seconds).padStart(2, '0');

                countdownTimeEl.textContent = `${days}d ${hours}h ${formattedMins}m ${formattedSecs}s`;
            }
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
