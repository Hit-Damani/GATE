/**
 * GATE 2027 — Unified Subject Hub & Study Planner Controller
 * Streamlined, high-performance controller for all 13 GATE CSE subjects.
 */
(() => {
    'use strict';

    let currentSubject = null;
    let plannerData = null;
    let totalTasks = 0;

    window.GatePlannerService = {
        async initSubjectView() {
            const subjectId = window.GateUtils ? window.GateUtils.getQueryParam('id') : 'coa';
            const subjects = window.GateSubjectService
                ? await window.GateSubjectService.loadSubjectsData('../data/subjects.json')
                : [];

            currentSubject = subjects.find(s => s.id === subjectId) || subjects.find(s => s.id === 'coa') || subjects[0];
            if (!currentSubject) return;

            // Apply theme & title
            document.body.className = `app-layout subject-page theme-${currentSubject.accent || 'purple'}`;
            document.title = `${currentSubject.name} — Study Planner | GATE 2027`;
            if (window.GateStorage) window.GateStorage.saveLastActiveSubject(currentSubject.id);

            // Load Planner Data
            plannerData = await this.loadPlannerData(currentSubject.id);

            if (plannerData && Array.isArray(plannerData.days) && plannerData.days.length > 0) {
                const allTaskIds = plannerData.days.flatMap(d => (d.topics || []).flatMap(t => (t.tasks || []).map(k => k.id)));
                totalTasks = allTaskIds.length;

                if (window.GateStorage) {
                    const doneCount = window.GateStorage.getCompletedTaskCount(currentSubject.id);
                    await window.GateStorage.setSubjectProgress(currentSubject.id, doneCount, totalTasks);
                }

                this.renderHeader();
                this.renderNavCards(true);
                this.renderPlanner();
                this.renderModal();
                this.updateProgress();
            } else {
                totalTasks = currentSubject.totalTasks || 0;
                this.renderHeader();
                this.renderNavCards(false);
                this.renderEmptyState();
            }

            if (window.lucide) window.lucide.createIcons();
        },

        async loadPlannerData(subjectId) {
            for (const path of [`../data/${subjectId}/planner.json`, `data/${subjectId}/planner.json`]) {
                try {
                    const res = await fetch(path);
                    if (res.ok) return await res.json();
                } catch (e) {}
            }
            return null;
        },

        renderHeader() {
            const el = document.getElementById('subject-sticky-header');
            if (!el || !currentSubject) return;

            const done = window.GateStorage ? window.GateStorage.getCompletedTaskCount(currentSubject.id) : 0;
            const pct = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;

            el.innerHTML = `
                <div class="subject-header-content">
                    <div class="subject-header-left">
                        <div class="subject-title-block">
                            <h1>${currentSubject.name}</h1>
                        </div>
                    </div>
                    <div class="subject-header-stats">
                        <div class="subject-progress-meta-row">
                            <span class="subject-task-meta" id="subject-header-meta"><strong>${done}</strong> / <strong>${totalTasks}</strong> tasks completed</span>
                            <span class="subject-progress-pct" id="subject-header-pct">${pct}%</span>
                        </div>
                        <div class="subject-progress-bar-track">
                            <div class="subject-progress-bar-fill" id="subject-header-bar" style="width:${pct}%"></div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderNavCards(hasPlanner = false) {
            const el = document.getElementById('subject-nav-section');
            if (!el) return;

            const cards = [
                { icon: '📅', label: 'Study Planner', active: hasPlanner },
                { icon: '📝', label: 'Notes', active: false },
                { icon: '📄', label: 'PYQs', active: false },
                { icon: '📚', label: 'Formula Sheet', active: false }
            ];

            el.innerHTML = `
                <div class="subject-nav-grid">
                    ${cards.map(c => `
                        <div class="subject-nav-card ${c.active ? 'active' : 'disabled'}">
                            <span class="subject-nav-icon">${c.icon}</span>
                            <span class="subject-nav-label">${c.label}</span>
                            <span class="subject-nav-badge ${c.active ? '' : 'coming-soon'}">${c.active ? 'Active' : 'Coming Soon'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        },

        renderPlanner() {
            const el = document.getElementById('subject-planner-section');
            if (!el || !plannerData || !plannerData.days) return;

            const doneSet = window.GateStorage ? window.GateStorage.getTaskCompletions(currentSubject.id) : new Set();
            const today = new Date().toISOString().split('T')[0];

            el.innerHTML = plannerData.days.map(day => {
                const dayTopics = day.topics || [];
                const dayIds = dayTopics.flatMap(t => (t.tasks || []).map(k => k.id));
                const dayDone = dayIds.filter(id => doneSet.has(id)).length;
                const isDone = dayDone === dayIds.length && dayIds.length > 0;
                const isToday = day.date === today;

                return `
                    <div class="day-card ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}" id="${day.id}">
                        <div class="day-header">
                            <div class="day-header-left">
                                <div class="day-number">D${day.day}</div>
                                <div class="day-info">
                                    <h3>
                                        ${day.dayName || ('Day ' + day.day)}, ${day.dateLabel || ''}
                                        ${isToday ? '<span class="today-badge">Today</span>' : ''}
                                    </h3>
                                </div>
                            </div>
                            <div class="day-header-right">
                                <span class="day-done-badge">🎉 Day Completed</span>
                                <div class="day-progress">
                                    <span class="day-progress-text" id="progress-text-${day.id}">${dayDone}/${dayIds.length}</span>
                                    <div class="day-progress-track">
                                        <div class="day-progress-fill" id="progress-bar-${day.id}" style="width:${dayIds.length ? Math.round((dayDone / dayIds.length) * 100) : 0}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="day-body">
                            ${dayTopics.map((topic, topicIdx) => {
                                const topicTasks = topic.tasks || [];
                                const topicIds = topicTasks.map(k => k.id);
                                const topicDone = topicIds.filter(id => doneSet.has(id)).length;
                                const isTopicDone = topicDone === topicIds.length && topicIds.length > 0;

                                return `
                                    <div class="topic-group ${isTopicDone ? 'topic-completed' : ''}" id="topic-group-${topic.id}">
                                        <div class="topic-header">
                                            <div class="topic-title-wrapper">
                                                <span class="topic-tag">Topic ${topicIdx + 1}</span>
                                                <h4 class="topic-title">${topic.name}</h4>
                                            </div>
                                            <div class="topic-meta">
                                                <span class="topic-count" id="topic-count-${topic.id}"><strong>${topicDone}</strong> / ${topicTasks.length} tasks</span>
                                            </div>
                                        </div>
                                        <div class="tasks-list">
                                            ${topicTasks.map(task => {
                                                const chk = doneSet.has(task.id);
                                                return `
                                                    <label class="task-item ${chk ? 'checked' : ''}" id="task-${task.id}">
                                                        <div class="checkbox-wrapper">
                                                            <input type="checkbox" data-task-id="${task.id}" ${chk ? 'checked' : ''} />
                                                            <div class="checkbox-visual"></div>
                                                        </div>
                                                        <div class="task-label-wrapper">
                                                            <div class="task-title">${task.title}</div>
                                                        </div>
                                                    </label>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            // Clean event delegation for checkbox handling
            el.onchange = async (e) => {
                if (e.target && e.target.type === 'checkbox') {
                    const taskId = e.target.dataset.taskId;
                    const isChk = e.target.checked;
                    const item = e.target.closest('.task-item');

                    const ok = isChk
                        ? await window.GateStorage.completeTask(taskId, currentSubject.id)
                        : await window.GateStorage.uncompleteTask(taskId);

                    if (!ok) {
                        e.target.checked = !isChk;
                        if (window.GateErrorHandler) window.GateErrorHandler.showToast('Failed to save task', 'error');
                        return;
                    }

                    if (item) item.classList.toggle('checked', isChk);
                    const count = window.GateStorage.getCompletedTaskCount(currentSubject.id);
                    await window.GateStorage.setSubjectProgress(currentSubject.id, count, totalTasks);
                    this.updateProgress();

                    if (count === totalTasks && totalTasks > 0) this.showCelebration();
                }
            };
        },

        renderEmptyState() {
            const el = document.getElementById('subject-planner-section');
            if (!el || !currentSubject) return;

            el.innerHTML = `
                <div class="planner-empty-card">
                    <h2>Roadmap In Preparation</h2>
                    <p>The structured study planner schedule for <strong>${currentSubject.name}</strong> is currently being assembled.</p>
                    <a href="../index.html" class="planner-empty-back-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                        <span>Return to Dashboard</span>
                    </a>
                </div>
            `;
        },

        updateProgress() {
            if (!plannerData || !window.GateStorage || !currentSubject) return;

            const doneSet = window.GateStorage.getTaskCompletions(currentSubject.id);
            const count = doneSet.size;
            const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

            const hPct = document.getElementById('subject-header-pct');
            const hBar = document.getElementById('subject-header-bar');
            const hMeta = document.getElementById('subject-header-meta');

            if (hPct) hPct.textContent = pct + '%';
            if (hBar) hBar.style.width = pct + '%';
            if (hMeta) hMeta.innerHTML = `<strong>${count}</strong> / <strong>${totalTasks}</strong> tasks completed`;

            if (plannerData.days) {
                plannerData.days.forEach(day => {
                    const dayTopics = day.topics || [];
                    const dayIds = dayTopics.flatMap(t => (t.tasks || []).map(k => k.id));
                    const dayDone = dayIds.filter(id => doneSet.has(id)).length;
                    const isDone = dayDone === dayIds.length && dayIds.length > 0;

                    const txt = document.getElementById(`progress-text-${day.id}`);
                    const bar = document.getElementById(`progress-bar-${day.id}`);
                    const card = document.getElementById(day.id);

                    if (txt) txt.textContent = `${dayDone}/${dayIds.length}`;
                    if (bar) bar.style.width = `${dayIds.length ? Math.round((dayDone / dayIds.length) * 100) : 0}%`;
                    if (card) card.classList.toggle('completed', isDone);

                    dayTopics.forEach(topic => {
                        const topicTasks = topic.tasks || [];
                        const topicIds = topicTasks.map(k => k.id);
                        const topicDone = topicIds.filter(id => doneSet.has(id)).length;
                        const isTopicDone = topicDone === topicIds.length && topicIds.length > 0;

                        const topicCountEl = document.getElementById(`topic-count-${topic.id}`);
                        const topicGroupEl = document.getElementById(`topic-group-${topic.id}`);

                        if (topicCountEl) topicCountEl.innerHTML = `<strong>${topicDone}</strong> / ${topicTasks.length} tasks`;
                        if (topicGroupEl) topicGroupEl.classList.toggle('topic-completed', isTopicDone);
                    });
                });
            }
        },

        renderModal() {
            if (document.getElementById('subject-completion-modal') || !currentSubject) return;

            const modal = document.createElement('div');
            modal.className = 'subject-completion-modal';
            modal.id = 'subject-completion-modal';
            modal.innerHTML = `
                <div class="subject-modal-content">
                    <div class="subject-modal-emoji">🎉</div>
                    <h2 class="subject-modal-title">Congratulations!</h2>
                    <p class="subject-modal-subtitle">
                        <strong>${currentSubject.name} Completed!</strong><br>
                        Outstanding effort. Keep up the momentum for GATE 2027!
                    </p>
                    <button class="subject-modal-close-btn" id="subject-modal-close">Continue →</button>
                </div>
            `;
            document.body.appendChild(modal);

            const close = () => {
                modal.classList.remove('show');
                document.getElementById('subject-confetti-container')?.remove();
            };

            document.getElementById('subject-modal-close').onclick = close;
            modal.onclick = (e) => { if (e.target === modal) close(); };
        },

        showCelebration() {
            document.getElementById('subject-completion-modal')?.classList.add('show');
            document.getElementById('subject-confetti-container')?.remove();

            const container = document.createElement('div');
            container.className = 'subject-confetti-container';
            container.id = 'subject-confetti-container';
            document.body.appendChild(container);

            const colors = ['#9333ea', '#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];
            for (let i = 0; i < 50; i++) {
                const p = document.createElement('div');
                p.className = 'subject-confetti-piece';
                p.style.left = Math.random() * 100 + '%';
                p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                p.style.width = p.style.height = (Math.random() * 6 + 4) + 'px';
                p.style.animationDuration = (Math.random() * 2 + 2) + 's';
                p.style.animationDelay = (Math.random() * 1.5) + 's';
                container.appendChild(p);
            }
            setTimeout(() => container.remove(), 5000);
        }
    };
})();
