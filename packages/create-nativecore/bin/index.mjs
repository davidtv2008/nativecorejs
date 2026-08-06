#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import ts from 'typescript';

const cliArgs = process.argv.slice(2);
const rl = createInterface({ input, output });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.resolve(__dirname, '../template');

function hasFlag(flag) {
    return cliArgs.includes(flag);
}

function getFlagValue(flag) {
    const idx = cliArgs.indexOf(flag);
    if (idx === -1) return null;
    const val = cliArgs[idx + 1];
    return val && !val.startsWith('--') ? val : null;
}

function toKebabCase(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function toTitleCase(value) {
    return value
        .split(/[-\s]/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function resolveTargetDir(projectInput) {
    const outDir = getFlagValue('--out-dir');
    if (outDir) return path.resolve(process.cwd(), outDir);

    // If the positional value looks like a path, treat it as a target directory.
    const looksLikePath = path.isAbsolute(projectInput) || /[\\/]/.test(projectInput);
    if (looksLikePath) return path.resolve(process.cwd(), projectInput);

    // Otherwise, use a sanitized project-name folder under the current working dir.
    return path.resolve(process.cwd(), toKebabCase(projectInput));
}

async function ask(question, fallback = '') {
    const suffix = fallback ? ` (${fallback})` : '';
    const answer = await rl.question(`${question}${suffix}: `);
    return answer.trim() || fallback;
}

async function askYesNo(question, defaultYes = true) {
    const fallback = defaultYes ? 'y' : 'n';
    const answer = (await ask(question, fallback)).toLowerCase();
    return answer === 'y' || answer === 'yes';
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function writeFile(filePath, content) {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
}

async function removeIfExists(targetPath) {
    await fs.rm(targetPath, { recursive: true, force: true });
}

async function replaceInFile(filePath, transform) {
    const existing = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(filePath, transform(existing), 'utf8');
}

/**
 * Use TypeScript transpilation to strip TS syntax from source.
 * Returns plain JavaScript with all type annotations removed.
 */
async function stripTypeScript(source) {
    const result = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            removeComments: false,
            sourceMap: false,
        }
    });
    return result.outputText;
}

/**
 * Walk targetDir, strip every .ts file → .js, remove every .d.ts file.
 * Skips node_modules and dist directories.
 */
async function stripAllTypeScript(targetDir) {
    async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === 'dist') continue;
                await walk(fullPath);
            } else if (entry.isFile()) {
                if (entry.name.endsWith('.d.ts')) {
                    await fs.rm(fullPath);
                } else if (entry.name.endsWith('.ts')) {
                    const source = await fs.readFile(fullPath, 'utf8');
                    const stripped = await stripTypeScript(source);
                    const jsPath = fullPath.slice(0, -3) + '.js';
                    await fs.writeFile(jsPath, stripped, 'utf8');
                    await fs.rm(fullPath);
                }
            }
        }
    }
    await walk(targetDir);
}

async function installDependencies(targetDir) {
    await new Promise((resolve, reject) => {
        const child = spawn('npm', ['install'], {
            cwd: targetDir,
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });

        child.on('error', reject);
        child.on('exit', code => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`npm install failed with exit code ${code ?? 'unknown'}`));
        });
    });
}

