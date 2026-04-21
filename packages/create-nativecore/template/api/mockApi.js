/**
 * Mock API Helper Functions
 *
 * Includes a dev-only Server-Sent Events (SSE) demo stream for local testing
 * with `connectSSE()` from the NativeCore runtime (`GET DEV_SSE_DEMO_PATH`).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = crypto.randomBytes(32).toString('hex');

function generateToken(user, expiresInSeconds = 3600) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        iat: Math.floor(Date.now() / 1000)
    };

    const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payloadSegment}`)
        .digest('base64url');
    return `${header}.${payloadSegment}.${signature}`;
}

// Read JSON file
function readJSON(filename) {
    const filePath = path.join(__dirname, 'data', filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

// Handle login
function handleLogin(body) {
    const { email, password } = body;
    const data = readJSON('users.json');
    
    const user = data.users.find(u => {
        if (u.email !== email) return false;
        // Hash comparison for stored passwords
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        const storedHash = crypto.createHash('sha256').update(u.password).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
        } catch {
            return false;
        }
    });
    
    if (!user) {
        return {
            status: 401,
            data: { error: 'Invalid email or password' }
        };
    }
    
    const accessToken = generateToken(user, 3600);       // 1 hour
    const refreshToken = generateToken(user, 7 * 24 * 3600); // 7 days
    
    return {
        status: 200,
        data: {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }
    };
}

// Handle dashboard stats
function handleDashboard() {
    const data = readJSON('dashboard.json');
    return {
        status: 200,
        data
    };
}

// ── Dashboard template ────────────────────────────────────────────────────────

function handleDashboardActivity() {
    return {
        status: 200,
        data: [
            { id: '1', message: 'User alice@example.com signed up', time: '2 min ago' },
            { id: '2', message: 'Order #1042 placed — $89.00', time: '8 min ago' },
            { id: '3', message: 'Password reset requested by bob@example.com', time: '15 min ago' },
            { id: '4', message: 'New comment on Post "Getting Started"', time: '1 hr ago' },
            { id: '5', message: 'Deployment to production succeeded', time: '3 hr ago' },
        ]
    };
}

// ── Blog template ─────────────────────────────────────────────────────────────

const BLOG_POSTS = [
    {
        id: '1', slug: 'getting-started', title: 'Getting Started with NativeCoreJS',
        excerpt: 'A hands-on introduction to building your first NativeCore application.',
        category: 'Tutorial', author: 'Alice Chen', date: 'Apr 18 2026',
        body: '<p>NativeCoreJS is a zero-dependency TypeScript framework built on Web Components and reactive signals. In this post we walk you through setting up your first project and building a simple counter.</p><p>Run <code>npm create nativecore@latest my-app</code> to scaffold your project. The CLI will guide you through all configuration options including authentication, Capacitor mobile support, and your choice of starter template.</p>'
    },
    {
        id: '2', slug: 'reactive-state', title: 'Reactive State with Signals',
        excerpt: 'How useState, computed, and effect replace a virtual DOM.',
        category: 'Deep Dive', author: 'Bob Torres', date: 'Apr 15 2026',
        body: '<p>Unlike React\'s re-render model, NativeCoreJS uses fine-grained reactive signals. A <code>useState</code> call returns a signal whose <code>.value</code> property is read and set directly. <code>computed()</code> derives new signals lazily, and <code>effect()</code> runs a side-effect whenever any of its dependencies change.</p><p>The result: only the DOM nodes that actually depend on a piece of state are updated — no diffing, no virtual DOM, no wasted renders.</p>'
    },
    {
        id: '3', slug: 'web-components-primer', title: 'Web Components Without the Boilerplate',
        excerpt: 'How nc-* components give you Shadow DOM with none of the ceremony.',
        category: 'Tutorial', author: 'Carol Smith', date: 'Apr 10 2026',
        body: '<p>Shadow DOM isolates your component\'s styles and markup from the rest of the page. NativeCoreJS wraps the Custom Elements API in a <code>Component</code> base class so you only need to implement <code>template()</code> and optional lifecycle hooks — no constructors, no <code>attachShadow()</code>, no boilerplate.</p>'
    },
    {
        id: '4', slug: 'routing-deep-dive', title: 'Client-Side Routing in Depth',
        excerpt: 'Middleware, loaders, caching, and prefetching in the NativeCore router.',
        category: 'Deep Dive', author: 'Alice Chen', date: 'Apr 05 2026',
        body: '<p>The NativeCore router is a first-class citizen of the framework. Routes are registered with <code>router.register(path, view, controller)</code> and can be augmented with middleware, data loaders, and cache policies.</p>'
    },
    {
        id: '5', slug: 'accessibility-first', title: 'Building Accessible UIs from Day One',
        excerpt: 'trapFocus, announce, and roving — the built-in a11y toolkit.',
        category: 'Accessibility', author: 'David Kim', date: 'Mar 28 2026',
        body: '<p>NativeCoreJS ships <code>trapFocus</code>, <code>announce</code>, and <code>roving</code> as first-class exports. Every modal and drawer in the <code>nc-*</code> component library uses them automatically, so your app is accessible by default.</p>'
    },
];

function handleBlogPosts() {
    return { status: 200, data: BLOG_POSTS.map(({ body: _body, ...rest }) => rest) };
}

function handleBlogPostBySlug(slug) {
    const post = BLOG_POSTS.find(p => p.slug === slug);
    if (!post) return { status: 404, data: { error: 'Post not found' } };
    return { status: 200, data: post };
}

// ── E-commerce template ───────────────────────────────────────────────────────

const SHOP_PRODUCTS = [
    { id: '1', name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', price: 149.99, image: '', description: 'Premium sound with 30-hour battery life and active noise cancellation.', rating: 4.5, reviewCount: 128 },
    { id: '2', name: 'Ergonomic Mechanical Keyboard', category: 'Electronics', price: 89.99, image: '', description: 'Tactile brown switches, RGB backlight, and a split ergonomic layout.', rating: 4.7, reviewCount: 74 },
    { id: '3', name: 'Minimalist Leather Wallet', category: 'Accessories', price: 34.99, image: '', description: 'Slim, RFID-blocking full-grain leather wallet. Holds up to 8 cards.', rating: 4.3, reviewCount: 312 },
    { id: '4', name: 'Stainless Steel Water Bottle', category: 'Outdoor', price: 24.99, image: '', description: '32oz double-wall insulated bottle. Keeps drinks cold 24 hrs, hot 12 hrs.', rating: 4.8, reviewCount: 541 },
    { id: '5', name: 'Smart LED Desk Lamp', category: 'Home', price: 49.99, image: '', description: 'Touch-dimming, color-temperature control, and USB-A charging port.', rating: 4.4, reviewCount: 93 },
    { id: '6', name: 'Bamboo Cutting Board Set', category: 'Home', price: 29.99, image: '', description: 'Set of 3 sustainably sourced bamboo boards with juice grooves.', rating: 4.6, reviewCount: 207 },
    { id: '7', name: 'Portable Bluetooth Speaker', category: 'Electronics', price: 59.99, image: '', description: 'IPX7 waterproof, 360° sound, 20-hour playback.', rating: 4.5, reviewCount: 189 },
    { id: '8', name: 'Merino Wool Beanie', category: 'Accessories', price: 19.99, image: '', description: 'Lightweight, itch-free, naturally temperature-regulating merino wool.', rating: 4.2, reviewCount: 88 },
    { id: '9', name: 'Ultralight Packable Backpack', category: 'Outdoor', price: 39.99, image: '', description: '30L daypack that folds into its own pocket. Weighs only 0.4 lb.', rating: 4.4, reviewCount: 156 },
    { id: '10', name: 'Ceramic Pour-Over Coffee Set', category: 'Home', price: 44.99, image: '', description: 'Dripper, carafe, and filters included. Makes 1–4 cups.', rating: 4.7, reviewCount: 263 },
    { id: '11', name: 'USB-C 100W GaN Charger', category: 'Electronics', price: 39.99, image: '', description: '3-port compact charger. Powers a laptop, tablet, and phone simultaneously.', rating: 4.6, reviewCount: 412 },
    { id: '12', name: 'Leather Notebook Cover', category: 'Accessories', price: 27.99, image: '', description: 'Fits A5 notebooks. Hand-stitched genuine leather with pen loop.', rating: 4.3, reviewCount: 67 },
];

function handleShopProducts() {
    return { status: 200, data: SHOP_PRODUCTS.map(({ description: _d, rating, reviewCount, ...rest }) => ({ ...rest, rating, reviewCount })) };
}

function handleShopProductById(id) {
    const product = SHOP_PRODUCTS.find(p => p.id === id);
    if (!product) return { status: 404, data: { error: 'Product not found' } };
    return { status: 200, data: product };
}

function handleVerify(user) {
    return {
        status: 200,
        data: {
            authenticated: true,
            user: {
                id: user.userId,
                email: user.email,
                name: user.name,
                role: user.role
            }
        }
    };
}

function handleUserDetail(userId) {
    const data = readJSON('users.json');
    const user = data.users.find(u => String(u.id) === String(userId));

    if (!user) {
        return {
            status: 404,
            data: { error: 'User not found' }
        };
    }

    return {
        status: 200,
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
        }
    };
}

function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) return false;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const [headerSegment, payloadSegment, signatureSegment] = parts;

        // Verify signature
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${headerSegment}.${payloadSegment}`)
            .digest('base64url');

        if (!crypto.timingSafeEqual(
            Buffer.from(signatureSegment),
            Buffer.from(expectedSignature)
        )) {
            return false;
        }

        // Decode payload
        const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
        const payload = JSON.parse(Buffer.from(padded, 'base64').toString());

        // Check expiration (required)
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            return false;
        }

        return payload;
    } catch {
        return false;
    }
}

// --- Dev SSE (Server-Sent Events) ---------------------------------------------

/** Path served by `server.js` — use with `new EventSource()` or `connectSSE('/api/sse/demo')`. */
const DEV_SSE_DEMO_PATH = '/api/sse/demo';

