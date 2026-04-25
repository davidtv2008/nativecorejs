const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  USER_DETAIL: "/users/:id",
  PROFILE: "/profile"
};
var stdin_default = ROUTES;
export {
  ROUTES,
  stdin_default as default
};