function packageJsonTemplate(config) {
    const scripts = {
        prestart: 'npm run compile && node .nativecore/scripts/inject-version.mjs',
        start: 'node server.js',
        validate: config.useTypeScript
            ? 'npm run typecheck && npm run build:client && npm run test -- --run'
            : 'npm run build:client && npm run test -- --run',
        dev: 'npm run compile && node .nativecore/scripts/inject-version.mjs && node .nativecore/scripts/sync-importmap.mjs && concurrently --kill-others --names "watch,server" -c "blue,green" "node .nativecore/scripts/watch-compile.mjs" "node server.js"',
        'dev:watch': 'node .nativecore/scripts/watch-compile.mjs',
        clean: 'node -e "const fs=require(\'fs\'); fs.rmSync(\'dist\',{recursive:true,force:true}); fs.rmSync(\'_deploy\',{recursive:true,force:true})"',
        prebuild: config.useTypeScript
            ? 'npm run clean && npm run lint && npm run typecheck'
            : 'npm run clean && npm run lint',
        build: 'node .nativecore/scripts/inject-version.mjs && npm run compile:prod && node .nativecore/scripts/minify.mjs && node .nativecore/scripts/prepare-static-assets.mjs && node .nativecore/scripts/strip-dev-blocks.mjs && node .nativecore/scripts/remove-dev.mjs',
        'build:client': 'node .nativecore/scripts/inject-version.mjs && npm run compile:prod && node .nativecore/scripts/minify.mjs && node .nativecore/scripts/prepare-static-assets.mjs',
        'build:ssg': 'node .nativecore/scripts/ssg.mjs --yes',
        'build:full': 'npm run build && npm run build:ssg',
        compile: 'node .nativecore/scripts/watch-compile.mjs --once && node .nativecore/scripts/bundle-css.mjs && node .nativecore/scripts/sync-importmap.mjs',
        'bundle:css': 'node .nativecore/scripts/bundle-css.mjs',
        'sync:importmap': 'node .nativecore/scripts/sync-importmap.mjs',
        'compile:prod': 'node .nativecore/scripts/watch-compile.mjs --once && node .nativecore/scripts/bundle-css.mjs && node .nativecore/scripts/remove-dev.mjs',
        'make:component': 'node .nativecore/scripts/make-component.mjs',
        'make:core-component': 'node .nativecore/scripts/make-core-component.mjs',
        'make:controller': 'node .nativecore/scripts/make-controller.mjs',
        'make:store': 'node .nativecore/scripts/make-store.mjs',
        'remove:component': 'node .nativecore/scripts/remove-component.mjs',
        'remove:core-component': 'node .nativecore/scripts/remove-core-component.mjs',
        'make:view': 'node .nativecore/scripts/make-view.mjs',
        'make:page': 'node .nativecore/scripts/make-view.mjs',
        'make:middleware': 'node .nativecore/scripts/make-middleware.mjs',
        'remove:view': 'node .nativecore/scripts/remove-view.mjs',
        test: 'vitest',
        'test:ui': 'vitest --ui',
        'test:coverage': 'vitest --coverage',
        lint: config.useTypeScript
            ? 'eslint src/**/*.ts && htmlhint "**/*.html" --config .htmlhintrc'
            : 'eslint "src/**/*.js" && htmlhint "**/*.html" --config .htmlhintrc',
        'lint:fix': config.useTypeScript
            ? 'eslint src/**/*.ts --fix'
            : 'eslint "src/**/*.js" --fix',
    };

    if (config.useTypeScript) {
        scripts['typecheck'] = 'tsc --noEmit';
    }

    if (config.includeCapacitor) {
        scripts['cap:sync'] = 'npm run build:client && npx cap sync';
        scripts['cap:android'] = 'npm run cap:sync && npx cap open android';
        scripts['cap:ios'] = 'npm run cap:sync && npx cap open ios';
        scripts['cap:add:android'] = 'npx cap add android && node .nativecore/scripts/patch-android-assets.mjs';
        scripts['cap:add:ios'] = 'npx cap add ios';
        scripts['cap:run:android'] = 'npm run cap:sync && npx cap run android';
        scripts['cap:run:ios'] = 'npm run cap:sync && npx cap run ios';
    } else {
        // Even without --capacitor, expose a cap:init script so users can add Capacitor later
        // without being tripped up by the interactive web-dir prompt defaulting to "www".
        scripts['cap:init'] = `npx cap init "${config.projectTitle}" com.example.${config.projectName.replace(/-/g, '')} --web-dir _deploy`;
    }

    const devDependencies = {
        'esbuild': '^0.25.0',
        '@eslint/js': '^9.39.2',
        'concurrently': '^9.2.1',
        'eslint': '^9.39.2',
        'globals': '^17.0.0',
        'happy-dom': '^20.8.9',
        'htmlhint': '^1.1.4',
        'puppeteer': '^24.36.0',
        'terser': '^5.46.0',
        'vitest': '^4.1.4',
        'ws': '^8.19.0'
    };

    if (config.useTypeScript) {
        devDependencies['@types/node'] = '^20.11.0';
        devDependencies['ts-lit-plugin'] = '^2.0.2';
        devDependencies['typescript'] = '^5.3.3';
        devDependencies['typescript-eslint'] = '^8.53.1';
    }

    const result = {
        name: config.projectName,
        version: '0.1.0',
        description: `${config.projectTitle} built with NativeCore`,
        type: 'module',
        main: 'server.js',
        scripts,
        keywords: ['nativecore', 'spa', 'web-components', config.useTypeScript ? 'typescript' : 'javascript'],
        license: 'MIT',
        devDependencies
    };

    if (config.includeCapacitor) {
        result.dependencies = {
            '@capacitor/core': '^8.3.1'
        };
        devDependencies['@capacitor/cli'] = '^8.3.1';
        devDependencies['@capacitor/android'] = '^8.3.1';
        devDependencies['@capacitor/ios'] = '^8.3.1';
    }

    return JSON.stringify(result, null, 2) + '\n';
}

