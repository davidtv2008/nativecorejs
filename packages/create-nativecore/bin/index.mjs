#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const cliArgs = process.argv.slice(2);
const rl = createInterface({ input, output });

function hasFlag(flag) {
    return cliArgs.includes(flag);
}

function getFlagValue(prefix) {
    const match = cliArgs.find(arg => arg.startsWith(`${prefix}=`));
    return match ? match.slice(prefix.length + 1) : null;
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

async function askChoice(question, options, fallback) {
    const label = `${question} [${options.join('/')}]`;
    while (true) {
        const answer = (await ask(label, fallback)).toLowerCase();
        if (options.includes(answer)) return answer;
        console.log(`Invalid choice. Expected one of: ${options.join(', ')}`);
    }
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function writeFile(filePath, content) {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
}

function installCommand(packageManager) {
    if (packageManager === 'yarn') {
        return { command: 'yarn', args: ['install'] };
    }

    return { command: packageManager, args: ['install'] };
}

async function installDependencies(targetDir, packageManager) {
    const { command, args } = installCommand(packageManager);

    await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
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

            reject(new Error(`${packageManager} install failed with exit code ${code ?? 'unknown'}`));
        });
    });
}

function scriptBlock(config) {
    const scripts = {
        dev: `${config.packageManager === 'yarn' ? 'yarn compile' : `${config.packageManager} run compile`} && node server.js`,
        start: 'node server.js',
        compile: config.useTypeScript ? 'tsc' : 'echo "No compile step required for JavaScript"',
        typecheck: config.useTypeScript ? 'tsc --noEmit' : 'echo "Type checking is disabled for JavaScript mode"'
    };

    return scripts;
}

function packageJsonTemplate(config) {
    return JSON.stringify({
        name: config.projectName,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: scriptBlock(config),
        dependencies: {
            nativecorejs: config.frameworkDependency
        },
        devDependencies: config.useTypeScript ? {
            typescript: '^5.6.3',
            '@types/node': '^22.0.0'
        } : {}
    }, null, 2) + '\n';
}

function tsconfigTemplate() {
    return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": "."
  },
  "include": ["src/**/*.ts"]
}
`;
}

function serverTemplate() {
    return `import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
    const requestPath = req.url?.split('?')[0] || '/';
    let filePath = path.join(__dirname, requestPath === '/' ? 'index.html' : requestPath);

    if (!path.extname(requestPath) && !fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'index.html');
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }

        const contentType = mimeTypes[path.extname(filePath)] || 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
        res.end(content);
    });
}).listen(PORT, () => {
    console.log('NativeCore starter running at http://localhost:' + PORT);
});
`;
}

function shellHtmlTemplate(config, shell) {
    const entryScript = config.useTypeScript ? './dist/app.js' : './src/app.js';
    const shellName = shell === 'app' ? 'protected' : 'public';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="app-shell" content="${shellName}">
    <title>${config.projectTitle}</title>
    <link rel="stylesheet" href="./node_modules/nativecorejs/src/styles/base.css">
    <link rel="stylesheet" href="./src/styles/main.css">
    <script type="importmap">
    {
        "imports": {
            "nativecorejs": "./node_modules/nativecorejs/dist/index.js",
            "nativecorejs/components": "./node_modules/nativecorejs/dist/components/index.js"
        }
    }
    </script>
</head>
<body>
    <div id="main-content"></div>
    <script type="module" src="${entryScript}"></script>
</body>
</html>
`;
}

function appEntryTemplate(config) {
    return `import { registerBuiltinComponents, Router } from 'nativecorejs';
import { registerRoutes } from './config/routes.js';

registerBuiltinComponents();

const router = new Router();

registerRoutes(router);
router.start();
`;
}

