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

// Update cacheBuster.ts
const cacheBusterPath = path.join(__dirname, '../utils/cacheBuster.ts');
let cacheBusterContent = fs.readFileSync(cacheBusterPath, 'utf-8');

cacheBusterContent = replaceOrThrow(
    cacheBusterContent,
    /export const cacheVersion = isDevelopment[\s\S]*?;/,
    `export const cacheVersion = isDevelopment\n    ? Date.now()\n    : '${deployVersion}';`,
    '.nativecore/utils/cacheBuster.ts'
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


