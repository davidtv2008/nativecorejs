/**
 * wires — unified export for all declarative binding utilities
 *
 * Import from one place instead of three:
 *   import { wireContents, wireInputs, wireAttributes, wireClasses, wireStyles, wireActions } from '@core-utils/wires.js';
 *
 * | Utility           | HTML attribute               | Direction           |
 * |-------------------|------------------------------|---------------------|
 * | wireContents()    | wire-content="key"           | state → textContent |
 * | wireInputs()      | wire-input="key"             | state ↔ input value |
 * | wireAttributes()  | wire-attribute="key:attr"    | state → setAttribute|
 * | wireClasses()     | wire-class="key:class"       | state → class toggle|
 * | wireStyles()      | wire-style="key:css-prop"    | state → style value |
 * | wireActions()     | wire-action="name:eventType" | DOM event → handler |
 */

export { wireContents } from './wireContents.js';
export type { WireContentsOptions, WireContentsResult } from './wireContents.js';

export { wireInputs } from './wireInputs.js';
export type { WireInputsOptions, WireInputsResult } from './wireInputs.js';

export { wireAttributes } from './wireAttributes.js';
export type { WireAttributesOptions, WireAttributesResult } from './wireAttributes.js';

export { wireClasses } from './wireClasses.js';
export type { WireClassesOptions, WireClassesResult } from './wireClasses.js';

export { wireStyles } from './wireStyles.js';
export type { WireStylesOptions, WireStylesResult } from './wireStyles.js';

export { wireActions } from './wireActions.js';
export type { WireActionsOptions, WireActionsResult, WireAction } from './wireActions.js';

