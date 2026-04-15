#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const cliArgs = process.argv.slice(2);
const rl = createInterface({ input, output });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.resolve(__dirname, '../template');

function hasFlag(flag) {
    return cliArgs.includes(flag);
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
    return JSON.stringify({
        name: config.projectName,
        version: '0.1.0',
        description: `${config.projectTitle} built with NativeCore`,
        type: 'module',
        main: 'server.js',
        scripts: {
            prestart: 'npm run compile && node scripts/inject-version.mjs',
            start: 'node server.js',
            validate: 'npm run typecheck && npm run build:client && npm run test -- --run',
            dev: 'npm run compile && node scripts/inject-version.mjs && concurrently --kill-others --names "watch,server" -c "blue,green" "node scripts/watch-compile.mjs" "node server.js"',
            'dev:watch': 'node scripts/watch-compile.mjs',
            clean: 'node -e "const fs=require(\'fs\'); fs.rmSync(\'dist\',{recursive:true,force:true}); fs.rmSync(\'_deploy\',{recursive:true,force:true})"',
            prebuild: 'npm run clean && npm run lint && npm run typecheck',
            build: 'node scripts/inject-version.mjs && npm run compile:prod && node scripts/minify.mjs && node scripts/prepare-static-assets.mjs && node scripts/strip-dev-blocks.mjs && node scripts/remove-dev.mjs',
            'build:client': 'node scripts/inject-version.mjs && npm run compile:prod && node scripts/minify.mjs && node scripts/prepare-static-assets.mjs',
            compile: 'tsc && tsc-alias',
            'compile:prod': 'tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json && node scripts/remove-dev.mjs',
            typecheck: 'tsc --noEmit',
            'make:component': 'node scripts/make-component.mjs',
            'make:core-component': 'node scripts/make-core-component.mjs',
            'make:controller': 'node scripts/make-controller.mjs',
            'remove:component': 'node scripts/remove-component.mjs',
            'remove:core-component': 'node scripts/remove-core-component.mjs',
            'make:view': 'node scripts/make-view.mjs',
            'remove:view': 'node scripts/remove-view.mjs',
            test: 'vitest',
            'test:ui': 'vitest --ui',
            'test:coverage': 'vitest --coverage',
            lint: 'eslint src/**/*.ts && htmlhint "**/*.html" --config .htmlhintrc',
            'lint:fix': 'eslint src/**/*.ts --fix'
        },
        keywords: ['nativecore', 'spa', 'web-components', 'typescript'],
        license: 'MIT',
        devDependencies: {
            '@eslint/js': '^9.39.2',
            '@types/node': '^20.11.0',
            'concurrently': '^9.2.1',
            'eslint': '^9.39.2',
            'globals': '^17.0.0',
            'happy-dom': '^20.8.9',
            'htmlhint': '^1.1.4',
            'puppeteer': '^24.36.0',
            'terser': '^5.46.0',
            'tsc-alias': '^1.8.16',
            'typescript': '^5.3.3',
            'typescript-eslint': '^8.53.1',
            'vitest': '^4.1.4',
            'ws': '^8.19.0'
        }
    }, null, 2) + '\n';
}

function nativecoreConfigTemplate(config) {
    return JSON.stringify({
        appName: config.projectTitle,
        packageManager: 'npm',
        useTypeScript: true,
        features: {
            auth: config.includeAuth,
            dashboard: config.includeDashboard,
            devTools: true,
            hmr: true,
            mockApi: true
        }
    }, null, 2) + '\n';
}

function routesTemplate(config) {
    const loginRoute = config.includeAuth
        ? "        .register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'))\n"
        : '';
    const dashboardRoute = config.includeDashboard
        ? "        .register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))\n"
        : '';
    const protectedRoutes = config.includeAuth && config.includeDashboard ? "export const protectedRoutes = ['/dashboard'];\n" : "export const protectedRoutes = [];\n";

    return `/**
 * Route Configuration
 */
import { bustCache } from '../utils/cacheBuster.js';
import type { ControllerFunction, Router } from '../core/router.js';

function lazyController(controllerName: string, controllerPath: string): ControllerFunction {
    return async (...args: any[]) => {
        const module = await import(bustCache(controllerPath));
        return module[controllerName](...args);
    };
}

export function registerRoutes(router: Router): void {
    router
        .register('/', 'src/views/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
${loginRoute}${dashboardRoute}}

${protectedRoutes}`;
}

