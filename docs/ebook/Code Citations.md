# Code Citations

## License: unknown
https://github.com/spicecrm/spicecrm/blob/9fc9f2fe1504f2b8f3823adcb24a8416d5741f7d/src/systemcomponents/components/systemhtmleditor.ts

```
Not a large undertaking at all. The implementation is about 10 lines. Here's exactly what it requires and what the tradeoffs are:

**The implementation**

The `html` tag already receives static parts and interpolated values as separate arguments — that's how tagged template literals work. You escape only the interpolated values; static strings written by the developer are trusted code:

```typescript
function escapeHtml(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        result += escapeHtml(values[i]) + strings[i + 1];
    }
    return result;
};
```

**The
```


## License: MIT
https://github.com/alexanderknapstein/stencil_mybranch/blob/489260dddc9f180995effcffa6cc58a3e9794961/src/util/logger/logger-util.ts

```
Not a large undertaking at all. The implementation is about 10 lines. Here's exactly what it requires and what the tradeoffs are:

**The implementation**

The `html` tag already receives static parts and interpolated values as separate arguments — that's how tagged template literals work. You escape only the interpolated values; static strings written by the developer are trusted code:

```typescript
function escapeHtml(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        result += escapeHtml(values[i]) + strings[i + 1];
    }
    return result;
};
```

**The
```


## License: unknown
https://github.com/spicecrm/spicecrm/blob/9fc9f2fe1504f2b8f3823adcb24a8416d5741f7d/src/systemcomponents/components/systemhtmleditor.ts

```
Not a large undertaking at all. The implementation is about 10 lines. Here's exactly what it requires and what the tradeoffs are:

**The implementation**

The `html` tag already receives static parts and interpolated values as separate arguments — that's how tagged template literals work. You escape only the interpolated values; static strings written by the developer are trusted code:

```typescript
function escapeHtml(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        result += escapeHtml(values[i]) + strings[i + 1];
    }
    return result;
};
```

**The
```


## License: MIT
https://github.com/alexanderknapstein/stencil_mybranch/blob/489260dddc9f180995effcffa6cc58a3e9794961/src/util/logger/logger-util.ts

```
Not a large undertaking at all. The implementation is about 10 lines. Here's exactly what it requires and what the tradeoffs are:

**The implementation**

The `html` tag already receives static parts and interpolated values as separate arguments — that's how tagged template literals work. You escape only the interpolated values; static strings written by the developer are trusted code:

```typescript
function escapeHtml(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        result += escapeHtml(values[i]) + strings[i + 1];
    }
    return result;
};
```

**The
```

