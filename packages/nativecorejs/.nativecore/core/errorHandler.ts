/**
 * Optional global error subscribe API.
 * Window listeners are installed only when `onError` or `handleError` is first called.
 */
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'A network error occurred. Please try again.',
    TIMEOUT: 'The request timed out. Please try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

export interface ErrorInfo {
    message: string;
    stack?: string;
    timestamp: string;
    context: Record<string, any>;
}

type ErrorListener = (errorInfo: ErrorInfo) => void;

class ErrorHandler {
    private errorListeners = new Set<ErrorListener>();
    private installed = false;

    private setupGlobalHandlers(): void {
        if (this.installed || typeof window === 'undefined') return;
        this.installed = true;

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

    handleError(error: Error | string, context: Record<string, any> = {}): void {
        this.setupGlobalHandlers();

        const errorInfo: ErrorInfo = {
            message: this.getErrorMessage(error),
            stack: (error as Error)?.stack,
            timestamp: new Date().toISOString(),
            context,
        };

        if (this.isDevelopment()) {
            console.error('Error handled:', errorInfo);
        }

        this.notifyListeners(errorInfo);
    }

    private getErrorMessage(error: Error | string): string {
        if (typeof error === 'string') return error;

        if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
            return ERROR_MESSAGES.NETWORK_ERROR;
        }

        if (error?.message?.includes('timeout')) {
            return ERROR_MESSAGES.TIMEOUT;
        }

        return error?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    onError(listener: ErrorListener): () => void {
        this.setupGlobalHandlers();
        this.errorListeners.add(listener);
        return () => this.errorListeners.delete(listener);
    }

    private notifyListeners(errorInfo: ErrorInfo): void {
        this.errorListeners.forEach(listener => {
            try {
                listener(errorInfo);
            } catch (err) {
                console.error('Error in error listener:', err);
            }
        });
    }

    private isDevelopment(): boolean {
        return typeof window !== 'undefined' && window.location.hostname === 'localhost';
    }
}

let instance: ErrorHandler | null = null;

function getErrorHandler(): ErrorHandler {
    if (!instance) instance = new ErrorHandler();
    return instance;
}

export function onError(listener: ErrorListener): () => void {
    return getErrorHandler().onError(listener);
}

export function handleError(error: Error | string, context: Record<string, any> = {}): void {
    getErrorHandler().handleError(error, context);
}
