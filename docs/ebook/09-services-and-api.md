# Chapter 09 — Services and API

Scaffold services under `src/services/`: `api`, `storage`, `logger`.

## Accuracy note

API caching (`getCached`, tag invalidation) lives in **`api.service`**, not as a
separate `@core` module. Auth headers are intentionally omitted — wire them in
`request()` when you add authentication.

## `api.service` (verified surface)

```js
import api from '@services/api.service.js';

api.setBaseURL('/api');

await api.get('/tasks');
await api.post('/tasks', { title: 'New' });
await api.put(`/tasks/${id}`, body);
await api.patch(`/tasks/${id}`, body);
await api.delete(`/tasks/${id}`);

// Cached GET
// ttl is in seconds (not ms)
await api.getCached('/tasks', { ttl: 60, tags: ['tasks'], revalidate: true });

api.invalidateTags(['tasks']);
api.invalidateQuery(queryKey);
api.clearCache();
```

On localhost the default base URL is `/api` (mock API via `server.js`).

## `storage.service`

```js
import storage from '@services/storage.service.js';

storage.setStrategy('local'); // 'memory' | 'session' | 'local'
storage.set('deskflow.theme', 'dark');
storage.get('deskflow.theme');
storage.remove('deskflow.theme');
storage.has('deskflow.theme');
storage.clear();
```

## `logger.service`

```js
import logger from '@services/logger.service.js';

logger.setLevel('debug');
logger.info('tasks loaded', { count });
logger.error('failed', err);
```

## Apply to Deskflow

> **Feature:** Load tasks from the mock API when available; fall back to in-memory.

1. Add a mock handler under your app’s `api/` if you want persistence beyond memory
   (the scaffold’s `server.js` mock layer is project-specific — inspect `api/mockApi.js`).
2. In `tasks.controller.js`, replace the hard-coded array with:

```js
const data = await api.getCached('/tasks', { ttl: 30, tags: ['tasks'] });
this.tasks.value = data;
```

3. After create/update/delete, call `api.invalidateTags(['tasks'])` and refresh.

If no mock route exists yet, keep the in-memory array and still structure the
controller as if the API call were present — then add the mock endpoint.

## Verify

- [ ] Network tab shows `/api/...` when you call the service
- [ ] `invalidateTags` causes a refetch on next `getCached`

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Documenting a core “API cache module” | It’s `api.service` |
| Expecting Authorization headers by default | Add them yourself |

## Next

[Chapter 10 — Global stores](./10-global-stores.md)
