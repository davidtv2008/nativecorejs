/**
 * Simple SPA Development Server
 * Serves index.html for all routes (except static assets)
 * Includes mock API endpoints + Hot Module Replacement (HMR)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import * as mockApi from './api/mockApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;
const HMR_PORT = 8001;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.ts': 'text/javascript',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ============================================
// IN-MEMORY STATIC FILE CACHE
// ============================================

const MAX_CACHE_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * In-memory static file cache.
 * Each entry stores { mtimeMs, content } so a changed file is automatically
 * detected via statSync on the next request.
 * @type {Map<string, { mtimeMs: number, content: Buffer }>}
 */
const staticFileCache = new Map();

/**
 * Return cached content for filePath if the on-disk mtime matches.
 * Returns null on miss or when the file has changed.
 */
function getCachedFile(filePath) {
    const cached = staticFileCache.get(filePath);
    if (!cached) return null;
    try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs === cached.mtimeMs) return cached.content;
        staticFileCache.delete(filePath);
    } catch {
        staticFileCache.delete(filePath);
    }
    return null;
}

/**
 * Store content in the in-memory cache (only if the file is within the size
 * limit and the stat is readable).
 */
function setCachedFile(filePath, content) {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size <= MAX_CACHE_FILE_SIZE) {
            staticFileCache.set(filePath, { mtimeMs: stat.mtimeMs, content });
        }
    } catch {
        // ignore unreadable files
    }
}

/**
 * Recursively warm the static file cache for a directory (sync, startup only).
 * Skips files larger than MAX_CACHE_FILE_SIZE.
 */
function warmCacheDir(dir) {
    let count = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                count += warmCacheDir(fullPath);
            } else if (entry.isFile()) {
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.size > MAX_CACHE_FILE_SIZE) continue;
                    const content = fs.readFileSync(fullPath);
                    staticFileCache.set(fullPath, { mtimeMs: stat.mtimeMs, content });
                    count++;
                } catch {
                    // skip files that cannot be read
                }
            }
        }
    } catch {
        // skip directories that cannot be read
    }
    return count;
}

function warmStaticCache() {
    const dirs = ['src/views', 'public/content', 'dist/src/controllers', 'dist/src/styles'];
    let total = 0;
    for (const dir of dirs) {
        const fullDir = path.join(ROOT_DIR, dir);
        if (fs.existsSync(fullDir)) {
            total += warmCacheDir(fullDir);
        }
    }
    console.log(`[perf] warmed ${total} files`);
}

// Parse JSON body
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error('Request body too large'));
                return;
            }
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Validate that a resolved file path is within the allowed root directory.
 * Prevents path traversal attacks.
 */
function validatePath(userPath, rootDir = ROOT_DIR) {
    const resolved = path.resolve(rootDir, userPath);
    if (!resolved.startsWith(path.resolve(rootDir) + path.sep) && resolved !== path.resolve(rootDir)) {
        throw new Error(`Path traversal blocked: ${userPath}`);
    }
    return resolved;
}

/**
 * Path portion of the request (no query string). Handles absolute-form Request-URI
 * (e.g. GET http://localhost:8000/api/foo HTTP/1.1) so /api/* routes are not missed.
 */
function getRequestPathname(req) {
    let raw = req.url || '/';
    try {
        if (/^https?:\/\//i.test(raw)) {
            const p = new URL(raw).pathname;
            return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
        }
    } catch {
        /* fall through */
    }
    const q = raw.indexOf('?');
    if (q !== -1) raw = raw.slice(0, q);
    if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1);
    return raw || '/';
}

/** Query string only (for URLSearchParams), works with absolute Request-URI. */
function getRequestQuery(req) {
    const raw = req.url || '';
    try {
        if (/^https?:\/\//i.test(raw)) {
            return new URL(raw).search.slice(1);
        }
    } catch {
        /* ignore */
    }
    const q = raw.indexOf('?');
    return q === -1 ? '' : raw.slice(q + 1);
}

// ============================================
// DEV TOOLS: Component Metadata Parser
// ============================================

/**
 * Get component metadata by parsing the source file
 */
