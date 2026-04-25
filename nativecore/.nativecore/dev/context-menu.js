class ContextMenu {
  onEdit;
  observedComponents = /* @__PURE__ */ new Set();
  mutationObserver = null;
  activeMenu = null;
  constructor(onEdit) {
    this.onEdit = onEdit;
    this.injectStyles();
    this.setupObserver();
    this.scanExistingComponents();
    document.addEventListener("click", () => this.hideMenu());
    document.addEventListener("contextmenu", (e) => {
      const target = e.target;
      if (!this.isCustomComponent(target)) {
        this.hideMenu();
      }
    });
    setInterval(() => this.scanExistingComponents(), 2e3);
  }
  /**
   * Inject context menu styles
   */
  injectStyles() {
    const styleId = "nativecore-context-menu-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
            .nc-context-menu {
                position: fixed;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                padding: 4px 0;
                z-index: 999999;
                min-width: 180px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
            }

            .nc-context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.15s ease;
            }

            .nc-context-menu-item:hover {
                background: #f0f0f0;
            }

            .nc-context-menu-item.devtools {
                border-top: 1px solid #e0e0e0;
                color: #667eea;
                font-weight: 600;
            }

            .nc-context-menu-item.devtools:hover {
                background: #f5f3ff;
            }

            .nc-context-menu-icon {
                width: 16px;
                height: 16px;
                fill: currentColor;
            }
        `;
    document.head.appendChild(style);
  }
  /**
   * Setup mutation observer
   */
  setupObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElement(node);
            node.querySelectorAll("*").forEach((child) => {
              this.processElement(child);
            });
          }
        });
      });
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  /**
   * Scan for existing components
   */
  scanExistingComponents() {
    document.querySelectorAll("*").forEach((element) => {
      this.processElement(element);
    });
  }
  /**
   * Check if element is a custom component
   */
  isCustomComponent(element) {
    const tagName = element.tagName.toLowerCase();
    if (!tagName.includes("-")) return false;
    if (tagName.startsWith("nc-dev")) return false;
    if (tagName.startsWith("ion-") || tagName.startsWith("mat-")) return false;
    return customElements.get(tagName) !== void 0 || element.shadowRoot !== null;
  }
  /**
   * Process element and add context menu
   */
  processElement(element) {
    if (!this.isCustomComponent(element)) return;
    if (this.observedComponents.has(element)) return;
    this.observedComponents.add(element);
    element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showMenu(e.clientX, e.clientY, element);
    });
  }
  /**
   * Show context menu
   */
  showMenu(x, y, element) {
    this.hideMenu();
    const menu = document.createElement("div");
    menu.className = "nc-context-menu";
    const devToolsItem = document.createElement("div");
    devToolsItem.className = "nc-context-menu-item devtools";
    devToolsItem.innerHTML = `
            <svg class="nc-context-menu-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            Edit Component
        `;
    devToolsItem.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideMenu();
      this.onEdit(element);
    });
    menu.appendChild(devToolsItem);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
    this.activeMenu = menu;
  }
  /**
   * Hide context menu
   */
  hideMenu() {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }
  /**
   * Destroy the context menu system
   */
  destroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    this.hideMenu();
    document.getElementById("nativecore-context-menu-styles")?.remove();
    this.observedComponents.clear();
  }
}
export {
  ContextMenu
};
