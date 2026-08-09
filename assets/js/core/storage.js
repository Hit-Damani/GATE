/**
 * GATE 2027 Core Storage & Profile Engine
 * Handles user progress, streaks, task completions, and profiles backed by Supabase.
 */

// 1. Storage & Progress Aggregator
window.GateStorage = {
    _userId: null,
    _cache: {
        progress: {},
        streak: null,
        completions: {},
        profile: null
    },
    _initialized: false,

    async init(userId, options = {}) {
        if (!userId) {
            console.error('[GateStorage] init called without userId');
            return;
        }
        this._userId = userId;

        try {
            // Lightweight init for subject page (skips profile & streak queries)
            if (options.isSubjectPage) {
                const [progressRes, completionsRes] = await Promise.all([
                    GateSupabase.client.from('subject_progress').select('*').eq('user_id', userId),
                    GateSupabase.client.from('task_completions').select('task_id, subject_id').eq('user_id', userId)
                ]);

                this._cache.progress = {};
                if (progressRes.data) {
                    progressRes.data.forEach(p => {
                        this._cache.progress[p.subject_id] = p;
                    });
                }

                this._cache.completions = {};
                if (completionsRes.data) {
                    completionsRes.data.forEach(tc => {
                        if (!this._cache.completions[tc.subject_id]) {
                            this._cache.completions[tc.subject_id] = new Set();
                        }
                        this._cache.completions[tc.subject_id].add(tc.task_id);
                    });
                }
                this._initialized = true;
                return;
            }

            // Full init for dashboard (includes progress, task completions & profile)
            const [progressRes, completionsRes, profileRes] = await Promise.all([
                GateSupabase.client.from('subject_progress').select('*').eq('user_id', userId),
                GateSupabase.client.from('task_completions').select('task_id, subject_id').eq('user_id', userId),
                GateSupabase.client.from('profiles').select('*').eq('id', userId).maybeSingle()
            ]);

            // Cache progress indexed by subject_id
            this._cache.progress = {};
            if (progressRes.data) {
                progressRes.data.forEach(p => {
                    this._cache.progress[p.subject_id] = p;
                });
            }

            // Cache profile
            if (profileRes.data) {
                this._cache.profile = profileRes.data;
            } else {
                const { data: newProfile } = await GateSupabase.client
                    .from('profiles')
                    .upsert({ id: userId, display_name: 'GATE Aspirant' })
                    .select()
                    .maybeSingle();
                this._cache.profile = newProfile || { display_name: 'GATE Aspirant' };
            }

            // Cache task completions
            this._cache.completions = {};
            if (completionsRes.data) {
                completionsRes.data.forEach(tc => {
                    if (!this._cache.completions[tc.subject_id]) {
                        this._cache.completions[tc.subject_id] = new Set();
                    }
                    this._cache.completions[tc.subject_id].add(tc.task_id);
                });
            }

            this._initialized = true;
        } catch (err) {
            console.error('[GateStorage] init failed:', err);
            this._initialized = true;
        }
    },

    getSubjectProgress(subjectId, defaultTotal = 50) {
        const cached = this._cache.progress[subjectId];
        if (cached) {
            return {
                completedTasks: Number(cached.completed_tasks) || 0,
                totalTasks: Number(cached.total_tasks) || Number(defaultTotal),
                percentage: Number(cached.percentage) || 0
            };
        }
        return {
            completedTasks: 0,
            totalTasks: defaultTotal,
            percentage: 0
        };
    },

    async setSubjectProgress(subjectId, completedTasks, totalTasks) {
        const comp = Math.max(0, Number(completedTasks) || 0);
        const tot = Math.max(0, Number(totalTasks) || 0);
        const percentage = tot > 0 ? Math.round((comp / tot) * 100) : 0;
        const boundedPct = Math.min(percentage, 100);

        const progressData = {
            user_id: this._userId,
            subject_id: subjectId,
            completed_tasks: comp,
            total_tasks: tot,
            percentage: boundedPct
        };

        try {
            await GateSupabase.client
                .from('subject_progress')
                .upsert(progressData, { onConflict: 'user_id,subject_id' });
        } catch (err) {
            console.error('[GateStorage] setSubjectProgress failed:', err);
        }

        this._cache.progress[subjectId] = progressData;
        this.updateStreak();

        return {
            completedTasks: comp,
            totalTasks: tot,
            percentage: boundedPct
        };
    },

    getLastActiveSubject() {
        return localStorage.getItem('gate_2027_last_active') || 'os';
    },

    saveLastActiveSubject(subjectId) {
        if (subjectId) {
            localStorage.setItem('gate_2027_last_active', subjectId);
        }
    },

    /**
     * Get activity data for a given month.
     * Returns a Map of day-of-month -> task count.
     */
    async getActivityDates(year, month) {
        const activityMap = new Map();
        if (!this._userId) return activityMap;

        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const { data, error } = await GateSupabase.client
                .from('task_completions')
                .select('completed_date')
                .eq('user_id', this._userId)
                .gte('completed_date', startDate)
                .lte('completed_date', endDate);

            if (error) {
                console.error('[GateStorage] getActivityDates error:', error);
                return activityMap;
            }

            if (data) {
                data.forEach(row => {
                    const day = new Date(row.completed_date).getDate();
                    activityMap.set(day, (activityMap.get(day) || 0) + 1);
                });
            }
        } catch (err) {
            console.error('[GateStorage] getActivityDates failed:', err);
        }

        return activityMap;
    },

    getStreakData() {
        const streak = this._cache.streak;
        if (streak) {
            return {
                currentStreak: Number(streak.current_streak) || 0,
                bestStreak: Number(streak.best_streak) || 0,
                lastActiveDate: streak.last_active_date || null
            };
        }
        return { currentStreak: 0, bestStreak: 0, lastActiveDate: null };
    },

    async updateStreak() {
        const streak = this._cache.streak || {
            current_streak: 0,
            best_streak: 0,
            last_active_date: null
        };
        const today = new Date().toISOString().split('T')[0];

        if (!streak.last_active_date) {
            streak.current_streak = 1;
            streak.last_active_date = today;
        } else if (streak.last_active_date !== today) {
            const lastDate = new Date(streak.last_active_date);
            const currDate = new Date(today);
            const diffTime = Math.abs(currDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak.current_streak += 1;
            } else if (diffDays > 1) {
                streak.current_streak = 1;
            }
            streak.last_active_date = today;
        }

        if (streak.current_streak > (streak.best_streak || 0)) {
            streak.best_streak = streak.current_streak;
        }

        try {
            await GateSupabase.client
                .from('user_streaks')
                .upsert({
                    user_id: this._userId,
                    current_streak: streak.current_streak,
                    best_streak: streak.best_streak,
                    last_active_date: streak.last_active_date
                }, { onConflict: 'user_id' });
        } catch (err) {
            console.error('[GateStorage] updateStreak failed:', err);
        }

        this._cache.streak = streak;

        return {
            currentStreak: streak.current_streak,
            bestStreak: streak.best_streak,
            lastActiveDate: streak.last_active_date
        };
    },

    async completeTask(taskId, subjectId) {
        try {
            const { error } = await GateSupabase.client
                .from('task_completions')
                .upsert({
                    user_id: this._userId,
                    task_id: taskId,
                    subject_id: subjectId,
                    is_completed: true,
                    completed_at: new Date().toISOString(),
                    completed_date: new Date().toISOString().split('T')[0]
                }, { onConflict: 'user_id,task_id' });

            if (error) {
                console.error('[GateStorage] completeTask error:', error);
                return false;
            }

            if (!this._cache.completions[subjectId]) {
                this._cache.completions[subjectId] = new Set();
            }
            this._cache.completions[subjectId].add(taskId);

            return true;
        } catch (err) {
            console.error('[GateStorage] completeTask failed:', err);
            return false;
        }
    },

    async uncompleteTask(taskId) {
        try {
            const { error } = await GateSupabase.client
                .from('task_completions')
                .delete()
                .eq('user_id', this._userId)
                .eq('task_id', taskId);

            if (error) {
                console.error('[GateStorage] uncompleteTask error:', error);
                return false;
            }

            for (const subjectId in this._cache.completions) {
                this._cache.completions[subjectId].delete(taskId);
            }

            return true;
        } catch (err) {
            console.error('[GateStorage] uncompleteTask failed:', err);
            return false;
        }
    },

    getTaskCompletions(subjectId) {
        return this._cache.completions[subjectId] || new Set();
    },

    getCompletedTaskCount(subjectId) {
        const completions = this._cache.completions[subjectId];
        return completions ? completions.size : 0;
    }
};

