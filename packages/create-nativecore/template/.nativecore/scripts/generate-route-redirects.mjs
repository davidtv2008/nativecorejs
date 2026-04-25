#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../..');
const routesDir = path.join(rootDir, 'src', 'routes');
const redirectsPath = path.resolve(__dirname, '../..', 'public', '_redirects');

function resolveRoutesPath() {
    const configPath = path.join(rootDir, 'nativecore.config.json');
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const ext = config.useTypeScript === false ? 'js' : 'ts';
        return path.join(routesDir, `routes.${ext}`);
    } catch {
        // Fallback: prefer TS, then JS for older projects.
        const tsPath = path.join(routesDir, 'routes.ts');
        if (fs.existsSync(tsPath)) return tsPath;
        return path.join(routesDir, 'routes.js');
    }
}

const routesPath = resolveRoutesPath();

export function extractProtectedRoutes(routesSource) {
    const match = routesSource.match(/export const protectedRoutes = \[(.*?)\];/s);

    if (!match) {
        // Newer templates derive protected routes dynamically with
        // router.getPathsForMiddleware('auth'); no array extraction needed.
        return [];
    }

    return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g), routeMatch => routeMatch[1]);
}

export function extractRegisteredRoutes(routesSource) {
    return Array.from(routesSource.matchAll(/\.register\(\s*['"]([^'"]+)['"]/g), match => match[1]);
}

export function renderRouteRedirects(protectedRoutes, registeredRoutes) {
    const routeRules = registeredRoutes
        .filter(route => route !== '/')
        .flatMap(route => {
            const variants = route.endsWith('/') ? [route] : [route, `${route}/`];
            return variants.map(routeVariant => `${routeVariant} / 200`);
        });

    return [
        ...routeRules
    ].join('\n') + '\n';
}

export function generateRouteRedirects() {
    const routesSource = fs.readFileSync(routesPath, 'utf8');
    const protectedRoutes = extractProtectedRoutes(routesSource);
    const registeredRoutes = extractRegisteredRoutes(routesSource);
    const output = renderRouteRedirects(protectedRoutes, registeredRoutes);

    fs.writeFileSync(redirectsPath, output);
    console.log(`Updated: ${path.relative(path.resolve(__dirname, '../..'), redirectsPath).replace(/\\/g, '/')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    generateRouteRedirects();
}