async function getComponentMetadata(tagName) {
    // Find the component file — check both .ts (TypeScript) and .js (JavaScript) projects
    const possiblePaths = [
        path.join(ROOT_DIR, 'src/components/ui',   `${tagName}.ts`),
        path.join(ROOT_DIR, 'src/components/core',  `${tagName}.ts`),
        path.join(ROOT_DIR, 'src/components',       `${tagName}.ts`),
        path.join(ROOT_DIR, 'src/components/ui',   `${tagName}.js`),
        path.join(ROOT_DIR, 'src/components/core',  `${tagName}.js`),
        path.join(ROOT_DIR, 'src/components',       `${tagName}.js`),
    ];
    
    let filePath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }

    if (!filePath) {
        const componentDirs = [
            path.join(ROOT_DIR, 'src/components/core'),
            path.join(ROOT_DIR, 'src/components/ui'),
            path.join(ROOT_DIR, 'src/components'),
        ];

        const defineComponentPatterns = [
            `defineComponent('${tagName}'`,
            `defineComponent("${tagName}"`,
        ];

        for (const dir of componentDirs) {
            if (!fs.existsSync(dir)) continue;

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.js')) continue;

                const candidatePath = path.join(dir, entry.name);
                const candidateSource = fs.readFileSync(candidatePath, 'utf-8');

                if (defineComponentPatterns.some(pattern => candidateSource.includes(pattern))) {
                    filePath = candidatePath;
                    break;
                }
            }

            if (filePath) break;
        }
    }
    
    if (!filePath) {
        return null;
    }
    
    console.log(`[DEBUG] Reading component file: ${filePath}`);
    
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const lines = sourceCode.split('\n');
    
    // Parse class name
    const classMatch = sourceCode.match(/export class (\w+) extends Component/);
    const className = classMatch ? classMatch[1] : 'Unknown';
    
    // Parse attributes from getAttribute calls
    const attributes = [];
    const attrRegex = /this\.getAttribute\(['"](\w+)['"]\)/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(sourceCode)) !== null) {
        const name = attrMatch[1];
        const lineIndex = sourceCode.substring(0, attrMatch.index).split('\n').length;
        
        let type = 'string';
        let variantOptions = null;
        
        const contextLine = lines[lineIndex - 1] || '';
        if (contextLine.includes('parseInt') || contextLine.includes('parseFloat') || contextLine.includes('Number(')) {
            type = 'number';
        }
        if (sourceCode.includes(`hasAttribute('${name}')`)) {
            type = 'boolean';
        }
        
        // Check for dropdown options for ANY attribute (excluding known string-only)
        if (name !== 'href' && name !== 'src' && name !== 'alt' && name !== 'title' && name !== 'class' && name !== 'id') {
            variantOptions = extractVariantOptions(sourceCode, name);
            if (variantOptions && variantOptions.length > 0) {
                type = 'variant';
            }
        }
        
        if (!attributes.find(a => a.name === name)) {
            attributes.push({ name, type, defaultValue: '', currentValue: '', line: lineIndex, variantOptions });
        }
    }
    
    // Parse CSS variables from template
    const cssVariables = [];
    const cssVarRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let cssMatch;
    while ((cssMatch = cssVarRegex.exec(sourceCode)) !== null) {
        const name = `--${cssMatch[1]}`;
        const defaultValue = cssMatch[2].trim();
        const lineIndex = sourceCode.substring(0, cssMatch.index).split('\n').length;
        cssVariables.push({ name, defaultValue, currentValue: defaultValue, line: lineIndex });
    }
    
    // Parse :host styles
    const hostStyles = [];
    const hostMatch = sourceCode.match(/:host\s*\{([^}]+)\}/);
    if (hostMatch) {
        const hostContent = hostMatch[1];
        const styleRegex = /([a-z-]+)\s*:\s*([^;]+);/gi;
        let styleMatch;
        while ((styleMatch = styleRegex.exec(hostContent)) !== null) {
            const prop = styleMatch[1].trim();
            const value = styleMatch[2].trim();
            // Skip CSS variables (already captured)
            if (!prop.startsWith('--')) {
                hostStyles.push({ property: prop, value });
            }
        }
    }
    
    // Parse computed styles from template (common patterns)
    const inlineStyles = [];
    const styleAttrRegex = /style\s*=\s*["']([^"']+)["']/g;
    let inlineMatch;
    while ((inlineMatch = styleAttrRegex.exec(sourceCode)) !== null) {
        const styleContent = inlineMatch[1];
        const props = styleContent.split(';').filter(s => s.trim());
        props.forEach(p => {
            const [prop, value] = p.split(':').map(s => s.trim());
            if (prop && value && !inlineStyles.find(s => s.property === prop)) {
                inlineStyles.push({ property: prop, value });
            }
        });
    }
    
    // Detect if component uses Shadow DOM
    const usesShadowDOM = sourceCode.includes('static useShadowDOM = true') || 
                          sourceCode.includes('this.attachShadow');
    
    // Detect observed attributes
    // Detect observed attributes — supports both static field and getter syntax
    const observedAttrsMatch = sourceCode.match(/static\s+(?:get\s+)?observedAttributes(?:\s*\(\s*\)\s*\{\s*return)?\s*[=]?\s*\[([^\]]+)\]/);
    console.log(`[DEBUG] observedAttributes match for ${tagName}:`, observedAttrsMatch ? observedAttrsMatch[1] : 'NOT FOUND');
    if (observedAttrsMatch) {
        const attrNames = observedAttrsMatch[1].match(/['"]([^'"]+)['"]/g);
        if (attrNames) {
            attrNames.forEach(name => {
                const cleanName = name.replace(/['"]/g, '');
                if (!attributes.find(a => a.name === cleanName)) {
                    // Determine attribute type
                    let attrType = 'string';
                    let variantOptions = null;
                    
                    // Boolean attributes
                    const booleanAttrs = ['disabled', 'readonly', 'required', 'checked', 'selected', 'hidden', 'loading'];
                    if (booleanAttrs.includes(cleanName)) {
                        attrType = 'boolean';
                    }
                    // Try to extract dropdown options for ANY attribute
                    else if (cleanName !== 'href' && cleanName !== 'src' && cleanName !== 'class' && cleanName !== 'id') {
                        console.log(`[DEBUG] Extracting options for ${cleanName}...`);
                        variantOptions = extractVariantOptions(sourceCode, cleanName);
                        console.log(`[DEBUG] Extracted options for ${cleanName}:`, variantOptions);
                        if (variantOptions && variantOptions.length > 0) {
                            attrType = 'variant';
                        }
                    }
                    // Number attributes
                    if (['count', 'max', 'min', 'step', 'duration', 'delay', 'index'].includes(cleanName)) {
                        attrType = 'number';
                    }
                    
                    attributes.push({ 
                        name: cleanName, 
                        type: attrType, 
                        defaultValue: '', 
                        currentValue: '', 
                        line: 0,
                        variantOptions 
                    });
                    
                    console.warn(`[DEBUG] Added attribute: ${cleanName}, type: ${attrType}, options:`, variantOptions);
                }
            });
        }
    }
    
    return {
        tagName,
        filePath: filePath.replace(ROOT_DIR + path.sep, '').replace(/\\/g, '/'),
        absoluteFilePath: filePath,
        className,
        attributes,
        cssVariables,
        hostStyles,
        inlineStyles,
        usesShadowDOM,
        slots: [],
        sourceCode
    };
}

/**
 * Extract variant options from component source
 * Priority: 1) static attributeOptions, 2) CSS patterns, 3) code patterns
 */
function extractVariantOptions(sourceCode, attributeName) {
    const options = new Set();
    
    // PRIORITY 1: Check for static attributeOptions property
    const attributeOptionsRegex = /static\s+attributeOptions\s*=\s*\{([^}]+)\}/s;
    const attributeOptionsMatch = sourceCode.match(attributeOptionsRegex);
    
    if (attributeOptionsMatch) {
        const optionsBlock = attributeOptionsMatch[1];
        // Match the specific attribute and its array
        const attrRegex = new RegExp(`['"]?${attributeName.replace('-', '[\\-_]?')}['"]?\\s*:\\s*\\[([^\\]]+)\\]`, 'i');
        const attrMatch = optionsBlock.match(attrRegex);
        
        if (attrMatch) {
            // Separate single/double quote patterns — prevents cross-boundary matches on adjacent empty strings like '' '_blank'
            const pattern = /'([^']*)'|"([^"]*)"/g;
            let m;
            while ((m = pattern.exec(attrMatch[1])) !== null) {
                const val = m[1] !== undefined ? m[1] : m[2];
                options.add(val);
            }
            if (options.size > 0) {
                console.log(`[DEBUG] Found attributeOptions for ${attributeName}:`, Array.from(options));
                return Array.from(options);
            }
        }
    }
    
    // PRIORITY 2 & 3: Fallback to CSS/code pattern detection
    const sizeKeywords = ['sm', 'md', 'lg', 'xl', 'xs', 'small', 'medium', 'large', 'tiny', 'huge'];
    const variantKeywords = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 
                            'light', 'dark', 'outline', 'ghost', 'link', 'text', 'error'];
    const positionKeywords = ['left', 'right', 'top', 'bottom', 'center', 'start', 'end'];
    
    if (attributeName === 'size') {
        // Match patterns like: .nc-btn-sm, .size-lg, .small, etc.
        const sizeRegex = new RegExp(`\\.(?:[a-z]+-)?(?:btn-|size-)?(${sizeKeywords.join('|')})\\s*\\{`, 'gi');
        let match;
        while ((match = sizeRegex.exec(sourceCode)) !== null) {
            const size = match[1].toLowerCase();
            options.add(size);
        }
        
        // Match :host([size="sm"]) or :host([size='lg'])
        const hostSizeRegex = new RegExp(`:host\\(\\[size=["'](${sizeKeywords.join('|')})["']\\]\\)`, 'gi');
        let hostMatch;
        while ((hostMatch = hostSizeRegex.exec(sourceCode)) !== null) {
            const size = hostMatch[1].toLowerCase();
            options.add(size);
        }
        
        // Also check for comments like /* Sizes */ or /* Size: sm, md, lg */
        const commentRegex = /\/\*\s*Sizes?\s*:?\s*\*\/[\s\S]*?(?=\/\*|$)/gi;
        let commentMatch;
        while ((commentMatch = commentRegex.exec(sourceCode)) !== null) {
            const section = commentMatch[0];
            sizeKeywords.forEach(keyword => {
                if (section.toLowerCase().includes(keyword)) {
                    options.add(keyword);
                }
            });
        }
        
        console.log(`[DEBUG] Size options found for ${attributeName}:`, Array.from(options));
    } else if (attributeName === 'variant') {
        // Match patterns like: .nc-btn-primary, .variant-success, .btn-danger, etc.
        const variantRegex = new RegExp(`\\.(?:[a-z]+-)?(?:btn-|variant-)?(${variantKeywords.join('|')})\\s*\\{`, 'gi');
        let match;
        
        while ((match = variantRegex.exec(sourceCode)) !== null) {
            const variant = match[1].toLowerCase();
            options.add(variant);
        }
        
        // Match :host([variant="primary"]) or :host([variant='primary'])
        const hostVariantRegex = new RegExp(`:host\\(\\[variant=["'](${variantKeywords.join('|')})["']\\]\\)`, 'gi');
        let hostMatch;
        while ((hostMatch = hostVariantRegex.exec(sourceCode)) !== null) {
            const variant = hostMatch[1].toLowerCase();
            options.add(variant);
        }
        
        // Also check for comments like /* Variant: Primary */ or /* Variants */
        const commentRegex = /\/\*\s*Variants?\s*:?\s*\*\/[\s\S]*?(?=\/\*|$)/gi;
        let commentMatch;
        while ((commentMatch = commentRegex.exec(sourceCode)) !== null) {
            const section = commentMatch[0];
            variantKeywords.forEach(keyword => {
                if (section.toLowerCase().includes(keyword)) {
                    options.add(keyword);
                }
            });
        }
        
        console.log(`[DEBUG] Variant options found for ${attributeName}:`, Array.from(options));
    } else if (attributeName.includes('position')) {
        // Match iconPosition === 'left', icon-position="right", etc.
        const positionRegex = new RegExp(`(${positionKeywords.join('|')})`, 'gi');
        let match;
        while ((match = positionRegex.exec(sourceCode)) !== null) {
            const pos = match[1].toLowerCase();
            // Only add if it's in a relevant context (near icon-position or iconPosition)
            const contextStart = Math.max(0, match.index - 100);
            const contextEnd = Math.min(sourceCode.length, match.index + 100);
            const context = sourceCode.substring(contextStart, contextEnd);
            if (context.includes('position') || context.includes('flex-direction')) {
                options.add(pos);
            }
        }
        
        console.log(`[DEBUG] Position options found for ${attributeName}:`, Array.from(options));
    }
    
    return options.size > 0 ? Array.from(options).sort() : null;
}