function routesTemplate(config) {
    const typeImport = config.useTypeScript
        ? "import type { ControllerFunction, Router } from 'nativecorejs';\n"
        : '';

    const docsRoute = config.includeDocs
        ? "        .register('/docs', 'src/views/pages/public/docs.html', lazyController('docsController', '../controllers/docs.controller.js'))\n"
        : '';
    const loginRoute = config.includeAuth
        ? "        .register('/login', 'src/views/pages/public/login.html', lazyController('loginController', '../controllers/login.controller.js'))\n"
        : '';
    const dashboardRoute = config.includeDashboard
        ? "        .register('/dashboard', 'src/views/pages/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))\n"
        : '';
    const protectedRoutes = config.includeDashboard ? "export const protectedRoutes = ['/dashboard'];\n" : "export const protectedRoutes = [];\n";

    return `${typeImport}function lazyController(controllerName${config.useTypeScript ? ': string' : ''}, controllerPath${config.useTypeScript ? ': string' : ''})${config.useTypeScript ? ': ControllerFunction' : ''} {
    return async (...args) => {
        const module = await import(controllerPath);
        return module[controllerName](...args);
    };
}

export function registerRoutes(router${config.useTypeScript ? ': Router' : ''})${config.useTypeScript ? ': void' : ''} {
    router
        .register('/', 'src/views/pages/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
${docsRoute}${loginRoute}${dashboardRoute}}

${protectedRoutes}`;
}

function controllerTemplate(name, body, config) {
    const typePrefix = config.useTypeScript ? ': Promise<() => void>' : '';
    return `import { trackEvents, trackSubscriptions } from 'nativecorejs';

export async function ${name}(params = {})${typePrefix} {
    const events = trackEvents();
    const subs = trackSubscriptions();

${body}

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
`;
}

function homeControllerBody(config) {
    return `    void params;
    const cta = document.querySelector('[data-action="launch-dashboard"]');

    if (cta) {
        events.onClick('[data-action="launch-dashboard"]', () => {
            window.history.pushState({}, '', '${config.includeDashboard ? '/dashboard' : '/'}');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
    }`;
}

function loginControllerBody() {
    return `    void params;
    events.onSubmit('[data-form="login"]', event => {
        event.preventDefault();
    });`;
}

function docsControllerBody() {
    return '    void params;';
}

function dashboardControllerBody() {
    return `    void params;
    const items = document.querySelectorAll('[data-metric-card]');
    items.forEach(item => item.classList.add('is-ready'));`;
}

function publicViewTemplate(config) {
    const docsLink = config.includeDocs ? '<a href="/docs">Docs</a>' : '';
    const authLink = config.includeAuth ? '<a href="/login">Login</a>' : '';
    const dashboardButton = config.includeDashboard ? '<button type="button" data-action="launch-dashboard">Open dashboard shell</button>' : '';

    return `<section class="hero">
    <p class="eyebrow">NativeCore</p>
    <h1>${config.projectTitle}</h1>
    <p class="lede">A clean starter generated by create-nativecore. This shell is app-level only and excludes demo API endpoints or deployment-specific backend assets.</p>
    <div class="hero-actions">
        ${dashboardButton}
        ${docsLink}
        ${authLink}
    </div>
</section>
`;
}

function docsViewTemplate() {
    return `<section class="page-section">
    <h1>Documentation</h1>
    <p>Replace this starter page with your product documentation, component examples, or a markdown renderer.</p>
</section>
`;
}

function loginViewTemplate() {
    return `<section class="page-section auth-page">
    <h1>Sign in</h1>
    <form data-form="login" class="auth-form">
        <label>
            <span>Email</span>
            <input type="email" name="email" placeholder="you@example.com">
        </label>
        <label>
            <span>Password</span>
            <input type="password" name="password" placeholder="Enter your password">
        </label>
        <button type="submit">Sign in</button>
    </form>
</section>
`;
}

function dashboardViewTemplate() {
    return `<section class="page-section dashboard-grid">
    <article data-metric-card>
        <h2>Users</h2>
        <p>1,284</p>
    </article>
    <article data-metric-card>
        <h2>Revenue</h2>
        <p>$48,900</p>
    </article>
    <article data-metric-card>
        <h2>Errors</h2>
        <p>2</p>
    </article>
</section>
`;
}

