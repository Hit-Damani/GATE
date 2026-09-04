/**
 * GATE 2027 — Focus Timer Studio Service (Streamlined)
 * Handles circular SVG progress dial, 25m/50m Pomodoro timing,
 * Zen mode, and deep work logging to Supabase.
 */

window.GateTimerService = {
    durationMins: 25,
    totalSeconds: 25 * 60,
    secondsLeft: 25 * 60,
    isRunning: false,
    intervalId: null,
    startTime: null,
    baseSecondsLeft: 25 * 60,
    activeSubjectId: 'os',
    C: 2 * Math.PI * 140, // ~879.65px circumference for r=140

    dom: {},

    async init() {
        this.cacheDom();
        if (window.GateStorage?.getLastActiveSubject) {
            this.activeSubjectId = window.GateStorage.getLastActiveSubject() || 'os';
        }
        await this.populateSubjectPicker();
        this.bindEvents();
        this.updateDisplay();
        this.renderStats();
        this.renderHistory();
        window.lucide?.createIcons();
    },

    cacheDom() {
        const id = s => document.getElementById(s);
        this.dom = {
            circleProgress: id('timer-circle-progress'),
            clockDisplay: id('timer-clock-display'),
            clockSubtitle: id('timer-clock-subtitle'),
            statusBadge: id('timer-status-badge'),
            primaryBtn: id('timer-btn-primary'),
            primaryIcon: id('timer-primary-icon'),
            primaryText: id('timer-primary-text'),
            resetBtn: id('timer-btn-reset'),
            subjectSelect: id('timer-subject-select'),
            customDropdown: id('custom-subject-dropdown'),
            dropdownTrigger: id('custom-dropdown-trigger'),
            dropdownText: id('dropdown-selected-text'),
            dropdownDot: id('dropdown-selected-dot'),
            dropdownMenu: id('custom-dropdown-menu'),
            modePills: document.querySelectorAll('.timer-mode-pill'),
            zenToggle: id('zen-mode-toggle'),
            exitZenBtn: id('exit-zen-btn'),
            statToday: id('timer-stat-today-hours'),
            statSessions: id('timer-stat-total-sessions'),
            statTotal: id('timer-stat-total-hours'),
            historyList: id('timer-history-list'),
            historyCount: id('history-total-count')
        };
    },

    subjects: [],
    subjectsMap: new Map(),

    async populateSubjectPicker() {
        try {
            this.subjects = await window.GateSubjectService?.loadSubjectsData('data/subjects.json') || [];
        } catch (e) {
            this.subjects = [];
        }
        this.subjectsMap = new Map(this.subjects.map(s => [s.id, s]));

        // Hidden select for backward compatibility
        if (this.dom.subjectSelect) {
            this.dom.subjectSelect.innerHTML = this.subjects.map(s => `<option value="${s.id}">${this.getSubjectDisplayName(s.id)}</option>`).join('');
            this.dom.subjectSelect.value = this.activeSubjectId;
        }

        // Custom Glass Dropdown Menu
        if (this.dom.dropdownMenu) {
            this.dom.dropdownMenu.innerHTML = this.subjects.map(s => {
                const color = this.getSubjectColor(s.id);
                const isActive = s.id === this.activeSubjectId;
                const displayName = this.getSubjectDisplayName(s.id);
                return `
                    <div class="custom-dropdown-item ${isActive ? 'active' : ''}" data-id="${s.id}">
                        <div class="item-left">
                            <span class="item-dot" style="background:${color};box-shadow:0 0 8px ${color}"></span>
                            <span class="item-name">${displayName}</span>
                        </div>
                        ${isActive ? '<i data-lucide="check" class="item-check"></i>' : ''}
                    </div>
                `;
            }).join('');

            this.dom.dropdownMenu.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.selectSubject(item.dataset.id);
                });
            });
        }

        this.updateDropdownTriggerUI();
    },

    getSubject(id) {
        return this.subjectsMap.get(id) || { id, name: id ? id.toUpperCase() : 'General Study', accent: 'purple' };
    },

    getSubjectColor(id) {
        const accent = this.getSubject(id).accent || 'purple';
        return `rgb(var(--accent-${accent}, var(--accent-purple)))`;
    },

    getSubjectDisplayName(id) {
        const s = this.getSubject(id);
        return s.shortName || s.name;
    },

    selectSubject(id) {
        this.activeSubjectId = id;
        if (this.dom.subjectSelect) this.dom.subjectSelect.value = id;
        window.GateStorage?.setLastActiveSubject?.(id);
        this.updateDropdownTriggerUI();
        this.closeCustomDropdown();
        this.populateSubjectPicker();
    },

    updateDropdownTriggerUI() {
        const sub = this.getSubject(this.activeSubjectId);
        const color = this.getSubjectColor(this.activeSubjectId);
        if (this.dom.dropdownText) this.dom.dropdownText.textContent = sub.shortName || sub.name;
        if (this.dom.dropdownDot) {
            this.dom.dropdownDot.style.background = color;
            this.dom.dropdownDot.style.boxShadow = `0 0 8px ${color}`;
        }
        window.lucide?.createIcons();
    },

    toggleCustomDropdown() {
        this.dom.customDropdown?.classList.toggle('open');
        const isOpen = this.dom.customDropdown?.classList.contains('open');
        this.dom.dropdownTrigger?.setAttribute('aria-expanded', String(isOpen));
        window.lucide?.createIcons();
    },

    closeCustomDropdown() {
        this.dom.customDropdown?.classList.remove('open');
        this.dom.dropdownTrigger?.setAttribute('aria-expanded', 'false');
    },

    bindEvents() {
        this.dom.primaryBtn?.addEventListener('click', () => this.isRunning ? this.pause() : this.start());
        this.dom.resetBtn?.addEventListener('click', () => this.reset());

        // Custom Dropdown trigger
        this.dom.dropdownTrigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCustomDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.dom.customDropdown?.contains(e.target)) {
                this.closeCustomDropdown();
            }
        });

        this.dom.modePills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.dom.modePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const mins = Number(pill.dataset.mins) || 25;
                this.setDuration(mins);
            });
        });

        this.dom.zenToggle?.addEventListener('click', () => this.toggleZenMode(true));
        this.dom.exitZenBtn?.addEventListener('click', () => this.toggleZenMode(false));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeCustomDropdown();
                if (document.body.classList.contains('zen-mode')) this.toggleZenMode(false);
            }
        });
    },

    setDuration(mins = 25) {
        this.pause();
        this.durationMins = mins;
        this.totalSeconds = mins * 60;
        this.secondsLeft = this.totalSeconds;
        this.baseSecondsLeft = this.secondsLeft;
        this.setBadge('READY TO FOCUS', 'ready');
        if (this.dom.clockSubtitle) {
            this.dom.clockSubtitle.textContent = `${mins}-Minute Session`;
        }
        this.updateDisplay();
        this.updatePrimaryButtonUI();
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = Date.now();
        this.baseSecondsLeft = this.secondsLeft;
        this.setBadge('FOCUSING', 'running');
        this.updatePrimaryButtonUI();
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.tick(), 250);
    },

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.baseSecondsLeft = this.secondsLeft;
        this.setBadge('PAUSED', 'paused');
        this.updatePrimaryButtonUI();
    },

    tick() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const next = Math.max(0, this.baseSecondsLeft - elapsed);
        if (next !== this.secondsLeft) {
            this.secondsLeft = next;
            this.updateDisplay();
            if (this.secondsLeft === 0) this.completeSession();
        }
    },

    reset() {
        this.pause();
        this.secondsLeft = this.totalSeconds;
        this.baseSecondsLeft = this.secondsLeft;
        this.setBadge('READY TO FOCUS', 'ready');
        this.updateDisplay();
        this.updatePrimaryButtonUI();
    },

    async completeSession() {
        this.pause();
        this.setBadge('SPRINT COMPLETE 🎉', 'completed');
        await this.logSession(this.durationMins);
        this.secondsLeft = this.totalSeconds;
        this.baseSecondsLeft = this.secondsLeft;
        this.updateDisplay();
    },

    async logSession(minutes) {
        const subId = this.activeSubjectId || 'os';
        const subName = this.getSubjectDisplayName(subId);
        if (window.GateStorage?.saveStudySession) {
            await window.GateStorage.saveStudySession(subId, minutes, 'pomodoro');
        }
        window.GateErrorHandler?.showToast(`🎉 Logged ${minutes}m of deep work for ${subName}!`, 'success', 4000);
        this.renderStats();
        this.renderHistory();
    },

    setBadge(text, cls) {
        if (!this.dom.statusBadge) return;
        this.dom.statusBadge.textContent = text;
        this.dom.statusBadge.className = `timer-status-badge ${cls}`;
    },

    formatTime(secs) {
        const m = Math.floor(secs / 60), s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    updateDisplay() {
        const timeStr = this.formatTime(this.secondsLeft);
        if (this.dom.clockDisplay) this.dom.clockDisplay.textContent = timeStr;

        if (this.dom.circleProgress) {
            const fraction = this.totalSeconds > 0 ? this.secondsLeft / this.totalSeconds : 1;
            this.dom.circleProgress.style.strokeDashoffset = (this.C * (1 - fraction)).toFixed(2);
        }
        document.title = this.isRunning ? `(${timeStr}) Focus Studio — GATE 2027` : 'Focus Studio — GATE 2027';
    },

    updatePrimaryButtonUI() {
        if (!this.dom.primaryBtn) return;
        const btn = this.dom.primaryBtn;
        if (this.isRunning) {
            btn.className = 'timer-main-btn pause';
            if (this.dom.primaryText) this.dom.primaryText.textContent = 'Pause';
            this.dom.primaryIcon?.setAttribute('data-lucide', 'pause');
        } else {
            btn.className = 'timer-main-btn primary play';
            const started = this.secondsLeft < this.totalSeconds;
            if (this.dom.primaryText) this.dom.primaryText.textContent = started ? 'Resume' : 'Start';
            this.dom.primaryIcon?.setAttribute('data-lucide', 'play');
        }

        window.lucide?.createIcons();
    },

    toggleZenMode(enable) {
        document.body.classList.toggle('zen-mode', enable);
        window.lucide?.createIcons();
    },

    renderStats() {
        const stats = window.GateStorage?.getDeepWorkStats?.();
        if (!stats) return;
        if (this.dom.statToday) this.dom.statToday.textContent = `${stats.todayHours}h`;
        if (this.dom.statSessions) this.dom.statSessions.textContent = `${stats.sessionCount}`;
        if (this.dom.statTotal) this.dom.statTotal.textContent = `${stats.totalHours}h`;
    },

    renderHistory() {
        if (!this.dom.historyList) return;
        const sessions = window.GateStorage?.getStudySessions?.() || [];
        if (this.dom.historyCount) this.dom.historyCount.textContent = `${sessions.length} Sessions`;

        if (!sessions.length) {
            this.dom.historyList.innerHTML = '<div class="history-empty-state">No focus sessions recorded yet. Start above! 🚀</div>';
            return;
        }

        this.dom.historyList.innerHTML = sessions.slice(0, 10).map(s => {
            const mins = Number(s.duration_minutes) || 25;
            const sub = this.getSubjectDisplayName(s.subject_id);
            const rawDate = s.session_date || (s.created_at ? s.created_at.split('T')[0] : '');
            const dateDisplay = this.formatSessionDate(rawDate);

            return `<div class="history-session-item">
                <div class="session-left-meta">
                    <span class="session-subject-name">${sub}</span>
                    <div class="session-sub-row">
                        <span class="session-time-ago">${dateDisplay}</span>
                    </div>
                </div>
                <div class="session-right-meta">
                    <span class="session-duration">+${mins}m</span>
                </div>
            </div>`;
        }).join('');
    },

    formatSessionDate(dateStr) {
        if (!dateStr) return 'Today';
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) return 'Today';

        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        if (dateStr === yStr) return 'Yesterday';

        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const mo = Number(parts[1]);
                const dy = Number(parts[2]);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                if (mo >= 1 && mo <= 12) return `${dy} ${months[mo - 1]}`;
            }
        } catch (e) {}
        return dateStr;
    }
};
