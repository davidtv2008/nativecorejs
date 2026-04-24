/**
 * NativeCoreJS Reactive State Benchmarks
 *
 * Measures the throughput of useState, computed, effect, and
 * watch across a range of scenarios.
 *
 * Run: node --experimental-strip-types benchmarks/state.bench.ts
 */

import {
    useState,
    computed,
    effect,
} from '../packages/create-nativecore/template/.nativecore/core/state.ts';

// ─── Benchmark harness ────────────────────────────────────────────────────────

const WARMUP_ITERATIONS = 3;
const BENCH_ITERATIONS = 5;

interface BenchmarkResult {
    name: string;
    ops: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
}

function bench(name: string, iterations: number, fn: () => void): BenchmarkResult {
    // Warm-up passes so JIT has compiled the hot path before we measure
    for (let i = 0; i < WARMUP_ITERATIONS; i++) fn();

    const samples: number[] = [];
    for (let i = 0; i < BENCH_ITERATIONS; i++) {
        const start = performance.now();
        fn();
        samples.push(performance.now() - start);
    }

    const avgMs = samples.reduce((a, b) => a + b, 0) / samples.length;
    const minMs = Math.min(...samples);
    const maxMs = Math.max(...samples);
    const opsPerSec = Math.round(iterations / (avgMs / 1000));

    return { name, ops: opsPerSec, avgMs, minMs, maxMs };
}

function printResult(r: BenchmarkResult): void {
    const opsStr = r.ops.toLocaleString('en-US');
    console.log(
        `  ${r.name.padEnd(50)} ${opsStr.padStart(14)} ops/s` +
        `   avg ${r.avgMs.toFixed(2)}ms  (min ${r.minMs.toFixed(2)} / max ${r.maxMs.toFixed(2)})`,
    );
}

function printSection(title: string): void {
    console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

const N = 100_000;
const results: BenchmarkResult[] = [];

printSection('useState');

results.push(bench('create 100k instances', N, () => {
    for (let i = 0; i < N; i++) useState(i);
}));

results.push(bench('set value 100k times (single state)', N, () => {
    const s = useState(0);
    for (let i = 0; i < N; i++) { s.value = i; }
}));

results.push(bench('get value 100k times (single state)', N, () => {
    const s = useState(42);
    let x = 0;
    for (let i = 0; i < N; i++) { x = s.value as number; }
    // Prevent dead-code elimination
    if (x === -1) throw new Error('unreachable');
}));

results.push(bench('set + get 100k pairs', N, () => {
    const s = useState(0);
    for (let i = 0; i < N; i++) {
        s.value = i;
        const _ = s.value;
    }
}));

// ─── computed ─────────────────────────────────────────────────────────────────

printSection('computed');

const COMP_N = 50_000;

results.push(bench('create 10k computed (no deps)', 10_000, () => {
    for (let i = 0; i < 10_000; i++) {
        const c = computed(() => i * 2);
        c.dispose();
    }
}));

results.push(bench('propagate update through 1 computed 50k times', COMP_N, () => {
    const src = useState(0);
    const dbl = computed(() => (src.value as number) * 2);
    for (let i = 0; i < COMP_N; i++) { src.value = i; }
    dbl.dispose();
}));

results.push(bench('read computed value 50k times', COMP_N, () => {
    const src = useState(1);
    const dbl = computed(() => (src.value as number) * 2);
    let x = 0;
    for (let i = 0; i < COMP_N; i++) { x = dbl.value as number; }
    dbl.dispose();
    if (x === -1) throw new Error('unreachable');
}));

results.push(bench('computed chain depth-5 — 20k upstream changes', 20_000, () => {
    const a = useState(0);
    const b = computed(() => (a.value as number) + 1);
    const c = computed(() => (b.value as number) + 1);
    const d = computed(() => (c.value as number) + 1);
    const e = computed(() => (d.value as number) + 1);
    const f = computed(() => (e.value as number) + 1);
    for (let i = 0; i < 20_000; i++) { a.value = i; }
    const _ = f.value; // ensure chain is evaluated
    [b, c, d, e, f].forEach(x => x.dispose());
}));

// ─── effect ───────────────────────────────────────────────────────────────────

printSection('effect');

const EFF_N = 50_000;

results.push(bench('effect fires 50k times (1 dependency)', EFF_N, () => {
    const src = useState(0);
    let calls = 0;
    const stop = effect(() => { const _ = src.value; calls++; });
    for (let i = 0; i < EFF_N; i++) { src.value = i; }
    stop();
}));

results.push(bench('effect with cleanup — 20k times', 20_000, () => {
    const src = useState(0);
    let calls = 0;
    const stop = effect(() => {
        const _ = src.value;
        calls++;
        return () => { /* cleanup */ };
    });
    for (let i = 0; i < 20_000; i++) { src.value = i; }
    stop();
}));

results.push(bench('create + dispose 10k effects', 10_000, () => {
    const src = useState(0);
    for (let i = 0; i < 10_000; i++) {
        const stop = effect(() => { const _ = src.value; });
        stop();
    }
}));

// ─── watch / fan-out ──────────────────────────────────────────────────────────

printSection('watch (fan-out subscriptions)');

const WATCH_N = 20_000;

results.push(bench('1 subscriber, 100k updates', N, () => {
    const s = useState(0);
    let calls = 0;
    const unsub = s.watch(() => calls++);
    for (let i = 0; i < N; i++) { s.value = i; }
    unsub();
}));

results.push(bench('10 subscribers, 20k updates', WATCH_N, () => {
    const s = useState(0);
    let calls = 0;
    const unsubs = Array.from({ length: 10 }, () => s.watch(() => calls++));
    for (let i = 0; i < WATCH_N; i++) { s.value = i; }
    unsubs.forEach(u => u());
}));

results.push(bench('100 subscribers, 5k updates', 5_000, () => {
    const s = useState(0);
    let calls = 0;
    const unsubs = Array.from({ length: 100 }, () => s.watch(() => calls++));
    for (let i = 0; i < 5_000; i++) { s.value = i; }
    unsubs.forEach(u => u());
}));

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('NativeCoreJS Reactive State — Benchmark Results');
console.log('════════════════════════════════════════════════════════════════════════════════');

let currentSection = '';
for (const r of results) {
    const section = r.name.split(' ')[0];
    if (section !== currentSection) {
        currentSection = section;
    }
    printResult(r);
}

console.log('────────────────────────────────────────────────────────────────────────────────');
console.log(`Node ${process.version}  •  ${new Date().toISOString()}`);
console.log('');