function appTsTemplate(config) {
    const authImports = config.includeAuth
        ? "import auth from './services/auth.service.js';\nimport type { User } from './services/auth.service.js';\nimport api from './services/api.service.js';\nimport { authMiddleware } from './middleware/auth.middleware.js';\n"
        : "";
    const authVerify = config.includeAuth
        ? `async function verifyExistingSession(): Promise<void> {
    if (!auth.getToken()) {
        return;
    }

    try {
        const response = await api.get<{ authenticated: boolean; user?: User }>('/auth/verify');
        if (!response?.authenticated || !response.user) {
            auth.logout();
            return;
        }

        auth.setUser(response.user);
    } catch {
        auth.logout();
    }
}

`
        : '';
    const authMiddlewareSetup = config.includeAuth ? '    router.use(authMiddleware);\n' : '';
    const authChangeHandler = config.includeAuth ? `    window.addEventListener('auth-change', () => {
        const isAuth = auth.isAuthenticated();
        if (!isAuth) {
            document.body.classList.remove('sidebar-enabled');
            document.getElementById('app')?.classList.remove('sidebar-collapsed');
            document.getElementById('app')?.classList.add('no-sidebar');
        } else {
            updateSidebarVisibility();
        }
    });

` : '';
    const authVerificationCall = config.includeAuth ? '    await verifyExistingSession();\n' : '';

    return `/**
 * Main Application Entry Point
 */
import router from './core/router.js';
${authImports}import { registerRoutes, protectedRoutes } from './routes/routes.js';
import { initSidebar } from './utils/sidebar.js';
import { initLazyComponents } from './core/lazyComponents.js';
import './utils/dom.js';
import './components/registry.js';

function isLocalhost(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local');
}

function updateSidebarVisibility() {
${config.includeAuth ? `    const isAuthenticated = auth.isAuthenticated();` : '    const isAuthenticated = false;'}
    const currentPath = window.location.pathname;
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    const app = document.getElementById('app');

    if (isAuthenticated && isProtectedRoute) {
        document.body.classList.add('sidebar-enabled');
        app?.classList.remove('no-sidebar');
    } else {
        document.body.classList.remove('sidebar-enabled');
        app?.classList.add('no-sidebar');
    }
}

${authVerify}async function init() {
${authVerificationCall}    await initLazyComponents();

    window.router = router;

${authMiddlewareSetup}    registerRoutes(router);
    router.start();

    initSidebar();

${authChangeHandler}    window.addEventListener('pageloaded', () => {
        updateSidebarVisibility();
    });

    updateSidebarVisibility();
    initDevTools();
}

function initDevTools(): void {
    if (!isLocalhost()) {
        return;
    }

    Promise.all([
        import('./dev/hmr.js'),
        import('./dev/denc-tools.js')
    ])
        .then(() => {
            window.__NATIVECORE_DEV__ = true;
        })
        .catch(() => {
            // Dev tools not available.
        });
}

init();
`;
}

function homeControllerTemplate(config) {
    const authenticatedHref = config.includeDashboard ? '/dashboard' : '/';
    const unauthenticatedHref = config.includeAuth ? '/login' : authenticatedHref;
    const unauthenticatedLabel = config.includeAuth
        ? 'Sign In'
        : config.includeDashboard
            ? 'Open Dashboard'
            : 'Get Started';

    return `/**
 * Home Controller
 * Updates the primary landing CTA based on authentication status.
 */
import auth from '../services/auth.service.js';

export async function homeController(): Promise<() => void> {
    const getStartedBtn = document.getElementById('get-started-btn') as HTMLAnchorElement | null;

    if (getStartedBtn) {
        if (auth.isAuthenticated()) {
            getStartedBtn.href = '${authenticatedHref}';
            getStartedBtn.textContent = 'Go to Dashboard';
        } else {
            getStartedBtn.href = '${unauthenticatedHref}';
            getStartedBtn.textContent = '${unauthenticatedLabel}';
        }
    }

    return () => {};
}
`;
}

