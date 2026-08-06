import { readFileSync, writeFileSync } from 'fs';

// Map: corrupted string → correct character/entity
// These are Windows-1252 bytes re-interpreted as UTF-8 mojibake
const fixes = [
  // Special HTML chars — use entities so files stay ASCII-safe
  ['src/components/ui/nc-alert.ts',      '\u00c3\u00b7',     '&times;'],
  ['src/components/ui/nc-modal.ts',      '\u00c3\u00b7',     '&times;'],
  ['src/components/ui/nc-pagination.ts', '\u00c2\u00ab',     '&laquo;'],
  ['src/components/ui/nc-pagination.ts', '\u00e2\u20ac\u00b9','&lsaquo;'],
  ['src/components/ui/nc-pagination.ts', '\u00e2\u20ac\u00a6','&hellip;'],
  ['src/components/ui/nc-pagination.ts', '\u00e2\u20ac\u00ba','&rsaquo;'],
  ['src/components/ui/nc-pagination.ts', '\u00c2\u00bb',     '&raquo;'],
  // em dash in comment
  ['src/components/core/app-sidebar.ts', '\u00e2\u20ac\u201c', '\u2014'],
];

for (const [file, bad, good] of fixes) {
  const content = readFileSync(file, 'utf8');
  if (content.includes(bad)) {
    writeFileSync(file, content.split(bad).join(good), 'utf8');
    console.log(`Fixed ${file}  ${JSON.stringify(bad)} -> ${JSON.stringify(good)}`);
  }
}
console.log('Encoding fix complete.');

