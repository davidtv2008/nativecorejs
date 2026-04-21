/**
 * Unit tests for the NativeCoreJS HTTP client.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, HttpError } from '../../.nativecore/core/http.js';

const json = (data: unknown, init: ResponseInit = {}): Response =>
    new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'content-type': 'application/json' },
        ...init,
    });

describe('HttpClient', () => {
    let client: HttpClient;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        client = new HttpClient();
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('returns parsed JSON for a successful GET', async () => {
        fetchMock.mockResolvedValueOnce(json({ ok: true }));
        const result = await client.get<{ ok: boolean }>('/items');
        expect(result).toEqual({ ok: true });
    });

    it('appends query parameters', async () => {
        fetchMock.mockResolvedValueOnce(json({ ok: true }));
        await client.get('/items', { params: { page: 2, q: 'hello' } });
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain('page=2');
        expect(url).toContain('q=hello');
    });

    it('serializes plain object bodies as JSON', async () => {
        fetchMock.mockResolvedValueOnce(json({ id: 1 }));
        await client.post('/items', { name: 'a' });
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(init.body).toBe(JSON.stringify({ name: 'a' }));
    });

    it('throws an HttpError for non-2xx responses', async () => {
        fetchMock.mockResolvedValueOnce(json({ message: 'nope' }, { status: 400 }));
        await expect(client.get('/x')).rejects.toBeInstanceOf(HttpError);
    });

    it('retries the configured number of times before giving up', async () => {
        fetchMock
            .mockRejectedValueOnce(new TypeError('network'))
            .mockRejectedValueOnce(new TypeError('network'))
            .mockResolvedValueOnce(json({ ok: true }));
        const result = await client.get('/x', { retries: 2, retryDelay: 1, backoff: 'none' });
        expect(result).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('does not retry 4xx by default', async () => {
        fetchMock.mockResolvedValue(json({ message: 'bad' }, { status: 400 }));
        await expect(client.get('/x', { retries: 3, retryDelay: 1 })).rejects.toBeInstanceOf(HttpError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent identical GET requests', async () => {
        let resolveFetch: (value: Response) => void = () => {};
        fetchMock.mockReturnValueOnce(new Promise<Response>(r => { resolveFetch = r; }));
        const p1 = client.get('/items');
        const p2 = client.get('/items');
        resolveFetch(json({ ok: true }));
        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1).toEqual(r2);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('safeRequest never throws and returns { data, error }', async () => {
        fetchMock.mockResolvedValueOnce(json({ message: 'no' }, { status: 500 }));
        const result = await client.safeGet('/x');
        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(HttpError);
        expect(result.error?.status).toBe(500);
    });

    it('applies request and response interceptors', async () => {
        fetchMock.mockResolvedValueOnce(json({ ok: true }));
        client.addRequestInterceptor(cfg => {
            cfg.headers = { ...cfg.headers, 'x-test': '1' };
            return cfg;
        });
        await client.get('/items');
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>)['x-test']).toBe('1');
    });
});
