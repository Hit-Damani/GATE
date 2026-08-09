/**
 * GATE 2027 Dashboard Content Controller
 * Connects LocalStorage states, renders grid items, and drives Chart.js analytics graphs
 */

// Fallback subjects list matching data/subjects.json
const FALLBACK_SUBJECTS = [
    { "id": "coa", "name": "Computer Organization & Architecture", "icon": "cpu", "accent": "purple", "folder": "coa", "totalTasks": 0 },
    { "id": "os", "name": "Operating System", "icon": "terminal", "accent": "blue", "folder": "os", "totalTasks": 0 },
    { "id": "dbms", "name": "DBMS", "icon": "database", "accent": "cyan", "folder": "dbms", "totalTasks": 0 },
    { "id": "cn", "name": "Computer Networks", "icon": "globe", "accent": "emerald", "folder": "cn", "totalTasks": 0 },
    { "id": "data-structures", "name": "Data Structures", "icon": "layers", "accent": "indigo", "folder": "data-structures", "totalTasks": 0 },
    { "id": "algorithms", "name": "Algorithms", "icon": "git-branch", "accent": "violet", "folder": "algorithms", "totalTasks": 0 },
    { "id": "toc", "name": "Theory of Computation", "icon": "settings", "accent": "teal", "folder": "toc", "totalTasks": 0 },
    { "id": "compiler", "name": "Compiler Design", "icon": "code-2", "accent": "rose", "folder": "compiler", "totalTasks": 0 },
    { "id": "digital-logic", "name": "Digital Logic", "icon": "binary", "accent": "amber", "folder": "digital-logic", "totalTasks": 0 },
    { "id": "engineering-mathematics", "name": "Engineering Mathematics", "icon": "calculator", "accent": "orange", "folder": "engineering-mathematics", "totalTasks": 0 },
    { "id": "discrete-mathematics", "name": "Discrete Mathematics", "icon": "hash", "accent": "pink", "folder": "discrete-mathematics", "totalTasks": 0 },
    { "id": "c-programming", "name": "C Programming", "icon": "file-code", "accent": "sky", "folder": "c-programming", "totalTasks": 0 },
    { "id": "aptitude", "name": "General Aptitude", "icon": "lightbulb", "accent": "green", "folder": "aptitude", "totalTasks": 0 }
];

// Hex codes for accent colors matching the HSL variables
const ACCENT_COLOR_MAP = {
    purple: '#a855f7',
    blue: '#3b82f6',
    cyan: '#06b6d4',
    emerald: '#10b981',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    teal: '#14b8a6',
    rose: '#f43f5e',
    amber: '#f59e0b',
    orange: '#f97316',
    pink: '#ec4899',
    sky: '#0ea5e9',
    green: '#22c55e'
};

let globalSubjects = [];
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Subject Data
    globalSubjects = await loadSubjectsData();

    // 2. Render Cards
    renderSubjectCards(globalSubjects);

    // 3. Populate statistics and render Chart.js graphs
    updateAndAnimateStats(globalSubjects, true);
    initCharts(globalSubjects);

    // 4. Setup search filters
    setupSearch(globalSubjects);
});

/**
 * Loads subjects config from JSON with static safety limits
 */
async function loadSubjectsData() {
    try {
        const response = await fetch('data/subjects.json');
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Unable to fetch data/subjects.json due to CORS. Using local fallback subjects.");
    }
    return FALLBACK_SUBJECTS;
}

/**
 * Injects subject nodes into grid and resolves Lucide SVGs
 * @param {Array} subjects 
 */
function renderSubjectCards(subjects) {
    const grid = document.getElementById('subject-grid');
    if (!grid) return;

    grid.innerHTML = '';

    subjects.forEach(sub => {
        const progress = window.GateStorage.getSubjectProgress(sub.id, sub.totalTasks);

        let statusText = 'Not Started';
        let statusClass = 'status-not-started';

        if (progress.percentage === 100) {
            statusText = 'Completed';
            statusClass = 'status-completed';
        } else if (progress.percentage > 0) {
            statusText = 'In Progress';
            statusClass = 'status-in-progress';
        }

        const card = document.createElement('div');
        card.className = `subject-card accent-${sub.accent}`;
        card.dataset.id = sub.id;
        card.dataset.name = sub.name.toLowerCase();

        card.innerHTML = `
            <div class="card-glow"></div>
            <div class="card-header">
                <span class="subject-icon"><i data-lucide="${sub.icon}"></i></span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <h3 class="subject-name">${sub.name}</h3>
            
            <div class="card-progress-section">
                <div class="progress-info">
                    <span class="progress-label">Completion</span>
                    <span class="progress-value" id="val-${sub.id}">0%</span>
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" id="bar-${sub.id}" style="width: 0%"></div>
                </div>
                <div class="task-info">
                    <span>Lectures: <strong class="tasks-completed">${progress.completedTasks}</strong> / <span class="tasks-total">${progress.totalTasks}</span></span>
                </div>
            </div>
            
            <a href="subjects/${sub.folder}/index.html" class="continue-btn" data-id="${sub.id}">
                <span>Continue Hub</span>
                <i data-lucide="arrow-right"></i>
            </a>
        `;

        card.addEventListener('click', () => {
            window.GateStorage.saveLastActiveSubject(sub.id);
        });

        const btn = card.querySelector('.continue-btn');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.GateStorage.saveLastActiveSubject(sub.id);
        });

        grid.appendChild(card);

        // Animating individual bar fills
        setTimeout(() => {
            const fill = document.getElementById(`bar-${sub.id}`);
            if (fill) fill.style.width = `${progress.percentage}%`;

            const val = document.getElementById(`val-${sub.id}`);
            if (val) window.GateUtils.animatePercentage(val, 0, progress.percentage, 1000);
        }, 80);
    });

    // Re-trigger Lucide icon rendering on dynamically created DOM nodes
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Calculates aggregates and triggers count up animations
 * @param {Array} subjects 
 * @param {boolean} animate 
 */
