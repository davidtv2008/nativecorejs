/**
 * Global Error Handler
 */
import { ERROR_MESSAGES } from '../../src/constants/errorMessages.js';
class ErrorHandler {
    errorListeners = new Set();
    constructor() {
        this.setupGlobalHandlers();
    }
    setupGlobalHandlers() {
        window.addEventListener('error', (event) => {
            console.error('Unhandled error:', event.error);
            this.handleError(event.error);
            event.preventDefault();
        });
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
            event.preventDefault();
        });
    }
    handleError(error, context = {}) {
        const errorInfo = {
            message: this.getErrorMessage(error),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            context,
        };
        if (this.isDevelopment()) {
            console.error('Error handled:', errorInfo);
        }
        this.notifyListeners(errorInfo);
    }
    getErrorMessage(error) {
        if (typeof error === 'string')
            return error;
        if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
            return ERROR_MESSAGES.NETWORK_ERROR;
        }
        if (error?.message?.includes('timeout')) {
            return ERROR_MESSAGES.TIMEOUT;
        }
        return error?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    }
    onError(listener) {
        this.errorListeners.add(listener);
        return () => this.errorListeners.delete(listener);
    }
    notifyListeners(errorInfo) {
        this.errorListeners.forEach(listener => {
            try {
                listener(errorInfo);
            }
            catch (err) {
                console.error('Error in error listener:', err);
            }
        });
    }
    isDevelopment() {
        return window.location.hostname === 'localhost';
    }
}
export default new ErrorHandler();
