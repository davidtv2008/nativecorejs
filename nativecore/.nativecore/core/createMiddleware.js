import router from "./router.js";
function createMiddleware(tag, fn) {
  return (route, state) => {
    const tags = router.getTagsForPath(route.path);
    if (!tags.includes(tag)) return true;
    return fn(route, state);
  };
}
export {
  createMiddleware
};
