/**
 * Logger Service
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
    private levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
    };
    
    private currentLevel: number;
    private enableRemoteLogging = false;
    
    constructor() {
        this.currentLevel = this.isDevelopment() ? this.levels.DEBUG : this.levels.WARN;
    }
    
    private isDevelopment(): boolean {
        return window.location.hostname === 'localhost';
    }
    
    setLevel(level: LogLevel): void {
        this.currentLevel = this.levels[level] ?? this.levels.INFO;
    }
    
    setRemoteLogging(enabled: boolean): void {
        this.enableRemoteLogging = enabled;
    }
    
    debug(message: string, ...data: any[]): void {
        if (this.currentLevel <= this.levels.DEBUG) {
            console.log(`[DEBUG] ${message}`, ...data);
        }
    }
    
    info(message: string, ...data: any[]): void {
        if (this.currentLevel <= this.levels.INFO) {
            console.log(`[INFO] ${message}`, ...data);
        }
    }
    
    warn(message: string, ...data: any[]): void {
        if (this.currentLevel <= this.levels.WARN) {
            console.warn(`[WARN] ${message}`, ...data);
        }
        this.sendToRemote('warn', message, data);
    }
    
    error(message: string, ...data: any[]): void {
        if (this.currentLevel <= this.levels.ERROR) {
            console.error(`[ERROR] ${message}`, ...data);
        }
        this.sendToRemote('error', message, data);
    }
    
    logRequest(method: string, url: string, data?: any): void {
        this.debug(`API Request: ${method} ${url}`, data);
    }
    
    logResponse(method: string, url: string, status: number, data?: any): void {
        this.debug(`API Response: ${method} ${url} ${status}`, data);
    }
    
    private sendToRemote(_level: string, _message: string, _data: any[]): void {
        if (!this.enableRemoteLogging) return;
        // TODO: Implement remote logging
    }
}

export default new Logger();