function capacitorConfigTemplate(config) {
    const appId = `com.example.${config.projectName.replace(/-/g, '')}`;
    if (config.useTypeScript) {
        return `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: '${appId}',
    appName: '${config.projectTitle}',
    webDir: '_deploy',
    server: {
        androidScheme: 'https'
    }
};

export default config;
`;
    }
    return `/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
    appId: '${appId}',
    appName: '${config.projectTitle}',
    webDir: '_deploy',
    server: {
        androidScheme: 'https'
    }
};

module.exports = config;
`;
}

function nativecoreConfigTemplate(config) {
    return JSON.stringify({
        appName: config.projectTitle,
        packageManager: 'npm',
        useTypeScript: config.useTypeScript,
        features: {
            auth: false,
            dashboard: false,
            devTools: true,
            hmr: true,
            mockApi: true,
            capacitor: config.includeCapacitor
        }
    }, null, 2) + '\n';
}

function routesTemplate(config) {
    const isTs = config.useTypeScript;
    const typeImport = isTs ? "import type { Router } from '@core/router.js';\n" : '';
    const signature = isTs ? 'export function registerRoutes(r: Router): void' : 'export function registerRoutes(r)';

    return `/**
 * Route Configuration
 */
import { createLazyController } from '@core/lazyController.js';
${typeImport}
const lazyController = createLazyController(import.meta.url);

${signature} {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });
    });

    // Protected routes — start with no middleware tags; after npm run make:middleware,
    // change middleware: [] to e.g. middleware: ['auth'] and register it in app.${isTs ? 'ts' : 'js'}.
    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // npm run make:view (answer protected) inserts routes here
    });
}

/**
 * Paths that use a middleware tag — read at runtime after registerRoutes():
 *   router.getPathsForMiddleware('auth')
 */
`;
}

