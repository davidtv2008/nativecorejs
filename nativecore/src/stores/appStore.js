import { useState } from "@core/state.js";
class AppStore {
  user;
  isLoading;
  error;
  count;
  constructor() {
    this.user = useState(null);
    this.isLoading = useState(false);
    this.error = useState(null);
    this.count = useState(0);
  }
  setUser(user) {
    this.user.value = user;
  }
  setLoading(loading) {
    this.isLoading.value = loading;
  }
  setError(error) {
    this.error.value = error;
  }
  clearError() {
    this.error.value = null;
  }
  incrementCount(amount = 1) {
    this.count.value += amount;
  }
  decrementCount(amount = 1) {
    this.count.value -= amount;
  }
  resetCount() {
    this.count.value = 0;
  }
}
const store = new AppStore();
export {
  store
};
