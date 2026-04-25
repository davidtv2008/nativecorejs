/**
 * Static Site Generation (SSG)
 *
 * Renders every public route at build time and writes hydration-ready HTML to
 * _deploy/<route>/index.html so that Cloudflare Pages, S3+CloudFront, Netlify
 * static, and any other static-file host can serve a fully pre-rendered page on
 * first request.
 *
 * Key differences from the older build-for-bots.mjs:
 *  • Routes are read automatically from src/routes/routes.(ts|js) — no hardcoded list.
 *  • Protected routes and dynamic routes (:param, *) are skipped.
 *  • The app.js <script> is KEPT so the page hydrates in the browser.
 *  • Pre-rendered HTML is written to _deploy/ (not dist/bot/).
 *  • A sitemap.xml is generated / updated inside _deploy/.
 *  • The dev server is started automatically if not already running, and is
 *    stopped when SSG finishes (unless it was already running before).
 *
 * Usage:
 *   node .nativecore/scripts/ssg.mjs           # interactive prompt
 *   node .nativecore/scripts/ssg.mjs --yes     # always run (CI / build:ssg)
 *   node .nativecore/scripts/ssg.mjs --no      # skip silently
 *   BOT_BUILD=always npm run build:ssg         # env-var override
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const deployDir = path.join(rootDir, '_deploy');
let useTypeScript = true;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === false) useTypeScript = false;
} catch { /* default to TypeScript */ }
const routesPath = path.join(rootDir, 'src', 'routes', `routes.${useTypeScript ? 'ts' : 'js'}`);

const SERVER_PORT = 8000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const RENDER_TIMEOUT = 30_000;
const RENDER_SETTLE_MS = 800;

// ---------------------------------------------------------------------------
// Route extraction (mirrors generate-route-redirects.mjs)
// ---------------------------------------------------------------------------

function readRoutesSource() {
    if (!fs.existsSync(routesPath)) {
        return null;
    }
    return fs.readFileSync(routesPath, 'utf8');
}

function extractRegisteredRoutes(src) {
    return Array.from(src.matchAll(/\.register\(\s*['"]([^'"]+)['"]/g), m => m[1]);
}

function extractProtectedRoutes(src) {
    const match = src.match(/export const protectedRoutes\s*=\s*\[(.*?)\]/s);
    if (!match) return [];
    return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g), m => m[1]);
}

/** Returns only the static, public routes eligible for SSG pre-rendering. */
function resolvePublicRoutes(src) {
    const all = extractRegisteredRoutes(src);
    const protected_ = new Set(extractProtectedRoutes(src));
    return all.filter(route => {
        if (protected_.has(route)) return false;           // protected — skip
        if (route.includes(':') || route.includes('*')) return false; // dynamic — skip
        return true;
    });
}

// ---------------------------------------------------------------------------
// HTML sanitisation for SSG output
// ---------------------------------------------------------------------------

/**
 * Clean up the Puppeteer-captured HTML for use as a static page.
 *
 * KEPT (required for client-side hydration):
 *   • The <script type="module"> that imports app.js
 *   • All <link> stylesheet / modulepreload tags written to the DOM
 *
 * REMOVED (development / runtime artifacts):
 *   • The document.write IIFE that injects CSS/preload links at runtime
 *     (they already ran; keeping it would duplicate the tags on reload)
 *   • The data-public-route "pending" flash-prevention inline script
 *   • The HMR WebSocket script (ws.js / hmr.js)
 *   • Cloudflare analytics beacon script
 *
 * REPLACED:
 *   • data-public-route="pending" → "ready" (page is already rendered)
 */
