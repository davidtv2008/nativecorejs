# Repo Split Plan

## Keep in current app repo

- app shells and route views
- app-specific controllers
- app-specific stores and constants
- mock API, migrations, infra, worker, deploy assets
- demo layout components such as app header, footer, and sidebar

## Move into nativecorejs

- core runtime under `src/core`
- reusable UI components under `src/components/ui`
- component registry and preload registry
- generic utilities under `src/utils`
- framework styles such as `src/styles/core.css`
- generic services and build/generator scripts after removing demo coupling

## Installer direction

`create-nativecore` should generate:

- app entry files
- route config
- starter controllers
- view files
- app shell components
- app stores
- project config files

It should not generate:

- framework internals
- demo API endpoints
- demo database files
- Cloudflare or Lambda deployment assets unless explicitly chosen as a template