// 2. Overall Progress Aggregator
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

// 3. Profile Service
window.GateProfileService = {
    async getProfile() {
        if (window.GateStorage?._cache?.profile) {
            return window.GateStorage._cache.profile;
        }

        try {
            const { data: { user } } = await GateSupabase.client.auth.getUser();
            if (!user) return null;

            let { data } = await GateSupabase.client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!data) {
                const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'GATE Aspirant';

                const { data: created } = await GateSupabase.client
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        display_name: displayName
                    })
                    .select()
                    .maybeSingle();
                data = created;
            }

            if (data && window.GateStorage?._cache) {
                window.GateStorage._cache.profile = data;
            }

            return data;
        } catch (err) {
            console.error('[ProfileService] getProfile failed:', err);
            return null;
        }
    },

    async updateProfile(updates) {
        try {
            const { data: { user } } = await GateSupabase.client.auth.getUser();
            if (!user) return null;

            const { data, error } = await GateSupabase.client
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...updates
                })
                .select()
                .maybeSingle();

            if (error) {
                console.error('[ProfileService] updateProfile error:', error);
                return null;
            }

            if (data && window.GateStorage?._cache) {
                window.GateStorage._cache.profile = data;
            }

            return data;
        } catch (err) {
            console.error('[ProfileService] updateProfile failed:', err);
            return null;
        }
    },

    async populateSidebar() {
        const profile = await this.getProfile();
        if (!profile) return;

        const nameEl = document.getElementById('user-display-name');
        const goalEl = document.getElementById('user-target-goal');
        const avatarEl = document.getElementById('user-avatar-initials');

        const displayName = profile.display_name || 'GATE Aspirant';
        const initials = displayName.substring(0, 2).toUpperCase();

        if (nameEl) nameEl.textContent = displayName;
        if (goalEl) goalEl.textContent = profile.email ? profile.email : 'Target: AIR < 100';
        if (avatarEl) avatarEl.textContent = initials;
    }
};
