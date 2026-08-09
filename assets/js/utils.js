/**
 * GATE 2027 Dashboard Utilities
 * Reusable helper functions for UI and core operations
 */

window.GateUtils = {
    /**
     * Animates a numeric counter from a start to an end value using requestAnimationFrame.
     * Uses a cubic ease-out function for smooth premium feel.
     * @param {string|HTMLElement} elementOrId - The target element or its ID.
     * @param {number} start - Starting value.
     * @param {number} end - Target value.
     * @param {number} duration - Animation duration in ms.
     */
    animateCounter(elementOrId, start, end, duration = 1000) {
        const obj = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (!obj) return;
        
        // Ensure values are numbers
        start = Number(start) || 0;
        end = Number(end) || 0;
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic ease-out: f(t) = 1 - (1 - t)^3
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOutCubic * (end - start) + start);
            
            obj.textContent = current;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end;
            }
        };
        window.requestAnimationFrame(step);
    },

    /**
     * Animates a percentage indicator from start to end with '%' sign.
     * @param {string|HTMLElement} elementOrId - The target element or its ID.
     * @param {number} start - Starting percentage.
     * @param {number} end - Target percentage.
     * @param {number} duration - Animation duration in ms.
     */
    animatePercentage(elementOrId, start, end, duration = 1000) {
        const obj = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (!obj) return;
        
        start = Number(start) || 0;
        end = Number(end) || 0;
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOutCubic * (end - start) + start);
            
            obj.textContent = current + '%';
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end + '%';
            }
        };
        window.requestAnimationFrame(step);
    },

    /**
     * Formats a Date object into a readable date string.
     * @param {Date} date - The date to format.
     * @returns {string} e.g. "Sun, Jul 5, 2026"
     */
    formatDate(date) {
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Formats a Date object into a detailed 12-hour time string with AM/PM.
     * @param {Date} date - The date to format.
     * @returns {string} e.g. "03:45:12 PM"
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    },

    /**
     * Debounces a function call.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - Timeout in ms.
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