function homeViewTemplate(config) {
    const primaryHref = config.includeAuth ? '/login' : config.includeDashboard ? '/dashboard' : '/';
    const primaryLabel = config.includeAuth ? 'Sign In' : config.includeDashboard ? 'Open Dashboard' : 'Get Started';

    return `<section class="hero">
    <div class="hero-inner">
        <div class="hero-badge">TypeScript-first. Web Components. Dev tools included.</div>

        <h1>NativeCoreJS</h1>

        <p class="hero-tagline">
            Build modern applications with a browser-native architecture that leans on web standards,
            not proprietary runtimes. NativeCoreJS keeps you close to the platform with Web Components,
            TypeScript, reactive state, and high-performance patterns that stay durable as the web evolves.
        </p>

        <div class="hero-actions">
            <nc-a variant="hero-primary" href="${primaryHref}" id="get-started-btn">${primaryLabel}</nc-a>
            <nc-a variant="hero-ghost" href="https://nativecorejs.com/docs" target="_blank" rel="noopener noreferrer">Read the Docs</nc-a>
            <nc-a variant="hero-ghost" href="https://nativecorejs.com/components" target="_blank" rel="noopener noreferrer">Component Library</nc-a>
        </div>

        <div class="hero-stats">
            <div class="stat-item">
                <span class="stat-number">Full</span>
                <span class="stat-label">Project Template</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">Built-in</span>
                <span class="stat-label">Dev Tools</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">Local</span>
                <span class="stat-label">Mock API</span>
            </div>
        </div>
    </div>
</section>
`;
}

function loginViewTemplate() {
    return `<div class="login-experience">
    <div class="login-shell">
        <section class="login-showcase" aria-label="Starter access overview">
            <div class="login-showcase__eyebrow">Starter Auth Flow</div>
            <h1 class="login-showcase__title">Sign in.</h1>
            <p class="login-showcase__copy">
                This starter includes a local mock authentication flow, protected routes, and dashboard handoff.
            </p>

            <div class="login-showcase__grid">
                <article class="login-showcase__card">
                    <h2>What is included</h2>
                    <ul class="login-showcase__list">
                        <li>Protected route gating with dashboard handoff</li>
                        <li>Mock API-backed authentication for local development</li>
                        <li>Component-driven UI built from NativeCore primitives</li>
                    </ul>
                </article>

                <article class="login-showcase__card login-showcase__card--accent">
                    <h2>Starter defaults</h2>
                    <div class="login-showcase__metrics">
                        <div>
                            <strong>Demo email</strong>
                            <span>demo@example.com</span>
                        </div>
                        <div>
                            <strong>Demo password</strong>
                            <span>pa$$w0rd</span>
                        </div>
                        <div>
                            <strong>Target route</strong>
                            <span>/dashboard</span>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="login-panel" aria-label="Sign in form">
            <div class="login-panel__header">
                <p class="login-panel__eyebrow">Starter Access</p>
                <h2>Access the dashboard</h2>
                <p>Use the local demo credentials below.</p>
            </div>

            <div class="login-demo-credentials" aria-label="Demo credentials">
                <div class="login-demo-credentials__item">
                    <span>Demo email</span>
                    <strong>demo@example.com</strong>
                </div>
                <div class="login-demo-credentials__item">
                    <span>Demo password</span>
                    <strong>pa$$w0rd</strong>
                </div>
            </div>

            <div id="login-error" class="login-alert alert alert-error" hidden aria-live="polite"></div>

            <nc-form id="loginForm" class="login-form">
                <nc-field class="login-field" label="Work Email" for="email" required>
                    <nc-input
                        id="email"
                        name="email"
                        type="email"
                        autocomplete="username email"
                        placeholder="demo@example.com"
                        value="demo@example.com"
                        required
                    ></nc-input>
                </nc-field>

                <nc-field class="login-field" label="Password" for="password" required>
                    <nc-input
                        id="password"
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        placeholder="Enter your password"
                        value="pa$$w0rd"
                        required
                        minlength="8"
                        show-password-toggle
                    ></nc-input>
                </nc-field>

                <div class="login-form__utility">
                    <nc-checkbox id="rememberMe" name="rememberMe" label="Remember demo email" checked></nc-checkbox>
                    <a href="/" data-link class="login-form__utility-link">Return home</a>
                </div>

                <nc-button id="loginBtn" type="submit" variant="primary" size="lg" full-width>
                    Access Dashboard
                </nc-button>
            </nc-form>
        </section>
    </div>
</div>
`;
}