/**
 * Format one SSE field block. `data` is JSON-stringified unless it is already a string.
 * @param {import('http').ServerResponse} res
 * @param {{ event?: string, data: unknown }} opts
 */
function writeSSE(res, { event, data }) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (event) {
        res.write(`event: ${event}\n`);
    }
    res.write(`data: ${payload}\n\n`);
}

/**
 * Long-lived SSE response for demos: `ready` once, then `tick` every few seconds.
 * Cleans up when the client disconnects.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ intervalMs?: number }} [options]
 */
function attachDevDemoSSE(req, res, options = {}) {
    const intervalMs = Math.max(1000, Number(options.intervalMs) || 3000);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    // Comment line (ignored by EventSource) — helps some proxies flush immediately
    res.write(': nativecore mock SSE\n\n');

    writeSSE(res, {
        event: 'ready',
        data: {
            ok: true,
            path: DEV_SSE_DEMO_PATH,
            message: 'Dev mock stream. Listen for event "tick" or default messages.'
        }
    });

    let n = 0;
    const timer = setInterval(() => {
        n += 1;
        try {
            writeSSE(res, {
                event: 'tick',
                data: { n, at: new Date().toISOString() }
            });
        } catch {
            clearInterval(timer);
        }
    }, intervalMs);

    const cleanup = () => {
        clearInterval(timer);
    };
    req.on('close', cleanup);
    req.on('aborted', cleanup);
}

export {
    handleLogin,
    handleDashboard,
    handleVerify,
    handleUserDetail,
    verifyToken,
    DEV_SSE_DEMO_PATH,
    writeSSE,
    attachDevDemoSSE,
    // template-specific mocks
    handleDashboardActivity,
    handleBlogPosts,
    handleBlogPostBySlug,
    handleShopProducts,
    handleShopProductById,
};
