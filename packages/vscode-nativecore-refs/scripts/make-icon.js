'use strict';

const fs = require('fs');
const path = require('path');

async function main() {
    const sharp = require('sharp');
    const svgPath = path.resolve(
        __dirname,
        '../../create-nativecore/template/public/assets/icon.svg'
    );
    const outPath = path.resolve(__dirname, '../media/icon.png');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const svg = fs.readFileSync(svgPath);
    await sharp(svg).resize(128, 128).png().toFile(outPath);
    console.log('wrote', outPath, fs.statSync(outPath).size);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
