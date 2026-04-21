/**
 * Custom Elements Manifest analyzer plugin for NativeCoreJS.
 *
 * Reads each NcXxx component class and enriches the generated manifest with:
 *   - All declared attributes (from `static observedAttributes`)
 *   - Allowed enum values (from `static attributeOptions`)
 *   - Whether the attribute is a boolean flag (reflects presence not value)
 *   - JSDoc description from the file-level comment block `Attributes:` section
 *   - CSS custom-property section if a `CSSProperties:` block is present
 *
 * The resulting `custom-elements.json` is consumed by:
 *   - `ts-lit-plugin` / `vscode-lit-plugin` for in-template completions and
 *     type checking inside html`...` tagged template literals
 *   - The VS Code Custom Elements Language Feature extension
 *   - Storybook and documentation generators
 */

// Known boolean attributes that reflect presence, not value.
const BOOLEAN_ATTRS = new Set([
    'disabled', 'readonly', 'required', 'checked', 'selected', 'loading',
    'clearable', 'show-password-toggle', 'full-width', 'open', 'expanded',
    'indeterminate', 'multiple', 'autofocus', 'hidden', 'draggable',
    'closable', 'searchable', 'filterable', 'resizable', 'sticky',
    'show-line-numbers', 'wrap', 'border', 'striped', 'hoverable',
]);

/**
 * Extract the `Attributes:` section from a JSDoc block above the class.
 * Returns a map of { attrName -> description }.
 */
function parseJSDocAttributes(node, ts) {
    const result = {};
    const jsDoc = node.jsDoc;
    if (!Array.isArray(jsDoc)) return result;

    for (const doc of jsDoc) {
        const comment = typeof doc.comment === 'string' ? doc.comment : '';
        // Look for the Attributes: block then grab dash-prefixed lines
        const attrSection = comment.match(/Attributes?:\s*([\s\S]*?)(?:\n\s*\n|\*\/|$)/i);
        if (!attrSection) continue;
        const lines = attrSection[1].split('\n');
        for (const line of lines) {
            const m = line.match(/[-*]\s*`?([\w-]+)`?\s*[:\-–]\s*(.+)/);
            if (m) result[m[1].trim()] = m[2].trim();
        }
    }
    return result;
}

export function nativeCorePlugin() {
    return {
        name: 'nativecore-cem-plugin',
        analyzePhase({ ts, node, moduleDoc }) {
            if (ts.isClassDeclaration(node) && node.name) {
                const className = node.name.getText();
                // Only process nc-* component classes (NcButton, NcInput, etc.)
                if (!/^(Nc[A-Z]|LoadingSpinner)/.test(className)) return;

                const declaration = moduleDoc.declarations?.find(
                    d => d.name === className
                );
                if (!declaration) return;

                const jsDocAttrs = parseJSDocAttributes(node, ts);

                for (const member of node.members ?? []) {
                    if (!ts.isPropertyDeclaration(member) && !ts.isGetAccessorDeclaration(member)) continue;
                    const memberName = member.name?.getText();
                    if (memberName !== 'observedAttributes') continue;

                    // static get observedAttributes() — handled in separate branch
                }

                // Walk static members for observedAttributes array + attributeOptions
                let observedAttrs = [];
                let attrOptions = {};
                let attrPlaceholders = {};

                for (const member of node.members ?? []) {
                    const name = member.name?.getText();

                    // static get observedAttributes(): string[]
                    if (
                        name === 'observedAttributes' &&
                        ts.isGetAccessorDeclaration(member) &&
                        member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)
                    ) {
                        const returnStmt = member.body?.statements?.[0];
                        if (returnStmt && ts.isReturnStatement(returnStmt) && returnStmt.expression) {
                            const arr = returnStmt.expression;
                            if (ts.isArrayLiteralExpression(arr)) {
                                observedAttrs = arr.elements
                                    .filter(ts.isStringLiteral)
                                    .map(el => el.text);
                            }
                        }
                    }

                    // static attributeOptions = { variant: [...], size: [...] }
                    if (
                        name === 'attributeOptions' &&
                        ts.isPropertyDeclaration(member) &&
                        member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) &&
                        member.initializer &&
                        ts.isObjectLiteralExpression(member.initializer)
                    ) {
                        for (const prop of member.initializer.properties) {
                            if (!ts.isPropertyAssignment(prop)) continue;
                            const key = prop.name?.getText()?.replace(/['"]/g, '');
                            if (!key || !ts.isArrayLiteralExpression(prop.initializer)) continue;
                            attrOptions[key] = prop.initializer.elements
                                .filter(ts.isStringLiteral)
                                .map(el => el.text);
                        }
                    }

                    // static attributePlaceholders = { icon: '...', ... }
                    if (
                        name === 'attributePlaceholders' &&
                        ts.isPropertyDeclaration(member) &&
                        member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) &&
                        member.initializer &&
                        ts.isObjectLiteralExpression(member.initializer)
                    ) {
                        for (const prop of member.initializer.properties) {
                            if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteral(prop.initializer)) continue;
                            const key = prop.name?.getText()?.replace(/['"]/g, '');
                            if (key) attrPlaceholders[key] = prop.initializer.text;
                        }
                    }
                }

                if (observedAttrs.length === 0) return;

                // Build the attributes array for the manifest
                declaration.attributes = observedAttrs.map(attrName => {
                    const isBoolean = BOOLEAN_ATTRS.has(attrName);
                    const values = attrOptions[attrName];
                    const description = jsDocAttrs[attrName] ?? attrPlaceholders[attrName] ?? '';

                    const attr = {
                        name: attrName,
                        ...(description ? { description } : {}),
                        ...(isBoolean
                            ? { type: { text: 'boolean' } }
                            : values
                                ? { type: { text: values.map(v => `'${v}'`).join(' | ') } }
                                : { type: { text: 'string' } }),
                    };
                    return attr;
                });
            }
        },

        packageLinkPhase({ customElementsManifest }) {
            // Inject top-level metadata
            customElementsManifest.schemaVersion = '1.0.0';
            customElementsManifest._nativecoreVersion = '1.0.0-rc.1';
        },
    };
}
