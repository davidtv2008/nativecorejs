const OVERLAY_ID = "__nc_dev_overlay__";
const MODAL_ID = "__nc_dev_modal__";
const STYLE_ID = "__nc_dev_overlay_style__";
const DEV_VISIBLE_KEY = "nativecore-devtools-visible";
const MAX_API_LOG = 20;
const MAX_LONG_TASK_LOG = 50;
const MAX_CONSOLE_LOG = 50;
const MAX_ROUTE_LOG = 20;
const MAX_EFFECT_GUARD_LOG = 20;
const FPS_HISTORY_LEN = 60;
let fpsFrameId = null;
let longTaskObserver = null;
let paintObserver = null;
let lcpObserver = null;
let navStartTime = performance.now();
let domBaselineNodes = 0;
const state = {
  // FPS
  fps: 0,
  fpsFrameCount: 0,
  fpsHistory: [],
  // Memory
  memUsed: 0,
  memTotal: 0,
  memHistory: [],
  // Paint
  fcp: 0,
  lcp: 0,
  // Long tasks
  longTaskCount: 0,
  longTaskLastMs: 0,
  longTaskWarning: false,
  longTaskWarningTimer: null,
  longTaskLog: [],
  // Routes
  routeTime: 0,
  routePath: "",
  routeHistory: [],
  // DOM
  domNodes: 0,
  domDelta: 0,
  // Network / API
  pendingFetches: 0,
  apiLog: [],
  netFailCount: 0,
  // Errors
  consoleErrors: 0,
  consoleWarns: 0,
  unhandledRejections: 0,
  consoleLog: [],
  effectGuardTrips: 0,
  effectGuardLog: [],
  // Components
  componentCount: 0,
  componentList: [],
  // SEO (dev scan)
  seoScore: 0,
  seoChecks: [],
  seoInputs: []
};
function formatMs(ms) {
  return ms >= 1e3 ? `${(ms / 1e3).toFixed(2)}s` : `${ms.toFixed(0)}ms`;
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}
function clamp(s, max) {
  return s.length > max ? "..." + s.slice(-(max - 3)) : s;
}
function fpsColor(fps) {
  if (fps >= 55) return "#00ff88";
  if (fps >= 30) return "#ffcc00";
  return "#ff4444";
}
function memColor(used, limit) {
  if (limit === 0) return "#888";
  const r = used / limit;
  if (r < 0.5) return "#00ff88";
  if (r < 0.75) return "#ffcc00";
  return "#ff4444";
}
function msColor(ms, warn, bad) {
  if (ms < warn) return "#00ff88";
  if (ms < bad) return "#ffcc00";
  return "#ff4444";
}
function statusColor(status) {
  if (status >= 500) return "#ff4444";
  if (status >= 400) return "#ffcc00";
  if (status >= 200) return "#00ff88";
  return "#888";
}
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
        /* \u2500\u2500 Overlay \u2500\u2500 */
        #${OVERLAY_ID} {
            position: fixed;
            bottom: 12px;
            left: 12px;
            z-index: 2147483646;
            background: rgba(0,0,0,0.52);
            border: 1px solid rgba(0,255,136,0.22);
            border-radius: 6px;
            padding: 7px 10px 8px;
            font-family: 'Cascadia Code','Fira Code','Consolas',monospace;
            font-size: 10px;
            line-height: 1.65;
            color: #00ff88;
            backdrop-filter: blur(6px);
            min-width: 192px;
            max-width: 230px;
            user-select: none;
            cursor: move;
            pointer-events: all;
        }
        #${OVERLAY_ID}:hover {
            background: rgba(0,0,0,0.78);
            border-color: rgba(0,255,136,0.45);
        }
        #${OVERLAY_ID} .nc-hdr {
            color: #00ff88;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .09em;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #${OVERLAY_ID} .nc-x {
            color: rgba(0,255,136,0.3);
            cursor: pointer;
            padding: 0 2px;
            pointer-events: all;
        }
        #${OVERLAY_ID} .nc-x:hover { color: #ff4444; }
        #${OVERLAY_ID} .nc-row {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            cursor: pointer;
            border-radius: 3px;
            padding: 0 2px;
            margin: 0 -2px;
        }
        #${OVERLAY_ID} .nc-row:hover {
            background: rgba(0,255,136,0.07);
        }
        #${OVERLAY_ID} .nc-lbl { color: #00ff88; }
        #${OVERLAY_ID} .nc-div {
            border: none;
            border-top: 1px solid rgba(0,255,136,0.09);
            margin: 3px 0;
        }
        #${OVERLAY_ID} .nc-warn {
            color: #ff4444;
            animation: nc-blink .6s steps(1) infinite;
        }
        #${OVERLAY_ID} .nc-caution { color: #ffcc00; }
        #${OVERLAY_ID} .nc-muted { color: #00ff88; }
        @keyframes nc-blink { 50% { opacity:0; } }

        /* \u2500\u2500 Modal backdrop \u2500\u2500 */
        #${MODAL_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(3px);
            pointer-events: all;
        }
        #${MODAL_ID} .nc-modal-box {
            background: #0a0a0a;
            border: 1px solid rgba(0,255,136,0.35);
            border-radius: 8px;
            padding: 20px 22px;
            font-family: 'Cascadia Code','Fira Code','Consolas',monospace;
            font-size: 11px;
            color: #00ff88;
            min-width: 420px;
            max-width: 680px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        }
        #${MODAL_ID} .nc-modal-box::-webkit-scrollbar { width: 5px; }
        #${MODAL_ID} .nc-modal-box::-webkit-scrollbar-track { background: transparent; }
        #${MODAL_ID} .nc-modal-box::-webkit-scrollbar-thumb { background: rgba(0,255,136,.25); border-radius: 99px; }
        #${MODAL_ID} .nc-m-title {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: .06em;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0,255,136,0.15);
            display: flex;
            justify-content: space-between;
        }
        #${MODAL_ID} .nc-m-close {
            color: rgba(0,255,136,0.35);
            cursor: pointer;
            font-size: 14px;
        }
        #${MODAL_ID} .nc-m-close:hover { color: #ff4444; }
        #${MODAL_ID} .nc-m-sect {
            margin-bottom: 12px;
        }
        #${MODAL_ID} .nc-m-sect-title {
            color: rgba(0,255,136,0.45);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .1em;
            margin-bottom: 5px;
        }
        #${MODAL_ID} .nc-m-kv {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 2px;
            line-height: 1.7;
        }
        #${MODAL_ID} .nc-m-kv .k { color: rgba(0,255,136,0.4); min-width: 120px; }
        #${MODAL_ID} .nc-m-log-row {
            border-top: 1px solid rgba(0,255,136,0.06);
            padding: 3px 0;
            line-height: 1.6;
            display: grid;
            gap: 6px;
        }
        #${MODAL_ID} .nc-m-log-row.err  { color: #ff4444; }
        #${MODAL_ID} .nc-m-log-row.warn { color: #ffcc00; }
        #${MODAL_ID} .nc-m-ts {
            color: rgba(0,255,136,0.3);
            font-size: 9px;
        }
        #${MODAL_ID} .nc-m-empty {
            color: rgba(0,255,136,0.25);
            font-style: italic;
        }
        #${MODAL_ID} .nc-sparkline {
            height: 32px;
            width: 100%;
            display: block;
            margin: 6px 0;
        }
        #${MODAL_ID} .nc-chip {
            display: inline-block;
            background: rgba(0,255,136,0.08);
            border: 1px solid rgba(0,255,136,0.18);
            border-radius: 3px;
            padding: 1px 6px;
            margin: 2px 3px 2px 0;
            font-size: 10px;
        }
        #${MODAL_ID} .nc-chip.bad  { border-color: rgba(255,68,68,.5);  background: rgba(255,68,68,.08);  color: #ff4444; }
        #${MODAL_ID} .nc-chip.warn { border-color: rgba(255,204,0,.5);  background: rgba(255,204,0,.08);  color: #ffcc00; }
        #${MODAL_ID} .nc-m-seo-field { margin-bottom: 10px; }
        #${MODAL_ID} .nc-m-seo-label {
            display: block;
            color: rgba(0,255,136,0.55);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .08em;
            margin-bottom: 4px;
        }
        #${MODAL_ID} .nc-m-textarea {
            width: 100%;
            box-sizing: border-box;
            background: rgba(0,0,0,0.35);
            border: 1px solid rgba(0,255,136,0.22);
            border-radius: 4px;
            color: #00ff88;
            font-family: inherit;
            font-size: 11px;
            padding: 8px 10px;
            resize: vertical;
            min-height: 44px;
        }
        #${MODAL_ID} .nc-m-textarea:focus {
            outline: none;
            border-color: rgba(0,255,136,0.45);
        }
        #${MODAL_ID} .nc-m-btn-row {
            display: flex;
            gap: 10px;
            margin-top: 14px;
            flex-wrap: wrap;
        }
        #${MODAL_ID} .nc-m-btn {
            background: rgba(0,255,136,0.08);
            border: 1px solid rgba(0,255,136,0.28);
            color: #00ff88;
            font-family: inherit;
            font-size: 11px;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        #${MODAL_ID} .nc-m-btn:hover { background: rgba(0,255,136,0.14); }
        #${MODAL_ID} .nc-m-btn-primary {
            background: rgba(0,255,136,0.18);
            border-color: rgba(0,255,136,0.45);
        }
        #${MODAL_ID} .nc-m-seo-note {
            color: rgba(0,255,136,0.28);
            font-size: 9px;
            line-height: 1.5;
            margin-top: 12px;
        }
    `;
  document.head.appendChild(s);
}
function sparkline(values, color = "#00ff88") {
  if (values.length < 2) return "";
  const w = 380, h = 32;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = i / (values.length - 1) * w;
    const y = h - v / max * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="nc-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
}
function snapshotDom() {
  const count = document.querySelectorAll("*").length;
  const delta = count - state.domNodes;
  state.domDelta = state.domNodes > 0 ? delta : 0;
  state.domNodes = count;
}
function snapshotComponents() {
  const all = document.querySelectorAll(":defined");
  const custom = [];
  all.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag.includes("-")) custom.push(tag);
  });
  state.componentCount = custom.length;
  const freq = {};
  for (const t of custom) freq[t] = (freq[t] ?? 0) + 1;
  state.componentList = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([t, n]) => n > 1 ? `${t} \xD7${n}` : t);
}
function seoScoreColor(score) {
  if (score >= 85) return "#00ff88";
  if (score >= 60) return "#ffcc00";
  return "#ff4444";
}
function escapeModalText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function runSeoScan() {
  const checks = [];
  const inputs = [];
  let score = 0;
  const body = document.body;
  if (!body) {
    state.seoScore = 0;
    state.seoChecks = [];
    state.seoInputs = [];
    return;
  }
  const pushInput = (row2) => {
    if (inputs.some((i) => i.group === "img" && i.imgSrcContains === row2.imgSrcContains)) return;
    if (row2.group !== "img" && inputs.some((i) => i.key === row2.key && i.group === row2.group)) return;
    inputs.push(row2);
  };
  const lang = document.documentElement.getAttribute("lang")?.trim() ?? "";
  if (lang.length >= 2) {
    score += 5;
    checks.push({
      id: "lang",
      label: "html[lang]",
      status: "good",
      points: 5,
      maxPoints: 5,
      detail: `lang="${lang}"`
    });
  } else {
    checks.push({
      id: "lang",
      label: "html[lang]",
      status: "bad",
      points: 0,
      maxPoints: 5,
      detail: "Missing or too short \u2014 search engines use language for indexing."
    });
    pushInput({ key: "htmlLang", label: "Language (html lang)", value: lang || "en", hint: "BCP-47, e.g. en, es, en-US", group: "head" });
  }
  const title = (document.title || "").trim();
  let titlePts = 0;
  if (title.length === 0) {
    checks.push({
      id: "title",
      label: "<title>",
      status: "bad",
      points: 0,
      maxPoints: 15,
      detail: "Empty \u2014 set a unique title per route."
    });
    pushInput({ key: "title", label: "Document title", value: "", hint: "Target ~10\u201370 characters", group: "head" });
  } else if (title.length >= 10 && title.length <= 70) {
    titlePts = 15;
    checks.push({
      id: "title",
      label: "<title>",
      status: "good",
      points: 15,
      maxPoints: 15,
      detail: `${title.length} characters`
    });
  } else if (title.length < 10) {
    titlePts = 7;
    checks.push({
      id: "title",
      label: "<title>",
      status: "warn",
      points: 7,
      maxPoints: 15,
      detail: `Short (${title.length} chars) \u2014 aim for at least ~10 characters.`
    });
    pushInput({ key: "title", label: "Document title", value: title, hint: "Expand toward 10\u201370 chars", group: "head" });
  } else {
    titlePts = 10;
    checks.push({
      id: "title",
      label: "<title>",
      status: "warn",
      points: 10,
      maxPoints: 15,
      detail: `Long (${title.length} chars) \u2014 may truncate in SERPs (\u226470 is safer).`
    });
    pushInput({ key: "title", label: "Document title", value: title, hint: "Shorten to ~70 chars", group: "head" });
  }
  score += titlePts;
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  let descPts = 0;
  if (!metaDesc) {
    checks.push({
      id: "meta-desc",
      label: "meta description",
      status: "bad",
      points: 0,
      maxPoints: 15,
      detail: 'Missing \u2014 add <meta name="description" content="\u2026"> in index.html head.'
    });
    pushInput({
      key: "metaDescription",
      label: "Meta description",
      value: "",
      hint: "Roughly 50\u2013160 characters",
      group: "head"
    });
  } else if (metaDesc.length >= 50 && metaDesc.length <= 160) {
    descPts = 15;
    checks.push({
      id: "meta-desc",
      label: "meta description",
      status: "good",
      points: 15,
      maxPoints: 15,
      detail: `${metaDesc.length} characters`
    });
  } else if (metaDesc.length < 50) {
    descPts = 8;
    checks.push({
      id: "meta-desc",
      label: "meta description",
      status: "warn",
      points: 8,
      maxPoints: 15,
      detail: `Short (${metaDesc.length} chars) \u2014 aim for ~50\u2013160.`
    });
    pushInput({
      key: "metaDescription",
      label: "Meta description",
      value: metaDesc,
      hint: "Expand toward 50\u2013160 chars",
      group: "head"
    });
  } else {
    descPts = 10;
    checks.push({
      id: "meta-desc",
      label: "meta description",
      status: "warn",
      points: 10,
      maxPoints: 15,
      detail: `Long (${metaDesc.length} chars) \u2014 may truncate (\u2264160 is safer).`
    });
    pushInput({
      key: "metaDescription",
      label: "Meta description",
      value: metaDesc,
      hint: "Shorten to ~160 chars",
      group: "head"
    });
  }
  score += descPts;
  const hasViewport = !!document.querySelector('meta[name="viewport"]');
  if (hasViewport) {
    score += 5;
    checks.push({
      id: "viewport",
      label: "viewport meta",
      status: "good",
      points: 5,
      maxPoints: 5,
      detail: "Present"
    });
  } else {
    checks.push({
      id: "viewport",
      label: "viewport meta",
      status: "bad",
      points: 0,
      maxPoints: 5,
      detail: "Missing \u2014 required for mobile-friendly ranking."
    });
  }
  const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() ?? "";
  if (canonicalHref) {
    score += 10;
    checks.push({
      id: "canonical",
      label: "canonical URL",
      status: "good",
      points: 10,
      maxPoints: 10,
      detail: clamp(canonicalHref, 56)
    });
  } else {
    checks.push({
      id: "canonical",
      label: "canonical URL",
      status: "bad",
      points: 0,
      maxPoints: 10,
      detail: 'Missing <link rel="canonical" href="\u2026">'
    });
    pushInput({
      key: "canonicalHref",
      label: "Canonical URL",
      value: `${window.location.origin}${window.location.pathname}`,
      hint: "Preferred URL for this page",
      group: "head"
    });
  }
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ?? "";
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() ?? "";
  let ogPts = 0;
  if (ogTitle) {
    ogPts += 5;
    checks.push({
      id: "og-title",
      label: "og:title",
      status: "good",
      points: 5,
      maxPoints: 5,
      detail: clamp(ogTitle, 48)
    });
  } else {
    checks.push({
      id: "og-title",
      label: "og:title",
      status: "bad",
      points: 0,
      maxPoints: 5,
      detail: "Missing \u2014 used for social previews."
    });
    pushInput({
      key: "ogTitle",
      label: "Open Graph title",
      value: title || "",
      hint: "Often matches page title",
      group: "head"
    });
  }
  if (ogDesc) {
    ogPts += 5;
    checks.push({
      id: "og-desc",
      label: "og:description",
      status: "good",
      points: 5,
      maxPoints: 5,
      detail: clamp(ogDesc, 48)
    });
  } else {
    checks.push({
      id: "og-desc",
      label: "og:description",
      status: "bad",
      points: 0,
      maxPoints: 5,
      detail: "Missing \u2014 add for link previews."
    });
    pushInput({
      key: "ogDescription",
      label: "Open Graph description",
      value: metaDesc || "",
      hint: "Often matches meta description",
      group: "head"
    });
  }
  score += ogPts;
  const h1List = Array.from(body.querySelectorAll("h1"));
  const h1Count = h1List.length;
  let h1Pts = 0;
  const firstH1Text = h1List[0]?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (h1Count === 1) {
    h1Pts = 15;
    checks.push({
      id: "h1",
      label: "H1 heading",
      status: "good",
      points: 15,
      maxPoints: 15,
      detail: `"${clamp(firstH1Text, 40)}"`
    });
  } else if (h1Count === 0) {
    checks.push({
      id: "h1",
      label: "H1 heading",
      status: "bad",
      points: 0,
      maxPoints: 15,
      detail: "No visible <h1> \u2014 add one clear topic heading."
    });
    pushInput({
      key: "firstH1",
      label: "Primary H1 text (view HTML)",
      value: "",
      hint: "Replaces first <h1> in this route view file",
      group: "view"
    });
  } else {
    h1Pts = 7;
    checks.push({
      id: "h1",
      label: "H1 heading",
      status: "warn",
      points: 7,
      maxPoints: 15,
      detail: `${h1Count} <h1> elements \u2014 use one per page when possible.`
    });
    pushInput({
      key: "firstH1",
      label: "First H1 text (edit in source)",
      value: firstH1Text,
      hint: "Consider removing extra H1s manually in the view file",
      group: "view"
    });
  }
  score += h1Pts;
  const imgs = Array.from(body.querySelectorAll("img"));
  const missingAlt = imgs.filter((img) => !img.hasAttribute("alt"));
  const imgDeduction = Math.min(15, missingAlt.length * 3);
  const imgPts = 15 - imgDeduction;
  score += imgPts;
  if (missingAlt.length === 0) {
    checks.push({
      id: "img-alt",
      label: "Image alt text",
      status: "good",
      points: 15,
      maxPoints: 15,
      detail: `${imgs.length} image(s), all have alt`
    });
  } else {
    checks.push({
      id: "img-alt",
      label: "Image alt text",
      status: imgPts < 8 ? "bad" : "warn",
      points: imgPts,
      maxPoints: 15,
      detail: `${missingAlt.length} image(s) without an alt attribute (decorative images may use alt="").`
    });
    for (const img of missingAlt) {
      const rawSrc = (img.getAttribute("src") || "").split("?")[0] || "";
      const src = rawSrc;
      const slice = src.includes("/") ? src.split("/").pop() || src : src;
      const srcContains = slice.length > 4 ? slice.slice(0, 80) : src.slice(0, 80);
      if (!srcContains) continue;
      pushInput({
        key: `img-${srcContains}`,
        label: `alt for \u2026${escapeModalText(clamp(srcContains, 32))}`,
        value: "",
        hint: "Short description for SEO & a11y",
        group: "img",
        imgSrcContains: srcContains
      });
    }
  }
  const anchors = Array.from(body.querySelectorAll("a[href]"));
  const emptyLinks = anchors.filter((a) => {
    const t = (a.textContent || "").replace(/\s+/g, " ").trim();
    if (t.length > 0) return false;
    if (a.querySelector("img")) return false;
    return true;
  });
  const linkDeduction = Math.min(10, emptyLinks.length * 2);
  const linkPts = 10 - linkDeduction;
  score += linkPts;
  if (emptyLinks.length === 0) {
    checks.push({
      id: "link-text",
      label: "Link text",
      status: "good",
      points: 10,
      maxPoints: 10,
      detail: "No empty text links detected"
    });
  } else {
    checks.push({
      id: "link-text",
      label: "Link text",
      status: linkPts < 5 ? "bad" : "warn",
      points: linkPts,
      maxPoints: 10,
      detail: `${emptyLinks.length} link(s) with no visible text \u2014 add labels or aria-label in source.`
    });
  }
  state.seoScore = Math.min(100, Math.round(score));
  state.seoChecks = checks;
  state.seoInputs = inputs;
}
function patchConsole() {
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args) => {
    state.consoleErrors++;
    state.consoleLog.unshift({ level: "error", msg: args.map(String).join(" "), ts: Date.now() });
    if (state.consoleLog.length > MAX_CONSOLE_LOG) state.consoleLog.pop();
    origError(...args);
  };
  console.warn = (...args) => {
    state.consoleWarns++;
    state.consoleLog.unshift({ level: "warn", msg: args.map(String).join(" "), ts: Date.now() });
    if (state.consoleLog.length > MAX_CONSOLE_LOG) state.consoleLog.pop();
    origWarn(...args);
  };
}
function observeRejections() {
  window.addEventListener("unhandledrejection", (e) => {
    state.unhandledRejections++;
    state.consoleLog.unshift({
      level: "error",
      msg: `Unhandled rejection: ${e.reason}`,
      ts: Date.now()
    });
    if (state.consoleLog.length > MAX_CONSOLE_LOG) state.consoleLog.pop();
  });
}
function observeEffectLoopGuards() {
  window.addEventListener("nativecore:effect-loop-guard", (e) => {
    const detail = e.detail;
    if (!detail) return;
    state.effectGuardTrips++;
    state.effectGuardLog.unshift(detail);
    if (state.effectGuardLog.length > MAX_EFFECT_GUARD_LOG) state.effectGuardLog.pop();
  });
}
function patchFetch() {
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    state.pendingFetches++;
    const t0 = performance.now();
    const method = (init?.method ?? "GET").toUpperCase();
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = clamp(rawUrl, 60);
    try {
      const res = await origFetch(input, init);
      const duration = performance.now() - t0;
      const entry = { method, url, status: res.status, duration, ts: Date.now(), ok: res.ok };
      state.apiLog.unshift(entry);
      if (state.apiLog.length > MAX_API_LOG) state.apiLog.pop();
      if (!res.ok) state.netFailCount++;
      return res;
    } catch (err) {
      const duration = performance.now() - t0;
      state.apiLog.unshift({ method, url, status: 0, duration, ts: Date.now(), ok: false });
      if (state.apiLog.length > MAX_API_LOG) state.apiLog.pop();
      state.netFailCount++;
      throw err;
    } finally {
      state.pendingFetches = Math.max(0, state.pendingFetches - 1);
    }
  };
}
function observePaintMetrics() {
  if (!("PerformanceObserver" in window)) return;
  try {
    paintObserver = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name === "first-contentful-paint") state.fcp = e.startTime;
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch {
  }
  try {
    lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) state.lcp = last.startTime;
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
  }
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        state.longTaskCount++;
        state.longTaskLastMs = e.duration;
        state.longTaskWarning = true;
        state.longTaskLog.unshift({ duration: e.duration, startTime: e.startTime, ts: Date.now() });
        if (state.longTaskLog.length > MAX_LONG_TASK_LOG) state.longTaskLog.pop();
        if (state.longTaskWarningTimer) clearTimeout(state.longTaskWarningTimer);
        state.longTaskWarningTimer = setTimeout(() => {
          state.longTaskWarning = false;
        }, 2e3);
      }
    });
    longTaskObserver.observe({ type: "longtask", buffered: true });
  } catch {
  }
}
function observeRouteChanges() {
  navStartTime = performance.now();
  const onNav = () => {
    navStartTime = performance.now();
    domBaselineNodes = state.domNodes;
  };
  window.addEventListener("popstate", onNav);
  window.addEventListener("pageloaded", () => {
    snapshotDom();
    snapshotComponents();
    runSeoScan();
    const duration = performance.now() - navStartTime;
    const path = window.location.pathname;
    state.routeTime = duration;
    state.routePath = path;
    state.routeHistory.unshift({ path, duration, domNodes: state.domNodes, ts: Date.now() });
    if (state.routeHistory.length > MAX_ROUTE_LOG) state.routeHistory.pop();
    updateOverlay();
  });
}
function startFpsLoop() {
  let lastUpdateTime = performance.now();
  const loop = (now) => {
    state.fpsFrameCount++;
    const elapsed = now - lastUpdateTime;
    if (elapsed >= 500) {
      state.fps = Math.round(state.fpsFrameCount * 1e3 / elapsed);
      state.fpsFrameCount = 0;
      lastUpdateTime = now;
      state.fpsHistory.push(state.fps);
      if (state.fpsHistory.length > FPS_HISTORY_LEN) state.fpsHistory.shift();
      if (performance.memory) {
        const mb = performance.memory.usedJSHeapSize / (1024 * 1024);
        state.memHistory.push(mb);
        if (state.memHistory.length > FPS_HISTORY_LEN) state.memHistory.shift();
      }
      snapshotDom();
      snapshotComponents();
      updateOverlay();
    }
    fpsFrameId = requestAnimationFrame(loop);
  };
  fpsFrameId = requestAnimationFrame(loop);
}
function row(label, valueHtml, key) {
  return `<div class="nc-row" data-nc-section="${key}"><span class="nc-lbl">${label}</span><span>${valueHtml}</span></div>`;
}
function renderOverlayHTML() {
  const fc = fpsColor(state.fps);
  const memAvail = !!performance.memory;
  const usedMb = performance.memory ? performance.memory.usedJSHeapSize / (1024 * 1024) : 0;
  const limitMb = performance.memory ? performance.memory.jsHeapSizeLimit / (1024 * 1024) : 0;
  const mc = memColor(usedMb, limitMb);
  const totalErrors = state.consoleErrors + state.unhandledRejections;
  const errorCls = totalErrors > 0 ? "nc-warn" : "nc-muted";
  const warnCls = state.consoleWarns > 0 ? "nc-caution" : "nc-muted";
  const effectGuardCls = state.effectGuardTrips > 0 ? "nc-warn" : "nc-muted";
  const domDeltaStr = state.domDelta !== 0 ? ` <span class="${state.domDelta > 100 ? "nc-warn" : state.domDelta > 20 ? "nc-caution" : "nc-muted"}">(${state.domDelta > 0 ? "+" : ""}${state.domDelta})</span>` : "";
  const netCls = state.pendingFetches > 0 ? "nc-caution" : state.netFailCount > 0 ? "nc-warn" : "nc-muted";
  const lastApi = state.apiLog[0];
  const netVal = lastApi ? `<span style="color:${statusColor(lastApi.status)}">${lastApi.status}</span> <span class="nc-muted">${formatMs(lastApi.duration)}</span>` : '<span class="nc-muted">--</span>';
  let html = `
        <div class="nc-hdr">
            <span>nativecore dev</span>
            <span class="nc-x" data-nc-close title="Close">&#x2715;</span>
        </div>
        ${row("FPS", `<span style="color:${fc}">${state.fps}</span>`, "fps")}
    `;
  if (memAvail) {
    html += row("MEM", `<span style="color:${mc}">${usedMb.toFixed(1)} / ${limitMb.toFixed(0)} MB</span>`, "mem");
  }
  html += `<hr class="nc-div">`;
  html += row("DOM", `${state.domNodes}${domDeltaStr}`, "dom");
  html += row("COMPONENTS", `<span class="nc-muted">${state.componentCount}</span>`, "components");
  html += row("SEO", `<span style="color:${seoScoreColor(state.seoScore)}">${state.seoScore}</span>`, "seo");
  html += `<hr class="nc-div">`;
  if (state.fcp > 0 || state.lcp > 0) {
    if (state.fcp > 0) html += row("FCP", `<span style="color:${msColor(state.fcp, 1800, 3e3)}">${formatMs(state.fcp)}</span>`, "paint");
    if (state.lcp > 0) html += row("LCP", `<span style="color:${msColor(state.lcp, 2500, 4e3)}">${formatMs(state.lcp)}</span>`, "paint");
    html += `<hr class="nc-div">`;
  }
  if (state.routeTime > 0) {
    html += row("ROUTE", `<span class="nc-muted">${formatMs(state.routeTime)}</span>`, "routes");
  }
  html += row("LONG TASKS", state.longTaskCount > 0 ? `<span class="${state.longTaskWarning ? "nc-warn" : ""}">${state.longTaskCount}</span>` : '<span class="nc-muted">0</span>', "longtasks");
  html += `<hr class="nc-div">`;
  html += row("NET", netVal, "net");
  html += row("ERRORS", `<span class="${errorCls}">${totalErrors}</span> <span class="${warnCls}">/ ${state.consoleWarns}w</span>`, "errors");
  html += row("LOOP GUARD", `<span class="${effectGuardCls}">${state.effectGuardTrips}</span>`, "effectguards");
  const conn = navigator.connection;
  if (conn) {
    html += `<hr class="nc-div">`;
    html += row("CONN", `<span class="nc-muted">${conn.effectiveType ?? "--"}</span>`, "conn");
  }
  return html;
}
function createOverlay() {
  const el = document.createElement("div");
  el.id = OVERLAY_ID;
  el.innerHTML = renderOverlayHTML();
  document.body.appendChild(el);
  makeDraggable(el);
  bindOverlayEvents(el);
  return el;
}
function updateOverlay() {
  const el = document.getElementById(OVERLAY_ID);
  if (!el) return;
  const { left, top, bottom, right } = el.style;
  el.innerHTML = renderOverlayHTML();
  el.style.left = left;
  el.style.top = top;
  el.style.bottom = bottom;
  el.style.right = right;
  bindOverlayEvents(el);
}
function bindOverlayEvents(el) {
  el.querySelector("[data-nc-close]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    destroyOverlay();
  });
  el.querySelectorAll(".nc-row[data-nc-section]").forEach((row2) => {
    row2.addEventListener("click", (e) => {
      e.stopPropagation();
      const section = row2.dataset.ncSection;
      openModal(section);
    });
  });
}
function openModal(section) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.id = MODAL_ID;
  backdrop.innerHTML = `<div class="nc-modal-box">${renderModalContent(section)}</div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  backdrop.querySelector(".nc-m-close")?.addEventListener("click", closeModal);
  document.addEventListener("keydown", onEscClose);
  if (section === "seo") {
    initSeoModal(backdrop);
  }
}
function closeModal() {
  document.getElementById(MODAL_ID)?.remove();
  document.removeEventListener("keydown", onEscClose);
}
function onEscClose(e) {
  if (e.key === "Escape") closeModal();
}
function renderModalContent(section) {
  switch (section) {
    case "fps":
      return modalFps();
    case "mem":
      return modalMem();
    case "dom":
      return modalDom();
    case "components":
      return modalComponents();
    case "paint":
      return modalPaint();
    case "routes":
      return modalRoutes();
    case "longtasks":
      return modalLongTasks();
    case "net":
      return modalNet();
    case "errors":
      return modalErrors();
    case "effectguards":
      return modalEffectGuards();
    case "conn":
      return modalConn();
    case "seo":
      return modalSeo();
    default:
      return `<div class="nc-m-title"><span>Dev</span><span class="nc-m-close">&#x2715;</span></div><p class="nc-m-empty">No data.</p>`;
  }
}
function modalHeader(title) {
  return `<div class="nc-m-title"><span>${title}</span><span class="nc-m-close">&#x2715;</span></div>`;
}
function kv(k, v) {
  return `<div class="nc-m-kv"><span class="k">${k}</span><span>${v}</span></div>`;
}
function sect(title, body) {
  return `<div class="nc-m-sect"><div class="nc-m-sect-title">${title}</div>${body}</div>`;
}
function modalFps() {
  const avg = state.fpsHistory.length ? Math.round(state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length) : state.fps;
  const min = state.fpsHistory.length ? Math.min(...state.fpsHistory) : state.fps;
  const max = state.fpsHistory.length ? Math.max(...state.fpsHistory) : state.fps;
  const drops = state.fpsHistory.filter((f) => f < 30).length;
  return modalHeader("FPS \u2014 Frame Rate") + sect("Current", kv("Live FPS", `<span style="color:${fpsColor(state.fps)}">${state.fps}</span>`) + kv("Average (30s)", `${avg}`) + kv("Min", `<span style="color:${fpsColor(min)}">${min}</span>`) + kv("Max", `${max}`) + kv("Drops < 30fps", drops > 0 ? `<span class="${drops > 5 ? "nc-warn" : "nc-caution"}">${drops} samples</span>` : '<span class="nc-muted">none</span>')) + sect("History (last 30s)", sparkline(state.fpsHistory, fpsColor(avg)));
}
function modalMem() {
  if (!performance.memory) {
    return modalHeader("Memory") + '<p class="nc-m-empty">memory API not available (Chrome only)</p>';
  }
  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
  const usedMb = usedJSHeapSize / (1024 * 1024);
  const totalMb = totalJSHeapSize / (1024 * 1024);
  const limitMb = jsHeapSizeLimit / (1024 * 1024);
  const pct = (usedMb / limitMb * 100).toFixed(1);
  const mc = memColor(usedMb, limitMb);
  return modalHeader("Memory \u2014 JS Heap") + sect("Heap", kv("Used", `<span style="color:${mc}">${usedMb.toFixed(2)} MB</span>`) + kv("Allocated", `${totalMb.toFixed(2)} MB`) + kv("Limit", `${limitMb.toFixed(0)} MB`) + kv("Usage %", `<span style="color:${mc}">${pct}%</span>`)) + sect("Trend (last 30s)", sparkline(state.memHistory));
}
function modalDom() {
  const deltaStr = state.domDelta !== 0 ? ` (${state.domDelta > 0 ? "+" : ""}${state.domDelta} since last route)` : "";
  const leakWarning = state.domDelta > 200 ? `<div style="color:#ff4444;margin-top:8px">Warning: large DOM growth after route change may indicate missing cleanup.</div>` : "";
  return modalHeader("DOM \u2014 Node Count") + sect("Snapshot", kv("Total nodes", `${state.domNodes}${deltaStr}`) + kv("Delta this route", state.domDelta > 0 ? `<span class="${state.domDelta > 100 ? "nc-warn" : "nc-caution"}">+${state.domDelta}</span>` : `<span class="nc-muted">${state.domDelta}</span>`)) + leakWarning + sect(
    "What to watch for",
    '<div style="color:rgba(0,255,136,0.45);font-size:10px;line-height:1.8">If DOM nodes grow after each navigation without returning to baseline,<br>check that your controller cleanup functions remove all injected HTML.<br>Also verify Shadow DOM components disconnect properly in onUnmount().</div>'
  );
}
function modalComponents() {
  const chips = state.componentList.length ? state.componentList.map((c) => `<span class="nc-chip">${c}</span>`).join("") : '<span class="nc-m-empty">no custom elements found</span>';
  return modalHeader("Components \u2014 Mounted Web Components") + sect("Stats", kv("Total mounted", `${state.componentCount}`)) + sect("Active components", chips);
}
function modalPaint() {
  return modalHeader("Paint Timing \u2014 FCP / LCP") + sect(
    "First Contentful Paint (FCP)",
    kv("Time", state.fcp > 0 ? `<span style="color:${msColor(state.fcp, 1800, 3e3)}">${formatMs(state.fcp)}</span>` : '<span class="nc-muted">--</span>') + kv("Rating", state.fcp === 0 ? "--" : state.fcp < 1800 ? '<span style="color:#00ff88">Good (&lt;1.8s)</span>' : state.fcp < 3e3 ? '<span class="nc-caution">Needs Improvement (1.8\u20133s)</span>' : '<span class="nc-warn">Poor (&gt;3s)</span>')
  ) + sect(
    "Largest Contentful Paint (LCP)",
    kv("Time", state.lcp > 0 ? `<span style="color:${msColor(state.lcp, 2500, 4e3)}">${formatMs(state.lcp)}</span>` : '<span class="nc-muted">--</span>') + kv("Rating", state.lcp === 0 ? "--" : state.lcp < 2500 ? '<span style="color:#00ff88">Good (&lt;2.5s)</span>' : state.lcp < 4e3 ? '<span class="nc-caution">Needs Improvement (2.5\u20134s)</span>' : '<span class="nc-warn">Poor (&gt;4s)</span>')
  );
}
function modalRoutes() {
  const rows = state.routeHistory.length ? state.routeHistory.map((r) => `<div class="nc-m-log-row" style="grid-template-columns:1fr auto auto">
                <span>${r.path}</span>
                <span style="color:${msColor(r.duration, 200, 600)}">${formatMs(r.duration)}</span>
                <span class="nc-m-ts">${formatTime(r.ts)}</span>
            </div>`).join("") : '<span class="nc-m-empty">no navigations yet</span>';
  return modalHeader("Route Navigation History") + sect("Last navigations (newest first)", rows);
}
function modalLongTasks() {
  const rows = state.longTaskLog.length ? state.longTaskLog.map((t) => `<div class="nc-m-log-row" style="grid-template-columns:1fr auto auto">
                <span style="color:#ffcc00">long task</span>
                <span style="color:${msColor(t.duration, 100, 200)}">${formatMs(t.duration)}</span>
                <span class="nc-m-ts">${formatTime(t.ts)}</span>
            </div>`).join("") : '<span class="nc-m-empty">no long tasks recorded (> 50ms)</span>';
  return modalHeader("Long Tasks \u2014 Main Thread Blocking") + sect(
    "Info",
    '<div style="color:rgba(0,255,136,0.45);font-size:10px;line-height:1.8">Tasks over 50ms block the main thread and cause jank.<br>Look for heavy loops, large DOM mutations, or synchronous XHR in controllers.</div>'
  ) + sect(`History (${state.longTaskLog.length} tasks)`, rows);
}
function modalNet() {
  const rows = state.apiLog.length ? state.apiLog.map((c) => {
    const sc = statusColor(c.status);
    return `<div class="nc-m-log-row" style="grid-template-columns:48px 1fr auto auto">
                <span style="color:rgba(0,255,136,0.5)">${c.method}</span>
                <span style="word-break:break-all">${c.url}</span>
                <span style="color:${sc}">${c.status || "ERR"}</span>
                <span class="nc-m-ts">${formatMs(c.duration)}</span>
            </div>`;
  }).join("") : '<span class="nc-m-empty">no fetch calls recorded</span>';
  return modalHeader("Network \u2014 Fetch Log") + sect(
    "Stats",
    kv("Pending fetches", state.pendingFetches > 0 ? `<span class="nc-caution">${state.pendingFetches}</span>` : '<span class="nc-muted">0</span>') + kv("Failed requests", state.netFailCount > 0 ? `<span class="nc-warn">${state.netFailCount}</span>` : '<span class="nc-muted">0</span>')
  ) + sect(`Last ${state.apiLog.length} calls`, rows);
}
function modalErrors() {
  const rows = state.consoleLog.length ? state.consoleLog.map((e) => `<div class="nc-m-log-row ${e.level} " style="grid-template-columns:1fr auto">
                <span style="word-break:break-all">${e.msg.slice(0, 200)}</span>
                <span class="nc-m-ts">${formatTime(e.ts)}</span>
            </div>`).join("") : '<span class="nc-m-empty">no errors or warnings</span>';
  return modalHeader("Errors & Warnings") + sect(
    "Summary",
    kv("Console errors", state.consoleErrors > 0 ? `<span class="nc-warn">${state.consoleErrors}</span>` : '<span class="nc-muted">0</span>') + kv("Unhandled rejections", state.unhandledRejections > 0 ? `<span class="nc-warn">${state.unhandledRejections}</span>` : '<span class="nc-muted">0</span>') + kv("Console warnings", state.consoleWarns > 0 ? `<span class="nc-caution">${state.consoleWarns}</span>` : '<span class="nc-muted">0</span>')
  ) + sect(`Log (last ${state.consoleLog.length})`, rows);
}
function modalEffectGuards() {
  const rows = state.effectGuardLog.length ? state.effectGuardLog.map((entry) => `<div class="nc-m-log-row" style="grid-template-columns:1fr auto auto">
                <span>threshold ${entry.threshold}</span>
                <span class="nc-warn">${entry.runs} runs</span>
                <span class="nc-m-ts">${formatTime(entry.ts)}</span>
            </div>`).join("") : '<span class="nc-m-empty">no effect loop-guard trips</span>';
  return modalHeader("Effect Loop Guard") + sect(
    "Summary",
    kv("Trips", state.effectGuardTrips > 0 ? `<span class="nc-warn">${state.effectGuardTrips}</span>` : '<span class="nc-muted">0</span>') + kv("Behavior", state.effectGuardTrips > 0 ? '<span class="nc-warn">effect was auto-disposed</span>' : '<span class="nc-muted">no trips recorded</span>')
  ) + sect(
    "What it means",
    '<div style="color:rgba(0,255,136,0.45);font-size:10px;line-height:1.8">An effect exceeded its max-runs-per-flush threshold and was disposed.<br>This usually means the effect writes to state it also depends on,<br>or two effects are ping-ponging values back and forth.</div>'
  ) + sect(`Trips (last ${state.effectGuardLog.length})`, rows);
}
function modalConn() {
  const conn = navigator.connection;
  if (!conn) {
    return modalHeader("Connection") + '<p class="nc-m-empty">Network Information API not available.</p>';
  }
  const typeColor = conn.effectiveType === "4g" ? "#00ff88" : conn.effectiveType === "3g" ? "#ffcc00" : "#ff4444";
  return modalHeader("Connection \u2014 Network Info") + sect(
    "Network Information API",
    kv("Effective type", `<span style="color:${typeColor}">${conn.effectiveType ?? "--"}</span>`) + kv("Downlink", conn.downlink != null ? `${conn.downlink} Mbps` : "--") + kv("RTT", conn.rtt != null ? `${conn.rtt} ms` : "--") + kv("Save-data mode", conn.saveData ? '<span class="nc-caution">enabled</span>' : '<span class="nc-muted">off</span>')
  );
}
function modalSeo() {
  const sc = seoScoreColor(state.seoScore);
  const chips = state.seoChecks.map((c) => {
    const cls = c.status === "good" ? "" : c.status === "warn" ? "warn" : "bad";
    return `<span class="nc-chip ${cls}">${escapeModalText(c.label)} ${c.points}/${c.maxPoints}</span>`;
  }).join("");
  const issueRows = state.seoChecks.map((c) => {
    const col = c.status === "good" ? "#00ff88" : c.status === "warn" ? "#ffcc00" : "#ff4444";
    return `<div class="nc-m-kv" style="align-items:flex-start"><span class="k" style="color:${col}">${escapeModalText(c.label)}</span><span style="text-align:right;max-width:72%;word-break:break-word">${escapeModalText(c.detail)}</span></div>`;
  }).join("");
  const formRows = state.seoInputs.map((row2, i) => {
    const id = `nc-seo-in-${i}`;
    return `<div class="nc-m-seo-field"><label class="nc-m-seo-label" for="${id}">${escapeModalText(row2.label)}</label><textarea id="${id}" class="nc-m-textarea" rows="2" placeholder="${escapeModalText(row2.hint)}">${escapeModalText(row2.value)}</textarea></div>`;
  }).join("");
  const actions = state.seoInputs.length > 0 ? `<div class="nc-m-btn-row"><button type="button" class="nc-m-btn nc-m-btn-primary" id="nc-seo-apply">Apply to source</button><button type="button" class="nc-m-btn" id="nc-seo-rescan">Rescan</button></div>` : `<div class="nc-m-btn-row"><button type="button" class="nc-m-btn" id="nc-seo-rescan">Rescan</button></div>`;
  const note = '<p class="nc-m-seo-note">Applies edits through the dev server (like the component editor &quot;Apply Changes&quot;): index.html for head tags, and the mapped view HTML file for H1 / image alt. Unknown routes must be added to resolveViewHtmlPath in server.js.</p>';
  return modalHeader("SEO \u2014 Page scan") + sect("Score", `<div style="font-size:26px;font-weight:bold;color:${sc};margin-bottom:8px">${state.seoScore}<span style="color:rgba(0,255,136,0.35)">/100</span></div><div>${chips}</div>`) + sect("Checks", issueRows || '<span class="nc-m-empty">No data</span>') + sect("Edit & apply to project files", (formRows || "") + actions + note);
}
async function submitSeoPatches(backdrop) {
  const textareas = backdrop.querySelectorAll(".nc-m-textarea");
  const head = {};
  const view = { imageAlts: [] };
  textareas.forEach((el, i) => {
    const row2 = state.seoInputs[i];
    if (!row2) return;
    const v = el.value.trim();
    if (!v) return;
    if (row2.group === "head") {
      head[row2.key] = v;
    } else if (row2.group === "view" && row2.key === "firstH1") {
      view.firstH1 = v;
    } else if (row2.group === "img" && row2.imgSrcContains) {
      view.imageAlts.push({ srcContains: row2.imgSrcContains, alt: v });
    }
  });
  const payload = { viewPath: window.location.pathname };
  if (Object.keys(head).length) payload.head = head;
  if (view.firstH1 || view.imageAlts.length) {
    payload.view = {
      ...view.firstH1 ? { firstH1: view.firstH1 } : {},
      imageAlts: view.imageAlts
    };
  }
  if (!payload.head && !payload.view) {
    alert("Enter at least one value to apply, or fix issues manually in the repo.");
    return;
  }
  try {
    const res = await fetch("/api/dev/seo/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Save failed: ${data.message || res.statusText}`);
      return;
    }
    closeModal();
  } catch (e) {
    alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
function initSeoModal(backdrop) {
  const apply = backdrop.querySelector("#nc-seo-apply");
  apply?.addEventListener("click", (e) => {
    e.stopPropagation();
    void submitSeoPatches(backdrop);
  });
  backdrop.querySelector("#nc-seo-rescan")?.addEventListener("click", (e) => {
    e.stopPropagation();
    runSeoScan();
    updateOverlay();
    closeModal();
    openModal("seo");
  });
}
function makeDraggable(el) {
  let dragging = false;
  let startX = 0, startY = 0, origLeft = 0, origTop = 0;
  el.addEventListener("mousedown", (e) => {
    const t = e.target;
    if (t.dataset.ncClose || t.classList.contains("nc-row")) return;
    dragging = true;
    const rect = el.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    origLeft = rect.left;
    origTop = rect.top;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    el.style.left = `${origLeft + (e.clientX - startX)}px`;
    el.style.top = `${origTop + (e.clientY - startY)}px`;
    el.style.bottom = "auto";
    el.style.right = "auto";
  });
  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}
function destroyOverlay() {
  if (fpsFrameId !== null) {
    cancelAnimationFrame(fpsFrameId);
    fpsFrameId = null;
  }
  longTaskObserver?.disconnect();
  paintObserver?.disconnect();
  lcpObserver?.disconnect();
  closeModal();
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
function isDevModeOn() {
  try {
    return localStorage.getItem(DEV_VISIBLE_KEY) === "true";
  } catch {
    return false;
  }
}
function showOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  injectStyles();
  snapshotDom();
  snapshotComponents();
  runSeoScan();
  domBaselineNodes = state.domNodes;
  createOverlay();
  startFpsLoop();
}
function hideOverlay() {
  if (fpsFrameId !== null) {
    cancelAnimationFrame(fpsFrameId);
    fpsFrameId = null;
  }
  closeModal();
  document.getElementById(OVERLAY_ID)?.remove();
}
function initDevOverlay() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const start = () => {
    patchConsole();
    patchFetch();
    observeRejections();
    observeEffectLoopGuards();
    observePaintMetrics();
    observeRouteChanges();
    if (isDevModeOn()) {
      showOverlay();
    }
    document.addEventListener("nc-devtools-visibility", (e) => {
      const visible = e.detail.visible;
      if (visible) {
        showOverlay();
      } else {
        hideOverlay();
      }
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
  setTimeout(() => {
    runSeoScan();
    if (document.getElementById(OVERLAY_ID)) updateOverlay();
  }, 0);
}
export {
  initDevOverlay
};
