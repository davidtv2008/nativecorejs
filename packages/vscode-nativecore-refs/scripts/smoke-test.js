'use strict';

/**
 * Lightweight checks that do not require a scaffolded app on disk.
 */

const pairRe =
    /['"](src\/views\/[^'"]+\.html)['"]\s*,\s*lazyController\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g;

const routesSnippet = `
r.register(
  '/courses/ce/:package',
  'src/views/protected/ce-package.html',
  lazyController('cePackageController', '../controllers/ce-package.controller.js')
);
`;

let m;
let n = 0;
let hit = null;
while ((m = pairRe.exec(routesSnippet)) !== null) {
    n++;
    hit = m;
}
console.log('pairs', n);
console.log('ce-package', hit && hit[1], hit && hit[2]);

const line = '        <div class="lc-step-panel" ref="step2El" hidden>';
const REF_ATTR_RE = /\bref\s*=\s*(["'])([A-Za-z_$][\w$]*)\1/g;
let mm;
while ((mm = REF_ATTR_RE.exec(line)) !== null) {
    const start = mm.index + mm[0].indexOf(mm[2]);
    console.log('attr', mm[2], 'range', start, start + mm[2].length);
}

const jline = "        this.assertRefs('step2El', 'sectionsEl');";
const ASSERT_REFS_RE = /\bassertRefs\s*\(([^)]*)\)/g;
const ASSERT_ARG_RE = /(["'])([A-Za-z_$][\w$]*)\1/g;
const call = ASSERT_REFS_RE.exec(jline);
const args = call[1];
const argsStart = call.index + call[0].indexOf('(') + 1;
let arg;
while ((arg = ASSERT_ARG_RE.exec(args)) !== null) {
    console.log('assert', arg[2], argsStart + arg.index + 1);
}

const memberLine = '        this.step2El.hidden = false;';
const THIS_MEMBER_RE = /\bthis\.([A-Za-z_$][\w$]*)\b/g;
let tm;
while ((tm = THIS_MEMBER_RE.exec(memberLine)) !== null) {
    console.log('member', tm[1]);
}

if (n !== 1 || !hit || hit[2] !== '../controllers/ce-package.controller.js') {
    process.exitCode = 1;
    console.error('FAIL: route pairing');
} else {
    console.log('OK');
}
