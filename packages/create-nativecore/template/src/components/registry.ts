/**
 * Component Registry
 */
import { registerAppComponents } from './appRegistry.js';
import { registerFrameworkComponents } from './frameworkRegistry.js';

registerFrameworkComponents();
registerAppComponents();