function sanitizeSsgHtml(html) {
    return html
        // Mark page as already rendered — no FOUC flash
        .replace(/data-public-route="pending"/g, 'data-public-route="ready"')

        // Remove the flash-prevention / pageloaded inline script
        .replace(
            /<script>\s*\(function\(\)\s*\{[\s\S]*?document\.documentElement\.setAttribute\('data-public-route'[\s\S]*?\}\)\(\);\s*<\/script>/,
            ''
        )

        // Remove the document.write IIFE for CSS / modulepreload links
        // (the links are already in the DOM; this script would duplicate them)
        .replace(
            /<script>\s*\(function\(\)\s*\{[\s\S]*?document\.write\([\s\S]*?modulePreloads[\s\S]*?\}\)\(\);\s*<\/script>/,
            ''
        )

        // Remove HMR / dev-tools WebSocket loader (any script whose src contains hmr or ws)
        .replace(/<script[^>]+src="[^"]*(?:hmr|\/ws\.js)[^"]*"[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<script[^>]+src="[^"]*(?:hmr|\/ws\.js)[^"]*"[^>]* ?\/?>/g, '')

        // Remove Cloudflare Insights beacon
        .replace(/<script[^>]+src="https:\/\/static\.cloudflareinsights\.com\/beacon[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<script[^>]+src="https:\/\/static\.cloudflareinsights\.com\/beacon[^>]* ?\/?>/g, '')

        // Swap nc-error-boundary mode="dev" → mode="production"
        .replace(/(<nc-error-boundary\b[^>]*)\bmode="dev"([^>]*>)/g, '$1mode="production"$2')

        // Remove <!-- DEnc-ONLY-START --> ... <!-- DEnc-ONLY-END --> dev blocks
        .replace(/<!-- DEnc-ONLY-START -->[\s\S]*?<!-- DEnc-ONLY-END -->/g, '');
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

async function isServerReady() {
    try {
        const res = await fetch(SERVER_URL, { signal: AbortSignal.timeout(2000) });
        return res.ok || res.status < 500;
    } catch {
        return false;
    }
}

async function startServer() {
    return new Promise((resolve, reject) => {
        const child = spawn('node', ['server.js'], {
            cwd: rootDir,
            detached: false,
            stdio: 'ignore',
            shell: process.platform === 'win32'
        });

        child.on('error', err => reject(new Error(`Could not start server: ${err.message}`)));

        let attempts = 0;
        const maxAttempts = 30;
        const interval = setInterval(async () => {
            attempts++;
            if (await isServerReady()) {
                clearInterval(interval);
                resolve(child);
                return;
            }
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                child.kill();
                reject(new Error('Server did not become ready within 30 seconds'));
            }
        }, 1000);
    });
}

// ---------------------------------------------------------------------------
// Sitemap generation
// ---------------------------------------------------------------------------

function buildSitemapXml(routes, baseUrl) {
    const buildDate = new Date().toISOString().slice(0, 10);
    const urls = routes.map(route => {
        const loc = route === '/' ? baseUrl + '/' : `${baseUrl}${route}`;
        const priority = route === '/' ? '1.0' : '0.8';
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${buildDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function extractBaseUrl() {
    // Prefer canonical URL from index.html; fall back to a sensible default.
    const indexHtml = path.join(rootDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
        const src = fs.readFileSync(indexHtml, 'utf8');
        const m = src.match(/<link rel="canonical" href="([^"]+)"/);
        if (m) {
            try {
                const u = new URL(m[1]);
                return u.origin;
            } catch {
                // fall through
            }
        }
    }
    return 'https://yourdomain.com';
}

// ---------------------------------------------------------------------------
// Mode resolution (mirrors prompt-bot-build.mjs)
// ---------------------------------------------------------------------------

function resolveMode() {
    const args = new Set(process.argv.slice(2));
    if (args.has('--yes')) return 'always';
    if (args.has('--no')) return 'never';

    const env = (process.env.BOT_BUILD || '').toLowerCase().trim();
    if (['y', 'yes', 'true', '1', 'always'].includes(env)) return 'always';
    if (['n', 'no', 'false', '0', 'never', 'skip'].includes(env)) return 'never';

    if (process.env.CI || !process.stdin.isTTY || !process.stdout.isTTY) return 'never';
    return 'prompt';
}

async function askUser() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question('Pre-render pages for SEO (SSG)? (y/N): ', answer => {
            rl.close();
            const a = answer.toLowerCase().trim();
            resolve(a === 'y' || a === 'yes');
        });
    });
}

// ---------------------------------------------------------------------------
// Core SSG render loop
// ---------------------------------------------------------------------------

async function runSsg(routes) {
    if (!fs.existsSync(deployDir)) {
        throw new Error(
            `_deploy/ directory not found. Run \`npm run build\` before \`npm run build:ssg\`.`
        );
    }

    const alreadyRunning = await isServerReady();
    let serverChild = null;

    if (!alreadyRunning) {
        console.log('🚀 Starting dev server...');
        try {
            serverChild = await startServer();
            console.log('✅ Server ready\n');
        } catch (err) {
            throw new Error(`Failed to start server: ${err.message}`);
        }
    } else {
        console.log('✅ Server already running\n');
    }

    let browser;
    const renderedRoutes = [];

    try {
        console.log('🌐 Launching headless browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        for (const route of routes) {
            process.stdout.write(`  📄 ${route} ... `);
            try {
                await page.goto(`${SERVER_URL}${route}`, {
                    waitUntil: 'networkidle0',
                    timeout: RENDER_TIMEOUT
                });
                await new Promise(r => setTimeout(r, RENDER_SETTLE_MS));

                const rawHtml = await page.content();
                const html = sanitizeSsgHtml(rawHtml);

                const outPath = route === '/'
                    ? path.join(deployDir, 'index.html')
                    : path.join(deployDir, route.replace(/^\//, ''), 'index.html');

                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, html, 'utf8');

                renderedRoutes.push(route);
                console.log('✓');
            } catch (err) {
                console.log(`✗  (${err.message})`);
            }
        }

        // Write sitemap
        if (renderedRoutes.length > 0) {
            const baseUrl = extractBaseUrl();
            const sitemapXml = buildSitemapXml(renderedRoutes, baseUrl);
            const sitemapPath = path.join(deployDir, 'sitemap.xml');
            fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
            console.log(`\n🗺️  Sitemap written → _deploy/sitemap.xml`);
        }

        console.log(`\n✨ SSG complete — ${renderedRoutes.length} route(s) pre-rendered in _deploy/`);
        console.log('🚀 _deploy/ is ready for Cloudflare Pages, S3+CloudFront, or Netlify\n');
    } finally {
        if (browser) await browser.close();
        if (serverChild) {
            serverChild.kill();
        }
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
    const mode = resolveMode();

    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║  🏗️  NativeCoreJS Static Site Generation (SSG)   ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    let shouldRun = false;
    if (mode === 'always') {
        shouldRun = true;
    } else if (mode === 'never') {
        console.log('⏭️  Skipping SSG (--no / BOT_BUILD=never)\n');
        process.exit(0);
    } else {
        console.log('Pre-rendering routes writes ready-to-deploy HTML into _deploy/.');
        console.log('This makes the app deployable to Cloudflare Pages, S3+CloudFront, and Netlify.\n');
        shouldRun = await askUser();
    }

    if (!shouldRun) {
        console.log('\n⏭️  Skipping SSG. Run `npm run build:ssg` anytime to pre-render.\n');
        process.exit(0);
    }

    const src = readRoutesSource();
    if (!src) {
        console.error(`❌ Could not read ${routesPath}`);
        process.exit(1);
    }

    const routes = resolvePublicRoutes(src);
    if (routes.length === 0) {
        console.log('ℹ️  No public static routes found in routes file — nothing to pre-render.\n');
        process.exit(0);
    }

    console.log(`📋 Routes to pre-render: ${routes.join(', ')}\n`);

    try {
        await runSsg(routes);
    } catch (err) {
        console.error('\n❌ SSG failed:', err.message);
        process.exit(1);
    }
})();