function updateAndAnimateStats(subjects, animate = true) {
    const report = window.GateProgress.calculateOverall(subjects);

    // Update center description text
    const metaText = document.getElementById('overall-progress-meta-text');
    if (metaText) {
        metaText.innerHTML = `You've solved <strong>${report.completedTasks}</strong> of <strong>${report.totalTasks}</strong> total curriculum tasks.`;
    }

    // Set Streak and Estimated Completion Dates
    const streakData = window.GateStorage.getStreakData();
    const streakVal = document.getElementById('streak-val');
    if (streakVal) {
        streakVal.textContent = streakData.currentStreak;
    }

    const estVal = document.getElementById('est-completion-val');
    if (estVal) {
        estVal.textContent = 'Nov 30';
    }

    if (animate) {
        window.GateUtils.animatePercentage('overall-progress-val', 0, report.overallPercentage, 1000);
        window.GateUtils.animateCounter('stat-total-subjects', 0, report.totalSubjects, 600);
        window.GateUtils.animateCounter('stat-completed-subjects', 0, report.completedSubjects, 600);
        window.GateUtils.animateCounter('stat-remaining-subjects', 0, report.remainingSubjects, 600);
        window.GateUtils.animateCounter('stat-total-tasks', 0, report.totalTasks, 800);
        window.GateUtils.animateCounter('stat-completed-tasks', 0, report.completedTasks, 800);
        window.GateUtils.animateCounter('stat-remaining-tasks', 0, report.remainingTasks, 800);
    } else {
        document.getElementById('overall-progress-val').textContent = `${report.overallPercentage}%`;
        document.getElementById('stat-total-subjects').textContent = report.totalSubjects;
        document.getElementById('stat-completed-subjects').textContent = report.completedSubjects;
        document.getElementById('stat-remaining-subjects').textContent = report.remainingSubjects;
        document.getElementById('stat-total-tasks').textContent = report.totalTasks;
        document.getElementById('stat-completed-tasks').textContent = report.completedTasks;
        document.getElementById('stat-remaining-tasks').textContent = report.remainingTasks;
    }

    // Dynamic Chart Update (overallProgressChart)
    if (charts.overall) {
        charts.overall.data.datasets[0].data = [report.overallPercentage, 100 - report.overallPercentage];
        charts.overall.update();
    }
}

/**
 * Initializes visual Chart.js dashboards
 * @param {Array} subjects 
 */
function initCharts(subjects) {
    if (!window.Chart) return;

    const report = window.GateProgress.calculateOverall(subjects);

    // 1. Overall Circular Progress Chart (Doughnut)
    const overallCtx = document.getElementById('overallProgressChart');
    if (overallCtx) {
        charts.overall = new Chart(overallCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [report.overallPercentage, 100 - report.overallPercentage],
                    backgroundColor: ['#a855f7', 'rgba(255, 255, 255, 0.02)'],
                    borderWidth: 0,
                    hoverBackgroundColor: ['#b86cf9', 'rgba(255, 255, 255, 0.02)']
                }]
            },
            options: {
                cutout: '80%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }
}

/**
 * Intercepts desktop and mobile search bars and filters subject card nodes
 * @param {Array} subjects 
 */
function setupSearch(subjects) {
    const desktopSearch = document.getElementById('subject-search');
    const mobileSearch = document.getElementById('subject-search-mobile');

    if (!desktopSearch && !mobileSearch) return;

    const performSearch = (query) => {
        const cleanQuery = query.toLowerCase().trim();
        const cards = document.querySelectorAll('.subject-card');

        cards.forEach(card => {
            const name = card.dataset.name || '';
            const id = card.dataset.id || '';

            if (name.includes(cleanQuery) || id.includes(cleanQuery)) {
                card.style.display = '';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if (card.style.opacity === '0') {
                        card.style.display = 'none';
                    }
                }, 180);
            }
        });
    };

    const handleInput = window.GateUtils.debounce((e) => {
        const query = e.target.value;

        // Sync values between both inputs
        if (desktopSearch) desktopSearch.value = query;
        if (mobileSearch) mobileSearch.value = query;

        performSearch(query);
    }, 100);

    if (desktopSearch) desktopSearch.addEventListener('input', handleInput);
    if (mobileSearch) mobileSearch.addEventListener('input', handleInput);
}



/**
 * Instantiates glassmorphic Toast items on screen
 * @param {string} message 
 */
function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'custom-toast';

    // Inject icon into toast
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i data-lucide="info" style="font-size: 1.1rem; color: #a855f7; flex-shrink: 0;"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(toast);

    if (window.lucide) {
        window.lucide.createIcons();
    }

    setTimeout(() => {
        toast.classList.add('show');
    }, 20);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2800);
}

// Make showToast accessible from sidebar onclick scripts
window.showToast = showToast;
