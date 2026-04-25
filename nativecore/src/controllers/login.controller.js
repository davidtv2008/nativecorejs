import { trackEvents } from "@core-utils/events.js";
import { dom } from "@core-utils/dom.js";
import router from "@core/router.js";
import auth from "@services/auth.service.js";
import api from "@services/api.service.js";
async function loginController() {
  const events = trackEvents();
  const form = dom.$("#loginForm");
  const errorDiv = dom.$("#login-error");
  const loginBtn = dom.$("#loginBtn");
  const rememberMeCheckbox = dom.$("#rememberMe");
  const emailField = dom.$("#email");
  const passwordField = dom.$("#password");
  const setButtonState = (isLoading) => {
    if (!loginBtn) return;
    if (isLoading) {
      loginBtn.setAttribute("disabled", "");
      loginBtn.textContent = "Signing In...";
      return;
    }
    loginBtn.removeAttribute("disabled");
    loginBtn.textContent = "Access Dashboard";
  };
  const setError = (message) => {
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.hidden = false;
  };
  const clearError = () => {
    if (!errorDiv) return;
    errorDiv.hidden = true;
    errorDiv.textContent = "";
  };
  const getInputValue = (element) => {
    if (!element) return "";
    const shadowInput = dom.within(element.shadowRoot ?? element, "input");
    return shadowInput?.value ?? element.getAttribute("value") ?? "";
  };
  const focusInput = (element) => {
    dom.within(element?.shadowRoot ?? element, "input")?.focus();
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form || !loginBtn || !errorDiv) return;
    const submitEvent = e;
    const values = submitEvent.detail?.values ?? form.getValues?.() ?? {};
    const email = (values.email ?? getInputValue(emailField)).trim();
    const password = values.password ?? getInputValue(passwordField);
    const rememberMe = rememberMeCheckbox?.hasAttribute("checked") ?? false;
    clearError();
    if (!email || !password) {
      setError("Email and password are required. Use the demo credentials shown above.");
      focusInput(!email ? emailField : passwordField);
      return;
    }
    setButtonState(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      auth.setTokens(response.accessToken, response.refreshToken);
      auth.setUser(response.user);
      router.navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Login failed. Please try again.";
      setError(errorMessage);
      emailField?.setAttribute("value", email);
      passwordField?.setAttribute("value", "");
      focusInput(passwordField);
    } finally {
      setButtonState(false);
    }
  };
  const savedEmail = localStorage.getItem("rememberedEmail");
  if (savedEmail) {
    emailField?.setAttribute("value", savedEmail);
    rememberMeCheckbox?.setAttribute("checked", "");
  }
  events.onSubmit("#loginForm", handleSubmit);
  events.onKeydown("#loginForm", (e) => {
    if (e.key === "Enter") handleSubmit(e);
  });
  events.onInput("#email, #password", (e) => {
    const target = e.target;
    const value = getInputValue(target);
    if (value) {
      target.setAttribute("value", value);
    } else {
      target.removeAttribute("value");
    }
  });
  return () => {
    events.cleanup();
  };
}
export {
  loginController
};
