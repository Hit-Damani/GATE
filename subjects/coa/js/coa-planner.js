/**
 * GATE 2027 — Computer Organization & Architecture (COA) Study Planner Controller
 * Sleek, glassmorphic study planner with Supabase & GateStorage persistence and progress tracking.
 */
(() => {
    'use strict';

    const SUBJECT_ID = 'coa';
    const PLANNER_PATH = 'data/planner.json';
    const DASHBOARD_PATH = '../../index.html';

    let plannerData = null;
    let allTaskIds = [];
    let totalTasks = 0;

    /* Initialize Application */
    document.addEventListener('DOMContentLoaded', async () => {
        if (window.GateErrorHandler) window.GateErrorHandler.initOfflineDetection();
        if (!window.GateAuthManager || !window.GateSupabase?.client) return;

        const session = await window.GateAuthManager.requireAuth(false);
        if (!session) return;

        try {
            if (window.GateStorage) {
                await window.GateStorage.init(session.user.id, { isSubjectPage: true });
            }

            const res = await fetch(PLANNER_PATH);
            if (!res.ok) return;
            plannerData = await res.json();

            allTaskIds = plannerData.days.flatMap(d => d.topics.flatMap(t => t.tasks.map(k => k.id)));
            totalTasks = allTaskIds.length;

            if (window.GateStorage) {
                const cur = window.GateStorage.getSubjectProgress(SUBJECT_ID, totalTasks);
                if (cur.totalTasks !== totalTasks) {
                    await window.GateStorage.setSubjectProgress(SUBJECT_ID, window.GateStorage.getCompletedTaskCount(SUBJECT_ID), totalTasks);
                }
            }

            renderHeader();
            renderNavCards();
            renderPlanner();
            renderModal();
            updateProgress();
        } catch (e) {
            console.error('[COA Planner] Init error:', e);
        } finally {
            window.GateAuthManager.hideLoadingOverlay();
        }
    });
    function renderHeader() {
        const el = document.getElementById('coa-sticky-header');
        if (!el) return;

        const done = window.GateStorage ? window.GateStorage.getCompletedTaskCount(SUBJECT_ID) : 0;
        const pct = totalTasks ? Math.round((done / totalTasks) * 100) : 0;

        el.innerHTML = `
            <div class="coa-header-content">
                <div class="coa-header-left">
                    <a href="${DASHBOARD_PATH}" class="coa-back-btn" aria-label="Back to Dashboard">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                    </a>
                    <div class="coa-title-block">
                        <h1>Computer Organization & Architecture</h1>
                        <p>Overall Subject Progress</p>
                    </div>
                </div>
                <div class="coa-header-stats">
                    <div class="coa-progress-ring">
                        <span class="coa-progress-pct" id="coa-header-pct">${pct}%</span>
                        <span class="coa-progress-label">Completed</span>
                    </div>
                    <div class="coa-progress-bar-wrapper">
                        <div class="coa-progress-bar-track">
                            <div class="coa-progress-bar-fill" id="coa-header-bar" style="width:${pct}%"></div>
                        </div>
                        <div class="coa-task-meta" id="coa-header-meta">
                            <strong>${done}</strong> / <strong>${totalTasks}</strong> tasks completed
                        </div>
                    </div>
                </div>
            </div>`;
    }

    /* Module Navigation Grid */
    function renderNavCards() {
        const el = document.getElementById('coa-nav-section');
        if (!el) return;

        const cards = [
            { i: '📅', l: 'Study Planner', a: true },
            { i: '📝', l: 'Notes' },
            { i: '📄', l: 'PYQs' },
            { i: '📚', l: 'Formula Sheet' }
        ];

        el.innerHTML = `
            <div class="coa-nav-grid">
                ${cards.map(c => `
                    <div class="coa-nav-card ${c.a ? 'active' : 'disabled'}">
                        <span class="coa-nav-icon">${c.i}</span>
                        <span class="coa-nav-label">${c.l}</span>
                        <span class="coa-nav-badge ${c.a ? '' : 'coming-soon'}">${c.a ? 'Active' : 'Coming Soon'}</span>
                    </div>
                `).join('')}
            </div>`;
    }

    /* Dynamic Study Schedule Cards & Tasks */
    function renderPlanner() {
        const el = document.getElementById('coa-planner-section');
        if (!el || !plannerData) return;

        const doneSet = window.GateStorage ? window.GateStorage.getTaskCompletions(SUBJECT_ID) : new Set();
        const today = new Date().toISOString().split('T')[0];

        el.innerHTML = plannerData.days.map(day => {
            const dayIds = day.topics.flatMap(t => t.tasks.map(k => k.id));
            const dayDone = dayIds.filter(id => doneSet.has(id)).length;
            const isDone = dayDone === dayIds.length && dayIds.length > 0;
            const isToday = day.date === today;

            return `
                <div class="coa-day-card ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}" id="${day.id}">
                    <div class="coa-day-header">
                        <div class="coa-day-header-left">
                            <div class="coa-day-number">D${day.day}</div>
                            <div class="coa-day-info">
                                <h3>
                                    ${day.dayName}, ${day.dateLabel}
                                    ${isToday ? '<span class="coa-today-badge">Today</span>' : ''}
                                </h3>
                            </div>
                        </div>
                        <div class="coa-day-header-right">
                            <span class="coa-day-done-badge">🎉 Day Completed</span>
                            <div class="coa-day-progress">
                                <span class="coa-day-progress-text" id="progress-text-${day.id}">${dayDone}/${dayIds.length}</span>
                                <div class="coa-day-progress-track">
                                    <div class="coa-day-progress-fill" id="progress-bar-${day.id}" style="width:${Math.round((dayDone / dayIds.length) * 100)}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="coa-day-body">
                        ${day.topics.map((topic, topicIdx) => {
                            const topicIds = topic.tasks.map(k => k.id);
                            const topicDone = topicIds.filter(id => doneSet.has(id)).length;
                            const isTopicDone = topicDone === topicIds.length && topicIds.length > 0;

                            return `
                                <div class="coa-topic-group ${isTopicDone ? 'topic-completed' : ''}" id="topic-group-${topic.id}">
                                    <div class="coa-topic-header">
                                        <div class="coa-topic-title-wrapper">
                                            <span class="coa-topic-tag">Topic ${topicIdx + 1}</span>
                                            <h4 class="coa-topic-title">${topic.name}</h4>
                                        </div>
                                        <div class="coa-topic-meta">
                                            <span class="coa-topic-count" id="topic-count-${topic.id}"><strong>${topicDone}</strong> / ${topic.tasks.length} tasks</span>
                                        </div>
                                    </div>
                                    <div class="coa-tasks-list">
                                        ${topic.tasks.map(task => {
                                            const chk = doneSet.has(task.id);
                                            return `
                                                <label class="coa-task-item ${chk ? 'checked' : ''}" id="task-${task.id}">
                                                    <div class="coa-checkbox-wrapper">
                                                        <input type="checkbox" data-task-id="${task.id}" ${chk ? 'checked' : ''} />
                                                        <div class="coa-checkbox-visual"></div>
                                                    </div>
                                                    <div class="coa-task-label-wrapper">
                                                        <div class="coa-task-title">${task.title}</div>
                                                    </div>
                                                </label>`;
                                        }).join('')}
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>`;
        }).join('');

        /* Wire Checkbox Change Events */
        el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const taskId = e.target.dataset.taskId;
                const isChk = e.target.checked;
                const item = e.target.closest('.coa-task-item');

                const ok = isChk
                    ? await window.GateStorage.completeTask(taskId, SUBJECT_ID)
                    : await window.GateStorage.uncompleteTask(taskId);

                if (!ok) {
                    e.target.checked = !isChk;
                    return;
                }

                if (item) item.classList.toggle('checked', isChk);

                const count = window.GateStorage.getCompletedTaskCount(SUBJECT_ID);
                await window.GateStorage.setSubjectProgress(SUBJECT_ID, count, totalTasks);
                updateProgress();

                if (count === totalTasks && totalTasks > 0) {
                    showCelebration();
                }
            });
        });
    }

    /* Recalculate and Update Progress Indicators */
    function updateProgress() {
        if (!plannerData || !window.GateStorage) return;

        const doneSet = window.GateStorage.getTaskCompletions(SUBJECT_ID);
        const count = doneSet.size;
        const pct = totalTasks ? Math.round((count / totalTasks) * 100) : 0;

        const hPct = document.getElementById('coa-header-pct');
        const hBar = document.getElementById('coa-header-bar');
        const hMeta = document.getElementById('coa-header-meta');

        if (hPct) hPct.textContent = pct + '%';
        if (hBar) hBar.style.width = pct + '%';
        if (hMeta) hMeta.innerHTML = `<strong>${count}</strong> / <strong>${totalTasks}</strong> tasks completed`;

        plannerData.days.forEach(day => {
            const dayIds = day.topics.flatMap(t => t.tasks.map(k => k.id));
            const dayDone = dayIds.filter(id => doneSet.has(id)).length;
            const isDone = dayDone === dayIds.length && dayIds.length > 0;

            const txt = document.getElementById(`progress-text-${day.id}`);
            const bar = document.getElementById(`progress-bar-${day.id}`);
            const card = document.getElementById(day.id);

            if (txt) txt.textContent = `${dayDone}/${dayIds.length}`;
            if (bar) bar.style.width = `${Math.round((dayDone / dayIds.length) * 100)}%`;
            if (card) card.classList.toggle('completed', isDone);

            day.topics.forEach(topic => {
                const topicIds = topic.tasks.map(k => k.id);
                const topicDone = topicIds.filter(id => doneSet.has(id)).length;
                const isTopicDone = topicDone === topicIds.length && topicIds.length > 0;

                const topicCountEl = document.getElementById(`topic-count-${topic.id}`);
                const topicGroupEl = document.getElementById(`topic-group-${topic.id}`);

                if (topicCountEl) topicCountEl.innerHTML = `<strong>${topicDone}</strong> / ${topic.tasks.length} tasks`;
                if (topicGroupEl) topicGroupEl.classList.toggle('topic-completed', isTopicDone);
            });
        });
    }

    /* Modal Component */
    function renderModal() {
        if (document.getElementById('coa-completion-modal')) return;

        const modal = document.createElement('div');
        modal.className = 'coa-completion-modal';
        modal.id = 'coa-completion-modal';
        modal.innerHTML = `
            <div class="coa-modal-content">
                <div class="coa-modal-emoji">🎉</div>
                <h2 class="coa-modal-title">Congratulations!</h2>
                <p class="coa-modal-subtitle">
                    <strong>Computer Organization & Architecture Completed!</strong><br>
                    Outstanding Effort.<br>
                    Continue with your GATE preparation.
                </p>
                <button class="coa-modal-close-btn" id="coa-modal-close">Continue →</button>
            </div>`;

        document.body.appendChild(modal);

        const close = () => {
            modal.classList.remove('show');
            document.getElementById('coa-confetti-container')?.remove();
        };

        document.getElementById('coa-modal-close').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
    }

    /* Confetti Particle Burst */
    function showCelebration() {
        document.getElementById('coa-completion-modal')?.classList.add('show');
        document.getElementById('coa-confetti-container')?.remove();

        const container = document.createElement('div');
        container.className = 'coa-confetti-container';
        container.id = 'coa-confetti-container';
        document.body.appendChild(container);

        const colors = ['rgb(147,51,234)', 'rgb(168,85,247)', 'rgb(192,132,252)', 'rgb(236,72,153)', 'rgb(245,158,11)', 'rgb(16,185,129)'];
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.className = 'coa-confetti-piece';
            p.style.left = Math.random() * 100 + '%';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = p.style.height = (Math.random() * 6 + 4) + 'px';
            p.style.animationDuration = (Math.random() * 2 + 2) + 's';
            p.style.animationDelay = (Math.random() * 1.5) + 's';
            container.appendChild(p);
        }

        setTimeout(() => container.remove(), 5000);
    }
})();
