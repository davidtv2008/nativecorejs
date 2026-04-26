/**
 * Error Message Constants
 */
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
    UNAUTHORIZED: 'Your session has expired. Please log in again.',
    FORBIDDEN: 'You do not have permission to access this resource.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    REQUIRED_FIELD: (field) => `${field} is required.`,
    INVALID_EMAIL: 'Please enter a valid email address.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
    PASSWORDS_DONT_MATCH: 'Passwords do not match.',
    NOT_FOUND: 'The requested resource was not found.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};
export default ERROR_MESSAGES;