/**
 * Edit component file with style changes
 */
async function editComponentFile({ tagName, filePath, changes, styleChanges }) {
    const fullPath = validatePath(filePath);
    
    if (!fs.existsSync(fullPath)) {
        return { success: false, message: `File not found: ${filePath}` };
    }
    
    try {
        let sourceCode = fs.readFileSync(fullPath, 'utf-8');
        
        // Handle style changes - inject into component's host styles
        if (styleChanges && Object.keys(styleChanges).length > 0) {
            // Convert camelCase to kebab-case for CSS
            const cssProperties = Object.entries(styleChanges)
                .map(([prop, value]) => {
                    const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                    return `${kebabProp}: ${value};`;
                })
                .join('\n                ');
            
            // Check if :host styles already exist
            if (sourceCode.includes(':host {')) {
                // Update existing :host block
                sourceCode = sourceCode.replace(
                    /(:host\s*\{[^}]*)(})/,
                    `$1\n                ${cssProperties}\n            $2`
                );
            } else if (sourceCode.includes('<style>')) {
                // Add :host block after <style> tag
                sourceCode = sourceCode.replace(
                    /(<style>)/,
                    `$1\n            :host {\n                ${cssProperties}\n            }`
                );
            }
            
            console.log(`[DevTools] Style changes for <${tagName}>:`, styleChanges);
        }
        
        // Handle legacy changes format
        if (changes && Array.isArray(changes)) {
            for (const change of changes) {
                if (change.type === 'attribute') {
                    console.log(`[DevTools] Attribute change: ${change.name} = ${change.value}`);
                }
                
                if (change.type === 'cssVariable') {
                    const varRegex = new RegExp(`(${change.name}\\s*:\\s*)([^;]+)(;)`, 'g');
                    sourceCode = sourceCode.replace(varRegex, `$1${change.value}$3`);
                }
            }
        }
        
        // Write the file
        fs.writeFileSync(fullPath, sourceCode, 'utf-8');
        
        return { success: true, message: 'Component updated successfully' };
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/** Map SPA paths to view HTML files (used by DevTools instance save + SEO patch). */
function resolveViewHtmlPath(viewPath) {
    const viewsMap = {
        '/': 'src/views/public/home.html',
    };

    let htmlFilePath = viewsMap[viewPath];
    if (!htmlFilePath) {
        for (const [route, file] of Object.entries(viewsMap)) {
            if (route.includes(':')) {
                const routePattern = route.replace(/:[^/]+/g, '[^/]+');
                const regex = new RegExp(`^${routePattern}$`);
                if (regex.test(viewPath)) {
                    htmlFilePath = file;
                    break;
                }
            }
        }
    }
    return htmlFilePath || null;
}

function escapeSeoAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
}

