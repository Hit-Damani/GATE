/**
 * GATE 2027 Functional Progress & Telemetry Service Module
 */
let charts = {};

window.GateProgressService = {
    updateAndAnimateStats(subjects, animate = true) {
        if (!window.GateProgress) return;
        const report = window.GateProgress.calculateOverall(subjects);

        const metaText = document.getElementById('overall-progress-meta-text');
        if (metaText) {
            metaText.innerHTML = `You've solved <strong>${report.completedTasks}</strong> of <strong>${report.totalTasks}</strong> total curriculum tasks.`;
        }

        const estVal = document.getElementById('est-completion-val');
        if (estVal) {
            estVal.textContent = 'Nov 30';
        }

        if (animate && window.GateUtils) {
            window.GateUtils.animatePercentage('overall-progress-val', 0, report.overallPercentage, 1000);
            window.GateUtils.animateCounter('stat-total-subjects', 0, report.totalSubjects, 600);
            window.GateUtils.animateCounter('stat-completed-subjects', 0, report.completedSubjects, 600);
            window.GateUtils.animateCounter('stat-remaining-subjects', 0, report.remainingSubjects, 600);
            window.GateUtils.animateCounter('stat-total-tasks', 0, report.totalTasks, 800);
            window.GateUtils.animateCounter('stat-completed-tasks', 0, report.completedTasks, 800);
            window.GateUtils.animateCounter('stat-remaining-tasks', 0, report.remainingTasks, 800);
        }
    },

    async updateActiveDaysStat() {
        const activeDaysVal = document.getElementById('active-days-val');
        if (activeDaysVal && window.GateStorage) {
            const now = new Date();
            const activityMap = await window.GateStorage.getActivityDates(now.getFullYear(), now.getMonth() + 1);
            if (activeDaysVal) activeDaysVal.textContent = activityMap.size;
        }
    },

    async initActivityPage() {
        const container = document.getElementById('activity-months-list');
        if (!container) return;

        container.innerHTML = '';

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const today = new Date();
        const startYear = 2026;
        const startMonth = 8; // August (1-indexed, starting August 2026)

        // End month calculation: at least December of startYear, or current month if later
        let endYear = Math.max(startYear, today.getFullYear());
        let endMonth = (endYear === startYear) ? 12 : (today.getMonth() + 1);

        // Build array of { year, month } starting from August 2026
        const monthList = [];
        let y = startYear;
        let m = startMonth;

        while (y < endYear || (y === endYear && m <= endMonth)) {
            monthList.push({ year: y, month: m });
            m++;
            if (m > 12) {
                m = 1;
                y++;
            }
        }

        // Render each month card (stacked one below another)
        for (const { year, month } of monthList) {
            let activityMap = new Map();
            if (window.GateStorage) {
                activityMap = await window.GateStorage.getActivityDates(year, month);
            }

            const card = document.createElement('div');
            const isCurrent = (today.getFullYear() === year && (today.getMonth() + 1) === month);
            card.className = `activity-month-card ${isCurrent ? 'current-month' : ''}`;

            const activeDaysCount = activityMap.size;

            card.innerHTML = `
                <div class="month-card-header">
                    <div class="month-card-title">
                        <i data-lucide="calendar"></i>
                        <span>${monthNames[month - 1]} ${year}</span>
                    </div>
                    <span class="month-active-badge">${activeDaysCount} Active Day${activeDaysCount === 1 ? '' : 's'}</span>
                </div>
                <div class="month-calendar-grid">
                    <span class="cal-day-header">Mon</span>
                    <span class="cal-day-header">Tue</span>
                    <span class="cal-day-header">Wed</span>
                    <span class="cal-day-header">Thu</span>
                    <span class="cal-day-header">Fri</span>
                    <span class="cal-day-header">Sat</span>
                    <span class="cal-day-header">Sun</span>
                </div>
            `;

            const grid = card.querySelector('.month-calendar-grid');

            let startDay = (year === 2026 && month === 8) ? 12 : 1;
            const firstDay = new Date(year, month - 1, startDay).getDay();
            const offset = firstDay === 0 ? 7 : firstDay;
            const daysInMonth = new Date(year, month, 0).getDate();

            // Day cells: render ONLY the clean day number inside the box
            for (let day = startDay; day <= daysInMonth; day++) {
                const cell = document.createElement('span');
                cell.className = 'cal-day';
                if (day === startDay) {
                    cell.style.gridColumnStart = offset;
                }

                const count = activityMap.get(day) || 0;
                cell.innerHTML = `<span class="cal-day-num">${day}</span>`;

                if (count >= 3) {
                    cell.classList.add('active');
                    cell.title = `${count} tasks completed`;
                } else if (count >= 1) {
                    cell.classList.add('light-activity');
                    cell.title = `${count} task${count > 1 ? 's' : ''} completed`;
                }

                if (isCurrent && day === today.getDate()) {
                    cell.classList.add('is-today');
                }

                grid.appendChild(cell);
            }

            container.appendChild(card);
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    initCharts(subjects) {
        const canvas = document.getElementById('overallProgressChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const report = window.GateProgress ? window.GateProgress.calculateOverall(subjects) : { completedTasks: 0, remainingTasks: 740 };
        const ctx = canvas.getContext('2d');

        if (charts.overall) charts.overall.destroy();

        charts.overall = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed Tasks', 'Remaining Tasks'],
                datasets: [{
                    data: [report.completedTasks, Math.max(1, report.remainingTasks)],
                    backgroundColor: ['#a855f7', 'rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '78%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    }
};
