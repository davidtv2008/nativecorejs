import { html as htmlFn, raw as rawFn } from '../.nativecore/utils/templates.js';

type G = typeof globalThis & { html: typeof htmlFn; raw: typeof rawFn };
const g = globalThis as G;
g.html = htmlFn;
g.raw = rawFn;
