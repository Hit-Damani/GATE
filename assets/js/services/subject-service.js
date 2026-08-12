/**
 * GATE 2027 Functional Subject Service Module
 */

const FALLBACK_SUBJECTS = [
    { "id": "coa", "name": "Computer Organization & Architecture", "icon": "cpu", "accent": "purple", "totalTasks": 56, "hasPlanner": true, "plannerUrl": "subjects/coa/index.html" },
    { "id": "os", "name": "Operating System", "icon": "terminal", "accent": "blue", "totalTasks": 0 },
    { "id": "dbms", "name": "DBMS", "icon": "database", "accent": "cyan", "totalTasks": 0 },
    { "id": "cn", "name": "Computer Networks", "icon": "globe", "accent": "emerald", "totalTasks": 0 },
    { "id": "data-structures", "name": "Data Structures", "icon": "layers", "accent": "indigo", "totalTasks": 0 },
    { "id": "algorithms", "name": "Algorithms", "icon": "git-branch", "accent": "violet", "totalTasks": 0 },
    { "id": "toc", "name": "Theory of Computation", "icon": "settings", "accent": "teal", "totalTasks": 0 },
    { "id": "compiler", "name": "Compiler Design", "icon": "code-2", "accent": "rose", "totalTasks": 0 },
    { "id": "digital-logic", "name": "Digital Logic", "icon": "binary", "accent": "amber", "totalTasks": 0 },
    { "id": "engineering-mathematics", "name": "Engineering Mathematics", "icon": "calculator", "accent": "orange", "totalTasks": 0 },
    { "id": "discrete-mathematics", "name": "Discrete Mathematics", "icon": "hash", "accent": "pink", "folder": "discrete-mathematics", "totalTasks": 0 },
    { "id": "c-programming", "name": "C Programming", "icon": "file-code", "accent": "sky", "totalTasks": 0 },
    { "id": "aptitude", "name": "General Aptitude", "icon": "lightbulb", "accent": "green", "totalTasks": 0 }
];

window.GateSubjectService = {
    async loadSubjectsData(path = 'data/subjects.json') {
        try {
            const response = await fetch(path);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn(`Could not load ${path}. Using fallback subjects.`);
        }
        return FALLBACK_SUBJECTS;
    },

    renderSubjectCards(subjects) {
        const grid = document.getElementById('subject-grid');
        if (!grid) return;

        grid.innerHTML = '';

        subjects.forEach(sub => {
            const progress = window.GateStorage ? window.GateStorage.getSubjectProgress(sub.id, sub.totalTasks) : { completedTasks: 0, totalTasks: 0, percentage: 0 };

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

            const subjectHref = sub.plannerUrl ? sub.plannerUrl : `subjects/subject.html?id=${sub.id}`;

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
                
                <a href="${subjectHref}" class="continue-btn" data-id="${sub.id}">
                    <span>Continue Hub</span>
                    <i data-lucide="arrow-right"></i>
                </a>
            `;

            card.addEventListener('click', () => {
                // saveLastActiveSubject is async (Supabase) but fire-and-forget is OK here
                if (window.GateStorage) window.GateStorage.saveLastActiveSubject(sub.id);
            });

            const btn = card.querySelector('.continue-btn');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.GateStorage) window.GateStorage.saveLastActiveSubject(sub.id);
            });

            grid.appendChild(card);

            setTimeout(() => {
                const fill = document.getElementById(`bar-${sub.id}`);
                if (fill) fill.style.width = `${progress.percentage}%`;

                const val = document.getElementById(`val-${sub.id}`);
                if (val && window.GateUtils) window.GateUtils.animatePercentage(val, 0, progress.percentage, 1000);
            }, 80);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
};
