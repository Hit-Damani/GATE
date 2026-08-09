/**
 * GATE 2027 Functional Subject Hub & Planner Service Module
 */
window.GatePlannerService = {
    async initSubjectView() {
        const subjectId = window.GateUtils ? window.GateUtils.getQueryParam('id') : 'os';
        const subjects = window.GateSubjectService 
            ? await window.GateSubjectService.loadSubjectsData('../data/subjects.json') 
            : [];
        
        let currentSubject = subjects.find(s => s.id === subjectId);
        if (!currentSubject) {
            currentSubject = subjects.find(s => s.id === 'os') || subjects[0];
        }

        if (window.GateStorage && currentSubject) {
            window.GateStorage.saveLastActiveSubject(currentSubject.id);
        }

        if (currentSubject) {
            this.renderSubjectPage(currentSubject);
        }
    },

    async renderSubjectPage(subject) {
        document.title = `${subject.name} - Subject Hub | GATE 2027`;

        const iconEl = document.getElementById('subject-badge-icon');
        const titleEl = document.getElementById('subject-title');
        const descEl = document.getElementById('subject-description');

        if (iconEl) iconEl.innerHTML = `<i data-lucide="${subject.icon}"></i>`;
        if (titleEl) titleEl.textContent = subject.name;
        if (descEl) {
            descEl.textContent = (subject.hasPlanner || subject.hasNotes)
                ? `Core ${subject.name.toLowerCase()} study schedule, notes, and revision progress.`
                : `Core ${subject.name.toLowerCase()} study schedule, notes, and revision progress.`;
        }

        const container = document.getElementById('subject-content-container');
        if (!container) return;

        if (subject.hasPlanner && subject.plannerFile) {
            const plannerData = await this.loadJsonData(`../data/planners/${subject.plannerFile}`);
            this.renderPlannerSchedule(container, plannerData, subject);
        } else if (subject.hasNotes && subject.notesDataFile) {
            const notesList = await this.loadJsonData(`../data/notes/${subject.notesDataFile}`);
            this.renderNotesGrid(container, notesList);
        } else {
            this.renderPhase2Card(container, subject);
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    async loadJsonData(path) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn(`Could not load ${path}`);
        }
        return [];
    },

    renderPlannerSchedule(container, plannerDays, subject) {
        if (!plannerDays || plannerDays.length === 0) {
            container.innerHTML = `<div class="notes-grid-empty">No planner schedule available for this subject yet.</div>`;
            return;
        }

        let html = `<div class="planner-schedule-container">`;
        plannerDays.forEach(day => {
            html += `
                <div class="day-card" id="${day.id || 'day-' + day.day}">
                    <div class="day-header">
                        <h3>Day ${day.day}: ${day.title || 'Study Tasks'}</h3>
                        <span class="day-date">${day.date || ''}</span>
                    </div>
                    <div class="day-tasks-list">
            `;

            if (day.tasks && day.tasks.length > 0) {
                day.tasks.forEach(task => {
                    html += `
                        <label class="task-checkbox-item">
                            <input type="checkbox" data-task-id="${task.id}" />
                            <span class="checkmark"></span>
                            <span class="task-label">${task.title || task.id}</span>
                        </label>
                    `;
                });
            }

            html += `</div></div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    },

    renderNotesGrid(container, notesList) {
        if (!notesList || notesList.length === 0) {
            container.innerHTML = `<div class="notes-grid-empty">No notes available for this subject yet.</div>`;
            return;
        }

        let gridHtml = `<div class="notes-grid">`;

        notesList.forEach(note => {
            gridHtml += `
                <div class="note-card">
                    <div class="note-card-icon">
                        <i data-lucide="${note.icon || 'file-text'}"></i>
                    </div>
                    <div class="note-card-details">
                        <h3>${note.title}</h3>
                        <p>${note.description}</p>
                    </div>
                    <div class="note-actions">
                        <a href="${note.notesUrl}" target="_blank" class="note-open-btn">
                            <i data-lucide="file-text"></i>
                            <span>Notes</span>
                        </a>
                        <a href="${note.dppUrl}" target="_blank" class="note-open-btn dpp-btn">
                            <i data-lucide="pen-tool"></i>
                            <span>DPP</span>
                        </a>
                    </div>
                </div>
            `;
        });

        gridHtml += `</div>`;
        container.innerHTML = gridHtml;
    },

    renderPhase2Card(container, subject) {
        container.innerHTML = `
            <div class="phase2-container-card">
                <h1>Subject Hub</h1>
                <p>The <strong>Subject Hub</strong> module for <strong>${subject.name}</strong> will connect here to display notes, formula cards, and revision progress.</p>
                <a href="../index.html" class="phase2-back-btn">
                    <i data-lucide="arrow-left"></i>
                    <span>Return to Dashboard</span>
                </a>
            </div>
        `;
    }
};
