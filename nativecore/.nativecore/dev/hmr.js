if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  const savedScroll = sessionStorage.getItem("hmr_scroll_pos");
  if (savedScroll !== null) {
    window.addEventListener("pageloaded", () => {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem("hmr_scroll_pos");
        console.warn("\u{1F525} Scroll position restored:", savedScroll);
      }, 100);
    }, { once: true });
    setTimeout(() => {
      const scrollPos = sessionStorage.getItem("hmr_scroll_pos");
      if (scrollPos) {
        window.scrollTo(0, parseInt(scrollPos, 10));
        sessionStorage.removeItem("hmr_scroll_pos");
      }
    }, 500);
  }
  if (window.__hmrWebSocket) {
    console.warn("[HMR] Connection already exists, skipping...");
  } else {
    let connect = function() {
      try {
        ws = new WebSocket("ws://localhost:8001");
      } catch (err) {
        console.error("[HMR] could not open WebSocket:", err);
        scheduleReconnect();
        return;
      }
      window.__hmrWebSocket = ws;
      attachHandlers(ws);
    }, scheduleReconnect = function() {
      if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        console.warn("[HMR] giving up after", MAX_RECONNECT_ATTEMPTS, "attempts. Refresh manually.");
        showHMRIndicator("disconnected", "HMR offline");
        return;
      }
      reconnectAttempt++;
      const delay = Math.min(1e3 * Math.pow(1.5, reconnectAttempt), 15e3);
      showHMRIndicator("disconnected", `Reconnecting (${reconnectAttempt})\u2026`);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, delay);
    }, showHMRIndicator = function(status, message) {
      let indicator = document.getElementById("hmr-indicator");
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "hmr-indicator";
        indicator.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(calc(-50% - 96px));
                    padding: 6px 12px;
                    background: #000;
                    color: #fff;
                    border-radius: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    z-index: 999999;
                    opacity: 1;
                    transition: all 0.3s;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                `;
        document.body.appendChild(indicator);
      }
      const colors = {
        connected: "#10b981",
        disconnected: "#ef4444",
        updating: "#f59e0b"
      };
      const icons = {
        connected: "[HMR]",
        disconnected: "[DISCONNECTED]",
        updating: "[UPDATING]"
      };
      indicator.textContent = `${icons[status]} ${message || status.toUpperCase()}`;
      indicator.style.background = colors[status] || "#000";
    }, flashHMRIndicator = function() {
      const indicator = document.getElementById("hmr-indicator");
      if (indicator) {
        indicator.style.transform = "translateX(calc(-50% - 96px)) scale(1.08)";
        setTimeout(() => {
          indicator.style.transform = "translateX(calc(-50% - 96px))";
        }, 200);
      }
    }, attachHandlers = function(socket) {
      socket.onopen = () => {
        isConnected = true;
        reconnectAttempt = 0;
        console.warn("[HMR] enabled - Live reload active");
        showHMRIndicator("connected", "HMR Ready");
      };
      socket.onmessage = async (event) => {
        try {
          const { type, file } = JSON.parse(event.data);
          if (type === "file-changed") {
            if (file.endsWith(".css")) {
              await hotReloadCSS(file);
            } else if (file.endsWith(".js")) {
              await hotReloadJS(file);
            } else if (file.endsWith(".ts")) {
              console.warn(`\u267B\uFE0F  TS changed: ${file}`);
              showHMRIndicator("updating", "Reloading...");
              sessionStorage.setItem("hmr_scroll_pos", window.scrollY.toString());
              setTimeout(() => location.reload(), 100);
            } else if (file.endsWith(".html")) {
              console.warn(`\u267B\uFE0F  HTML changed: ${file}`);
              showHMRIndicator("updating", "Reloading...");
              sessionStorage.setItem("hmr_scroll_pos", window.scrollY.toString());
              setTimeout(() => location.reload(), 100);
            }
          }
        } catch (error) {
          console.error("\u{1F525} HMR error:", error);
        }
      };
      socket.onclose = () => {
        if (isConnected) {
          console.warn("[HMR] disconnected \u2014 attempting reconnect");
        }
        isConnected = false;
        window.__hmrWebSocket = void 0;
        scheduleReconnect();
      };
      socket.onerror = (err) => {
        console.error("[HMR] connection error:", err);
      };
    };
    let ws = null;
    let isConnected = false;
    let reconnectAttempt = 0;
    let reconnectTimer = null;
    const MAX_RECONNECT_ATTEMPTS = 10;
    async function hotReloadCSS(file) {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      let reloaded = false;
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.includes(file)) {
          const newHref = href.split("?")[0] + "?" + Date.now();
          link.href = newHref;
          reloaded = true;
        }
      });
      if (reloaded) {
        console.warn(`CSS hot reloaded: ${file}`);
        flashHMRIndicator();
      }
    }
    async function hotReloadJS(file) {
      console.warn(`Reloading JS: ${file}`);
      showHMRIndicator("updating", "Reloading...");
      setTimeout(() => {
        location.reload();
      }, 100);
    }
    connect();
  }
}
