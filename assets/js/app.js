/**
 * GATE 2027 Application Controller & Page Router Entry Point
 * MODIFIED: Smooth pre-rendered page transitions with loading overlay protection.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize offline detection
    if (window.GateErrorHandler) {
        window.GateErrorHandler.initOfflineDetection();
    }

    // Auth guard — redirect to login if not authenticated (keep overlay visible)
    if (!window.GateAuthManager || !window.GateSupabase?.client) {
        console.error('[App] Auth or Supabase client not loaded.');
        return;
    }

    const session = await window.GateAuthManager.requireAuth(false);
    if (!session) return; // Redirecting to login

    try {
        const isDashboardPage = document.getElementById('subject-grid');
        const isActivityPage = document.getElementById('activity-months-list');
        const isSubjectPage = document.getElementById('subject-content-container');

        // Initialize storage with lightweight or full dataset based on current page
        if (window.GateStorage) {
            await window.GateStorage.init(session.user.id, { isSubjectPage: !!isSubjectPage });
        }

        if (isDashboardPage) {
            await initDashboardFlow();
        } else if (isActivityPage) {
            await initActivityFlow();
        } else if (isSubjectPage) {
            await initSubjectFlow();
        }
    } catch (err) {
        console.error('[App] Initial flow error:', err);
    } finally {
        // Smoothly reveal the fully painted page
        window.GateAuthManager.hideLoadingOverlay();
    }
});

async function initDashboardFlow() {
    if (!window.GateSubjectService || !window.GateProgressService) return;
    
    const subjects = await window.GateSubjectService.loadSubjectsData('data/subjects.json');
    window.GateSubjectService.renderSubjectCards(subjects);
    window.GateProgressService.updateAndAnimateStats(subjects, true);
    window.GateProgressService.initCharts(subjects);
    await window.GateProgressService.updateActiveDaysStat();

    // Populate sidebar with user profile info
    if (window.GateProfileService) {
        await window.GateProfileService.populateSidebar();
    }

    // Wire up logout button
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.GateAuthManager.logout();
        });
    }
}

async function initActivityFlow() {
    if (!window.GateProgressService) return;
    await window.GateProgressService.initActivityPage();

    if (window.GateProfileService) {
        await window.GateProfileService.populateSidebar();
    }

    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.GateAuthManager.logout();
        });
    }
}

async function initSubjectFlow() {
    if (!window.GatePlannerService) return;
    await window.GatePlannerService.initSubjectView();
}