function appTsTemplate(config) {
    const isTs = config.useTypeScript;
    const registryComment = isTs ? 'components/registry.ts' : 'components/registry.js';
    const routesComment = isTs ? 'routes/routes.ts' : 'routes/routes.js';
    const capacitorCheck = isTs
        ? 'if ((window as any).Capacitor?.isNativePlatform?.()) return false;'
        : 'if (window.Capacitor?.isNativePlatform?.()) return false;';
    const devFlag = isTs
        ? '(window as any).__NATIVECORE_DEV__ = true;'
        : 'window.__NATIVECORE_DEV__ = true;';

    return `/**
 * Main Application Entry Point
 *
 * Boot order:
 *   1. Lazy-load Web Components registered in ${registryComment}
 *   2. Expose a frozen router API on window for use inside component templates
 *   3. Register middleware (add your own via make:middleware — none ship by default)
 *   4. Register all routes from ${routesComment}
 *   5. Start the router (begins listening for navigation events and renders the first view)
 *   6. Initialize sidebar helpers (no-op until shell chrome is opted in)
 *   7. Load dev tools (localhost only — never ships to production)
 *
 * Keep this file minimal. Business logic belongs in controllers and services.
 * Routes belong in ${routesComment}. Components belong in ${registryComment}.
 *
 * Auth is intentionally not included. Add your own middleware with
 * \`npm run make:middleware\` and register it with createMiddleware() before
 * protecting route groups in ${routesComment}.
 */
import router from '@core/router.js';
import { registerRoutes } from '@routes/routes.js';
import { initSidebar } from '@utils/sidebar.js';
import { initLazyComponents } from '@core/lazyComponents.js';
import { dom } from '@core-utils/dom.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import '@components/registry.js'; // side-effect import: registers all lazy components

function isLocalhost()${isTs ? ': boolean' : ''} {
    // Never treat Capacitor's WebView as localhost — it uses https://localhost as its
    // internal origin but is a production native app, not a dev server.
    ${capacitorCheck}
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local');
}

/**
 * Sync sidebar visibility with the current route.
 * Skipped while the default minimal shell is active (no chrome in the DOM).
 * When you opt into app-header / app-sidebar / app-footer, switch #app to
 * class="no-sidebar" and this helper will show the sidebar on protected paths.
 */
function updateSidebarVisibility() {
    const app = dom.$('#app');
    if (!app || app.classList.contains('minimal-shell')) {
        return;
    }

    const currentPath = window.location.pathname;
    const protectedPaths = router.getPathsForMiddleware('auth');
    const isProtectedRoute = protectedPaths.some(route => currentPath.startsWith(route));

    if (isProtectedRoute) {
        document.body.classList.add('sidebar-enabled');
        app.classList.remove('no-sidebar');
    } else {
        document.body.classList.remove('sidebar-enabled');
        app.classList.add('no-sidebar');
    }
}

async function init() {
    // Register and prepare lazy-loaded Web Components before the first route renders
    await initLazyComponents();

    // Expose a minimal, frozen router API on window so components can navigate
    // without importing the router directly. Frozen to prevent runtime tampering.
    Object.defineProperty(window, 'router', {
        value: Object.freeze({
            navigate: router.navigate.bind(router),
            replace: router.replace.bind(router),
            back: router.back.bind(router),
            getCurrentRoute: router.getCurrentRoute.bind(router),
        }),
        writable: false,
        configurable: false,
    });

    // @middleware — register middleware here (auto-updated by make:middleware)
    // Example after npm run make:middleware auth:
    //   import { createMiddleware } from '@core/createMiddleware.js';
    //   import { authMiddleware } from '@middleware/auth.middleware.js';
    //   router.use(createMiddleware('auth', authMiddleware));

    // Register all app routes (defined in ${routesComment})
    registerRoutes(router);

    // Start the router: match the current URL and render the first view.
    // Pause collection so that any effects or trackers created during app-level
    // bootstrap (before the first page controller runs) are never flushed by
    // subsequent navigations.
    pausePageCleanupCollection();
    router.start();
    resumePageCleanupCollection();

    initSidebar();

    // After each navigation the router dispatches 'pageloaded' — re-sync sidebar visibility
    window.addEventListener('pageloaded', () => {
        updateSidebarVisibility();
    });

    initDevTools();
}

/**
 * Load HMR and the component inspector dev tools.
 * SECURITY: guarded by isLocalhost() — these modules are never loaded in production.
 * The build script also strips the entire .nativecore/ import block from the production bundle.
 */
function initDevTools()${isTs ? ': void' : ''} {
    if (!isLocalhost()) {
        return;
    }

    Promise.all([
        import('@dev/hmr.js'),
        import('@dev/denc-tools.js'),
        import('@dev/devOverlay.js'),
    ])
        .then(([, , { initDevOverlay }]) => {
            console.warn('[NativeCore] Dev tools loaded');
            ${devFlag}
            initDevOverlay();
        })
        .catch((err) => {
            // Dev tools not available in production builds; log in local so failures are visible.
            console.error('[NativeCore] Dev tools failed to load:', err);
        });
}

init();
`;
}

