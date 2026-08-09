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

        const streakData = window.GateStorage ? window.GateStorage.getStreakData() : { currentStreak: 0 };
        const streakVal = document.getElementById('streak-val');
        if (streakVal) {
            streakVal.textContent = streakData.currentStreak;
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
