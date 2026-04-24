/**
 * Version Injection Script
 * Automatically injects package.json version into cache buster
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);

const packageVersion = packageJson.version;
const githubRunId = process.env.GITHUB_RUN_ID;
const githubRunAttempt = process.env.GITHUB_RUN_ATTEMPT;
const gitSha = process.env.GITHUB_SHA?.slice(0, 8);
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const deployVersion = githubRunId
    ? `${packageVersion}-${githubRunId}-${githubRunAttempt || '1'}`
    : gitSha
        ? `${packageVersion}-${gitSha}`
        : `${packageVersion}-${timestamp}`;

function replaceOrThrow(content, pattern, replacement, fileLabel) {
    const matched = content.match(pattern);

    if (!matched) {
        throw new Error(`Failed to inject deploy version into ${fileLabel}`);
    }

    return content.replace(pattern, replacement);
}

// Update cacheBuster — detect .ts or .js depending on project language
const cacheBusterTs = path.join(__dirname, '../utils/cacheBuster.ts');
const cacheBusterJs = path.join(__dirname, '../utils/cacheBuster.js');
const cacheBusterPath = fs.existsSync(cacheBusterTs) ? cacheBusterTs : cacheBusterJs;
const cacheBusterLabel = fs.existsSync(cacheBusterTs) ? '.nativecore/utils/cacheBuster.ts' : '.nativecore/utils/cacheBuster.js';
let cacheBusterContent = fs.readFileSync(cacheBusterPath, 'utf-8');

// Match both TS form:  export const cacheVersion = isDevelopment\n    ? ...\n    : '...';
// and esbuild-stripped JS form:  const cacheVersion = isDevelopment ? ... : "...";
const cacheBusterPattern = /(?:export )?const cacheVersion = isDevelopment[\s\S]*?;/;
const isTs = cacheBusterPath.endsWith('.ts');
const replacement = isTs
    ? `export const cacheVersion = isDevelopment\n    ? Date.now()\n    : '${deployVersion}';`
    : `const cacheVersion = isDevelopment ? Date.now() : '${deployVersion}';`;

cacheBusterContent = replaceOrThrow(
    cacheBusterContent,
    cacheBusterPattern,
    replacement,
    cacheBusterLabel
);

fs.writeFileSync(cacheBusterPath, cacheBusterContent);

for (const htmlFileName of ['index.html']) {
    const htmlPath = path.join(__dirname, `../../${htmlFileName}`);
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    htmlContent = replaceOrThrow(
        htmlContent,
        /const version = isDev \? Date\.now\(\) : '[^']+';/g,
        `const version = isDev ? Date.now() : '${deployVersion}';`,
        htmlFileName
    );

    fs.writeFileSync(htmlPath, htmlContent);
}

console.log(`Deploy version ${deployVersion} injected successfully!`);


