/**
 * GATE 2027 Core Utilities Engine
 */
window.GateUtils = {
    animateCounter(elementOrId, start, end, duration = 1000) {
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
            
            obj.textContent = current;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end;
            }
        };
        window.requestAnimationFrame(step);
    },

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

    formatDate(date) {
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    },

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
    },

    getQueryParam(paramName) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(paramName);
    }
};