function homeControllerTemplate(config) {
    const isTs = config.useTypeScript;
    const returnType = isTs ? ': () => void' : '';

    return `import { CoreController } from '@core/controller.js';

export class HomeController extends CoreController {
    onMount() {
        // Home is a static welcome surface — add view logic here as the app grows.
    }
}

// Factory — called by the router via lazyController('homeController', ...)
export function homeController()${returnType} {
    const ctrl = new HomeController();
    return () => ctrl.destroy();
}
`;
}

function eslintConfigJsTemplate() {
    return `import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            'no-console': 'off',
            'no-debugger': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-arrow-callback': 'warn',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],

            'no-restricted-globals': [
                'error',
                {
                    name: 'event',
                    message: "Use local event parameter instead of global 'event'"
                }
            ],

            'no-restricted-syntax': [
                'error',
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='querySelector']",
                    message: "Use dom.query() in controllers or this.$() in components instead of document.querySelector()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='querySelectorAll']",
                    message: "Use dom.queryAll() in controllers or this.$$() in components instead of document.querySelectorAll()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='getElementById']",
                    message: "Use dom.query() in controllers or this.$() in components instead of document.getElementById()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='getElementsByClassName']",
                    message: "Use dom.queryAll() in controllers or this.$$() in components instead of document.getElementsByClassName()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='getElementsByTagName']",
                    message: "Use dom.queryAll() in controllers or this.$$() in components instead of document.getElementsByTagName()"
                },
                {
                    selector: "MemberExpression[object.name='element'][property.name='innerHTML']",
                    message: 'Avoid innerHTML for security. Use textContent or render() method instead'
                }
            ],

            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error'
        }
    },
    {
        // Controllers and router - allow document.querySelector since they're not components
        files: ['src/controllers/**/*.js', '.nativecore/core/router.js', 'src/app.js', 'src/utils/**/*.js'],
        rules: {
            'no-restricted-syntax': 'off'
        }
    },
    {
        // Dev tools - need direct DOM access at framework level
        files: ['.nativecore/**/*.js'],
        rules: {
            'no-restricted-syntax': 'off'
        }
    },
    {
        // Scripts and test files - relaxed rules
        files: ['scripts/**/*.{js,mjs}', '*.test.js', '*.spec.js', 'tests/**/*.js'],
        rules: {
            'no-restricted-syntax': 'off',
            'no-console': 'off'
        }
    },
    {
        // Ignore patterns
        ignores: ['node_modules/**', 'dist/**', 'build/**', 'src/constants/*.js']
    }
];
`;
}

function controllersIndexTemplate() {
    return `/**
 * Controller Registry
 */

export { homeController } from './home.controller.js';
`;
}

async function copyTemplate(targetDir) {
    await fs.cp(templateDir, targetDir, { recursive: true, force: true });
}

