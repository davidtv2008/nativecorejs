import readline from 'readline';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let serverProcess = null;

function normalizeBotBuildPreference(value) {
    if (!value) return null;

    const normalized = value.toLowerCase().trim();

    if (['y', 'yes', 'true', '1', 'always'].includes(normalized)) {
        return 'always';
    }

    if (['n', 'no', 'false', '0', 'never', 'skip'].includes(normalized)) {
        return 'never';
    }

    if (['auto', 'prompt'].includes(normalized)) {
        return 'auto';
    }

    return null;
}

function resolveBotBuildMode() {
    const cliArgs = new Set(process.argv.slice(2));

    if (cliArgs.has('--yes') || cliArgs.has('--bots')) {
        return 'always';
    }

    if (cliArgs.has('--no') || cliArgs.has('--skip-bots')) {
        return 'never';
    }

    const envMode = normalizeBotBuildPreference(process.env.BOT_BUILD);
    if (envMode) {
        return envMode;
    }

    if (process.env.CI || !process.stdin.isTTY || !process.stdout.isTTY) {
        return 'never';
    }

    return 'prompt';
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

async function startServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting dev server...');
        
        // Start server directly without npm (skips prestart compilation)
        serverProcess = spawn('node', ['server.js'], {
            detached: false,
            stdio: 'ignore', // Suppress output to avoid overlap
            shell: true
        });
        
        serverProcess.on('error', (error) => {
            reject(new Error(`Failed to start server: ${error.message}`));
        });
        
        // Wait for server to be ready
        console.log('⏳ Waiting for server...');
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkServer = setInterval(async () => {
            attempts++;
            
            try {
                const response = await fetch('http://localhost:8000');
                if (response.ok) {
                    clearInterval(checkServer);
                    console.log('✅ Server ready!\n');
                    resolve();
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    clearInterval(checkServer);
                    reject(new Error('Server failed to start after 30 seconds'));
                }
            }
        }, 1000);
    });
}

function stopServer() {
    if (serverProcess) {
        console.log('\n🛑 Stopping dev server...');
        serverProcess.kill();
        serverProcess = null;
    }
}

async function main() {
    const mode = resolveBotBuildMode();

    // Wait for any background compilation to finish
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear any overlapping output
    console.clear();
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   🤖 SEO-Optimized Build Available                ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    console.log('Generate bot-optimized HTML for search engines?');
    console.log('  • Improves SEO (Google, Bing, etc.)');
    console.log('  • Enables social media previews');
    console.log('  • Zero impact on user performance');
    console.log('');
    
    let shouldBuildBots = false;

    if (mode === 'always') {
        console.log('BOT_BUILD=always detected. Running bot build without prompt.\n');
        shouldBuildBots = true;
    } else if (mode === 'never') {
        console.log('BOT_BUILD=never detected. Skipping bot build without prompt.\n');
    } else {
        const answer = await question('Build for bots? (y/N): ');
        shouldBuildBots = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
    }

    if (shouldBuildBots) {
        console.log('\n📦 Starting bot build...\n');
        
        let serverWasStarted = false;
        
        try {
            // Check if server is already running
            console.log('⚙️  Checking dev server...');
            
            try {
                const response = await fetch('http://localhost:8000');
                if (response.ok) {
                    console.log('✅ Server already running!\n');
                }
            } catch {
                // Server not running, try to start it
                try {
                    await startServer();
                    serverWasStarted = true;
                } catch (startError) {
                    // If start failed due to port in use, check if it's actually working now
                    if (startError.message.includes('address already in use') || 
                        startError.message.includes('EADDRINUSE')) {
                        console.log('\n⚠️  Port already in use, checking if server is now accessible...');
                        try {
                            const retryResponse = await fetch('http://localhost:8000');
                            if (retryResponse.ok) {
                                console.log('✅ Server is accessible!\n');
                            } else {
                                throw new Error('Server port in use but not responding');
                            }
                        } catch {
                            throw new Error('Port 8000 is in use. Please run: taskkill /F /IM node.exe');
                        }
                    } else {
                        throw startError;
                    }
                }
            }
            
            // Run bot build
            console.log('🎨 Rendering pages...\n');
            const { stdout, stderr } = await execAsync('node scripts/build-for-bots.mjs');
            
            if (stdout) console.log(stdout);
            if (stderr && !stderr.includes('ExperimentalWarning')) {
                console.error(stderr);
            }
            
        } catch (error) {
            console.error('\n❌ Bot build failed:', error.message);
            rl.close();
            if (serverWasStarted) stopServer();
            process.exit(1);
        } finally {
            // Clean up server if we started it
            if (serverWasStarted) {
                stopServer();
            }
        }
    } else {
        console.log('\n⏭️  Skipping bot build');
        console.log('💡 Run `npm run build:bots` anytime to generate\n');
    }
    
    rl.close();
}

// Handle cleanup on exit
process.on('exit', stopServer);
process.on('SIGINT', () => {
    stopServer();
    process.exit(0);
});
process.on('SIGTERM', () => {
    stopServer();
    process.exit(0);
});

main();

