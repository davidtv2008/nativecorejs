# NativeCoreJS Contract (v2)

Links client **API_ENDPOINTS** (+ `api.get/post/…`) to Laravel **controller methods**.

## Features

- **F12** on `API_ENDPOINTS.DASHBOARD` / `API_ENDPOINTS.cePackage(...)` in services or `apiEndpoints.js`
- **Method-aware**: `api.get` / `getCached` → GET, `api.post` → POST, etc. (filters duplicate path verbs)
- **Jumps to PHP action**: e.g. `ProfileController::show`, invokable `__invoke`, not only the `Route::` line
- Falls back to `routes/api.php` line if the controller file cannot be resolved
- Diagnostics for endpoint constants with no matching backend route
- Command: **NativeCore: Refresh API Contract Index**

Works best in a multi-root workspace (NativeCore app + Laravel API).

Marketplace ID: `NativeCoreJS.vscode-nativecore-contract`

## Settings

- `nativecoreContract.apiPhpGlob` (default `**/routes/api.php`)
- `nativecoreContract.endpointsGlob` (default `**/src/constants/apiEndpoints.{js,ts}`)
- `nativecoreContract.warnMissingBackend`
