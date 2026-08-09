/**
 * GATE 2027 — Configuration & Supabase Client Setup
 * Generated automatically during Vercel deployment build step or read locally.
 */

window.GATE_CONFIG = Object.freeze({
    SUPABASE_URL: 'https://rjzgghyhqbkgwjfkeqhk.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable__m3UXgPsfg5coTD7eVdDCA_EywWB4cC'
});

window.GATE_CONSTANTS = Object.freeze({
    ROUTES: {
        DASHBOARD: '/index.html',
        ACTIVITY: '/activity.html',
        SUBJECT: '/subjects/subject.html',
        LOGIN: '/auth/login.html',
        SIGNUP: '/auth/signup.html'
    },
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 8,
        MAX_DISPLAY_NAME_LENGTH: 50,
        EMAIL_REGEX: /^[^s@]+@[^s@]+.[^s@]+$/
    },
    ERRORS: {
        INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
        USER_ALREADY_EXISTS: 'An account with this email already exists.',
        WEAK_PASSWORD: 'Password must be at least 8 characters.',
        PASSWORDS_MISMATCH: 'Passwords do not match.',
        EMAIL_NOT_CONFIRMED: 'Please verify your email before logging in.',
        INVALID_EMAIL: 'Please enter a valid email address.',
        SESSION_EXPIRED: 'Your session has expired. Please log in again.',
        NETWORK_ERROR: 'You appear to be offline. Please check your connection.',
        PERMISSION_DENIED: 'You don\'t have permission for this action.',
        GENERIC_ERROR: 'Something went wrong. Please try again.',
        SIGNUP_SUCCESS: 'Account created! Please check your email to verify.',
        REQUIRED_FIELD: 'This field is required.',
        DISPLAY_NAME_REQUIRED: 'Please enter a display name.'
    },
    DEFAULTS: {
        DISPLAY_NAME: 'GATE Aspirant',
        AVATAR_INITIALS: 'GA',
        TARGET_RANK: 'AIR < 100',
        EXAM_YEAR: 2027,
        THEME: 'dark'
    }
});

window.GateSupabase = (() => {
    if (!window.supabase?.createClient) {
        console.error('[GateSupabase] Supabase JS SDK not loaded.');
        return { client: null };
    }

    const client = window.supabase.createClient(
        window.GATE_CONFIG.SUPABASE_URL,
        window.GATE_CONFIG.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    return Object.freeze({ client });
})();