function escapeSeoTitleText(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Apply SEO-related edits from the dev overlay: index.html head tags + current route view HTML.
 */
async function saveSeoDevPatches({ viewPath, head, view }) {
    try {
        const headActive = head && typeof head === 'object' && Object.keys(head).some(
            (k) => head[k] !== undefined && head[k] !== ''
        );
        const viewActive = view && typeof view === 'object' && (
            (view.firstH1 !== undefined && view.firstH1 !== '') ||
            (Array.isArray(view.imageAlts) && view.imageAlts.some((x) => x && x.srcContains && x.alt !== undefined))
        );

        if (!headActive && !viewActive) {
            return { success: false, message: 'No SEO fields to save' };
        }

        if (headActive) {
            const indexPath = validatePath('index.html');
            if (!fs.existsSync(indexPath)) {
                return { success: false, message: 'index.html not found' };
            }
            let idx = fs.readFileSync(indexPath, 'utf-8');

            if (head.htmlLang !== undefined && head.htmlLang !== '') {
                idx = idx.replace(/<html(\s[^>]*)?>/im, (full) => {
                    if (/lang\s*=/i.test(full)) {
                        return full.replace(/lang\s*=\s*"[^"]*"/i, `lang="${escapeSeoAttr(head.htmlLang)}"`);
                    }
                    return full.replace('<html', `<html lang="${escapeSeoAttr(head.htmlLang)}"`);
                });
            }

            if (head.title !== undefined && head.title !== '') {
                idx = idx.replace(/<title>[^<]*<\/title>/i, `<title>${escapeSeoTitleText(head.title)}</title>`);
                idx = idx.replace(
                    /(<meta\s+name="title"\s+content=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.title)}$2`
                );
            }
            if (head.metaDescription !== undefined && head.metaDescription !== '') {
                idx = idx.replace(
                    /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.metaDescription)}$2`
                );
            }
            if (head.canonicalHref !== undefined && head.canonicalHref !== '') {
                idx = idx.replace(
                    /(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.canonicalHref)}$2`
                );
            }
            if (head.ogTitle !== undefined && head.ogTitle !== '') {
                idx = idx.replace(
                    /(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.ogTitle)}$2`
                );
                idx = idx.replace(
                    /(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.ogTitle)}$2`
                );
            }
            if (head.ogDescription !== undefined && head.ogDescription !== '') {
                idx = idx.replace(
                    /(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.ogDescription)}$2`
                );
                idx = idx.replace(
                    /(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/i,
                    `$1${escapeSeoAttr(head.ogDescription)}$2`
                );
            }

            fs.writeFileSync(indexPath, idx, 'utf-8');
            console.log('[DevTools] SEO: updated index.html head');
            notifyHMRClients('index.html');
        }

        if (viewActive) {
            const htmlFilePath = resolveViewHtmlPath(viewPath);
            if (!htmlFilePath) {
                return {
                    success: false,
                    message: `Unknown view path for SEO view patch: ${viewPath}. Add it to resolveViewHtmlPath in server.js`
                };
            }
            const fullPath = validatePath(htmlFilePath);
            if (!fs.existsSync(fullPath)) {
                return { success: false, message: `View file not found: ${htmlFilePath}` };
            }
            let content = fs.readFileSync(fullPath, 'utf-8');

            if (view.firstH1 !== undefined && view.firstH1 !== '') {
                content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, (match) => {
                    const open = match.match(/^<h1[^>]*>/i);
                    return open ? `${open[0]}${escapeSeoTitleText(view.firstH1)}</h1>` : match;
                });
            }

            if (Array.isArray(view.imageAlts)) {
                for (const { srcContains, alt } of view.imageAlts) {
                    if (!srcContains || alt === undefined) continue;
                    const esc = escapeSeoAttr(alt);
                    content = content.replace(/<img[^>]+>/gi, (tag) => {
                        if (!tag.includes(srcContains)) return tag;
                        if (/alt\s*=\s*"/i.test(tag)) {
                            return tag.replace(/alt\s*=\s*"[^"]*"/i, `alt="${esc}"`);
                        }
                        return tag.replace(/<img/i, `<img alt="${esc}"`);
                    });
                }
            }

            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`[DevTools] SEO: updated view ${htmlFilePath}`);
            notifyHMRClients(htmlFilePath);
        }

        return { success: true, message: 'SEO patches saved' };
    } catch (error) {
        console.error('[DevTools] SEO save error:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Save changes to a specific component instance in an HTML file
 */
async function saveInstanceChanges({ tagName, viewPath, attributes, inlineStyles, elementIndex }) {
    try {
        console.log('[DevTools] saveInstanceChanges called with:', { tagName, viewPath, attributes, elementIndex });

        const htmlFilePath = resolveViewHtmlPath(viewPath);

        if (!htmlFilePath) {
            console.error('[DevTools] Unknown view path:', viewPath);
            return { success: false, message: `Unknown view path: ${viewPath}. Add it to viewsMap in server.js` };
        }

        const fullPath = validatePath(htmlFilePath);
        if (!fs.existsSync(fullPath)) {
            console.error('[DevTools] View file not found:', htmlFilePath);
            return { success: false, message: `View file not found: ${htmlFilePath}` };
        }

        let content = fs.readFileSync(fullPath, 'utf-8');
        
        // Find the specific component tag instance
        const tagRegex = new RegExp(`<${tagName}([^>]*)>`, 'g');
        let matches = [];
        let match;
        
        while ((match = tagRegex.exec(content)) !== null) {
            matches.push({ index: match.index, fullMatch: match[0], attrs: match[1] });
        }

        console.log('[DevTools] Found', matches.length, 'instances of', tagName, 'in', htmlFilePath);
        console.log('[DevTools] Looking for elementIndex:', elementIndex);

        if (elementIndex >= matches.length) {
            console.error('[DevTools] Component instance not found. Index:', elementIndex, 'Total:', matches.length);
            return { success: false, message: `Component instance ${elementIndex} not found (found ${matches.length} instances)` };
        }

        const targetMatch = matches[elementIndex];
        
        // Parse existing attributes from the tag
        const existingAttrs = {};
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(targetMatch.attrs)) !== null) {
            existingAttrs[attrMatch[1]] = attrMatch[2];
        }
        
        // Merge with new attributes (new values override existing)
        const mergedAttrs = { ...existingAttrs, ...attributes };
        
        // Build new attributes string
        const attrPairs = [];
        
        // Add merged attributes
        for (const [key, value] of Object.entries(mergedAttrs)) {
            if (key !== 'style') { // Handle style separately
                attrPairs.push(`${key}="${value}"`);
            }
        }
        
        // Add inline styles as style attribute
        if (inlineStyles && Object.keys(inlineStyles).length > 0) {
            const styleString = Object.entries(inlineStyles)
                .map(([prop, value]) => {
                    const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                    return `${kebabProp}: ${value}`;
                })
                .join('; ');
            attrPairs.push(`style="${styleString}"`);
        }

        const newTag = attrPairs.length > 0 
            ? `<${tagName} ${attrPairs.join(' ')}>`
            : `<${tagName}>`;
        
        // Replace the specific instance
        content = content.substring(0, targetMatch.index) + newTag + content.substring(targetMatch.index + targetMatch.fullMatch.length);
        
        fs.writeFileSync(fullPath, content, 'utf-8');
        
        console.log(`[DevTools] Saved instance changes for <${tagName}> in ${htmlFilePath}`);
        
        // Trigger HMR to update the page
        notifyHMRClients(htmlFilePath);
        
        return { success: true, message: 'Instance changes saved successfully' };
        
    } catch (error) {
        console.error('[DevTools] Error saving instance changes:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Save changes globally to the component TypeScript file
 */
async function saveGlobalChanges({ tagName, filePath, defaultAttributes, styleChanges }) {
    try {
        const fullPath = validatePath(filePath);
        
        if (!fs.existsSync(fullPath)) {
            return { success: false, message: `Component file not found: ${filePath}` };
        }

        let sourceCode = fs.readFileSync(fullPath, 'utf-8');
        
        // Update default attribute values in the template() method
        if (defaultAttributes && Object.keys(defaultAttributes).length > 0) {
            for (const [attrName, attrValue] of Object.entries(defaultAttributes)) {
                // Look for this.attr() calls or getAttribute() calls in template
                const attrPattern = new RegExp(`(this\\.attr\\(['"]${attrName}['"],\\s*['"])([^'"]+)(['"]\\))`, 'g');
                if (sourceCode.match(attrPattern)) {
                    sourceCode = sourceCode.replace(attrPattern, `$1${attrValue}$3`);
                    console.log(`[DevTools] Updated default for ${attrName} to ${attrValue}`);
                }
            }
        }

        // Handle style changes in :host block
        if (styleChanges && Object.keys(styleChanges).length > 0) {
            const cssProperties = Object.entries(styleChanges)
                .map(([prop, value]) => {
                    const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                    return `${kebabProp}: ${value};`;
                })
                .join('\n                ');
            
            if (sourceCode.includes(':host {')) {
                sourceCode = sourceCode.replace(
                    /(:host\s*\{[^}]*)(})/,
                    `$1\n                ${cssProperties}\n            $2`
                );
            } else if (sourceCode.includes('<style>')) {
                sourceCode = sourceCode.replace(
                    /(<style>)/,
                    `$1\n            :host {\n                ${cssProperties}\n            }`
                );
            }
        }

        fs.writeFileSync(fullPath, sourceCode, 'utf-8');
        
        console.log(`[DevTools] Saved global changes for <${tagName}>`);
        notifyHMRClients(fullPath);
        return { success: true, message: 'Global changes saved successfully' };
        
    } catch (error) {
        console.error('[DevTools] Error saving global changes:', error);
        return { success: false, message: error.message };
    }
}

function readProjectConfig() {
    const configPath = path.join(ROOT_DIR, 'nativecore.config.json');
    let useTypeScript = true;
    try {
        if (fs.existsSync(configPath)) {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (cfg.useTypeScript === false) useTypeScript = false;
        }
    } catch {
        // default TypeScript
    }
    return {
        useTypeScript,
        language: useTypeScript ? 'ts' : 'js',
        sourceExt: useTypeScript ? 'ts' : 'js',
    };
}

function isBuilderOwnedSource(source) {
    return typeof source === 'string'
        && source.includes('Auto-generated by NativeCore Component Builder')
        && source.includes('@nativecore-builder-owned true');
}

/**
 * List user UI components under src/components/ui for the Component Builder.
 */
function listUiComponents() {
    const uiDir = path.join(ROOT_DIR, 'src/components/ui');
    if (!fs.existsSync(uiDir)) {
        return [];
    }

    return fs.readdirSync(uiDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.(ts|js)$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
        .map((entry) => {
            const filePath = path.join(uiDir, entry.name);
            const source = fs.readFileSync(filePath, 'utf-8');
            const tag = entry.name.replace(/\.(ts|js)$/, '');
            const classMatch = source.match(/export\s+class\s+(\w+)/);
            const descMatch = source.match(/\/\*\*[\s\S]*?\*\s+([^\n*]+)\s*\n\s*\*\s+Auto-generated by NativeCore Component Builder/);
            return {
                tag,
                className: classMatch ? classMatch[1] : tag.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(''),
                file: `src/components/ui/${entry.name}`,
                ext: path.extname(entry.name).slice(1),
                builderGenerated: source.includes('Auto-generated by NativeCore Component Builder'),
                builderOwned: isBuilderOwnedSource(source),
                description: descMatch && !descMatch[1].includes('@nativecore') ? descMatch[1].trim() : '',
            };
        })
        .sort((a, b) => a.tag.localeCompare(b.tag));
}

/**
 * Create a new UI component file and register it in appRegistry.
 */
async function createComponentAndRegister({ tag, className, code, force = false }) {
    try {
        const project = readProjectConfig();
        const safeTag = String(tag || '').trim().toLowerCase();
        if (!safeTag || !/^[a-z][a-z0-9-]*-[a-z0-9-]+$/.test(safeTag)) {
            return { success: false, message: 'Invalid tag. Use kebab-case and include a dash (example: my-card).' };
        }

        const safeClassName = String(className || '').trim();
        if (!safeClassName || !/^[A-Z][A-Za-z0-9]*$/.test(safeClassName)) {
            return { success: false, message: 'Invalid className. Use PascalCase (example: MyCard).' };
        }

        const sourceCode = String(code || '').trim();
        if (!sourceCode) {
            return { success: false, message: 'Missing component code.' };
        }

        const uiDir = validatePath('src/components/ui');
        if (!fs.existsSync(uiDir)) {
            fs.mkdirSync(uiDir, { recursive: true });
        }

        const preferredPath = validatePath(path.join('src/components/ui', `${safeTag}.${project.sourceExt}`));
        const otherExt = project.sourceExt === 'ts' ? 'js' : 'ts';
        const otherPath = validatePath(path.join('src/components/ui', `${safeTag}.${otherExt}`));
        const preferredExists = fs.existsSync(preferredPath);
        const otherExists = fs.existsSync(otherPath);
        const existed = preferredExists || otherExists;

        let existingSource = '';
        if (preferredExists) existingSource = fs.readFileSync(preferredPath, 'utf-8');
        else if (otherExists) existingSource = fs.readFileSync(otherPath, 'utf-8');

        const builderOwned = existingSource ? isBuilderOwnedSource(existingSource) : true;
        if (existed && !builderOwned && !force) {
            return {
                success: false,
                needsForce: true,
                builderOwned: false,
                exists: true,
                language: project.language,
                filePath: (preferredExists ? preferredPath : otherPath)
                    .replace(ROOT_DIR + path.sep, '')
                    .replace(/\\/g, '/'),
                message: 'File exists and is not builder-owned. Pass force:true to overwrite.',
            };
        }

        // Write in the project language; remove the opposite-extension leftover if present.
        const fullPath = preferredPath;
        fs.writeFileSync(fullPath, `${sourceCode}\n`, 'utf-8');
        if (otherExists) {
            try { fs.unlinkSync(otherPath); } catch { /* ignore */ }
        }

        const registryCandidates = [
            validatePath(`src/components/appRegistry.${project.sourceExt}`),
            validatePath('src/components/appRegistry.ts'),
            validatePath('src/components/appRegistry.js'),
        ];
        const registryPath = registryCandidates.find((p) => fs.existsSync(p));
        if (!registryPath) {
            return { success: false, message: `appRegistry.${project.sourceExt} not found at src/components/` };
        }

        const registryLine = `    componentRegistry.register('${safeTag}', './ui/${safeTag}.js');`;
        let registrySource = fs.readFileSync(registryPath, 'utf-8');
        let registryUpdated = false;

        if (!registrySource.includes(registryLine)) {
            const fnRegex = /(export\s+function\s+registerAppComponents\s*\([^)]*\)(?:\s*:\s*void)?\s*\{)([\s\S]*?)(\n\})/m;
            const fnMatch = registrySource.match(fnRegex);

            if (fnMatch) {
                const fnBody = fnMatch[2];
                const hasBodyContent = fnBody.trim().length > 0;
                const injectedBody = hasBodyContent
                    ? `${fnBody}\n${registryLine}`
                    : `\n${registryLine}`;

                registrySource = registrySource.replace(fnRegex, `${fnMatch[1]}${injectedBody}${fnMatch[3]}`);
            } else {
                const sig = project.useTypeScript
                    ? 'export function registerAppComponents(): void'
                    : 'export function registerAppComponents()';
                registrySource = `${registrySource.trimEnd()}\n\n${sig} {\n${registryLine}\n}\n`;
            }

            fs.writeFileSync(registryPath, registrySource, 'utf-8');
            registryUpdated = true;
        }

        const relativePath = fullPath.replace(ROOT_DIR + path.sep, '').replace(/\\/g, '/');
        const relativeRegistry = registryPath.replace(ROOT_DIR + path.sep, '').replace(/\\/g, '/');
        console.log(`[DevTools] ${existed ? 'Updated' : 'Created'} component <${safeTag}> at ${relativePath}`);
        if (registryUpdated) {
            console.log(`[DevTools] Registered <${safeTag}> in ${relativeRegistry}`);
        } else {
            console.log(`[DevTools] Registry already contained <${safeTag}>`);
        }

        notifyHMRClients(fullPath);
        notifyHMRClients(registryPath);

        return {
            success: true,
            message: existed ? 'Component updated' : 'Component created and registered',
            filePath: relativePath,
            registryPath: relativeRegistry,
            registryUpdated,
            overwritten: existed,
            builderOwned: true,
            language: project.language,
        };
    } catch (error) {
        console.error('[DevTools] Error creating component:', error);
        return { success: false, message: error.message };
    }
}

// Handle API routes
async function handleApiRoute(req, res) {
    const pathname = getRequestPathname(req);
    const query = getRequestQuery(req);
    const method = req.method;

    // CORS headers
    const allowedOrigin = req.headers.origin || `http://localhost:${PORT}`;
    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(allowedOrigin);
    res.setHeader('Access-Control-Allow-Origin', isLocalOrigin ? allowedOrigin : `http://localhost:${PORT}`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // GET /api/sse/demo — dev mock Server-Sent Events stream (see api/mockApi.js)
        if (pathname === mockApi.DEV_SSE_DEMO_PATH && method === 'GET') {
            const intervalParam = new URLSearchParams(query).get('interval');
            const intervalMs = intervalParam ? Number(intervalParam) : undefined;
            mockApi.attachDevDemoSSE(req, res, intervalMs && !Number.isNaN(intervalMs) ? { intervalMs } : {});
            return;
        }

        // ── Dev Tools API ─────────────────────────────────────────────────────
        // GET /api/dev/project-config — language mode for Component Builder
        if (pathname === '/api/dev/project-config' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(readProjectConfig()));
            return;
        }

        // GET /api/dev/components — list user UI components for Component Builder
        if (pathname === '/api/dev/components' && method === 'GET') {
            const project = readProjectConfig();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...project, components: listUiComponents() }));
            return;
        }

        if (pathname.startsWith('/api/dev/component/') && method === 'GET' && !pathname.includes('/edit')) {
            const tagName = pathname.replace('/api/dev/component/', '');
            const metadata = await getComponentMetadata(tagName);
            
            if (!metadata) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Component <${tagName}> not found` }));
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(metadata));
            return;
        }
        
        // POST /api/dev/component/edit - Edit component file
        if (pathname === '/api/dev/component/edit' && method === 'POST') {
            const body = await parseBody(req);
            const result = await editComponentFile(body);
            
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // POST /api/dev/component/create - Create component file in ui/ and register it
        if (pathname === '/api/dev/component/create' && method === 'POST') {
            const body = await parseBody(req);
            const result = await createComponentAndRegister(body);

            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // POST /api/dev/component/save-instance - Save instance changes to HTML
        if (pathname === '/api/dev/component/save-instance' && method === 'POST') {
            const body = await parseBody(req);
            const result = await saveInstanceChanges(body);
            
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // POST /api/dev/component/save-global - Save global changes to component file
        if (pathname === '/api/dev/component/save-global' && method === 'POST') {
            const body = await parseBody(req);
            const result = await saveGlobalChanges(body);
            
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // POST /api/dev/seo/save — dev overlay SEO tool (index.html + current view HTML)
        if (pathname === '/api/dev/seo/save' && method === 'POST') {
            const body = await parseBody(req);
            const result = await saveSeoDevPatches(body);
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // POST /api/dev/component/delete-instance - Delete component instance from HTML
        if (pathname === '/api/dev/component/delete-instance' && method === 'POST') {
            const body = await parseBody(req);
            const { tagName, htmlPath, outerHTML } = body;
            const fullPath = validatePath(htmlPath);

            if (!fs.existsSync(fullPath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'HTML file not found' }));
                return;
            }

            let htmlContent = fs.readFileSync(fullPath, 'utf-8');
            
            // Remove the exact instance (including attributes and content)
            const escapedHTML = outerHTML.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedHTML, 'g');
            
            if (!htmlContent.match(regex)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Component instance not found in HTML' }));
                return;
            }

            htmlContent = htmlContent.replace(regex, '');
            fs.writeFileSync(fullPath, htmlContent, 'utf-8');

            console.log(`[DevTools] Deleted <${tagName}> instance from ${htmlPath}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));

            // Trigger HMR
            notifyHMRClients(htmlPath);
            return;
        }
        
        // API route not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
        
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error: ' + error.message }));
    }
}

