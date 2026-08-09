/**
 * GATE 2027 — Error Handler & Notification System
 * Maps Supabase/network errors to user-friendly messages.
 * Provides toast notifications and offline banner management.
 */
window.GateErrorHandler = {
    /**
     * Map a Supabase/JS error to a user-friendly message.
     * @param {Error|object|string} error
     * @returns {string} User-friendly message
     */
    mapError(error) {
        const ERRORS = window.GATE_CONSTANTS?.ERRORS || {};
        const msg = typeof error === 'string' ? error : (error?.message || '');

        // Network / offline
        if (!navigator.onLine) {
            return ERRORS.NETWORK_ERROR || 'You appear to be offline.';
        }

        // Auth errors
        if (msg.includes('Invalid login credentials')) {
            return ERRORS.INVALID_CREDENTIALS || 'Invalid email or password.';
        }
        if (msg.includes('already registered') || msg.includes('already been registered')) {
            return ERRORS.USER_ALREADY_EXISTS || 'An account with this email already exists.';
        }
        if (msg.includes('Email not confirmed')) {
            return ERRORS.EMAIL_NOT_CONFIRMED || 'Please verify your email before logging in.';
        }
        if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('at least'))) {
            return ERRORS.WEAK_PASSWORD || 'Password must be at least 8 characters.';
        }
        if (msg.includes('JWT') || msg.includes('token') || msg.includes('session')) {
            return ERRORS.SESSION_EXPIRED || 'Session expired. Please log in again.';
        }

        // RLS / permission errors
        if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('permission denied')) {
            return ERRORS.PERMISSION_DENIED || 'You don\'t have permission for this action.';
        }

        // Network errors
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_INTERNET')) {
            return ERRORS.NETWORK_ERROR || 'Network error. Please check your connection.';
        }

        return msg || ERRORS.GENERIC_ERROR || 'Something went wrong. Please try again.';
    },

    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'success'|'error'|'info'|'warning'} type
     * @param {number} duration - ms to show (default 4000)
     */
    showToast(message, type = 'info', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    /**
     * Show an error via toast (convenience method).
     * @param {Error|object|string} error
     */
    show(error) {
        const message = this.mapError(error);
        this.showToast(message, 'error', 5000);
        console.error('[GateErrorHandler]', error);
    },

    /**
     * Initialize offline/online event listeners.
     * Shows/hides the offline banner automatically.
     */
    initOfflineDetection() {
        const banner = document.getElementById('offline-banner');

        const updateStatus = () => {
            if (banner) {
                if (navigator.onLine) {
                    banner.classList.remove('show');
                } else {
                    banner.classList.add('show');
                }
            }
        };

        window.addEventListener('online', () => {
            updateStatus();
            this.showToast('You\'re back online!', 'success', 3000);
        });

        window.addEventListener('offline', () => {
            updateStatus();
        });

        // Check on init
        updateStatus();
    },

    /**
     * Check if user is online before performing a write operation.
     * @returns {boolean} true if online
     */
    requireOnline() {
        if (!navigator.onLine) {
            this.showToast('You\'re offline. Changes will sync when reconnected.', 'warning', 5000);
            return false;
        }
        return true;
    }
};
