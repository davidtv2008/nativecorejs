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
import * as esbuild from 'esbuild';

const __filename
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

async function copyAndMinifyCSSDirectory(sourceDir, destinationDir) {
    if (!fs.existsSync(sourceDir)) {
        return;
    }

    ensureDir(destinationDir);

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destinationPath = path.join(destinationDir, entry.name);

        if (entry.isDirectory()) {
            await copyAndMinifyCSSDirectory(sourcePath, destinationPath);
        } else if (entry.name.endsWith('.css')) {
            try {
                const code = fs.readFileSync(sourcePath, 'utf8');
                const result = await esbuild.transform(code, { loader: 'css', minify: true });
                fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
                fs.writeFileSync(destinationPath, result.code, 'utf8');
                const savings = ((1 - result.code.length / code.length) * 100).toFixed(1);
                console.log(`  ✓ CSS minified: ${entry.name} (${savings}% smaller)`);
            } catch (err) {
                console.warn(`  ⚠ CSS minify failed for ${entry.name}, copying as-is: ${err.message}`);
                copyFile(sourcePath, destinationPath);
            }
        } else {
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

/**
 * Detect bare specifier imports in a JS file (imports that don't start
 * with '.', '/', or a known protocol). These are npm package references
 * that the browser can't resolve without a bundler or import map.
 */
function hasBareSpecifierImports(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        return /(?:from|import)\s*["'](?![./\/]|https?:|node:)([^"']+)["']/m.test(code);
    } catch {
        return false;
    }
}

/**
 * Walk a directory and return all .js files that contain bare specifier imports.
 */
function collectFilesWithNpmImports(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectFilesWithNpmImports(full, results);
        } else if (entry.name.endsWith('.js') && hasBareSpecifierImports(full)) {
            results.push(full);
        }
    }
    return results;
}

/**
 * For each deployed JS file that imports npm packages, re-bundle it with
 * esbuild bundle:true so the npm deps are inlined. The framework's own
 * relative imports (other dist/ files) are marked external so the
 * unbundled module graph is preserved — only the npm packages get inlined.
 */
async function bundleNpmDeps(jsDeployDir) {
    const filesWithNpm = collectFilesWithNpmImports(jsDeployDir);
    if (filesWithNpm.length === 0) return;

    console.log(`\n📦 Bundling npm dependencies into ${filesWithNpm.length} file${filesWithNpm.length === 1 ? '' : 's'}...`);

    for (const filePath of filesWithNpm) {
        try {
            const code = fs.readFileSync(filePath, 'utf8');

            // Collect all import specifiers that are relative (keep those external)
            const relativeImports = [];
            const allImports = code.matchAll(/(?:from|import)\s*["']([^"']+)["']/g);
            for (const [, spec] of allImports) {
                if (spec.startsWith('.') || spec.startsWith('/')) {
                    relativeImports.push(spec);
                }
            }

            await esbuild.build({
                entryPoints:    [filePath],
                bundle:         true,
                format:         'esm',
                platform:       'browser',
                outfile:        filePath,
                allowOverwrite: true,
                // Keep relative imports external — only npm bare specifiers get inlined
                external:       relativeImports,
                logLevel:       'silent',
            });

            const rel = path.relative(deployDir, filePath).replace(/\\/g, '/');
            console.log(`  bundled: ${rel}`);
        } catch (err) {
            const rel = path.relative(deployDir, filePath).replace(/\\/g, '/');
            console.warn(`  warning: could not bundle npm deps in ${rel}: ${err.message}`);
        }
    }
}

async function prepareDeployDirectory() {
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
    // 3. CSS → _deploy/src/styles/ — minified via esbuild at copy time
    // ---------------------------------------------------------------
    console.log('\n🗜️  Minifying CSS files...');
    await copyAndMinifyCSSDirectory(
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
    // 6. Public static assets → _deploy/ root (robots.txt, _headers, etc.)
    // ---------------------------------------------------------------
    copyDirectory(path.join(rootDir, 'public'), deployDir);

    // ---------------------------------------------------------------
    // 7. Bundle npm deps inline for production (no node_modules on server)
    //    Any deployed JS file that imports an npm package gets re-bundled
    //    with esbuild so the dependency is inlined. Framework relative
    //    imports remain as-is, preserving the unbundled module graph.
    // ---------------------------------------------------------------
    const jsDeployDir = path.join(deployDir, 'dist');
    await bundleNpmDeps(jsDeployDir);

    console.log('\nDeployment directory prepared: _deploy/');
}

prepareDeployDirectory().catch(err => {
    console.error('prepare-static-assets failed:', err);
    process.exit(1);
});