const server = http.createServer(async (req, res) => {
    const pathOnly = getRequestPathname(req);
    if (pathOnly.startsWith('/api/')) {
        await handleApiRoute(req, res);
        return;
    }
    
    // Strip query parameters for file path resolution
    const urlWithoutQuery = req.url.split('?')[0];

    // Handle static files and SPA routing
    // public/ is the single source of truth for static assets — resolve /assets/* from there
    let filePath;
    if (urlWithoutQuery.startsWith('/assets/')) {
        filePath = path.join(ROOT_DIR, 'public', urlWithoutQuery);
    } else {
        filePath = path.join(ROOT_DIR, urlWithoutQuery === '/' ? 'index.html' : urlWithoutQuery);
    }
    const pathExists = fs.existsSync(filePath);
    const pathIsDirectory = pathExists ? fs.statSync(filePath).isDirectory() : false;
    
    // Handle favicon - return 204 if not found to avoid errors
    if (urlWithoutQuery === '/favicon.ico' && !fs.existsSync(filePath)) {
        res.writeHead(204); // No Content
        res.end();
        return;
    }
    
    // Determine if this is a file request or a route request
    const ext = path.extname(urlWithoutQuery);
    const isFileRequest = ext && ext !== '';
    
    // Check if file exists (only for actual file requests with extensions)
    if (isFileRequest && !pathExists) {
        // File request but file doesn't exist - return 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found: ' + urlWithoutQuery);
        return;
    }
    
    // If file doesn't exist and no extension, serve index.html for SPA routing
    if (!isFileRequest && (!pathExists || pathIsDirectory)) {
        filePath = path.join(ROOT_DIR, 'index.html');
    }
    
    // Get file extension
    const fileExt = path.extname(filePath);
    const contentType = MIME_TYPES[fileExt] || 'text/plain';
    
    // Read and serve file — check in-memory cache first, fall back to disk.
    let content = getCachedFile(filePath);
    if (content === null) {
        try {
            content = fs.readFileSync(filePath);
            setCachedFile(filePath, content);
        } catch (error) {
            res.writeHead(500);
            res.end('Server Error: ' + error.code);
            return;
        }
    }

    // Build response headers
    const headers = { 'Content-Type': contentType };

    // Security headers
    headers['X-Frame-Options'] = 'DENY';
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';

    // In development, disable all caching for instant updates
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // In development, set a permissive CSP to allow HMR/devtools eval
    if (isDevelopment && contentType === 'text/html') {
        const connectSrc = [
            "'self'",
            'ws://localhost:8001',
        ].join(' ');

        headers['Content-Security-Policy'] = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            `connect-src ${connectSrc}`,
            "img-src 'self' data:"
        ].join('; ');
    } else if (!isDevelopment && contentType === 'text/html') {
        headers['Content-Security-Policy'] = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self'",
            "img-src 'self' data: https:",
            "frame-ancestors 'none'"
        ].join('; ');
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    if (isDevelopment) {
        // No caching in development for HMR
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
    } else {
        // Production caching (with cache busting in place)
        if (['.css', '.js'].includes(fileExt)) {
            headers['Cache-Control'] = 'public, max-age=86400';
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'].includes(fileExt)) {
            headers['Cache-Control'] = 'public, max-age=2592000';
        } else if (fileExt === '.html') {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        }
    }

    res.writeHead(200, headers);
    res.end(content, 'utf-8');
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Serving files from: ${ROOT_DIR}`);
    console.log(`SPA mode: All routes fallback to index.html`);
    console.log(`Mock API: /api/* endpoints available`);
    warmStaticCache();
});

// ========== Hot Module Replacement (HMR) ==========

const wss = new WebSocketServer({ port: HMR_PORT });
const hmrClients = new Set();

// Server-level error handler so a flaky socket never takes the dev server down.
wss.on('error', (err) => {
    console.error('🔥 HMR server error (non-fatal):', err.message);
});

function safeSend(client, message) {
    // readyState 1 = OPEN. We still wrap send() because the socket can move to
    // CLOSING between the check and the call, which would otherwise throw.
    if (client.readyState !== 1) return;
    try {
        client.send(message);
    } catch (err) {
        // Drop the client; ws emits 'close' separately, but cleaning up here
        // avoids repeated send attempts in tight notification bursts.
        hmrClients.delete(client);
        console.warn('🔥 HMR: dropped a client mid-send:', err.message);
    }
}

function notifyHMRClients(file = 'unknown') {
    const message = JSON.stringify({ type: 'file-changed', file, timestamp: Date.now() });
    hmrClients.forEach(client => safeSend(client, message));
}

// Track connected HMR clients
wss.on('connection', (ws) => {
    hmrClients.add(ws);
    console.log('🔥 HMR client connected');

    ws.on('close', () => {
        hmrClients.delete(ws);
        console.log('🔥 HMR client disconnected');
    });

    ws.on('error', (error) => {
        // Always remove the client when its socket errors so we don't keep
        // notifying a half-closed peer.
        hmrClients.delete(ws);
        console.error('🔥 HMR WebSocket error:', error.message);
    });
});

console.log(`🔥 HMR enabled on ws://localhost:${HMR_PORT}`);

// ── File Watchers ─────────────────────────────────────────────────────────────
//
// Strategy: the server NEVER calls the compiler. Instead:
//   - dist/ is watched for .js output written by the external esbuild watch process
//   - src/ is watched for .css and .html changes (no compilation needed)
//   - index.html in root is watched directly
//
// `npm run dev` starts both this server and the esbuild watcher in parallel via
// concurrently. esbuild compiles TypeScript and resolves all path aliases
// (@core/*, @services/*, etc.) in one pass, then writes the .hmr-ready sentinel
// so the server fires exactly one browser reload per save.
//
// Type checking (tsc --noEmit) runs alongside esbuild in the background and
// prints errors to the terminal without blocking browser reloads.

const distDir  = path.join(ROOT_DIR, 'dist');
const srcDir   = path.join(ROOT_DIR, 'src');

function notifyFile(file) {
    const message = JSON.stringify({ type: 'file-changed', file, timestamp: Date.now() });
    hmrClients.forEach(client => safeSend(client, message));
}

function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Wraps `fs.watch` so a single watcher hiccup (EPERM when a generator deletes
 * + recreates a directory, ENOENT when a folder vanishes mid-event, etc.)
 * never crashes the dev server. Returns the watcher (or null if creation
 * failed) and silently re-arms after recoverable errors.
 */
function safeWatch(target, options, listener, label = target) {
    let watcher = null;
    let restartTimer = null;
    const create = () => {
        try {
            watcher = fs.watch(target, options, listener);
            watcher.on('error', (err) => {
                // EPERM happens on Windows when the target dir is briefly
                // locked (antivirus, editor saves, scaffolding). ENOENT
                // happens when a watched subdirectory is removed.  Both
                // are recoverable — close the watcher and re-arm.
                console.warn(`[HMR] watcher "${label}" error (${err.code || 'unknown'}): ${err.message} — restarting in 500ms`);
                try { watcher?.close(); } catch { /* already closed */ }
                watcher = null;
                clearTimeout(restartTimer);
                restartTimer = setTimeout(create, 500);
            });
        } catch (err) {
            console.error(`[HMR] could not start watcher "${label}":`, err.message);
            watcher = null;
        }
    };
    create();
    return () => { try { watcher?.close(); } catch { /* ignore */ } };
}

// Watch dist/ — fires after esbuild writes compiled .js output.
// esbuild writes all changed files near-simultaneously and then the
// watch-compile.mjs script writes the .hmr-ready sentinel.
// We track the last .js file seen in the debounce window so the callback
// always fires with a real JS filename even if the final fs event was a
// .map file.
//
// Double-reload prevention: when the .hmr-ready sentinel arrives we cancel
// the 800ms fallback timer and mark sentinelFired so the fallback can never
// also fire for the same compile cycle.
let pendingJsFile = null;
let distDebounceTimer = null;
let sentinelFired = false;

// Make-command suppression: when make:* creates new .ts files tsc does a
// full recompile that writes many dist files in a burst. We suppress the
// dist watcher for a short window so the browser isn't reloaded while the
// app is still mid-init from the previous page load.
let makeSuppressUntil = 0;

safeWatch(distDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (Date.now() < makeSuppressUntil) return;
    const norm = filename.replace(/\\/g, '/');

    // Sentinel written by watch-compile.mjs after esbuild finishes.
    // Firing HMR here ensures @core/* aliases are resolved before reload.
    if (norm === '.hmr-ready') {
        clearTimeout(distDebounceTimer);
        distDebounceTimer = null;
        if (pendingJsFile && !sentinelFired) {
            sentinelFired = true;
            console.log(`[HMR] compile ready: ${pendingJsFile}`);
            notifyFile(pendingJsFile);
            pendingJsFile = null;
        }
        return;
    }

    if (norm.endsWith('.js') && !norm.endsWith('.d.ts')) {
        pendingJsFile = norm;
        sentinelFired = false;
    }
    clearTimeout(distDebounceTimer);
    distDebounceTimer = setTimeout(() => {
        distDebounceTimer = null;
        if (pendingJsFile && !sentinelFired) {
            console.log(`[HMR] dist changed: ${pendingJsFile}`);
            notifyFile(pendingJsFile);
            pendingJsFile = null;
        }
    }, 800);
}, 'dist/');

