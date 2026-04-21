/**
 * Unit tests for the WebSocket client.
 * Uses a minimal mock WebSocket so we can drive open/message/close
 * transitions deterministically.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectWebSocket } from '../../.nativecore/core/ws.js';

class MockWS {
    static instances: MockWS[] = [];
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = MockWS.CONNECTING;
    sent: Array<string | ArrayBufferLike | Blob | ArrayBufferView> = [];
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    constructor(public url: string, public protocols?: string | string[]) {
        MockWS.instances.push(this);
    }
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (this.readyState !== MockWS.OPEN) throw new Error('not open');
        this.sent.push(data);
    }
    close(): void {
        this.readyState = MockWS.CLOSED;
        this.onclose?.({ code: 1000, reason: '', wasClean: true } as CloseEvent);
    }
    // Helpers used by tests
    _open(): void {
        this.readyState = MockWS.OPEN;
        this.onopen?.(new Event('open'));
    }
    _message(data: string): void {
        this.onmessage?.({ data } as MessageEvent);
    }
    _drop(): void {
        this.readyState = MockWS.CLOSED;
        this.onclose?.({ code: 1006, reason: 'lost', wasClean: false } as CloseEvent);
    }
}

describe('connectWebSocket', () => {
    beforeEach(() => {
        MockWS.instances = [];
        vi.stubGlobal('WebSocket', MockWS);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('fires onOpen on successful connect', () => {
        const onOpen = vi.fn();
        connectWebSocket('ws://x', { onOpen }, { reconnect: false });
        MockWS.instances[0]._open();
        expect(onOpen).toHaveBeenCalled();
    });

    it('queues sends while not open and flushes on open', () => {
        const ctrl = connectWebSocket('ws://x', {}, { reconnect: false });
        ctrl.send('one');
        ctrl.send('two');
        expect(MockWS.instances[0].sent).toEqual([]);
        MockWS.instances[0]._open();
        expect(MockWS.instances[0].sent).toEqual(['one', 'two']);
    });

    it('parses JSON when parseJson is true', () => {
        const onJson = vi.fn();
        connectWebSocket('ws://x', { onJsonMessage: onJson }, { parseJson: true, reconnect: false });
        MockWS.instances[0]._open();
        MockWS.instances[0]._message('{"a":1}');
        expect(onJson).toHaveBeenCalledWith({ a: 1 }, expect.anything());
    });

    it('reconnects on unexpected close with exponential backoff', () => {
        vi.useFakeTimers();
        const onReconnect = vi.fn();
        connectWebSocket('ws://x', { onReconnect }, {
            reconnect: { maxRetries: 3, baseDelay: 100, maxDelay: 1000 },
        });
        MockWS.instances[0]._open();
        MockWS.instances[0]._drop();

        vi.advanceTimersByTime(100);
        expect(MockWS.instances.length).toBe(2);
        MockWS.instances[1]._open();
        expect(onReconnect).toHaveBeenCalledWith(1);
    });

    it('gives up after maxRetries and calls onReconnectFailed', () => {
        vi.useFakeTimers();
        const onFailed = vi.fn();
        connectWebSocket('ws://x', { onReconnectFailed: onFailed }, {
            reconnect: { maxRetries: 2, baseDelay: 10, maxDelay: 100 },
        });
        MockWS.instances[0]._open();
        MockWS.instances[0]._drop();
        vi.advanceTimersByTime(10);
        MockWS.instances[1]._drop();
        vi.advanceTimersByTime(20);
        MockWS.instances[2]._drop();
        vi.advanceTimersByTime(40);
        expect(onFailed).toHaveBeenCalled();
    });

    it('explicit close() does not trigger reconnect', () => {
        vi.useFakeTimers();
        const ctrl = connectWebSocket('ws://x', {}, { reconnect: { maxRetries: 3, baseDelay: 10, maxDelay: 100 } });
        MockWS.instances[0]._open();
        ctrl.close();
        vi.advanceTimersByTime(1000);
        expect(MockWS.instances.length).toBe(1);
    });
});
