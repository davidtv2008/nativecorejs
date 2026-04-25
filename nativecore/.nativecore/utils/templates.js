class TrustedHtml {
  constructor(__html) {
    this.__html = __html;
  }
}
function trusted(value) {
  return new TrustedHtml(value);
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const html = (strings, ...values) => {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    result += value instanceof TrustedHtml ? value.__html : escapeHtml(value);
    result += strings[i + 1];
  }
  return result;
};
const css = (strings, ...values) => String.raw({ raw: strings }, ...values);
function sanitizeURL(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed === "") return "";
  const lower = trimmed.toLowerCase().replace(/[\s\u0000-\u001F]+/g, "");
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:")) {
    return "";
  }
  if (lower.startsWith("data:") && !lower.startsWith("data:image/")) {
    return "";
  }
  return trimmed;
}
export {
  TrustedHtml,
  css,
  escapeHtml,
  html,
  sanitizeURL,
  trusted
};