function stylesTemplate() {
    return `:root {
    --background: #f5efe5;
    --surface: rgba(255, 255, 255, 0.78);
    --surface-strong: #fffaf2;
    --text: #1f2937;
    --muted: #5b6470;
    --accent: #0f766e;
    --accent-strong: #115e59;
    --border: rgba(31, 41, 55, 0.12);
    --shadow: 0 24px 60px rgba(15, 23, 42, 0.10);
    font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    color: var(--text);
    background:
        radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 32%),
        radial-gradient(circle at bottom right, rgba(217, 119, 6, 0.16), transparent 24%),
        linear-gradient(180deg, #f8f5ee 0%, #efe6d8 100%);
}

body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
    opacity: 0.5;
}

#main-content {
    position: relative;
    z-index: 1;
    width: min(1100px, calc(100vw - 2rem));
    margin: 0 auto;
    padding: 4rem 0 5rem;
}

.hero,
.page-section {
    background: var(--surface);
    backdrop-filter: blur(14px);
    border: 1px solid var(--border);
    border-radius: 28px;
    box-shadow: var(--shadow);
}

.hero {
    padding: 4rem;
}

.eyebrow {
    margin: 0 0 1rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--accent-strong);
    font-size: 0.82rem;
}

h1,
h2,
p {
    margin-top: 0;
}

h1 {
    font-size: clamp(2.5rem, 6vw, 5rem);
    line-height: 0.95;
    margin-bottom: 1rem;
}

.lede,
.page-section p {
    max-width: 42rem;
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--muted);
}

.hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    margin-top: 2rem;
}

button,
a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.9rem;
    padding: 0.75rem 1.1rem;
    border-radius: 999px;
    border: 1px solid transparent;
    text-decoration: none;
    font: inherit;
}

button {
    background: var(--accent);
    color: #fff;
    cursor: pointer;
}

button:hover {
    background: var(--accent-strong);
}

a {
    color: var(--text);
    background: rgba(255, 255, 255, 0.65);
    border-color: var(--border);
}

.page-section {
    padding: 2rem;
}

.auth-page {
    max-width: 34rem;
}

.auth-form {
    display: grid;
    gap: 1rem;
}

.auth-form label {
    display: grid;
    gap: 0.45rem;
}

.auth-form input {
    min-height: 3rem;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 0.8rem 0.95rem;
    font: inherit;
    background: rgba(255, 255, 255, 0.85);
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
}

.dashboard-grid article {
    padding: 1.5rem;
    border-radius: 20px;
    background: var(--surface-strong);
    border: 1px solid var(--border);
    transform: translateY(8px);
    opacity: 0;
    transition: transform 160ms ease, opacity 160ms ease;
}

.dashboard-grid article.is-ready {
    transform: translateY(0);
    opacity: 1;
}

@media (max-width: 720px) {
    #main-content {
        width: min(100vw - 1rem, 100%);
        padding-top: 1rem;
    }

    .hero,
    .page-section {
        border-radius: 22px;
        padding: 1.4rem;
    }
}
`;
}

function nativecoreConfigTemplate(config) {
    return JSON.stringify({
        appName: config.projectTitle,
        packageManager: config.packageManager,
        useTypeScript: config.useTypeScript,
        frameworkDependency: config.frameworkDependency,
        features: {
            authShell: config.includeAuth,
            docs: config.includeDocs,
            dashboard: config.includeDashboard
        }
    }, null, 2) + '\n';
}

