#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.resolve(__dirname, '..', 'src', 'routes', 'routes.ts');
const redirectsPath = path.resolve(__dirname, '..', 'public', '_redirects');

export function extractProtectedRoutes(routesSource) {
    const match = routesSource.match(/export const protectedRoutes = \[(.*?)\];/s);

    if (!match) {
        throw new Error('Could not find protectedRoutes export in src/routes/routes.ts');
    }

    return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g), routeMatch => routeMatch[1]);
}

export function extractRegisteredRoutes(routesSource) {
    return Array.from(routesSource.matchAll(/\.register\(\s*['"]([^'"]+)['"]/g), match => match[1]);
}

export function renderCfRouter(protectedRoutes, registeredRoutes) {
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

export function generateCfRouter() {
    const routesSource = fs.readFileSync(routesPath, 'utf8');
    const protectedRoutes = extractProtectedRoutes(routesSource);
    const registeredRoutes = extractRegisteredRoutes(routesSource);
    const output = renderCfRouter(protectedRoutes, registeredRoutes);

    fs.writeFileSync(redirectsPath, output);
    console.log(`Updated: ${path.relative(path.resolve(__dirname, '..'), redirectsPath).replace(/\\/g, '/')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    generateCfRouter();
}