import { spawn } from 'child_process';

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

    if (/Found 0 errors?\. Watching for file changes\./.test(text)) {
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

