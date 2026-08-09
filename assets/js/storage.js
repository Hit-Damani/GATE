/**
 * GATE 2027 Dashboard LocalStorage Controller
 * Standardized progress storage and retrieval API
 */

const STORAGE_KEYS = {
    PROGRESS: 'gate_2027_progress_map',
    LAST_ACTIVE: 'gate_2027_last_active',
    THEME: 'gate_2027_theme',
    STREAK: 'gate_2027_streak_data'
};

window.GateStorage = {
    /**
     * Retrieves progress for a single subject.
     * Falls back to a clean 0% state if not found.
     * @param {string} subjectId - The subject ID.
     * @param {number} defaultTotal - Default total tasks to register if no data exists.
     * @returns {Object} { completedTasks, totalTasks, percentage }
     */
    getSubjectProgress(subjectId, defaultTotal = 50) {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            const progressMap = raw ? JSON.parse(raw) : {};
            
            if (progressMap[subjectId]) {
                const sub = progressMap[subjectId];
                
                // Sync totalTasks if it differs from the configured defaultTotal
                if (Number(sub.totalTasks) !== Number(defaultTotal)) {
                    sub.totalTasks = Number(defaultTotal);
                    sub.percentage = sub.totalTasks > 0 ? Math.round((Number(sub.completedTasks) || 0) / sub.totalTasks * 100) : 0;
                    sub.percentage = Math.min(sub.percentage, 100);
                    
                    progressMap[subjectId] = sub;
                    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
                }

                const percentage = sub.totalTasks > 0 ? Math.round((Number(sub.completedTasks) || 0) / sub.totalTasks * 100) : 0;
                return {
                    completedTasks: Number(sub.completedTasks) || 0,
                    totalTasks: sub.totalTasks,
                    percentage: percentage
                };
            }
        } catch (e) {
            console.error('Error reading subject progress from localStorage', e);
        }
        
        return {
            completedTasks: 0,
            totalTasks: defaultTotal,
            percentage: 0
        };
    },

    /**
     * Saves or updates the progress for a subject.
     * Also updates the calculated percentage.
     * @param {string} subjectId 
     * @param {number} completedTasks 
     * @param {number} totalTasks 
     */
    setSubjectProgress(subjectId, completedTasks, totalTasks) {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            const progressMap = raw ? JSON.parse(raw) : {};
            
            const comp = Math.max(0, Number(completedTasks) || 0);
            const tot = Math.max(1, Number(totalTasks) || 50);
            const percentage = Math.round((comp / tot) * 100);
            
            progressMap[subjectId] = {
                completedTasks: comp,
                totalTasks: tot,
                percentage: Math.min(percentage, 100),
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
            
            // Dispatch a storage event so if multiple tabs are open, they sync
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.error('Error saving subject progress to localStorage', e);
        }
    },

    /**
     * Gets all subject progress items.
     * @returns {Object} Mapping of subjectId -> progress object
     */
    getAllProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Error reading all progress from localStorage', e);
            return {};
        }
    },

    /**
     * Reset the progress for all subjects.
     * Sets completed tasks to 0, preserves totalTasks.
     */
    resetAllProgress() {
        try {
            const allProgress = this.getAllProgress();
            const updated = {};
            
            Object.keys(allProgress).forEach(id => {
                updated[id] = {
                    completedTasks: 0,
                    totalTasks: allProgress[id].totalTasks || 50,
                    percentage: 0,
                    updatedAt: new Date().toISOString()
                };
            });
            
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updated));
            localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, '');
            localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({
                currentStreak: 0,
                bestStreak: 0,
                lastStudyDate: ''
            }));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.error('Error resetting progress in localStorage', e);
        }
    },

    /**
     * Save the last active subject visited.
     * @param {string} subjectId 
     */
    saveLastActiveSubject(subjectId) {
        if (!subjectId) return;
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, subjectId);
    },

    /**
     * Get the last active subject ID.
     * @returns {string|null}
     */
    getLastActiveSubject() {
        return localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
    },

    getStreakData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
            if (raw) return JSON.parse(raw);
            
            // Initialize streak data
            const initial = {
                currentStreak: 0,
                bestStreak: 0,
                lastStudyDate: ''
            };
            localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(initial));
            return initial;
        } catch (e) {
            return { currentStreak: 0, bestStreak: 0 };
        }
    }
};
