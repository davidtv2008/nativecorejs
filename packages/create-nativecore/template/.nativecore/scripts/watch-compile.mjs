import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Sentinel file written after every full tsc + tsc-alias cycle.
// server.js watches for this to know when aliases are resolved.
const SENTINEL_PATH = path.join(__dirname, '..', '..', 'dist', '.hmr-ready');

const tscArgs = ['tsc', '--watch', '--preserveWatchOutput'];
let aliasProcess = null;
let aliasQueued = false;

function runAlias() {
    if (aliasProcess) {
        aliasQueued = true;
        return;
    }

    aliasProcess = spawn('npx', ['tsc-alias'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
    });

    aliasProcess.stdout.on('data', chunk => {
        process.stdout.write(`[alias] ${chunk}`);
    });

    aliasProcess.stderr.on('data', chunk => {
        process.stderr.write(`[alias] ${chunk}`);
    });

    aliasProcess.on('exit', code => {
        if (code && code !== 0) {
            process.stderr.write(`[alias] tsc-alias exited with code ${code}\n`);
        }

        aliasProcess = null;

        // Signal to server.js that the full tsc + tsc-alias cycle is done.
        // This prevents HMR from firing before path aliases are resolved.
        try { fs.writeFileSync(SENTINEL_PATH, String(Date.now())); } catch { /* dist may not exist yet */ }

        if (aliasQueued) {
            aliasQueued = false;
            runAlias();
        }
    });
}

const tscProcess = spawn('npx', tscArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
});

function handleTscOutput(chunk, writer) {
    const text = chunk.toString();
    writer.write(text);

    if (/Found \d+ errors?\. Watching for file changes\./.test(text)) {
        // Run tsc-alias on every compile pass, not just zero-error builds.
        // Without this, newly created files with TS errors (e.g. from make:view)
        // leave @core-utils/* aliases unresolved and crash the browser.
        runAlias();
    }
}

tscProcess.stdout.on('data', chunk => handleTscOutput(chunk, process.stdout));
tscProcess.stderr.on('data', chunk => handleTscOutput(chunk, process.stderr));

function shutdown(signal) {
    if (aliasProcess) {
        aliasProcess.kill(signal);
    }
    tscProcess.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

tscProcess.on('exit', code => {
    process.exit(code ?? 0);
});

