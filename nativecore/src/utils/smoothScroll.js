function initSmoothScroll() {
  if ("ontouchstart" in window) {
    return;
  }
  let isScrolling = false;
  let targetScrollY = window.scrollY;
  let currentScrollY = window.scrollY;
  const smoothness = 0.15;
  function smoothScrollStep() {
    if (Math.abs(targetScrollY - currentScrollY) < 0.5) {
      currentScrollY = targetScrollY;
      isScrolling = false;
      return;
    }
    currentScrollY += (targetScrollY - currentScrollY) * smoothness;
    window.scrollTo(0, currentScrollY);
    requestAnimationFrame(smoothScrollStep);
  }
  window.addEventListener("wheel", (e) => {
    e.preventDefault();
    targetScrollY += e.deltaY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetScrollY = Math.max(0, Math.min(targetScrollY, maxScroll));
    if (!isScrolling) {
      isScrolling = true;
      requestAnimationFrame(smoothScrollStep);
    }
  }, { passive: false });
  window.addEventListener("keydown", (e) => {
    const scrollAmount = 100;
    const pageScrollAmount = window.innerHeight * 0.8;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        targetScrollY = Math.min(targetScrollY + scrollAmount, document.documentElement.scrollHeight - window.innerHeight);
        break;
      case "ArrowUp":
        e.preventDefault();
        targetScrollY = Math.max(targetScrollY - scrollAmount, 0);
        break;
      case "PageDown":
        e.preventDefault();
        targetScrollY = Math.min(targetScrollY + pageScrollAmount, document.documentElement.scrollHeight - window.innerHeight);
        break;
      case "PageUp":
        e.preventDefault();
        targetScrollY = Math.max(targetScrollY - pageScrollAmount, 0);
        break;
      case "Home":
        e.preventDefault();
        targetScrollY = 0;
        break;
      case "End":
        e.preventDefault();
        targetScrollY = document.documentElement.scrollHeight - window.innerHeight;
        break;
      default:
        return;
    }
    if (!isScrolling) {
      isScrolling = true;
      requestAnimationFrame(smoothScrollStep);
    }
  });
}
export {
  initSmoothScroll
};
