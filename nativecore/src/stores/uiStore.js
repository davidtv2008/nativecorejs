import { useState } from "@core/state.js";
class UIStore {
  sidebarOpen;
  theme;
  notifications;
  constructor() {
    this.sidebarOpen = useState(false);
    this.theme = useState("light");
    this.notifications = useState([]);
  }
  toggleSidebar() {
    this.sidebarOpen.value = !this.sidebarOpen.value;
  }
  setTheme(theme) {
    this.theme.value = theme;
  }
  addNotification(notification) {
    this.notifications.value = [...this.notifications.value, notification];
  }
  removeNotification(id) {
    this.notifications.value = this.notifications.value.filter((n) => n.id !== id);
  }
}
const uiStore = new UIStore();
export {
  uiStore
};
