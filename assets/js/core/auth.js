/**
 * GATE 2027 — Auth Service & Session Guard Manager
 * Wraps Supabase Auth operations and centralizes route protection.
 */

// 1. Auth API Service
window.GateAuthService = {
    async signUp(email, password, displayName) {
        try {
            const name = displayName || 'GATE Aspirant';
            const initials = name.substring(0, 2).toUpperCase();

            const { data, error } = await GateSupabase.client.auth.signUp({
                email,
                password,
                options: {
                    data: { display_name: name }
                }
            });

            // Ensure profile is created immediately if session exists
            if (!error && data?.user && data?.session) {
                await GateSupabase.client.from('profiles').upsert({ id: data.user.id, email: email, display_name: name }, { onConflict: 'id' })
                    .catch(err => console.warn('[AuthService] Client-side auto-profile creation notice:', err));
            }

            return { data, error };
        } catch (err) {
            return { data: null, error: { message: err.message } };
        }
    },

    async signIn(email, password) {
        try {
            const { data, error } = await GateSupabase.client.auth.signInWithPassword({ email, password });
            return { data, error };
        } catch (err) {
            return { data: null, error: { message: err.message } };
        }
    },

    async signOut() {
        try {
            const { error } = await GateSupabase.client.auth.signOut({ scope: 'local' });
            return { error };
        } catch (err) {
            return { error: { message: err.message } };
        }
    },

    async getSession() {
        try {
            return await GateSupabase.client.auth.getSession();
        } catch (err) {
            return { data: { session: null }, error: { message: err.message } };
        }
    },

    async getUser() {
        try {
            return await GateSupabase.client.auth.getUser();
        } catch (err) {
            return { data: { user: null }, error: { message: err.message } };
        }
    },

    onAuthStateChange(callback) {
        return GateSupabase.client.auth.onAuthStateChange(callback);
    }
};

// 2. Auth Manager & Session Guard
window.GateAuthManager = {
    async requireAuth(hideOverlayOnSuccess = false) {
        this.showLoadingOverlay();

        try {
            const { data: { session }, error } = await GateSupabase.client.auth.getSession();

            if (error || !session) {
                this.redirectTo(this._getRoute('LOGIN'));
                return null;
            }

            this._setupAuthListener();

            if (hideOverlayOnSuccess) {
                this.hideLoadingOverlay();
            }
            return session;
        } catch (err) {
            console.error('[AuthManager] Session check failed:', err);
            this.redirectTo(this._getRoute('LOGIN'));
            return null;
        }
    },

    async redirectIfAuthenticated() {
        try {
            const { data: { session } } = await GateSupabase.client.auth.getSession();

            if (session) {
                this.redirectTo(this._getRoute('DASHBOARD'));
                return true;
            }
        } catch (err) {
            // Not authenticated — stay on auth page
        }
        return false;
    },

    async logout() {
        this.showLoadingOverlay();

        try {
            await GateSupabase.client.auth.signOut({ scope: 'local' });
        } catch (err) {
            console.error('[AuthManager] Logout error:', err);
        }

        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('gate'))) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {}

        window.location.href = this._getRoute('LOGIN');
    },

    showLoadingOverlay() {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    },

    hideLoadingOverlay() {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) {
            requestAnimationFrame(() => {
                overlay.classList.add('hidden');
            });
        }
    },

    redirectTo(path) {
        this.showLoadingOverlay();
        window.location.href = path;
    },

    _setupAuthListener() {
        if (this._listenerSet) return;
        this._listenerSet = true;

        GateSupabase.client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                this.redirectTo(this._getRoute('LOGIN'));
            }
        });
    },

    _getRoute(routeName) {
        const isAuthFolder = window.location.pathname.includes('/auth/');
        const isSubjectsFolder = window.location.pathname.includes('/subjects/');

        if (routeName === 'DASHBOARD') {
            return (isAuthFolder || isSubjectsFolder) ? '../index.html' : 'index.html';
        }
        if (routeName === 'ACTIVITY') {
            return (isAuthFolder || isSubjectsFolder) ? '../activity.html' : 'activity.html';
        }
        if (routeName === 'LOGIN') {
            return isAuthFolder ? 'login.html' : (isSubjectsFolder ? '../auth/login.html' : 'auth/login.html');
        }
        if (routeName === 'SIGNUP') {
            return isAuthFolder ? 'signup.html' : (isSubjectsFolder ? '../auth/signup.html' : 'auth/signup.html');
        }
        if (routeName === 'SUBJECT') {
            return isAuthFolder ? '../subjects/subject.html' : (isSubjectsFolder ? 'subject.html' : 'subjects/subject.html');
        }
        return isAuthFolder ? 'login.html' : 'auth/login.html';
    }
};
