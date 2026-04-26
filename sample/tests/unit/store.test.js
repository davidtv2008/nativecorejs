/**
 * Example: Testing a NativeCoreJS global store.
 *
 * This file shows the recommended pattern for testing stores that call an
 * API service. The service is mocked at the module level so tests remain
 * fast and deterministic.
 *
 * Replace the imports below with the real paths from your project.
 *
 * Run with:
 *   npm test
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState, batch } from '../../.nativecore/core/state.js';
// Simulate module-level state (reset between tests via beforeEach)
const items = useState([]);
const loading = useState(false);
const error = useState(null);
const mockApi = {
    getCached: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    invalidateTags: vi.fn(),
};
async function loadTasks() {
    if (loading.value)
        return;
    batch(() => { loading.value = true; error.value = null; });
    try {
        const data = await mockApi.getCached();
        batch(() => { items.value = data; loading.value = false; });
    }
    catch (err) {
        batch(() => {
            error.value = err instanceof Error ? err.message : 'Failed';
            loading.value = false;
        });
    }
}
async function addTask(task) {
    const created = await mockApi.post();
    items.value = [...items.value, created];
    mockApi.invalidateTags(['tasks']);
}
async function removeTask(id) {
    const previous = items.value;
    items.value = previous.filter(t => t.id !== id);
    try {
        await mockApi.delete();
        mockApi.invalidateTags(['tasks']);
    }
    catch (err) {
        items.value = previous;
        error.value = err instanceof Error ? err.message : 'Failed to remove';
    }
}
// ── Fixtures ──────────────────────────────────────────────────────────────────
const TASKS = [
    { id: '1', title: 'Write tests', status: 'in-progress' },
    { id: '2', title: 'Ship it', status: 'todo' },
    { id: '3', title: 'Retrospective', status: 'done' },
];
// ── Tests ─────────────────────────────────────────────────────────────────────
describe('task store', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        items.value = [];
        loading.value = false;
        error.value = null;
    });
    // ── loadTasks ───────────────────────────────────────────────────────────
    describe('loadTasks()', () => {
        it('sets items and clears loading on success', async () => {
            mockApi.getCached.mockResolvedValue(TASKS);
            await loadTasks();
            expect(items.value).toEqual(TASKS);
            expect(loading.value).toBe(false);
            expect(error.value).toBeNull();
        });
        it('sets error and clears loading on failure', async () => {
            mockApi.getCached.mockRejectedValue(new Error('Network error'));
            await loadTasks();
            expect(items.value).toEqual([]); // unchanged
            expect(loading.value).toBe(false);
            expect(error.value).toBe('Network error');
        });
        it('does not start a second fetch while already loading', async () => {
            loading.value = true;
            mockApi.getCached.mockResolvedValue(TASKS);
            await loadTasks();
            expect(mockApi.getCached).not.toHaveBeenCalled();
        });
        it('flushes loading and items in a single batch (one notification per state)', async () => {
            mockApi.getCached.mockResolvedValue(TASKS);
            const loadingSpy = vi.fn();
            const itemsSpy = vi.fn();
            loading.watch(loadingSpy);
            items.watch(itemsSpy);
            await loadTasks();
            // Each state should change at most twice: loading true→false, items []→TASKS
            expect(loadingSpy.mock.calls.length).toBeLessThanOrEqual(2);
            expect(itemsSpy.mock.calls.length).toBeLessThanOrEqual(1);
        });
    });
    // ── addTask ─────────────────────────────────────────────────────────────
    describe('addTask()', () => {
        it('appends the created task to items', async () => {
            items.value = [TASKS[0]];
            const newTask = { id: '99', title: 'New task', status: 'todo' };
            mockApi.post.mockResolvedValue(newTask);
            await addTask({ title: 'New task', status: 'todo' });
            expect(items.value).toHaveLength(2);
            expect(items.value[1]).toEqual(newTask);
            expect(mockApi.invalidateTags).toHaveBeenCalledWith(['tasks']);
        });
    });
    // ── removeTask ──────────────────────────────────────────────────────────
    describe('removeTask()', () => {
        it('removes the task optimistically', async () => {
            items.value = [...TASKS];
            mockApi.delete.mockResolvedValue(undefined);
            await removeTask('2');
            expect(items.value.find(t => t.id === '2')).toBeUndefined();
            expect(items.value).toHaveLength(2);
        });
        it('rolls back on API error', async () => {
            items.value = [...TASKS];
            mockApi.delete.mockRejectedValue(new Error('Server error'));
            await removeTask('1');
            expect(items.value).toHaveLength(3); // rolled back
            expect(error.value).toBe('Server error');
        });
    });
    // ── reactivity ──────────────────────────────────────────────────────────
    describe('reactivity', () => {
        it('computed count updates when items change', async () => {
            const { computed } = await import('../../.nativecore/core/state.js');
            const count = computed(() => items.value.length);
            expect(count.value).toBe(0);
            items.value = TASKS;
            expect(count.value).toBe(3);
            count.dispose();
        });
    });
});
