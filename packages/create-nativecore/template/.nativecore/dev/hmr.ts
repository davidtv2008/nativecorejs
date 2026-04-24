// .nativecore/hmr.ts
// NativeCore HMR client (development only)

// Extend Window interface for HMR
declare global {
    interface Window {
        __hmrWebSocket?: WebSocket;
    }
}

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Restore scroll position after HMR reload
    const savedScroll = sessionStorage.getItem('hmr_scroll_pos');
    if (savedScroll !== null) {
        // Wait for router to load the page, then restore scroll
        window.addEventListener('pageloaded', () => {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScroll, 10));
                sessionStorage.removeItem('hmr_scroll_pos');
                console.warn('🔥 Scroll position restored:', savedScroll);
            }, 100);
        }, { once: true });
        
        // Fallback if pageloaded doesn't fire
        setTimeout(() => {
            const scrollPos = sessionStorage.getItem('hmr_scroll_pos');
            if (scrollPos) {
                window.scrollTo(0, parseInt(scrollPos, 10));
                sessionStorage.removeItem('hmr_scroll_pos');
            }
        }, 500);
    }
    
    // Prevent multiple HMR connections
    if (window.__hmrWebSocket) {
        console.warn('[HMR] Connection already exists, skipping...');
    } else {
        // Bounded reconnection state.  If the dev server is briefly
        // unreachable (e.g. you saved a file in server.js and nodemon is
        // restarting), we back off instead of slamming reload() in a tight
        // loop, which used to brick the page when paired with `npm run make`.
        let ws: WebSocket | null = null;
        let isConnected = false;
        let reconnectAttempt = 0;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        const MAX_RECONNECT_ATTEMPTS = 10;

        function connect(): void {
            try {
                ws = new WebSocket('ws://localhost:8001');
            } catch (err) {
                console.error('[HMR] could not open WebSocket:', err);
                scheduleReconnect();
                return;
            }
            window.__hmrWebSocket = ws;
            attachHandlers(ws);
        }

        function scheduleReconnect(): void {
            if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
                console.warn('[HMR] giving up after', MAX_RECONNECT_ATTEMPTS, 'attempts. Refresh manually.');
                showHMRIndicator('disconnected', 'HMR offline');
                return;
            }
            reconnectAttempt++;
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), 15_000);
            showHMRIndicator('disconnected', `Reconnecting (${reconnectAttempt})…`);
            clearTimeout(reconnectTimer!);
            reconnectTimer = setTimeout(connect, delay);
        }
    
        // Show HMR status indicator
        function showHMRIndicator(status: 'connected' | 'disconnected' | 'updating', message?: string): void {
            let indicator = document.getElementById('hmr-indicator');
            
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'hmr-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(calc(-50% - 96px));
                    padding: 6px 12px;
                    background: #000;
                    color: #fff;
                    border-radius: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    z-index: 999999;
                    opacity: 1;
                    transition: all 0.3s;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                `;
                document.body.appendChild(indicator);
            }
            
            const colors: Record<string, string> = {
                connected: '#10b981',
                disconnected: '#ef4444',
                updating: '#f59e0b'
            };
            
            const icons: Record<string, string> = {
                connected: '[HMR]',
                disconnected: '[DISCONNECTED]',
                updating: '[UPDATING]'
            };
            
            indicator.textContent = `${icons[status]} ${message || status.toUpperCase()}`;
            indicator.style.background = colors[status] || '#000';
        }
        
        function flashHMRIndicator(): void {
            const indicator = document.getElementById('hmr-indicator');
            if (indicator) {
                indicator.style.transform = 'translateX(calc(-50% - 96px)) scale(1.08)';
                setTimeout(() => {
                    indicator.style.transform = 'translateX(calc(-50% - 96px))';
                }, 200);
            }
        }
        
        // Hot reload CSS
        async function hotReloadCSS(file: string): Promise<void> {
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            let reloaded = false;
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.includes(file)) {
                    const newHref = href.split('?')[0] + '?' + Date.now();
                    (link as HTMLLinkElement).href = newHref;
                    reloaded = true;
                }
            });
            
            if (reloaded) {
                console.warn(`CSS hot reloaded: ${file}`);
                flashHMRIndicator();
            }
        }
        
        // Hot reload JavaScript (full reload for now, can optimize later)
        async function hotReloadJS(file: string): Promise<void> {
            console.warn(`Reloading JS: ${file}`);
            showHMRIndicator('updating', 'Reloading...');
            
            // For now, do a full reload
            // Future: implement module-level HMR
            setTimeout(() => {
                location.reload();
            }, 100);
        }

        function attachHandlers(socket: WebSocket): void {
            // Connection established
            socket.onopen = () => {
                isConnected = true;
                reconnectAttempt = 0;
                console.warn('[HMR] enabled - Live reload active');
                showHMRIndicator('connected', 'HMR Ready');
            };

            // Receive updates from server
            socket.onmessage = async (event) => {
                try {
                    const { type, file } = JSON.parse(event.data);

                    if (type === 'file-changed') {

                        // Handle different file types
                        if (file.endsWith('.css')) {
                            await hotReloadCSS(file);
                        } else if (file.endsWith('.js')) {
                            await hotReloadJS(file);
                        } else if (file.endsWith('.ts')) {
                            // TypeScript changed - just reload the page (compilation already done by server)
                            console.warn(`♻️  TS changed: ${file}`);
                            showHMRIndicator('updating', 'Reloading...');
                            sessionStorage.setItem('hmr_scroll_pos', window.scrollY.toString());
                            setTimeout(() => location.reload(), 100);
                        } else if (file.endsWith('.html')) {
                            // For HTML changes - just reload the page (simple and reliable)
                            console.warn(`♻️  HTML changed: ${file}`);
                            showHMRIndicator('updating', 'Reloading...');

                            // Save scroll position before reload
                            sessionStorage.setItem('hmr_scroll_pos', window.scrollY.toString());

                            setTimeout(() => location.reload(), 100);
                        }
                    }
                } catch (error) {
                    console.error('🔥 HMR error:', error);
                }
            };

            // Connection lost — schedule a bounded reconnect with backoff
            // instead of immediately reloading.  Reloading mid-`npm run make`
            // hits the server while it is still creating files and races with
            // the next dist/ change event, which used to land the page in a
            // broken state.
            socket.onclose = () => {
                if (isConnected) {
                    console.warn('[HMR] disconnected — attempting reconnect');
                }
                isConnected = false;
                window.__hmrWebSocket = undefined;
                scheduleReconnect();
            };

            socket.onerror = (err) => {
                console.error('[HMR] connection error:', err);
                // Let onclose drive the reconnect path so we don't double up.
            };
        }

        connect();
    } // end of else block for single HMR connection
}

export {};