async function customizeProject(targetDir, config) {
    const ext = config.useTypeScript ? 'ts' : 'js';

    await writeFile(path.join(targetDir, 'package.json'), packageJsonTemplate(config));
    await writeFile(path.join(targetDir, 'nativecore.config.json'), nativecoreConfigTemplate(config));
    await writeFile(path.join(targetDir, `src/app.${ext}`), appTsTemplate(config));
    await writeFile(path.join(targetDir, `src/routes/routes.${ext}`), routesTemplate(config));
    await writeFile(path.join(targetDir, `src/controllers/index.${ext}`), controllersIndexTemplate());
    await writeFile(path.join(targetDir, `src/controllers/home.controller.${ext}`), homeControllerTemplate(config));
    // home.html ships from the template copy — enterprise starter welcome page

    await replaceInFile(path.join(targetDir, `src/services/api.service.${ext}`), content => content.replace("        return 'https://api.nativecorejs.com';", "        return '/api';"));

    await replaceInFile(path.join(targetDir, `src/components/core/app-header.${ext}`), content => content
        .replace(/<a href="\/docs" data-link class="nanc-link">Docs<\/a>\s*/g, '')
        .replace(/<a href="\/components" data-link class="nanc-link">Components<\/a>\s*/g, '')
        .replace(/<a href="\/docs" data-link class="login-form__utility-link">Review the docs<\/a>/g, '<a href="/" data-link class="login-form__utility-link">Return home</a>'));

    await replaceInFile(path.join(targetDir, 'index.html'), content => content
        .replaceAll('NativeCore | Modern Reactive JavaScript Framework', 'NativeCoreJS | Built with NativeCore')
        .replaceAll('NativeCore Framework', 'NativeCoreJS')
        .replaceAll('https://nativecorejs.com/', '/')
        .replaceAll('https://nativecorejs.com', '/')
        .replaceAll('@nativecorejs', '')
        .replaceAll('A modern, lightweight reactive framework using vanilla JavaScript, Web Components, reactive signals, and zero dependencies.', 'A NativeCoreJS starter focused on web standards, browser-native architecture, and durable performance.'));

    await replaceInFile(path.join(targetDir, 'manifest.json'), content => content
        .replace(/"name"\s*:\s*"[^"]+"/, '"name": "NativeCoreJS"')
        .replace(/"short_name"\s*:\s*"[^"]+"/, '"short_name": "NativeCoreJS"'));

    await replaceInFile(path.join(targetDir, 'public/_headers'), content => content
        .replace(/https:\/\/api\.nativecorejs\.com\s*/g, '')
        .replace(/Access-Control-Allow-Origin: .*\n/g, ''));

    await replaceInFile(path.join(targetDir, '.env.example'), content => content.replace('APP_NAME=MyApp', `APP_NAME=${config.projectTitle}`));

    if (config.includeCapacitor) {
        // JS projects use .cjs because the project has "type":"module" and Capacitor CLI
        // uses require() to load the config — module.exports is not valid in ESM .js files.
        const capExt = config.useTypeScript ? 'ts' : 'cjs';
        // Remove the opposite extension if it exists (from template stripping)
        if (!config.useTypeScript) {
            await removeIfExists(path.join(targetDir, 'capacitor.config.ts'));
            await removeIfExists(path.join(targetDir, 'capacitor.config.js'));
        }
        await writeFile(path.join(targetDir, `capacitor.config.${capExt}`), capacitorConfigTemplate(config));
    }

    if (!config.useTypeScript) {
        // Replace TypeScript-aware ESLint config with a plain JS one
        await writeFile(path.join(targetDir, 'eslint.config.js'), eslintConfigJsTemplate());
        // TypeScript config files are not needed in a JS project
        await removeIfExists(path.join(targetDir, 'tsconfig.json'));
        await removeIfExists(path.join(targetDir, 'tsconfig.build.json'));
    }
}

async function buildProject(config) {
    const targetDir = config.targetDir;

    try {
        await fs.access(targetDir);
        throw new Error(`Target directory already exists: ${targetDir}`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    await ensureDir(targetDir);
    await copyTemplate(targetDir);

    // First strip pass: convert base template .ts → .js so customizeProject
    // can reference .js paths when patching existing files (api.service.js, etc.)
    if (!config.useTypeScript) {
        await stripAllTypeScript(targetDir);
    }

    await customizeProject(targetDir, config);

    // Second strip pass: convert any .ts files written during customizeProject
    // when generating TypeScript-shaped content that still needs stripping.
    if (!config.useTypeScript) {
        await stripAllTypeScript(targetDir);
    }

    return targetDir;
}

async function main() {
    console.log('\nNativeCore installer\n');

    const positionalInput = cliArgs.find(arg => !arg.startsWith('--'));
    const rawInput = positionalInput || await ask('Project name', 'my-nativecore-app');
    const resolvedTargetDir = resolveTargetDir(rawInput);

    // Derive package-safe name from the final target folder.
    const projectName = toKebabCase(path.basename(resolvedTargetDir));
    if (!projectName) {
        console.error('Error: project name is empty after sanitization. Use a folder name with letters, numbers, and hyphens.');
        rl.close();
        process.exit(1);
    }
    const projectTitle = toTitleCase(projectName);
    const useDefaults = hasFlag('--defaults');

    // JavaScript is the default when no language flag is set (--defaults included).
    // Pass --ts to opt into TypeScript.
    const useTypeScript = hasFlag('--ts')
        ? true
        : hasFlag('--js') || useDefaults
            ? false
            : await askYesNo('Use TypeScript?', false);
    const includeCapacitor = hasFlag('--capacitor')
        ? true
        : hasFlag('--no-capacitor') || useDefaults
            ? false
            : await askYesNo('Include Capacitor (Android/iOS packaging)?', false);
    const shouldInstall = true;

    const config = {
        projectName,
        projectTitle,
        targetDir: resolvedTargetDir,
        useTypeScript,
        includeCapacitor,
        shouldInstall
    };

    const targetDir = await buildProject(config);

    let installSucceeded = false;
    let installError = null;

    if (config.shouldInstall) {
        console.log('\nInstalling dev dependencies...');
        console.log('These are development and build tools only — none ship to production:\n');
        console.log('  esbuild           — compiles source files and resolves path aliases (@core/*, @services/*, etc.) in one fast pass');
        if (config.useTypeScript) {
            console.log('  typescript        — TypeScript compiler (used for type-checking only during dev; tsc --noEmit)');
        }
        console.log('  concurrently      — runs the dev server and esbuild watcher in parallel');
        console.log('  ws                — WebSocket server used by the HMR dev server');
        console.log('  terser            — minifies JS output for production builds');
        console.log('  vitest            — unit test runner');
        console.log('  happy-dom         — lightweight DOM environment for unit tests');
        console.log('  puppeteer         — headless browser used for SSG pre-rendering (npm run build:ssg)');
        console.log('  eslint            — linter');
        if (config.useTypeScript) {
            console.log('  typescript-eslint — TypeScript-aware ESLint rules');
        }
        console.log('  @eslint/js        — ESLint core rules');
        console.log('  globals           — browser/node global definitions for ESLint');
        if (config.useTypeScript) {
            console.log('  @types/node       — TypeScript types for Node.js (scripts and build tools only)');
        }
        console.log('  htmlhint          — HTML linter for view files');
        if (config.includeCapacitor) {
            console.log('  @capacitor/core   — Capacitor runtime (ships to native app)');
            console.log('  @capacitor/cli    — Capacitor CLI for managing native projects');
            console.log('  @capacitor/android — Android platform (requires Android Studio to build)');
            console.log('  @capacitor/ios    — iOS platform (requires Xcode on macOS to build)');
        }
        console.log('');

        try {
            await installDependencies(targetDir);
            installSucceeded = true;
        } catch (error) {
            installError = error;
        }
    }

    console.log('\nProject ready.');
    const cdHint = path.relative(process.cwd(), targetDir);
    const cdPath = cdHint && !cdHint.startsWith('..') && !path.isAbsolute(cdHint)
        ? cdHint
        : targetDir;
    console.log(`\n  cd ${cdPath}`);

    const capConfigFile = `capacitor.config.${config.useTypeScript ? 'ts' : 'js'}`;

    if (config.shouldInstall && installSucceeded) {
        console.log('  npm run dev\n');
        if (config.includeCapacitor) {
            console.log('Capacitor next steps:');
            console.log('  npm run cap:add:android   — add the Android platform (requires Android Studio)');
            console.log('  npm run cap:add:ios       — add the iOS platform (requires Xcode on macOS)');
            console.log('  npm run cap:sync          — build and sync web assets to native projects');
            console.log('  npm run cap:android       — build, sync, and open in Android Studio');
            console.log('  npm run cap:ios           — build, sync, and open in Xcode (macOS only)');
            console.log(`\nUpdate ${capConfigFile} with your real app ID before adding platforms.\n`);
        } else {
            console.log('Your project has no runtime dependencies — only the dev tools listed above.');
        }
    } else {
        console.log('  npm install');
        console.log('  npm run dev\n');
        if (config.includeCapacitor) {
            console.log(`After installing, see ${capConfigFile} and run:`);
            console.log('  npm run cap:add:android   — add Android platform');
            console.log('  npm run cap:add:ios       — add iOS platform (macOS only)\n');
        }
    }

    if (installError) {
        console.log('\nDependency installation did not complete:');
        console.log(installError.message);
    }

    rl.close();
}

main().catch(error => {
    console.error('\nFailed to scaffold NativeCore app.');
    console.error(error.message);
    rl.close();
    process.exit(1);
});
