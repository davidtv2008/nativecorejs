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
const DEV_REMOTE_API_ORIGIN = process.env.DEV_REMOTE_API_ORIGIN || '';
const DEV_REMOTE_AUTH_LOGIN_URL = process.env.DEV_REMOTE_AUTH_LOGIN_URL || (DEV_REMOTE_API_ORIGIN ? `${DEV_REMOTE_API_ORIGIN}/auth/login` : '');
const HMR_PORT = 8001;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.ts': 'text/javascript',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

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

// ============================================
// DEV TOOLS: Component Metadata Parser
// ============================================

/**
 * Get component metadata by parsing the source file
 */
async function getComponentMetadata(tagName) {
    // Find the component file
    const possiblePaths = [
        path.join(ROOT_DIR, 'src/components/ui', `${tagName}.ts`),
        path.join(ROOT_DIR, 'src/components/core', `${tagName}.ts`),
        path.join(ROOT_DIR, 'src/components', `${tagName}.ts`)
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
                if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

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
    const observedAttrsMatch = sourceCode.match(/static get observedAttributes\(\)\s*\{\s*return\s*\[([^\]]+)\]/);
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
            const values = attrMatch[1].match(/['"]([^'"]+)['"]/g);
            if (values) {
                values.forEach(v => options.add(v.replace(/['"]/g, '')));
                console.log(`[DEBUG] Found attributeOptions for ${attributeName}:`, Array.from(options));
                return options.size > 0 ? Array.from(options) : null; // Don't sort - preserve order
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

/**
 * Save changes to a specific component instance in an HTML file
 */
async function saveInstanceChanges({ tagName, viewPath, attributes, inlineStyles, elementIndex }) {
    try {
        console.log('[DevTools] saveInstanceChanges called with:', { tagName, viewPath, attributes, elementIndex });
        
        // Map route paths to actual HTML file paths
        const viewsMap = {
            '/': 'src/views/public/home.html',
            '/about': 'src/views/public/about.html',
            '/login': 'src/views/public/login.html',
            '/components': 'src/views/public/components.html',
            '/dashboard': 'src/views/protected/dashboard.html',
            '/under-construction': 'src/views/protected/under-construction.html',
            '/testing': 'src/views/protected/testing.html',
            '/user/:id': 'src/views/protected/user-detail.html'
        };

        // Handle dynamic routes (e.g., /user/123)
        let htmlFilePath = viewsMap[viewPath];
        if (!htmlFilePath) {
            // Try to match dynamic routes
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

// Simple rate limiter for authentication endpoints
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max attempts per window

function checkRateLimit(ip) {
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || [];
    const recent = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
    recent.push(now);
    loginAttempts.set(ip, recent);
    
    if (recent.length > RATE_LIMIT_MAX) {
        return false;
    }
    return true;
}

// Periodically clean up expired rate limit entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts.entries()) {
        const recent = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
        if (recent.length === 0) {
            loginAttempts.delete(ip);
        } else {
            loginAttempts.set(ip, recent);
        }
    }
}, RATE_LIMIT_WINDOW).unref();

// Handle API routes
async function handleApiRoute(req, res) {
    const url = req.url;
    const method = req.method;
    
    // CORS headers

async function proxyRemoteLogin(body) {
    const response = await fetch(DEV_REMOTE_AUTH_LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const data = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

    return {
        status: response.status,
        data,
    };
}
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
        // POST /api/auth/login
        if (url === '/api/auth/login' && method === 'POST') {
            const clientIP = req.socket.remoteAddress || 'unknown';
            if (!checkRateLimit(clientIP)) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }));
                return;
            }
            const body = await parseBody(req);
            let result;

            if (DEV_REMOTE_AUTH_LOGIN_URL) {
                try {
                    result = await proxyRemoteLogin(body);
                } catch (error) {
                    console.error('[API] Remote login proxy failed, falling back to mock login:', error.message);
                    result = mockApi.handleLogin(body);
                }
            } else {
                result = mockApi.handleLogin(body);
            }

            res.writeHead(result.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.data));
            return;
        }
        
        // GET /api/dashboard/stats
        if (url === '/api/dashboard/stats' && method === 'GET') {
            const authHeader = req.headers.authorization;
            const user = mockApi.verifyToken(authHeader);
            
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            
            const result = mockApi.handleDashboard();
            res.writeHead(result.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.data));
            return;
        }

        // GET /api/auth/verify
        if (url === '/api/auth/verify' && method === 'GET') {
            const authHeader = req.headers.authorization;
            const user = mockApi.verifyToken(authHeader);

            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized - please login again' }));
                return;
            }

            const result = mockApi.handleVerify(user);
            res.writeHead(result.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.data));
            return;
        }

        // GET /api/users/:id
        if (url.startsWith('/api/users/') && method === 'GET') {
            const authHeader = req.headers.authorization;
            const user = mockApi.verifyToken(authHeader);

            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized - please login again' }));
                return;
            }

            const userId = url.replace('/api/users/', '').split('?')[0];
            const result = mockApi.handleUserDetail(userId);
            res.writeHead(result.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.data));
            return;
        }
        
        // ============================================
        // DEV TOOLS API (only works on localhost)
        // These endpoints allow live editing of components
        // ============================================
        
        // GET /api/dev/component/:tagName - Get component metadata
        if (url.startsWith('/api/dev/component/') && method === 'GET' && !url.includes('/edit')) {
            const tagName = url.replace('/api/dev/component/', '');
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
        if (url === '/api/dev/component/edit' && method === 'POST') {
            const body = await parseBody(req);
            const result = await editComponentFile(body);
            
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // POST /api/dev/component/save-instance - Save instance changes to HTML
        if (url === '/api/dev/component/save-instance' && method === 'POST') {
            const body = await parseBody(req);
            const result = await saveInstanceChanges(body);
            
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // POST /api/dev/component/save-global - Save global changes to component file
        if (url === '/api/dev/component/save-global' && method === 'POST') {
            const body = await parseBody(req);
            const result = await saveGlobalChanges(body);
            
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // POST /api/dev/component/delete-instance - Delete component instance from HTML
        if (url === '/api/dev/component/delete-instance' && method === 'POST') {
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
    // Handle API routes
    if (req.url.startsWith('/api/')) {
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
    
    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(500);
            res.end('Server Error: ' + error.code);
        } else {
            // Add headers
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
                    DEV_REMOTE_API_ORIGIN,
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
                    // Cache CSS/JS for 1 day with cache busting
                    headers['Cache-Control'] = 'public, max-age=86400';
                } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'].includes(fileExt)) {
                    // Cache images and fonts for 30 days
                    headers['Cache-Control'] = 'public, max-age=2592000';
                } else if (fileExt === '.html') {
                    // HTML should not be cached
                    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                }
            }
            
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Serving files from: ${ROOT_DIR}`);
    console.log(`SPA mode: All routes fallback to index.html`);
    console.log(`Mock API: /api/* endpoints available`);
    console.log(`\n📝 Test credentials:`);
    console.log(`   Email: demo@example.com`);
    console.log(`   Password: pa$$w0rd\n`);
    console.log(DEV_REMOTE_AUTH_LOGIN_URL
        ? `Remote auth proxy enabled: ${DEV_REMOTE_AUTH_LOGIN_URL}`
        : 'Remote auth proxy disabled: using local mock auth');
});

// ========== Hot Module Replacement (HMR) ==========

const wss = new WebSocketServer({ port: HMR_PORT });
const hmrClients = new Set();

function notifyHMRClients(file = 'unknown') {
    const message = JSON.stringify({ type: 'file-changed', file, timestamp: Date.now() });
    hmrClients.forEach(client => {
        if (client.readyState === 1) client.send(message);
    });
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
        console.error('🔥 HMR WebSocket error:', error.message);
    });
});

console.log(`🔥 HMR enabled on ws://localhost:${HMR_PORT}`);

// ── File Watchers ─────────────────────────────────────────────────────────────
//
// Strategy: the server NEVER calls tsc. Instead:
//   - dist/ is watched for .js output written by the external `tsc --watch` process
//   - src/ is watched for .css and .html changes (no compilation needed)
//   - index.html in root is watched directly
//
// To get fast HMR, run the TypeScript compiler in watch mode in a separate
// terminal alongside the server:
//
//   Terminal 1:  npm start           (this server)
//   Terminal 2:  npx tsc --watch     (incremental compiler)
//   Terminal 3 (optional): npx tsc-alias --watch
//
// The compiler picks up a save, incrementally rebuilds in ~100-400ms, writes
// the .js file to dist/, and the server immediately fires the HMR WebSocket
// message — no cold tsc spawn, no npx overhead.

const distDir  = path.join(ROOT_DIR, 'dist');
const srcDir   = path.join(ROOT_DIR, 'src');

function notifyFile(file) {
    const message = JSON.stringify({ type: 'file-changed', file, timestamp: Date.now() });
    hmrClients.forEach(client => {
        if (client.readyState === 1) client.send(message);
    });
}

function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

try {
    // Watch dist/ — fires after tsc --watch writes compiled .js output.
    // tsc writes several files per compile (foo.js, foo.js.map, foo.d.ts).
    // We track the last .js file seen in the debounce window so the callback
    // always fires with a real JS filename even if the final fs event was a
    // .map or .d.ts file.
    let pendingJsFile = null;
    let distDebounceTimer = null;

    fs.watch(distDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const norm = filename.replace(/\\/g, '/');
        if (norm.endsWith('.js') && !norm.endsWith('.d.ts')) {
            pendingJsFile = norm;
        }
        clearTimeout(distDebounceTimer);
        distDebounceTimer = setTimeout(() => {
            if (pendingJsFile) {
                console.log(`[HMR] dist changed: ${pendingJsFile}`);
                notifyFile(pendingJsFile);
                pendingJsFile = null;
            }
        }, 50);
    });

    // Watch src/ — CSS and HTML only (TS is handled via dist/ above)
    let pendingSrcFile = null;
    let srcDebounceTimer = null;

    fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const norm = filename.replace(/\\/g, '/');
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
    });

    // Watch the root shell HTML file
    for (const shellFile of ['index.html']) {
        fs.watch(path.join(ROOT_DIR, shellFile), debounce(() => {
            console.log(`[HMR] shell changed: ${shellFile}`);
            notifyFile(shellFile);
        }, 50));
    }

    console.log('[HMR] Watching dist/ for compiled JS output');
    console.log('[HMR] Watching src/ for CSS and HTML changes');
    console.log('[HMR] NOTE: Run "npx tsc --watch" in a separate terminal for instant TS recompilation');
} catch (error) {
    console.error('Could not start file watcher:', error.message);
}
