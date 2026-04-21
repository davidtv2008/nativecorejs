import { nativeCorePlugin } from './scripts/cem-plugin.mjs';

export default {
    globs: ['src/components/**/*.ts'],
    exclude: ['src/components/index.ts', 'src/components/builtinRegistry.ts'],
    outdir: 'dist',
    dev: false,
    watch: false,
    dependencies: false,
    packagejson: true,
    litelement: false,
    plugins: [nativeCorePlugin()],
};
