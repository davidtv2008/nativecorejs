import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssgSource = fs.readFileSync(path.join(__dirname, '../ssg.mjs'), 'utf8');

describe('SSG prerender contract', () => {
    it('stamps data-prerendered-route before serializing HTML', () => {
        assert.match(ssgSource, /data-prerendered-route/);
        assert.match(ssgSource, /setAttribute\('data-prerendered-route'/);
        assert.match(ssgSource, /SSG HTML missing data-prerendered-route/);
    });

    it('fails the build when any route render fails', () => {
        assert.match(ssgSource, /failures\.length > 0/);
        assert.match(ssgSource, /SSG failed for/);
    });

    it('rejects API/JSON servers on the SSG port', () => {
        assert.match(ssgSource, /API is running/);
        assert.match(ssgSource, /application\/json/);
    });
});
