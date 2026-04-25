/**
 * Patches android/app/build.gradle to allow dot-prefixed directories (like .nativecore/)
 * to be included in the APK assets. By default, aapt ignores files/dirs matching `.*`,
 * which causes the framework core to be silently excluded from the built app.
 *
 * Run once after `npx cap add android`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gradlePath = path.resolve(__dirname, '../../android/app/build.gradle');

if (!fs.existsSync(gradlePath)) {
    console.error('android/app/build.gradle not found. Run `npx cap add android` first.');
    process.exit(1);
}

const original = fs.readFileSync(gradlePath, 'utf8');
const patched = original.replace(
    /ignoreAssetsPattern\s*=\s*'([^']*)'/,
    (match, pattern) => {
        // Remove the `.*` segment (matches dot-prefixed files/dirs) from the ignore list.
        // Keep all other entries intact.
        const fixed = pattern
            .split(':')
            .filter(seg => seg !== '.*')
            .join(':');
        if (fixed === pattern) {
            console.log('android/app/build.gradle already patched, skipping.');
            return match;
        }
        return `ignoreAssetsPattern = '${fixed}'`;
    }
);

if (patched === original) {
    process.exit(0);
}

fs.writeFileSync(gradlePath, patched, 'utf8');
console.log('Patched android/app/build.gradle: dot-prefixed asset directories are now included.');
