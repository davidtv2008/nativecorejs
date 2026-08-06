# Plugins & observability

Opt-in hooks for analytics, logging, and navigation instrumentation.

```js
import { registerPlugin, unregisterPlugin, listPlugins } from 'nativecorejs';

registerPlugin({
    name: 'analytics',
    onNavigate(ctx) {
        // ctx includes path / navigation metadata from the plugin API
        console.info('[nav]', ctx);
    },
});

// Later
unregisterPlugin('analytics');
listPlugins();
```

## Guidance

- Do **not** add plugins to the default scaffold boot path unless the app needs them.
- Prefer thin wrappers around your APM (Datadog, Sentry, etc.).
- Keep PII out of client-side navigation logs.
