function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount);
}
function formatDate(date, format = "medium") {
  const d = new Date(date);
  const options = {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
    full: { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  };
  return new Intl.DateTimeFormat("en-US", options[format] || options.medium).format(d);
}
function formatTime(date) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(d);
}
function formatDateTime(date) {
  return `${formatDate(date)} at ${formatTime(date)}`;
}
function formatRelativeTime(date) {
  const d = new Date(date);
  const now = /* @__PURE__ */ new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1e3);
  const intervals = {
    year: 31536e3,
    month: 2592e3,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  return "just now";
}
function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function formatPercentage(value, decimals = 0) {
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(decimals)}%`;
}
function truncate(text, maxLength, suffix = "...") {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function titleCase(str) {
  if (!str) return "";
  return str.toLowerCase().split(" ").map(capitalize).join(" ");
}
var stdin_default = {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatFileSize,
  formatPercentage,
  truncate,
  capitalize,
  titleCase
};
export {
  capitalize,
  stdin_default as default,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  formatTime,
  titleCase,
  truncate
};
