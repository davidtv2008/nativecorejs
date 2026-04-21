/**
 * Unit tests for the NativeCoreJS SSE module.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectSSE } from '../../.nativecore/core/sse.js';
import { flushPageCleanups } from '../../.nativecore/core/pageCleanupRegistry.js';

class MockEventSource {
    static instances: MockEventSource[] = [];
    url: string;
    onopen: ((ev: Event) => unknown) | null = null;
    onmessage: ((ev: MessageEvent) => unknown) | null = null;
    onerror: ((ev: Event) => unknown) | null = null;
    private readonly store = new Map<string, Set<(ev: Event) => void>>();

    constructor(url: string, _init?: EventSourceInit) {
        this.url = url;
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, fn: (ev: Event) => void): void {
        if (!this.store.has(type)) {
            this.store.set(type, new Set());
        }
        this.store.get(type)!.add(fn);
    }

    removeEventListener(type: string, fn: (ev: Event) => void): void {
        this.store.get(type)?.delete(fn);
    }

    close = vi.fn((): void => {});

    dispatchOpen(): void {
        this.onopen?.(new Event('open'));
    }

    dispatchMessage(data: string): void {
        const ev = new MessageEvent('message', { data });
        this.onmessage?.(ev);
    }

    dispatchNamed(type: string, data: string): void {
        const ev = new MessageEvent(type, { data });
        const set = this.store.get(type);
        if (set) {
            for (const fn of set) {
                fn(ev);
            }
        }
    }
}

describe('connectSSE', () => {
    const OriginalEventSource = globalThis.EventSource;

    beforeEach(() => {
        MockEventSource.instances = [];
        globalThis.EventSource = MockEventSource as any;
    });

    afterEach(() => {
        flushPageCleanups();
        globalThis.EventSource = OriginalEventSource;
        vi.restoreAllMocks();
    });

    it('calls onMessage for default messages', () => {
        const onMessage = vi.fn();
        connectSSE('/stream', { onMessage });
        const es = MockEventSource.instances[0];
        es.dispatchMessage('hello');
        expect(onMessage).toHaveBeenCalledWith('hello', expect.any(MessageEvent));
    });

    it('registers named event listeners and dispatches to events handler', () => {
        const ping = vi.fn();
        connectSSE('/stream', {
            events: {
                ping
            }
        });
        const es = MockEventSource.instances[0];
        es.dispatchNamed('ping', 'pong');
        expect(ping).toHaveBeenCalledWith('pong', expect.any(MessageEvent));
    });

    it('disconnect closes the EventSource', () => {
        const disconnect = connectSSE('/stream', {});
        const es = MockEventSource.instances[0];
        disconnect();
        expect(es.close).toHaveBeenCalledOnce();
    });

    it('flushPageCleanups closes the connection', () => {
        connectSSE('/stream', {});
        const es = MockEventSource.instances[0];
        flushPageCleanups();
        expect(es.close).toHaveBeenCalledOnce();
    });

    it('closes when AbortSignal aborts', () => {
        const controller = new AbortController();
        connectSSE('/stream', {}, { signal: controller.signal });
        const es = MockEventSource.instances[0];
        controller.abort();
        expect(es.close).toHaveBeenCalledOnce();
    });

    it('returns noop disconnect when signal is already aborted', () => {
        const controller = new AbortController();
        controller.abort();
        const disconnect = connectSSE('/stream', {}, { signal: controller.signal });
        expect(MockEventSource.instances.length).toBe(0);
        disconnect();
    });

    it('parses JSON for onJsonMessage when parseJson is true', () => {
        const onJsonMessage = vi.fn();
        connectSSE(
            '/stream',
            { onJsonMessage },
            { parseJson: true }
        );
        const es = MockEventSource.instances[0];
        es.dispatchMessage('{"a":1}');
        expect(onJsonMessage).toHaveBeenCalledWith({ a: 1 }, expect.any(MessageEvent));
    });

    it('uses eventsJson for named events when parseJson is true', () => {
        const onTick = vi.fn();
        connectSSE(
            '/stream',
            {
                eventsJson: {
                    tick: onTick
                }
            },
            { parseJson: true }
        );
        const es = MockEventSource.instances[0];
        es.dispatchNamed('tick', '{"n":2}');
        expect(onTick).toHaveBeenCalledWith({ n: 2 }, expect.any(MessageEvent));
    });
});
