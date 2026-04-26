/**
 * Logger Service
 */
class Logger {
    levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
    };
    currentLevel;
    enableRemoteLogging = false;
    constructor() {
        this.currentLevel = this.isDevelopment() ? this.levels.DEBUG : this.levels.WARN;
    }
    isDevelopment() {
        return window.location.hostname === 'localhost';
    }
    setLevel(level) {
        this.currentLevel = this.levels[level] ?? this.levels.INFO;
    }
    setRemoteLogging(enabled) {
        this.enableRemoteLogging = enabled;
    }
    debug(message, ...data) {
        if (this.currentLevel <= this.levels.DEBUG) {
            console.log(`[DEBUG] ${message}`, ...data);
        }
    }
    info(message, ...data) {
        if (this.currentLevel <= this.levels.INFO) {
            console.log(`[INFO] ${message}`, ...data);
        }
    }
    warn(message, ...data) {
        if (this.currentLevel <= this.levels.WARN) {
            console.warn(`[WARN] ${message}`, ...data);
        }
        this.sendToRemote('warn', message, data);
    }
    error(message, ...data) {
        if (this.currentLevel <= this.levels.ERROR) {
            console.error(`[ERROR] ${message}`, ...data);
        }
        this.sendToRemote('error', message, data);
    }
    logRequest(method, url, data) {
        this.debug(`API Request: ${method} ${url}`, data);
    }
    logResponse(method, url, status, data) {
        this.debug(`API Response: ${method} ${url} ${status}`, data);
    }
    sendToRemote(_level, _message, _data) {
        if (!this.enableRemoteLogging)
            return;
        // TODO: Implement remote logging
    }
}
export default new Logger();
