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
  // Dashboard emojis — restore real UTF-8 emoji codepoints
  ['src/views/protected/dashboard.html', '\u00f0\u0178\u201c\u201c', '\uD83D\uDD04'], // 🔄
  ['src/views/protected/dashboard.html', '\u00e2\u017e\u2022',       '\u2795'],       // ➕
  ['src/views/protected/dashboard.html', '\u00f0\u0178\u201c\u0160', '\uD83D\uDCCA'], // 📊
  ['src/views/protected/dashboard.html', '\u00e2\u0161\u2122\u00ef\u00b8\u008f', '\u2699\uFE0F'], // ⚙️
  ['src/views/protected/dashboard.html', '\u00f0\u0178\u2019\u00a5', '\uD83D\uDC65'], // 👥
  ['src/views/protected/dashboard.html', '\u00f0\u0178\u201c\u02c6', '\uD83D\uDCC8'], // 📈
  ['src/views/protected/dashboard.html', '\u00e2\u0153\u2026',       '\u2705'],       // ✅
  // Components page emojis
  ['src/views/public/components.html',   '\u00f0\u0178\u201c\u00a7', '\uD83D\uDD27'], // 🔧
  ['src/views/public/components.html',   '\u00e2\u00ad\u00ad',       '\u2B50'],       // ⭐
  ['src/views/public/components.html',   '\u00f0\u0178\u201c\u00a4', '\uD83D\uDCE4'], // 📤
  ['src/views/public/components.html',   '\u00f0\u0178\u2014\u2018\u00ef\u00b8\u008f', '\uD83D\uDDD1\uFE0F'], // 🗑️
];

for (const [file, bad, good] of fixes) {
  const content = readFileSync(file, 'utf8');
  if (content.includes(bad)) {
    writeFileSync(file, content.split(bad).join(good), 'utf8');
    console.log(`Fixed ${file}  ${JSON.stringify(bad)} -> ${JSON.stringify(good)}`);
  }
}
console.log('Encoding fix complete.');

