/**
 * Mock API Helper Functions
 *
 * Includes a dev-only Server-Sent Events (SSE) demo stream for local testing
 * with `connectSSE()` from the NativeCore runtime (`GET DEV_SSE_DEMO_PATH`).
 *
 * Auth endpoints are intentionally omitted from the scaffold — implement your
 * own auth API when you add authentication.
 */

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
    DEV_SSE_DEMO_PATH,
    writeSSE,
    attachDevDemoSSE,
};
