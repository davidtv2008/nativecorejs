const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const cacheVersion = isDevelopment ? Date.now() : '0.1.0-20260424231326';
function bustCache(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${cacheVersion}`;
}
async function importWithBust(modulePath) {
  return import(bustCache(modulePath));
}
var stdin_default = { cacheVersion, bustCache, importWithBust };
export {
  bustCache,
  cacheVersion,
  stdin_default as default,
  importWithBust
};
