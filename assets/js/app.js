/**
 * GATE 2027 Application Controller & Page Router Entry Point
 */
document.addEventListener('DOMContentLoaded', async () => {
    const isDashboardPage = document.getElementById('subject-grid');
    const isSubjectPage = document.getElementById('subject-content-container');

    if (isDashboardPage) {
        initDashboardFlow();
    } else if (isSubjectPage) {
        initSubjectFlow();
    }
});

async function initDashboardFlow() {
    if (!window.GateSubjectService || !window.GateProgressService) return;
    
    const subjects = await window.GateSubjectService.loadSubjectsData('data/subjects.json');
    window.GateSubjectService.renderSubjectCards(subjects);
    window.GateProgressService.updateAndAnimateStats(subjects, true);
    window.GateProgressService.initCharts(subjects);
}

async function initSubjectFlow() {
    if (!window.GatePlannerService) return;
    await window.GatePlannerService.initSubjectView();
}
