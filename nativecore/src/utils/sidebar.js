import auth from "../services/auth.service.js";
import { dom } from "@core-utils/dom.js";
function initSidebar() {
  const sidebar = dom.$("#appSidebar");
  const appLayout = dom.$(".app-layout");
  sidebar?.addEventListener("toggle", (e) => {
    const isCollapsed = e.detail.collapsed;
    if (appLayout) {
      if (isCollapsed) {
        appLayout.classList.add("sidebar-collapsed");
      } else {
        appLayout.classList.remove("sidebar-collapsed");
      }
    }
    localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
  });
  const savedCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
  if (savedCollapsed && sidebar) {
    sidebar.setAttribute("collapsed", "");
    appLayout?.classList.add("sidebar-collapsed");
  }
  function updateSidebar() {
    const isAuthenticated = auth.isAuthenticated();

    if (isAuthenticated) {
      document.body.classList.add("sidebar-enabled");
      if (appLayout) appLayout.classList.remove("no-sidebar");
    } else {
      document.body.classList.remove("sidebar-enabled");
      if (appLayout) appLayout.classList.add("no-sidebar");
    }
    const homeLink = document.querySelector(".sidebar-item.home-link");
    const aboutLink = document.querySelector(".sidebar-item.about-link");
    const dashboardLink = document.querySelector(".sidebar-item.dashboard-link");
    const componentsLink = document.querySelector(".sidebar-item.components-link");
    const underConstructionLink = document.querySelector(".sidebar-item.under-construction-link");
    const logoutLink = document.querySelector(".sidebar-item.logout-link");
    if (homeLink) homeLink.style.display = isAuthenticated ? "none" : "flex";
    if (aboutLink) aboutLink.style.display = isAuthenticated ? "none" : "flex";
    if (dashboardLink) dashboardLink.style.display = isAuthenticated ? "flex" : "none";
    if (componentsLink) componentsLink.style.display = isAuthenticated ? "flex" : "none";
    if (underConstructionLink) underConstructionLink.style.display = isAuthenticated ? "flex" : "none";
    if (logoutLink) logoutLink.style.display = isAuthenticated ? "flex" : "none";
    updateActiveSidebarLink();
  }
  const sidebarLogoutBtn = dom.$("#sidebarLogoutBtn");
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", () => {
      auth.logout();
    });
  }
  function updateActiveSidebarLink() {
    const currentPath = window.location.pathname;
    const sidebarItems = dom.$$(".sidebar-item");
    sidebarItems.forEach((item) => {
      item.classList.remove("active");
      const href = item.getAttribute("href");
      if (href === currentPath || currentPath === "/" && href === "/") {
        item.classList.add("active");
      }
    });
  }
  window.addEventListener("auth-change", updateSidebar);
  window.addEventListener("pageloaded", updateActiveSidebarLink);
  updateSidebar();
}
export {
  initSidebar
};
