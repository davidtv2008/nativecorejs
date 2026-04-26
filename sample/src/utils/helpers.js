/**
 * Utility Helper Functions
 * Reusable utility functions for common tasks
 */
/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
export function debounce(func, wait = 300) {
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
/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 */
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options })
        .format(new Date(date));
}
/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}
/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 */
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}
/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 */
export function truncate(str, maxLength = 50) {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - 3) + '...';
}
/**
 * Generate unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Deep clone object
 * @param {object} obj - Object to clone
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Check if object is empty
 * @param {object} obj - Object to check
 */
export function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Sanitize HTML string to prevent XSS
 * @param {string} str - String to sanitize
 */
export function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}
/**
 * Parse query string to object
 * @param {string} queryString - Query string (with or without ?)
 */
export function parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}
/**
 * Build query string from object
 * @param {object} params - Parameters object
 */
export function buildQueryString(params) {
    return new URLSearchParams(params).toString();
}
/**
 * Validate email format
 * @param {string} email - Email to validate
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}
/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth));
}
/**
 * Scroll element into view smoothly
 * @param {HTMLElement|string} elementOrSelector - Element or selector
 */
export function scrollToElement(elementOrSelector) {
    const element = typeof elementOrSelector === 'string'
        ? document.querySelector(elementOrSelector)
        : elementOrSelector;
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
