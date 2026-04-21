/**
 * Prepare a deployment directory (_deploy/) that mirrors the static
 * hosting structure expected by Cloudflare Pages and other file-based
 * deploy targets.
 *
 * Expected runtime paths the HTML shells reference:
 *   /dist/app.js           - compiled JS (module entry)
 *   /src/styles/*.css       - stylesheets
 *   /src/views/**\/*.html   - view partials loaded by the router
 *   /docs/*.md              - markdown consumed by the docs controller
 *   /manifest.json, /robots.txt, /sitemap.xml, etc.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const distDir = path.join(rootDir, 'dist');
const deployDir = path.join(rootDir, '_deploy');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
    ensureDir(dirPath);
}

function copyFile(sourcePath, destinationPath) {
    if (!fs.existsSync(sourcePath)) {
        return;
    }

    ensureDir(path.dirname(destinationPath));
    fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectory(sourceDir, destinationDir, filter) {
    if (!fs.existsSync(sourceDir)) {
        return;
    }

    ensureDir(destinationDir);

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destinationPath = path.join(destinationDir, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(sourcePath, destinationPath, filter);
        } else if (!filter || filter(entry.name)) {
            copyFile(sourcePath, destinationPath);
        }
    }
}

/** Only compiled JS/JSON output — skip .d.ts, sourcemaps, and build info. */
function isCompiledJS(name) {
    if (name === '.tsbuildinfo') return false;
    if (name.endsWith('.d.ts')) return false;
    if (name.endsWith('.d.ts.map')) return false;
    if (name.endsWith('.js.map')) return false;
    return true;
}

function prepareDeployDirectory() {
    cleanDir(deployDir);

    // ---------------------------------------------------------------
    // 1. HTML shells (version-injected by inject-version.mjs earlier)
    // ---------------------------------------------------------------
    copyFile(path.join(rootDir, 'index.html'), path.join(deployDir, 'index.html'));
    copyFile(path.join(rootDir, 'manifest.json'), path.join(deployDir, 'manifest.json'));

    // ---------------------------------------------------------------
    // 2. Compiled JS → _deploy/dist/  (matches runtime /dist/app.js)
    // ---------------------------------------------------------------
    const jsDeployDir = path.join(deployDir, 'dist');

    for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
        const sourcePath = path.join(distDir, entry.name);
        const destPath = path.join(jsDeployDir, entry.name);

        // Skip non-JS artefacts that may exist at the dist root (legacy or dev builds).
        // NOTE: 'src' must NOT be skipped — compiled app JS lives at dist/src/app.js
        // and the browser fetches it as /dist/src/app.js, /dist/src/components/... etc.
        if (['docs', 'bot', 'index.html', 'manifest.json',
             'robots.txt', 'sitemap.xml', '.well-known'].includes(entry.name)) {
            continue;
        }

        if (entry.isDirectory()) {
            copyDirectory(sourcePath, destPath, isCompiledJS);
        } else if (isCompiledJS(entry.name)) {
            copyFile(sourcePath, destPath);
        }
    }

    // ---------------------------------------------------------------
    // 3. CSS → _deploy/src/styles/  (matches runtime /src/styles/)
    // ---------------------------------------------------------------
    copyDirectory(
        path.join(rootDir, 'src', 'styles'),
        path.join(deployDir, 'src', 'styles')
    );

    // ---------------------------------------------------------------
    // 4. View partials → _deploy/src/views/  (matches runtime /src/views/)
    // ---------------------------------------------------------------
    copyDirectory(
        path.join(rootDir, 'src', 'views'),
        path.join(deployDir, 'src', 'views')
    );

    // ---------------------------------------------------------------
    // 5. Docs markdown → _deploy/docs/
    // ---------------------------------------------------------------
    copyFile(
        path.join(rootDir, 'docs', 'NATIVECORE_EBOOK.md'),
        path.join(deployDir, 'docs', 'NATIVECORE_EBOOK.md')
    );

    // ---------------------------------------------------------------
    // 6. Public static assets → _deploy/ root (robots.txt, etc.)
    // ---------------------------------------------------------------
    copyDirectory(path.join(rootDir, 'public'), deployDir);

    console.log('Deployment directory prepared: _deploy/');
}

prepareDeployDirectory();
