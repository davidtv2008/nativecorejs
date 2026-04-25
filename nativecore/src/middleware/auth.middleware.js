import auth from "../services/auth.service.js";
import router from "@core/router.js";
async function authMiddleware(route) {
  const isAuthenticated = auth.isAuthenticated();
  if (!isAuthenticated) {
    router.replace("/login");
    return false;
  }
  return true;
}
export {
  authMiddleware
};
