// src/dev/hmr.ts
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
        const ws = new WebSocket('ws://localhost:8001');
        window.__hmrWebSocket = ws;
        let isConnected = false;
    
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
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    pointer-events: none;
                    line-height: 1.2;
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
        
        // Connection established
        ws.onopen = () => {
            isConnected = true;
            console.warn('[HMR] enabled - Live reload active');
            showHMRIndicator('connected', 'HMR Ready');
        };
        
        // Receive updates from server
        ws.onmessage = async (event) => {
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
        
        // Connection lost
        ws.onclose = () => {
            if (isConnected) {
                console.warn('🔥 HMR disconnected - Server may have restarted');
                showHMRIndicator('disconnected', 'Reconnecting...');
                
                // Try to reconnect after 1 second
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        };
        
        ws.onerror = (error) => {
            console.error('[HMR] connection error:', error);
        };
    } // end of else block for single HMR connection
}

export {};
