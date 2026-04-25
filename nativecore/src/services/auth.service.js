import storage from "./storage.service.js";
class AuthService {
  TOKEN_KEY = "access_token";
  REFRESH_TOKEN_KEY = "refresh_token";
  USER_KEY = "user_data";
  listeners = [];
  constructor() {
    storage.setStrategy("session");
  }
  /**
   * Set authentication tokens
   */
  setTokens(accessToken, refreshToken = null) {
    if (!accessToken || accessToken === "undefined") {
      console.error("Cannot set undefined token");
      return;
    }
    storage.set(this.TOKEN_KEY, accessToken);
    if (refreshToken && refreshToken !== "undefined") {
      storage.set(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    this.notifyListeners("login");
    window.dispatchEvent(new CustomEvent("auth-change"));
  }
  /**
   * Get access token
   */
  getToken() {
    const token = storage.get(this.TOKEN_KEY);
    if (!token || token === "undefined" || token === "null") {
      return null;
    }
    return token;
  }
  /**
   * Get refresh token
   */
  getRefreshToken() {
    return storage.get(this.REFRESH_TOKEN_KEY);
  }
  /**
   * Set user data
   */
  setUser(user) {
    storage.set(this.USER_KEY, JSON.stringify(user));
  }
  /**
   * Get user data
   */
  getUser() {
    const userData = storage.get(this.USER_KEY);
    if (!userData || userData === "undefined" || userData === "null") {
      return null;
    }
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }
  /**
   * Check if JWT token is expired
   */
  isTokenExpired(token) {
    try {
      const payload = this.decodeToken(token);
      if (!payload.exp) return false;
      const currentTime = Date.now() / 1e3;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }
  /**
   * Decode JWT token
   */
  decodeToken(token) {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) {
        throw new Error("Invalid token");
      }
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
      const jsonPayload = atob(paddedBase64);
      return JSON.parse(jsonPayload);
    } catch {
      throw new Error("Invalid token");
    }
  }
  /**
   * Logout user
   */
  logout() {
    storage.remove(this.TOKEN_KEY);
    storage.remove(this.REFRESH_TOKEN_KEY);
    storage.remove(this.USER_KEY);
    this.notifyListeners("logout");
    window.dispatchEvent(new CustomEvent("auth-change"));
  }
  /**
   * Subscribe to auth state changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
  /**
   * Notify listeners
   */
  notifyListeners(event) {
    this.listeners.forEach((callback) => callback(event));
  }
  /**
   * Get authorization header
   */
  getAuthHeader() {
    const token = this.getToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
  }
}
var stdin_default = new AuthService();
export {
  stdin_default as default
};
