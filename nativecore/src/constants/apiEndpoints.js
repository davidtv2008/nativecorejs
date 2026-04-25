const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    VERIFY: "/auth/verify"
  },
  DASHBOARD: {
    STATS: "/dashboard/stats",
    ACTIVITY: "/dashboard/activity"
  },
  USERS: {
    LIST: "/users",
    DETAIL: (id) => `/users/${id}`,
    CREATE: "/users",
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`
  }
};
var stdin_default = API_ENDPOINTS;
export {
  API_ENDPOINTS,
  stdin_default as default
};
