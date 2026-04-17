import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../../dist');
const botDistPath = path.join(distPath, 'bot');

// Routes to pre-render for bots. Keep this to publicly reachable marketing/docs pages.
const routes = [
    '/',
    '/docs',
    '/components',
    '/login'
];

function sanitizeBotHtml(html) {
    return html
    .replace(/<style>\s*html\[data-public-route="pending"\] body \{[\s\S]*?<\/style>/, '<style>html[data-public-route] body { visibility: visible; opacity: 1; }</style>')
    .replace(/data-public-route="pending"/g, 'data-public-route="ready"')
        .replace(/<script>\s*\(function\(\) \{[\s\S]*?document\.documentElement\.setAttribute\('data-public-route', 'ready'\);\s*\}\)\(\);\s*<\/script>/, '')
        .replace(/<script>\s*\(function\(\) \{[\s\S]*?document\.write\(`<link rel="stylesheet" href="\/src\/styles\/main\.css\?v=\$\{version\}">`\);\s*\}\)\(\);\s*<\/script>/, '')
        .replace(/<script type="module">\s*\(function\(\) \{[\s\S]*?import\(`\/dist\/app\.js\?v=\$\{version\}`\);\s*\}\)\(\);\s*<\/script>/, '')
        .replace(/<script defer="" src="https:\/\/static\.cloudflareinsights\.com\/beacon[^>]*><\/script>/g, '');
}

async function buildForBots() {
    console.log('🤖 Building bot-optimized HTML...\n');

    fs.rmSync(botDistPath, { recursive: true, force: true });
    fs.mkdirSync(botDistPath, { recursive: true });
    
    let browser;
    
    try {
        // Launch headless browser
        console.log('🚀 Starting headless browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Process each route
        for (const route of routes) {
            console.log(`📄 Rendering ${route}...`);
            
            try {
                // Navigate to the page
                await page.goto(`http://localhost:8000${route}`, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });
                
                // Wait a bit for any animations/dynamic content
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Get the rendered HTML
                const html = sanitizeBotHtml(await page.content());
                
                // Determine output path
                let outputPath;
                if (route === '/') {
                    outputPath = path.join(botDistPath, 'index.html');
                } else {
                    // Create directory for route
                    const routeDir = path.join(botDistPath, route);
                    if (!fs.existsSync(routeDir)) {
                        fs.mkdirSync(routeDir, { recursive: true });
                    }
                    outputPath = path.join(routeDir, 'index.html');
                }
                
                // Write HTML file
                fs.writeFileSync(outputPath, html);
                
                console.log(`   ✅ Saved to ${outputPath.replace(distPath, 'dist')}`);
            } catch (error) {
                console.error(`   ❌ Failed to render ${route}:`, error.message);
            }
        }
        
        console.log('\n✨ Bot build complete!');
        console.log(`📦 Bot-optimized files in: dist/bot/`);
        console.log(`📦 Publishable bot files will be copied into: _deploy/bot/ during prepare-static-assets`);
        console.log(`🔍 Search engines will now see pre-rendered HTML\n`);
        
    } catch (error) {
        console.error('❌ Bot build failed:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Check if dev server is running
async function checkDevServer() {
    try {
        const response = await fetch('http://localhost:8000');
        return response.ok;
    } catch {
        return false;
    }
}

// Main execution
(async () => {
    const serverRunning = await checkDevServer();
    
    if (!serverRunning) {
        console.error('❌ Dev server is not running on http://localhost:8000');
        console.error('💡 Please run `npm start` in another terminal first\n');
        process.exit(1);
    }
    
    await buildForBots();
})();

