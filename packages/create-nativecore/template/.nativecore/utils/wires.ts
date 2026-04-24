/**
 * wires — unified export for all declarative binding utilities
 *
 * Import from one place instead of three:
 *   import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';
 *
 * | Utility          | HTML attribute               | Direction           |
 * |------------------|------------------------------|---------------------|
 * | wireContents()    | wire-content="key"           | state → textContent |
 * | wireInputs()     | wire-input="key"             | state ↔ input value |
 * | wireAttributes() | wire-attribute="key:attr"    | state → setAttribute|
 */

export { wireContents } from './wireContents.js';
export type { WireContentsOptions, WireContentsResult } from './wireContents.js';

export { wireInputs } from './wireInputs.js';
export type { WireInputsOptions, WireInputsResult } from './wireInputs.js';

export { wireAttributes } from './wireAttributes.js';
export type { WireAttributesOptions, WireAttributesResult } from './wireAttributes.js';
