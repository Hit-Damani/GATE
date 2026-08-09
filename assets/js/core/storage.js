/**
 * GATE 2027 Core Storage & Progress Aggregator Engine
 */
const STORAGE_KEYS = {
    PROGRESS: 'gate_2027_progress_map',
    LAST_ACTIVE: 'gate_2027_last_active',
    THEME: 'gate_2027_theme',
    STREAK: 'gate_2027_streak_data'
};

window.GateStorage = {
    getSubjectProgress(subjectId, defaultTotal = 50) {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            const progressMap = raw ? JSON.parse(raw) : {};
            
            if (progressMap[subjectId]) {
                const sub = progressMap[subjectId];
                
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

    setSubjectProgress(subjectId, completedTasks, totalTasks) {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            const progressMap = raw ? JSON.parse(raw) : {};
            
            const comp = Math.max(0, Number(completedTasks) || 0);
            const tot = Math.max(0, Number(totalTasks) || 0);
            const percentage = tot > 0 ? Math.round((comp / tot) * 100) : 0;
            
            const progressData = {
                completedTasks: comp,
                totalTasks: tot,
                percentage: Math.min(percentage, 100),
                lastUpdated: new Date().toISOString()
            };
            
            progressMap[subjectId] = progressData;
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
            this.updateStreak();
            return progressData;
        } catch (e) {
            console.error('Error saving subject progress to localStorage', e);
            return null;
        }
    },

    getLastActiveSubject() {
        return localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE) || 'os';
    },

    saveLastActiveSubject(subjectId) {
        if (subjectId) {
            localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, subjectId);
        }
    },

    getStreakData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Error reading streak data', e);
        }
        return { currentStreak: 0, lastActiveDate: null };
    },

    updateStreak() {
        const streak = this.getStreakData();
        const today = new Date().toISOString().split('T')[0];
        
        if (!streak.lastActiveDate) {
            streak.currentStreak = 1;
            streak.lastActiveDate = today;
        } else if (streak.lastActiveDate !== today) {
            const lastDate = new Date(streak.lastActiveDate);
            const currDate = new Date(today);
            const diffTime = Math.abs(currDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak.currentStreak += 1;
            } else if (diffDays > 1) {
                streak.currentStreak = 1;
            }
            streak.lastActiveDate = today;
        }
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
        return streak;
    }
};

window.GateProgress = {
    calculateOverall(subjectsList) {
        if (!Array.isArray(subjectsList) || subjectsList.length === 0) {
            return {
                totalSubjects: 0,
                completedSubjects: 0,
                remainingSubjects: 0,
                totalTasks: 0,
                completedTasks: 0,
                remainingTasks: 0,
                overallPercentage: 0
            };
        }

        let totalSubjects = subjectsList.length;
        let completedSubjects = 0;
        let totalTasks = 0;
        let completedTasks = 0;

        subjectsList.forEach(sub => {
            const subTotal = Number(sub.totalTasks) || 0;
            const progress = window.GateStorage.getSubjectProgress(sub.id, subTotal);

            totalTasks += progress.totalTasks;
            completedTasks += progress.completedTasks;

            if (progress.percentage === 100 && progress.totalTasks > 0) {
                completedSubjects++;
            }
        });

        const remainingSubjects = Math.max(0, totalSubjects - completedSubjects);
        const remainingTasks = Math.max(0, totalTasks - completedTasks);
        const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            totalSubjects,
            completedSubjects,
            remainingSubjects,
            totalTasks,
            completedTasks,
            remainingTasks,
            overallPercentage: Math.min(overallPercentage, 100)
        };
    }
};
