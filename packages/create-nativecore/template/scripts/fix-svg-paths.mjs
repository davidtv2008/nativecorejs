import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/components/ui/nc-fab.ts',
  'src/components/ui/nc-file-upload.ts',
  'src/components/ui/nc-icon-button.ts',
  'src/components/ui/nc-icon.ts',
  'src/components/ui/nc-menu-item.ts',
  '.nativecore/outline-panel.ts',
];

const svgCtxMarkers = [' d=', '<path', '<polyline', '<polygon', '<svg', '"M', "'M"];

for (const file of files) {
  const orig = readFileSync(file, 'utf8');
  let c = orig;

  // Replace digit/space + nc- + digit back to v- only in SVG path contexts
  c = c.replace(/([0-9 ])nc-([0-9])/g, (match, before, after, offset) => {
    const ctx = orig.substring(Math.max(0, offset - 80), offset + 80);
    const inSvg = svgCtxMarkers.some(m => ctx.includes(m));
    return inSvg ? before + 'v-' + after : match;
  });

  if (c !== orig) {
    writeFileSync(file, c, 'utf8');
    console.log('Fixed:', file);
  } else {
    console.log('No change:', file);
  }
}
console.log('Done');
