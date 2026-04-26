/**
 * wires — unified export for all declarative binding utilities
 *
 * Import from one place instead of three:
 *   import { wireContents, wireInputs, wireAttributes, wireClasses, wireStyles } from '@core-utils/wires.js';
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
export { wireInputs } from './wireInputs.js';
export { wireAttributes } from './wireAttributes.js';
export { wireClasses } from './wireClasses.js';
export { wireStyles } from './wireStyles.js';
export { wireActions } from './wireActions.js';