function controllersIndexTemplate(config) {
    const lines = [
        '/**',
        ' * Controller Registry',
        ' */',
        '',
        "export { homeController } from './home.controller.js';"
    ];

    if (config.includeAuth) {
        lines.push("export { loginController } from './login.controller.js';");
    }

    if (config.includeDashboard) {
        lines.push("export { dashboardController } from './dashboard.controller.js';");
    }

    return `${lines.join('\n')}\n`;
}

async function copyTemplate(targetDir) {
    await fs.cp(templateDir, targetDir, { recursive: true, force: true });
}

async function customizeProject(targetDir, config) {
    await writeFile(path.join(targetDir, 'package.json'), packageJsonTemplate(config));
    await writeFile(path.join(targetDir, 'nativecore.config.json'), nativecoreConfigTemplate(config));
    await writeFile(path.join(targetDir, 'src/app.ts'), appTsTemplate(config));
    await writeFile(path.join(targetDir, 'src/routes/routes.ts'), routesTemplate(config));
    await writeFile(path.join(targetDir, 'src/controllers/index.ts'), controllersIndexTemplate(config));
    await writeFile(path.join(targetDir, 'src/controllers/home.controller.ts'), homeControllerTemplate(config));
    await writeFile(path.join(targetDir, 'src/views/public/home.html'), homeViewTemplate(config));

    if (config.includeAuth) {
        await writeFile(path.join(targetDir, 'src/views/public/login.html'), loginViewTemplate());
    } else {
        await removeIfExists(path.join(targetDir, 'src/controllers/login.controller.ts'));
        await removeIfExists(path.join(targetDir, 'src/views/public/login.html'));
    }

    if (!config.includeDashboard) {
        await removeIfExists(path.join(targetDir, 'src/controllers/dashboard.controller.ts'));
        await removeIfExists(path.join(targetDir, 'src/views/protected/dashboard.html'));
    }

    await replaceInFile(path.join(targetDir, 'src/services/api.service.ts'), content => content.replace("        return 'https://api.nativecorejs.com';", "        return '/api';"));

    await replaceInFile(path.join(targetDir, 'src/components/core/app-header.ts'), content => content
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
}

async function buildProject(config) {
    const targetDir = path.resolve(process.cwd(), config.projectName);

    try {
        await fs.access(targetDir);
        throw new Error(`Target directory already exists: ${config.projectName}`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    await ensureDir(targetDir);
    await copyTemplate(targetDir);
    await customizeProject(targetDir, config);

    return targetDir;
}

async function main() {
    console.log('\nNativeCore installer\n');

    const positionalName = cliArgs.find(arg => !arg.startsWith('--'));
    const rawName = positionalName || await ask('Project name', 'my-nativecore-app');
    const projectName = toKebabCase(rawName);
    const projectTitle = toTitleCase(projectName);
    const useDefaults = hasFlag('--defaults');

    const includeAuth = hasFlag('--no-auth')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Include auth flow?', true);
    const includeDashboard = hasFlag('--no-dashboard')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Include dashboard route?', true);
    const shouldInstall = hasFlag('--skip-install') || hasFlag('--no-install')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Install dependencies now?', true);

    const config = {
        projectName,
        projectTitle,
        includeAuth,
        includeDashboard,
        shouldInstall
    };

    const targetDir = await buildProject(config);

    let installSucceeded = false;
    let installError = null;

    if (config.shouldInstall) {
        console.log('\nInstalling dependencies with npm...\n');

        try {
            await installDependencies(targetDir);
            installSucceeded = true;
        } catch (error) {
            installError = error;
        }
    }

    console.log('\nProject created successfully.');
    console.log(`cd ${config.projectName}`);

    if (config.shouldInstall && installSucceeded) {
        console.log('Dependencies installed.');
    } else {
        console.log('npm install');
    }

    if (installError) {
        console.log('\nDependency installation did not complete.');
        console.log(installError.message);
    }

    console.log('npm run dev');
    console.log('\nThis scaffold now ships a full NativeCore-style project structure with scripts, dev tools, HMR, services, stores, middleware, mock API, and source folders included.');

    rl.close();
}

main().catch(error => {
    console.error('\nFailed to scaffold NativeCore app.');
    console.error(error.message);
    rl.close();
    process.exit(1);
});