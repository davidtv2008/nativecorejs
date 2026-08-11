import assert from 'node:assert/strict';
import { parseEnv } from '../load-env.mjs';
import {
    getPublicEnv,
    isPublicEnvKey,
    toClientEnvKey,
    injectPublicEnvIntoHtml,
    getApiConnectOrigins,
    buildContentSecurityPolicy,
    getCspExtraDirectives,
} from '../public-env.mjs';

assert.deepEqual(
    parseEnv('FOO=bar\n# comment\nBAZ="qux"\nexport HELLO=world\n'),
    { FOO: 'bar', BAZ: 'qux', HELLO: 'world' }
);

assert.equal(isPublicEnvKey('API_BASE_URL'), true);
assert.equal(isPublicEnvKey('NC_PUBLIC_FOO'), true);
assert.equal(isPublicEnvKey('FEATURE_X'), true);
assert.equal(isPublicEnvKey('DB_PASSWORD'), false);
assert.equal(toClientEnvKey('NC_PUBLIC_API_BASE_URL'), 'API_BASE_URL');

const publicEnv = getPublicEnv({
    API_BASE_URL: 'http://localhost:8000/api',
    DB_PASSWORD: 'secret',
    NC_PUBLIC_SITE: 'ft',
    FEATURE_DEBUG_MODE: 'true',
    PORT: '3000',
});
assert.deepEqual(publicEnv, {
    API_BASE_URL: 'http://localhost:8000/api',
    SITE: 'ft',
    FEATURE_DEBUG_MODE: 'true',
});
assert.deepEqual(getApiConnectOrigins(publicEnv), ['http://localhost:8000']);

const html = '<html><head><script>globalThis.__NC_PUBLIC_ENV__=/*@nc-public-env*/{}/*@/nc-public-env*/;</script></head></html>';
const baked = injectPublicEnvIntoHtml(html, { API_BASE_URL: '/api' });
assert.match(baked, /\/\*@nc-public-env\*\/\{"API_BASE_URL":"\/api"\}\/\*@\/nc-public-env\*\//);

assert.deepEqual(getCspExtraDirectives({}), []);
assert.deepEqual(
    getCspExtraDirectives({ CSP_FRAME_SRC: 'https://player.vimeo.com' }),
    ["frame-src 'self' https://player.vimeo.com"]
);
assert.match(
    buildContentSecurityPolicy(["default-src 'self'", "img-src 'self' data: https:"], {
        CSP_MEDIA_SRC: 'https://cdn.example.com https:',
    }),
    /default-src 'self'; img-src 'self' data: https:; media-src 'self' https:\/\/cdn\.example\.com https:/
);
assert.match(
    buildContentSecurityPolicy(["img-src 'self' data: https:"], {
        CSP_IMG_SRC: 'https://www.example.com',
    }),
    /img-src 'self' data: https: https:\/\/www\.example\.com/
);

console.log('public-env tests passed');