// Watch src/ — CSS and HTML only (TS is handled via dist/ above).
// `npm run make:*` commands often create new subdirectories under src/,
// which on Windows can briefly trigger EPERM/ENOENT in fs.watch — handled
// transparently by safeWatch().
let pendingSrcFile = null;
let srcDebounceTimer = null;

safeWatch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const norm = filename.replace(/\\/g, '/');
    // A new .ts file means make:* just ran. Suppress dist HMR for 5 s so the
    // browser isn't reloaded mid-init while esbuild recompiles.
    if (norm.endsWith('.ts') && eventType === 'rename') {
        makeSuppressUntil = Date.now() + 5000;
        console.log('[HMR] new .ts file detected — suppressing dist HMR for 5s');
    }
    if (norm.endsWith('.css') || norm.endsWith('.html')) {
        pendingSrcFile = norm;
    }
    clearTimeout(srcDebounceTimer);
    srcDebounceTimer = setTimeout(() => {
        if (pendingSrcFile) {
            console.log(`[HMR] src changed: ${pendingSrcFile}`);
            notifyFile(pendingSrcFile);
            pendingSrcFile = null;
        }
    }, 50);
}, 'src/');

// Watch the root shell HTML file
for (const shellFile of ['index.html']) {
    safeWatch(path.join(ROOT_DIR, shellFile), {}, debounce(() => {
        console.log(`[HMR] shell changed: ${shellFile}`);
        notifyFile(shellFile);
    }, 50), shellFile);
}

console.log('[HMR] Watching dist/ for compiled JS output');
console.log('[HMR] Watching src/ for CSS and HTML changes');
console.log('[HMR] esbuild watcher running — type errors appear in the terminal without blocking reloads');

// Last line of defence: if anything in the dev server throws asynchronously
// (e.g. a stray watcher event after teardown), log it instead of letting the
// process exit. Production builds never load this file.
process.on('uncaughtException', (err) => {
    console.error('[dev-server] uncaughtException (non-fatal):', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[dev-server] unhandledRejection (non-fatal):', reason);
});