async function buildProject(config) {
    const targetDir = path.resolve(process.cwd(), config.projectName);

    try {
        await fs.access(targetDir);
        throw new Error(`Target directory already exists: ${config.projectName}`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    const sourceExtension = config.useTypeScript ? 'ts' : 'js';

    await ensureDir(targetDir);
    await ensureDir(path.join(targetDir, 'src/config'));
    await ensureDir(path.join(targetDir, 'src/controllers'));
    await ensureDir(path.join(targetDir, 'src/views/pages/public'));
    await ensureDir(path.join(targetDir, 'src/views/pages/protected'));
    await ensureDir(path.join(targetDir, 'src/styles'));

    await writeFile(path.join(targetDir, 'package.json'), packageJsonTemplate(config));
    await writeFile(path.join(targetDir, 'server.js'), serverTemplate());
    await writeFile(path.join(targetDir, 'index.html'), shellHtmlTemplate(config, 'index'));
    await writeFile(path.join(targetDir, 'nativecore.config.json'), nativecoreConfigTemplate(config));
    await writeFile(path.join(targetDir, `src/app.${sourceExtension}`), appEntryTemplate(config));
    await writeFile(path.join(targetDir, `src/config/routes.${sourceExtension}`), routesTemplate(config));
    await writeFile(path.join(targetDir, `src/controllers/home.controller.${sourceExtension}`), controllerTemplate('homeController', homeControllerBody(config), config));
    await writeFile(path.join(targetDir, 'src/views/pages/public/home.html'), publicViewTemplate(config));
    await writeFile(path.join(targetDir, 'src/styles/main.css'), stylesTemplate());

    if (config.useTypeScript) {
        await writeFile(path.join(targetDir, 'tsconfig.json'), tsconfigTemplate());
    }

    if (config.includeAuth) {
        await writeFile(path.join(targetDir, 'app.html'), shellHtmlTemplate(config, 'app'));
        await writeFile(path.join(targetDir, `src/controllers/login.controller.${sourceExtension}`), controllerTemplate('loginController', loginControllerBody(), config));
        await writeFile(path.join(targetDir, 'src/views/pages/public/login.html'), loginViewTemplate());
    }

    if (config.includeDocs) {
        await writeFile(path.join(targetDir, `src/controllers/docs.controller.${sourceExtension}`), controllerTemplate('docsController', docsControllerBody(), config));
        await writeFile(path.join(targetDir, 'src/views/pages/public/docs.html'), docsViewTemplate());
    }

    if (config.includeDashboard) {
        await writeFile(path.join(targetDir, `src/controllers/dashboard.controller.${sourceExtension}`), controllerTemplate('dashboardController', dashboardControllerBody(), config));
        await writeFile(path.join(targetDir, 'src/views/pages/protected/dashboard.html'), dashboardViewTemplate());
    }

    return targetDir;
}

async function main() {
    console.log('\nNativeCore installer\n');

    const positionalName = cliArgs.find(arg => !arg.startsWith('--'));
    const rawName = positionalName || await ask('Project name', 'my-nativecore-app');
    const projectName = toKebabCase(rawName);
    const projectTitle = toTitleCase(projectName);
    const useDefaults = hasFlag('--defaults');

    const useTypeScript = hasFlag('--js')
        ? false
        : hasFlag('--ts')
            ? true
            : useDefaults
                ? true
                : await askYesNo('Use TypeScript?', true);
    const useLocalFramework = hasFlag('--local')
        ? true
        : useDefaults
            ? false
            : await askYesNo('Use local workspace nativecorejs package?', false);
    const includeAuth = hasFlag('--no-auth')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Include auth shell?', true);
    const includeDocs = hasFlag('--no-docs')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Include docs route?', true);
    const includeDashboard = hasFlag('--no-dashboard')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Include dashboard route?', true);
    const packageManager = getFlagValue('--pm')
        || (useDefaults ? 'npm' : await askChoice('Package manager', ['npm', 'pnpm', 'yarn'], 'npm'));
    const shouldInstall = hasFlag('--skip-install') || hasFlag('--no-install')
        ? false
        : useDefaults
            ? true
            : await askYesNo('Install dependencies now?', true);

    const config = {
        projectName,
        projectTitle,
        useTypeScript,
        frameworkDependency: useLocalFramework ? 'file:../packages/nativecorejs' : '^0.1.0',
        includeAuth,
        includeDocs,
        includeDashboard,
        packageManager,
        shouldInstall
    };

    const targetDir = await buildProject(config);

    let installSucceeded = false;
    let installError = null;

    if (config.shouldInstall) {
        console.log(`\nInstalling dependencies with ${config.packageManager}...\n`);

        try {
            await installDependencies(targetDir, config.packageManager);
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
        console.log(`${config.packageManager} install`);
    }

    if (installError) {
        console.log('\nDependency installation did not complete.');
        console.log(installError.message);
    }

    console.log(`${config.packageManager} run dev`);
    console.log('\nThis starter expects nativecorejs to provide prebuilt dist files and the base stylesheet from node_modules/nativecorejs.');

    rl.close();
}

main().catch(error => {
    console.error('\nFailed to scaffold NativeCore app.');
    console.error(error.message);
    rl.close();
    process.exit(1);
});
