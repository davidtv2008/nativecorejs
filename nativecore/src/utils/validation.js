function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
function isRequired(value) {
  if (value === null || value === void 0) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
function minLength(min) {
  return (value) => {
    if (!value) return false;
    return String(value).length >= min;
  };
}
function maxLength(max) {
  return (value) => {
    if (!value) return true;
    return String(value).length <= max;
  };
}
function matchesPattern(pattern) {
  return (value) => {
    if (!value) return false;
    return pattern.test(String(value));
  };
}
function isNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}
function isInteger(value) {
  return Number.isInteger(Number(value));
}
function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}
function validateForm(values, rules) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      if (!validator(values[field])) {
        errors[field] = `Validation failed for ${field}`;
        break;
      }
    }
  }
  return errors;
}
export {
  isInteger,
  isNumber,
  isRequired,
  isValidDate,
  isValidEmail,
  isValidURL,
  matchesPattern,
  maxLength,
  minLength,
  validateForm
};
