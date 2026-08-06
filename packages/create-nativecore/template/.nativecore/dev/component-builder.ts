/**
 * NativeCore Component Builder
 *
 * Dev-only visual tool to compose new custom components without writing code.
 * Launched from the dev indicator pill via the [+] button or Ctrl+Shift+B.
 *
 * Features:
 *   - Palette of all registered nc-* components + block elements
 *   - Live flexbox canvas — drag to reorder, add/remove children
 *   - Flex direction, wrap, gap, align, justify controls
 *   - Per-child attribute editor (uses component's attributeOptions/observedAttributes)
 *   - Event builder — name, trigger, payload fields, bubbles/composed/cancelable
 *   - Open existing src/components/ui/* components for round-trip editing
 *   - Code preview panel (auto-generated Component class)
 *   - Actions: Copy, Download, Save to disk
 *
 * SECURITY: Never loaded outside localhost/dev. Excluded from production build.
 */

import {
    createEmptyState,
    generateBuilderCode,
    parseBuilderSource,
    toClassName,
    uid,
} from './component-builder-codegen.mjs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildNode {
    id: string;
    tag: string;
    attrs: Record<string, { type: 'text' | 'bool'; value: string | boolean }>;
    slotContent: string;
    classList: string;
    nodeId: string;
}

interface CanvasLayout {
    direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    wrap: 'nowrap' | 'wrap' | 'wrap-reverse';
    alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    gap: string;
    padding: string;
}

interface EventDef {
    id: string;
    name: string;
    trigger: string;       // e.g. "nc-button-click" on "nc-button"
    triggerTag: string;
    payload: { key: string; type: 'string' | 'boolean' | 'number' | 'object' }[];
    bubbles: boolean;
    composed: boolean;
    cancelable: boolean;
}

interface EventLogEntry {
    id: string;
    timestamp: string;
    eventType: string;
    sourceTag: string;
    detail: string;
}

interface BuilderState {
    componentTag: string;
    componentClass: string;
    componentDesc: string;
    useShadowDOM: boolean;
    observedAttrs: { name: string; defaultValue: string }[];
    children: ChildNode[];
    layout: CanvasLayout;
    events: EventDef[];
    selectedChildId: string | null;
    dragSourceId: string | null;
    dragOverId: string | null;
}

// ─── Palette catalog ─────────────────────────────────────────────────────────

const NC_PALETTE: { tag: string; label: string; icon: string; category: string }[] = [
    // Inputs
    { tag: 'nc-button',       label: 'Button',        icon: '🔘', category: 'Inputs' },
    { tag: 'nc-input',        label: 'Input',         icon: '✏️', category: 'Inputs' },
    { tag: 'nc-textarea',     label: 'Textarea',      icon: '📝', category: 'Inputs' },
    { tag: 'nc-checkbox',     label: 'Checkbox',      icon: '☑️', category: 'Inputs' },
    { tag: 'nc-switch',       label: 'Switch',        icon: '🔄', category: 'Inputs' },
    { tag: 'nc-select',       label: 'Select',        icon: '📋', category: 'Inputs' },
    { tag: 'nc-slider',       label: 'Slider',        icon: '🎚️', category: 'Inputs' },
    { tag: 'nc-radio',        label: 'Radio',         icon: '⭕', category: 'Inputs' },
    { tag: 'nc-number-input', label: 'Number Input',  icon: '🔢', category: 'Inputs' },
    { tag: 'nc-date-picker',  label: 'Date Picker',   icon: '📅', category: 'Inputs' },
    // Display
    { tag: 'nc-badge',        label: 'Badge',         icon: '🏷️', category: 'Display' },
    { tag: 'nc-alert',        label: 'Alert',         icon: '⚠️', category: 'Display' },
    { tag: 'nc-avatar',       label: 'Avatar',        icon: '👤', category: 'Display' },
    { tag: 'nc-card',         label: 'Card',          icon: '🃏', category: 'Display' },
    { tag: 'nc-chip',         label: 'Chip',          icon: '🏷️', category: 'Display' },
    { tag: 'nc-image',        label: 'Image',         icon: '🖼️', category: 'Display' },
    { tag: 'nc-progress',     label: 'Progress',      icon: '📊', category: 'Display' },
    { tag: 'nc-skeleton',     label: 'Skeleton',      icon: '💀', category: 'Display' },
    { tag: 'nc-tooltip',      label: 'Tooltip',       icon: '💬', category: 'Display' },
    // Layout
    { tag: 'nc-div',          label: 'nc-div',        icon: '📦', category: 'Layout' },
    { tag: 'nc-divider',      label: 'Divider',       icon: '➖', category: 'Layout' },
    { tag: 'nc-collapsible',  label: 'Collapsible',   icon: '🪗', category: 'Layout' },
    // Navigation
    { tag: 'nc-a',            label: 'Link',          icon: '🔗', category: 'Nav' },
    { tag: 'nc-breadcrumb',   label: 'Breadcrumb',    icon: '🍞', category: 'Nav' },
    { tag: 'nc-pagination',   label: 'Pagination',    icon: '📄', category: 'Nav' },
    // Overlay
    { tag: 'nc-modal',        label: 'Modal',         icon: '🪟', category: 'Overlay' },
    { tag: 'nc-drawer',       label: 'Drawer',        icon: '🗄️', category: 'Overlay' },
    { tag: 'nc-popover',      label: 'Popover',       icon: '💭', category: 'Overlay' },
    // Native blocks
    { tag: 'div',             label: '<div>',         icon: '⬜', category: 'HTML' },
    { tag: 'span',            label: '<span>',        icon: '📏', category: 'HTML' },
    { tag: 'p',               label: '<p>',           icon: '¶',  category: 'HTML' },
    { tag: 'h2',              label: '<h2>',          icon: 'H2', category: 'HTML' },
    { tag: 'h3',              label: '<h3>',          icon: 'H3', category: 'HTML' },
    { tag: 'img',             label: '<img>',         icon: '🖼', category: 'HTML' },
    { tag: 'ul',              label: '<ul>',          icon: '•',  category: 'HTML' },
    { tag: 'form',            label: '<form>',        icon: '📋', category: 'HTML' },
    { tag: 'section',         label: '<section>',     icon: '§',  category: 'HTML' },
];

// Known attribute options per component tag (subset — runtime will query actual class)
const KNOWN_ATTR_OPTIONS: Record<string, Record<string, string[]>> = {
    'nc-button':  { variant: ['primary', 'secondary', 'tertiary', 'success', 'danger', 'outline'], size: ['sm', 'md', 'lg'] },
    'nc-input':   { type: ['text', 'email', 'password', 'search', 'url', 'tel', 'number'], size: ['sm', 'md', 'lg'], variant: ['default', 'filled'] },
    'nc-badge':   { variant: ['default', 'primary', 'success', 'warning', 'danger', 'info'], size: ['sm', 'md', 'lg'] },
    'nc-alert':   { variant: ['info', 'success', 'warning', 'danger'] },
    'nc-card':    { variant: ['default', 'outlined', 'elevated'] },
    'nc-chip':    { variant: ['default', 'primary', 'success', 'warning', 'danger'] },
    'nc-select':  { size: ['sm', 'md', 'lg'] },
    'nc-slider':  {},
    'nc-switch':  {},
    'nc-modal':   { size: ['sm', 'md', 'lg', 'xl', 'full'] },
    'nc-drawer':  { position: ['left', 'right', 'top', 'bottom'], size: ['sm', 'md', 'lg'] },
    'nc-avatar':  { size: ['xs', 'sm', 'md', 'lg', 'xl'] },
    'nc-progress':{ variant: ['default', 'success', 'warning', 'danger'] },
};

const KNOWN_OBS_ATTRS: Record<string, string[]> = {
    'nc-button':  ['variant', 'size', 'icon', 'icon-position', 'alt', 'disabled', 'loading', 'full-width'],
    'nc-input':   ['name', 'value', 'type', 'placeholder', 'disabled', 'readonly', 'required', 'size', 'variant', 'error', 'hint', 'clearable'],
    'nc-badge':   ['variant', 'size', 'dot'],
    'nc-alert':   ['variant', 'title', 'dismissible'],
    'nc-card':    ['variant', 'href', 'clickable'],
    'nc-chip':    ['variant', 'dismissible', 'selected'],
    'nc-select':  ['name', 'value', 'placeholder', 'disabled', 'required', 'size'],
    'nc-switch':  ['name', 'checked', 'disabled', 'label'],
    'nc-checkbox':['name', 'checked', 'disabled', 'required', 'label'],
    'nc-modal':   ['open', 'size', 'title'],
    'nc-drawer':  ['open', 'position', 'size', 'title'],
    'nc-avatar':  ['src', 'alt', 'size', 'initials'],
    'nc-image':   ['src', 'alt', 'width', 'height', 'loading'],
    'nc-progress':['value', 'max', 'variant', 'label'],
    'nc-slider':  ['value', 'min', 'max', 'step', 'disabled'],
    'nc-a':       ['href', 'target', 'rel'],
    'nc-div':     ['class'],
};

const KNOWN_BOOL_ATTRS: Record<string, string[]> = {
    'nc-button': ['disabled', 'loading', 'full-width'],
    'nc-input': ['disabled', 'readonly', 'required', 'clearable'],
    'nc-checkbox': ['checked', 'disabled', 'required'],
    'nc-switch': ['checked', 'disabled'],
    'nc-select': ['disabled', 'required'],
    'nc-card': ['clickable'],
    'nc-chip': ['dismissible', 'selected'],
    'nc-alert': ['dismissible'],
    'nc-modal': ['open'],
    'nc-drawer': ['open'],
    'nc-badge': ['dot'],
    'img': ['loading'],
    'input': ['disabled', 'readonly', 'required', 'checked'],
    'form': ['novalidate'],
};

function inferAttrType(tag: string, attrName: string): 'text' | 'bool' {
    const known = KNOWN_BOOL_ATTRS[tag] || [];
    if (known.includes(attrName)) return 'bool';
    const genericBool = new Set([
        'disabled', 'readonly', 'required', 'checked', 'selected', 'open', 'loading',
        'multiple', 'autofocus', 'hidden', 'novalidate', 'controls', 'muted', 'loop',
        'playsinline', 'draggable', 'contenteditable',
    ]);
    return genericBool.has(attrName) ? 'bool' : 'text';
}

// ─── ComponentBuilder ─────────────────────────────────────────────────────────

const BUILDER_DND_MIME = 'application/x-nc-builder-tag';

export class ComponentBuilder {
    private panel: HTMLElement | null = null;
    private isOpen: boolean = false;
    private state: BuilderState;
    private codePreviewOpen: boolean = false;
    private loadedFromDisk: boolean = false;
    private loadedBuilderOwned: boolean = true;
    private language: 'ts' | 'js' = 'ts';
    private openPickerEl: HTMLElement | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private eventLog: EventLogEntry[] = [];
    private eventBridgeListeners: Map<string, { eventName: string; handler: EventListener }> = new Map();
    private eventLogListeners: Map<string, EventListener> = new Map();
    private canvasHostBound: boolean = false;
    private dragActive: boolean = false;
    private docDragOver: ((e: DragEvent) => void) | null = null;
    private docDrop: ((e: DragEvent) => void) | null = null;
    private docDragEnd: ((e: DragEvent) => void) | null = null;

    constructor() {
        this.state = this.defaultState();
        this.injectStyles();
        this.createPanel();
        this.keydownHandler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                // Esc cancels an in-flight HTML5 drag — do not close the builder.
                if (this.dragActive) {
                    this.dragActive = false;
                    return;
                }
                if (this.openPickerEl) {
                    this.closeOpenPicker();
                    return;
                }
                this.close();
            }
        };
        window.addEventListener('keydown', this.keydownHandler);
    }

    private defaultState(): BuilderState {
        return createEmptyState() as BuilderState;
    }

    open(): void {
        if (!this.panel) return;
        this.isOpen = true;
        this.panel.classList.add('active');
        void this.ensureProjectLanguage();
        this.renderAll();
        this.syncEventRuntime();
        this.bindDocDragSafety();
    }

    private async ensureProjectLanguage(): Promise<void> {
        try {
            const res = await fetch('/api/dev/project-config');
            if (!res.ok) return;
            const cfg = await res.json() as { language?: 'ts' | 'js'; useTypeScript?: boolean };
            this.language = cfg.language === 'js' || cfg.useTypeScript === false ? 'js' : 'ts';
            this.updateCodePane();
        } catch {
            // keep default ts
        }
    }

    close(): void {
        if (!this.panel) return;
        this.closeOpenPicker();
        this.isOpen = false;
        this.panel.classList.remove('active');
        this.clearEventRuntime();
        this.unbindDocDragSafety();
    }

    toggle(): void {
        this.isOpen ? this.close() : this.open();
    }

    destroy(): void {
        this.clearEventRuntime();
        this.unbindDocDragSafety();
        this.panel?.remove();
        if (this.keydownHandler) window.removeEventListener('keydown', this.keydownHandler);
    }

    private bindDocDragSafety(): void {
        if (this.docDragOver) return; // already bound
        this.docDragOver = (e: DragEvent) => {
            if (!this.isOpen) return;
            // Required so drops are allowed and the browser does not navigate.
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = this.dragActive ? 'copy' : e.dataTransfer.dropEffect;
        };
        this.docDrop = (e: DragEvent) => {
            if (!this.isOpen) return;
            e.preventDefault();
            this.dragActive = false;
        };
        this.docDragEnd = () => {
            this.dragActive = false;
        };
        // Capture phase ensures this runs even if nested components call stopPropagation().
        document.addEventListener('dragover', this.docDragOver, true);
        document.addEventListener('drop', this.docDrop, true);
        document.addEventListener('dragend', this.docDragEnd, true);
    }

    private unbindDocDragSafety(): void {
        if (this.docDragOver) {
            document.removeEventListener('dragover', this.docDragOver, true);
            this.docDragOver = null;
        }
        if (this.docDrop) {
            document.removeEventListener('drop', this.docDrop, true);
            this.docDrop = null;
        }
        if (this.docDragEnd) {
            document.removeEventListener('dragend', this.docDragEnd, true);
            this.docDragEnd = null;
        }
        this.dragActive = false;
    }

    private readDragTag(e: DragEvent): string {
        const dt = e.dataTransfer;
        if (!dt) return '';
        const typed = dt.getData(BUILDER_DND_MIME) || dt.getData('text/plain') || '';
        if (!typed || typed.startsWith('__reorder__:')) return '';
        // Guard against accidental URL/file drops navigating or injecting paths.
        if (/[:/\\]/.test(typed) || typed.includes('://')) return '';
        return typed.trim();
    }

    // ─── Styles ───────────────────────────────────────────────────────────────

    private injectStyles(): void {
        const id = 'nc-builder-styles';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            /* Builder root */
            .nc-builder-root {
                position: fixed; inset: 0;
                z-index: 1000100;
                display: none;
                flex-direction: column;
                background: #0d1117;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 12px;
                color: #cdd6f4;
            }
            .nc-builder-root.active { display: flex; }

            /* Top bar */
            .nc-builder-topbar {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 0 16px;
                height: 44px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                flex-shrink: 0;
                color: white;
            }
            .nc-builder-topbar-title {
                font-size: 13px; font-weight: 700; letter-spacing: 0.3px; flex: 1;
            }
            .nc-builder-topbar-tag {
                background: rgba(255,255,255,0.2); border-radius: 6px;
                padding: 3px 10px; font-size: 11px; font-family: 'Fira Code', monospace;
            }
            .nc-builder-topbar-actions { display: flex; gap: 8px; align-items: center; }
            .nc-builder-tb-btn {
                background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.28);
                border-radius: 6px; color: white; padding: 5px 12px;
                font-size: 11px; font-weight: 600; cursor: pointer; transition: background 0.15s;
            }
            .nc-builder-tb-btn:hover { background: rgba(255,255,255,0.3); }
            .nc-builder-tb-btn.primary {
                background: rgba(255,255,255,0.9); color: #667eea;
            }
            .nc-builder-tb-btn.primary:hover { background: white; }
            .nc-builder-tb-btn.green {
                background: rgba(74,222,128,0.22); border-color: rgba(74,222,128,0.45);
            }
            .nc-builder-tb-btn.green:hover { background: rgba(74,222,128,0.35); }

            /* Open existing picker */
            .nc-builder-open-overlay {
                position: absolute; inset: 0; z-index: 20;
                background: rgba(0,0,0,0.55);
                display: flex; align-items: center; justify-content: center;
                padding: 24px;
            }
            .nc-builder-open-modal {
                width: min(480px, 100%);
                max-height: min(70vh, 560px);
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 12px;
                box-shadow: 0 24px 60px rgba(0,0,0,0.55);
                display: flex; flex-direction: column;
                overflow: hidden;
            }
            .nc-builder-open-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 14px; border-bottom: 1px solid #30363d;
                font-size: 13px; font-weight: 700; color: #f0f6fc;
            }
            .nc-builder-open-close {
                background: none; border: none; color: #8b949e; cursor: pointer;
                font-size: 16px; line-height: 1; padding: 2px 6px; border-radius: 4px;
            }
            .nc-builder-open-close:hover { background: #21262d; color: #f0f6fc; }
            .nc-builder-open-search {
                margin: 10px 12px 0; width: calc(100% - 24px);
                background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
                padding: 7px 10px; color: #cdd6f4; font-size: 12px; outline: none;
                box-sizing: border-box;
            }
            .nc-builder-open-search:focus { border-color: #667eea; }
            .nc-builder-open-list {
                flex: 1; overflow: auto; padding: 8px; margin-top: 8px;
            }
            .nc-builder-open-item {
                width: 100%; text-align: left; cursor: pointer;
                background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
                padding: 10px 12px; margin-bottom: 6px; color: #cdd6f4;
            }
            .nc-builder-open-item:hover { border-color: #667eea; background: #12181f; }
            .nc-builder-open-item-tag {
                font-family: 'Fira Code', Consolas, monospace; font-size: 12px; font-weight: 700;
                color: #f0f6fc;
            }
            .nc-builder-open-item-meta {
                margin-top: 3px; font-size: 10px; color: #8b949e;
            }
            .nc-builder-open-badge {
                display: inline-block; margin-left: 6px; padding: 1px 6px;
                border-radius: 999px; font-size: 9px; font-weight: 700;
                background: rgba(102,126,234,0.18); color: #a5b4fc;
                vertical-align: middle;
            }
            .nc-builder-open-empty {
                padding: 28px 16px; text-align: center; color: #6e7681; font-size: 12px;
                line-height: 1.6;
            }
            .nc-builder-close {
                background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.28);
                border-radius: 6px; color: white; width: 28px; height: 28px;
                font-size: 16px; cursor: pointer; display: flex; align-items: center;
                justify-content: center; transition: background 0.15s;
            }
            .nc-builder-close:hover { background: rgba(255,255,255,0.3); }

            /* Three-column body */
            .nc-builder-body {
                display: grid;
                grid-template-columns: 220px 1fr 320px;
                flex: 1;
                overflow: hidden;
            }

            /* ── Palette ── */
            .nc-builder-palette {
                background: #161b22; border-right: 1px solid #30363d;
                display: flex; flex-direction: column; overflow: hidden;
            }
            .nc-builder-palette-search {
                padding: 10px 12px; border-bottom: 1px solid #30363d; flex-shrink: 0;
            }
            .nc-builder-search-input {
                width: 100%; background: #0d1117; border: 1px solid #30363d;
                border-radius: 6px; padding: 6px 10px; color: #cdd6f4;
                font-size: 11px; outline: none; box-sizing: border-box;
            }
            .nc-builder-search-input:focus { border-color: #667eea; }
            .nc-builder-palette-list {
                flex: 1; overflow-y: auto; padding: 8px 0;
            }
            .nc-builder-palette-list::-webkit-scrollbar { width: 6px; }
            .nc-builder-palette-list::-webkit-scrollbar-track { background: #161b22; }
            .nc-builder-palette-list::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
            .nc-builder-category-label {
                padding: 6px 12px 3px; font-size: 9px; font-weight: 700;
                color: #6e7681; text-transform: uppercase; letter-spacing: 0.8px;
            }
            .nc-builder-palette-item {
                display: flex; align-items: center; gap: 8px;
                padding: 6px 12px; cursor: grab; user-select: none;
                border-radius: 4px; margin: 1px 6px; transition: background 0.1s;
            }
            .nc-builder-palette-item:hover { background: #21262d; }
            .nc-builder-palette-item:active { cursor: grabbing; }
            .nc-builder-palette-icon {
                width: 22px; height: 22px; font-size: 14px;
                display: flex; align-items: center; justify-content: center;
                background: #21262d; border-radius: 4px; flex-shrink: 0;
            }
            .nc-builder-palette-label { font-size: 11px; color: #c9d1d9; }
            .nc-builder-palette-tag { font-size: 9px; color: #6e7681; font-family: 'Fira Code', monospace; }

            /* ── Canvas ── */
            .nc-builder-canvas-wrap {
                display: flex; flex-direction: column; background: #0d1117; overflow: hidden;
            }
            .nc-builder-canvas-toolbar {
                display: flex; align-items: center; gap: 8px; padding: 8px 12px;
                background: #161b22; border-bottom: 1px solid #30363d;
                flex-shrink: 0; flex-wrap: wrap;
            }
            .nc-builder-canvas-toolbar label {
                font-size: 10px; color: #6e7681; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .nc-builder-ctrl-select {
                background: #21262d; border: 1px solid #30363d; border-radius: 5px;
                padding: 4px 8px; color: #cdd6f4; font-size: 11px; cursor: pointer; outline: none;
            }
            .nc-builder-ctrl-select:focus { border-color: #667eea; }
            .nc-builder-ctrl-input {
                background: #21262d; border: 1px solid #30363d; border-radius: 5px;
                padding: 4px 8px; color: #cdd6f4; font-size: 11px; width: 70px;
                outline: none;
            }
            .nc-builder-ctrl-input:focus { border-color: #667eea; }
            .nc-builder-canvas-toolbar .sep {
                width: 1px; height: 20px; background: #30363d; margin: 0 4px;
            }
            .nc-builder-canvas-area {
                flex: 1; overflow: auto; padding: 24px; display: flex;
                align-items: flex-start; justify-content: center;
            }
            .nc-builder-canvas-area::-webkit-scrollbar { width: 8px; height: 8px; }
            .nc-builder-canvas-area::-webkit-scrollbar-track { background: #0d1117; }
            .nc-builder-canvas-area::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }

            /* The live canvas host element */
            .nc-builder-canvas-host {
                min-width: 360px; min-height: 200px;
                background: #ffffff; border-radius: 10px;
                box-shadow: 0 0 0 1px #30363d, 0 8px 32px rgba(0,0,0,0.5);
                position: relative;
            }
            .nc-builder-canvas-host.drag-over-canvas {
                box-shadow: 0 0 0 2px #667eea, 0 8px 32px rgba(102,126,234,0.3);
            }
            .nc-builder-empty-drop {
                position: absolute; inset: 0; display: flex; align-items: center;
                justify-content: center; flex-direction: column; gap: 8px;
                color: #6e7681; pointer-events: none;
            }
            .nc-builder-empty-drop-icon { font-size: 36px; opacity: 0.4; }
            .nc-builder-empty-drop-text { font-size: 12px; opacity: 0.6; }
            .nc-builder-empty-open {
                pointer-events: auto;
                margin-top: 10px;
                background: #667eea; border: none; border-radius: 6px;
                color: #fff; font-size: 11px; font-weight: 700;
                padding: 7px 12px; cursor: pointer;
            }
            .nc-builder-empty-open:hover { background: #7c8ff0; }

            /* Child wrapper inside the live canvas */
            .nc-builder-child-wrap {
                position: relative; display: inline-flex;
                transition: outline 0.1s;
            }
            .nc-builder-child-wrap:hover { outline: 1px dashed rgba(102,126,234,0.5); }
            .nc-builder-child-wrap.selected { outline: 2px solid #667eea !important; border-radius: 3px; }
            .nc-builder-child-wrap.drag-over { outline: 2px dashed #f59e0b !important; border-radius: 3px; }
            .nc-builder-child-controls {
                position: absolute; top: -22px; left: 0;
                display: none; gap: 2px; z-index: 10;
                background: #1e1e2e; border: 1px solid #30363d;
                border-radius: 4px; padding: 2px 4px;
            }
            .nc-builder-child-wrap.selected .nc-builder-child-controls { display: flex; }
            .nc-builder-child-ctrl-btn {
                background: none; border: none; cursor: pointer; color: #cdd6f4;
                font-size: 11px; padding: 1px 3px; border-radius: 2px; line-height: 1;
            }
            .nc-builder-child-ctrl-btn:hover { background: #313244; }

            /* ── Properties ── */
            .nc-builder-props {
                background: #161b22; border-left: 1px solid #30363d;
                display: flex; flex-direction: column; overflow: hidden;
            }
            .nc-builder-props-tabs {
                display: flex; border-bottom: 1px solid #30363d; flex-shrink: 0;
            }
            .nc-builder-props-tab {
                flex: 1; padding: 10px 6px; font-size: 10px; font-weight: 700;
                text-align: center; cursor: pointer; color: #6e7681;
                text-transform: uppercase; letter-spacing: 0.5px;
                border-bottom: 2px solid transparent; transition: all 0.15s;
            }
            .nc-builder-props-tab:hover { color: #cdd6f4; background: #21262d; }
            .nc-builder-props-tab.active { color: #667eea; border-bottom-color: #667eea; }
            .nc-builder-props-body {
                flex: 1; overflow-y: auto; padding: 14px;
            }
            .nc-builder-props-body::-webkit-scrollbar { width: 6px; }
            .nc-builder-props-body::-webkit-scrollbar-track { background: #161b22; }
            .nc-builder-props-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

            /* Field group */
            .nc-builder-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
            .nc-builder-field-label {
                font-size: 10px; color: #8b949e; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.4px;
            }
            .nc-builder-field-input {
                background: #21262d; border: 1px solid #30363d; border-radius: 6px;
                padding: 7px 10px; color: #cdd6f4; font-size: 11px;
                outline: none; width: 100%; box-sizing: border-box;
            }
            .nc-builder-field-input:focus { border-color: #667eea; }
            .nc-builder-field-select {
                background: #21262d; border: 1px solid #30363d; border-radius: 6px;
                padding: 7px 10px; color: #cdd6f4; font-size: 11px;
                outline: none; width: 100%; cursor: pointer; box-sizing: border-box;
            }
            .nc-builder-field-select:focus { border-color: #667eea; }
            .nc-builder-field-checkbox {
                display: flex; align-items: center; gap: 8px;
            }
            .nc-builder-field-checkbox input[type="checkbox"] {
                width: 15px; height: 15px; accent-color: #667eea; cursor: pointer;
            }
            .nc-builder-field-checkbox span { font-size: 11px; color: #cdd6f4; }

            /* Section divider */
            .nc-builder-section-title {
                font-size: 10px; font-weight: 700; color: #6e7681;
                text-transform: uppercase; letter-spacing: 0.6px;
                padding: 4px 0 8px; border-bottom: 1px solid #21262d;
                margin-bottom: 12px;
            }

            /* Tag row */
            .nc-builder-tag-row {
                display: flex; gap: 8px; margin-bottom: 12px;
            }
            .nc-builder-tag-row .nc-builder-field { flex: 1; margin-bottom: 0; }

            /* Attr list */
            .nc-builder-attr-row {
                display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
            }
            .nc-builder-attr-name {
                flex: 1; background: #21262d; border: 1px solid #30363d;
                border-radius: 5px; padding: 5px 8px; color: #89b4fa;
                font-size: 10px; font-family: 'Fira Code', monospace;
                outline: none; min-width: 0;
            }
            .nc-builder-attr-name:focus { border-color: #667eea; }
            .nc-builder-attr-value {
                flex: 1.5; background: #21262d; border: 1px solid #30363d;
                border-radius: 5px; padding: 5px 8px; color: #a6e3a1;
                font-size: 10px; font-family: 'Fira Code', monospace;
                outline: none; min-width: 0;
            }
            .nc-builder-attr-value:focus { border-color: #667eea; }
            .nc-builder-remove-btn {
                background: none; border: none; cursor: pointer; color: #6e7681;
                font-size: 14px; padding: 2px; line-height: 1; border-radius: 3px;
            }
            .nc-builder-remove-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
            .nc-builder-add-btn {
                background: #21262d; border: 1px dashed #30363d; border-radius: 6px;
                padding: 6px; color: #6e7681; font-size: 11px; cursor: pointer;
                width: 100%; text-align: center; transition: all 0.15s;
            }
            .nc-builder-add-btn:hover { background: #30363d; color: #cdd6f4; border-color: #667eea; }

            /* Event list */
            .nc-builder-event-card {
                background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
                padding: 12px; margin-bottom: 10px;
            }
            .nc-builder-event-header {
                display: flex; align-items: center; justify-content: space-between;
                margin-bottom: 10px;
            }
            .nc-builder-event-name-badge {
                background: rgba(102,126,234,0.15); border: 1px solid rgba(102,126,234,0.3);
                border-radius: 12px; padding: 2px 10px; font-size: 10px;
                color: #89b4fa; font-family: 'Fira Code', monospace;
            }
            .nc-builder-event-trigger-row {
                display: flex; gap: 6px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;
            }
            .nc-builder-event-trigger-label { font-size: 10px; color: #6e7681; }
            .nc-builder-payload-row {
                display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
            }
            .nc-builder-payload-key {
                flex: 1; background: #21262d; border: 1px solid #30363d;
                border-radius: 5px; padding: 4px 8px; color: #89b4fa;
                font-size: 10px; font-family: 'Fira Code', monospace; outline: none;
            }
            .nc-builder-payload-key:focus { border-color: #667eea; }
            .nc-builder-payload-type {
                background: #21262d; border: 1px solid #30363d; border-radius: 5px;
                padding: 4px 6px; color: #cdd6f4; font-size: 10px; cursor: pointer; outline: none;
            }
            .nc-builder-payload-type:focus { border-color: #667eea; }
            .nc-builder-event-options {
                display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;
            }
            .nc-builder-event-option-cb {
                display: flex; align-items: center; gap: 5px; font-size: 10px; color: #8b949e;
            }
            .nc-builder-event-option-cb input { accent-color: #667eea; cursor: pointer; }
            .nc-builder-log-box {
                margin-top: 12px;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 8px;
                overflow: hidden;
            }
            .nc-builder-log-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 10px;
                border-bottom: 1px solid #21262d;
                background: #101620;
            }
            .nc-builder-log-title {
                font-size: 10px;
                font-weight: 700;
                color: #8b949e;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .nc-builder-log-clear {
                background: #21262d;
                border: 1px solid #30363d;
                border-radius: 5px;
                color: #cdd6f4;
                font-size: 10px;
                cursor: pointer;
                padding: 2px 8px;
            }
            .nc-builder-log-clear:hover { background: #30363d; }
            .nc-builder-log-list {
                max-height: 180px;
                overflow-y: auto;
                padding: 6px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .nc-builder-log-list::-webkit-scrollbar { width: 6px; }
            .nc-builder-log-list::-webkit-scrollbar-track { background: #0d1117; }
            .nc-builder-log-list::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
            .nc-builder-log-item {
                border: 1px solid #21262d;
                border-radius: 6px;
                padding: 6px 8px;
                background: #111827;
            }
            .nc-builder-log-meta {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 9px;
                color: #6e7681;
                margin-bottom: 3px;
                flex-wrap: wrap;
            }
            .nc-builder-log-evt {
                font-family: 'Fira Code', monospace;
                color: #89b4fa;
            }
            .nc-builder-log-src {
                font-family: 'Fira Code', monospace;
                color: #a6e3a1;
            }
            .nc-builder-log-detail {
                font-family: 'Fira Code', monospace;
                font-size: 10px;
                color: #cdd6f4;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .nc-builder-log-empty {
                font-size: 10px;
                color: #6e7681;
                text-align: center;
                padding: 10px 6px;
            }

            /* Code preview */
            .nc-builder-code-bar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 6px 12px; background: #161b22; border-top: 1px solid #30363d;
                cursor: pointer; user-select: none; flex-shrink: 0;
            }
            .nc-builder-code-bar-label { font-size: 11px; font-weight: 600; color: #6e7681; }
            .nc-builder-code-bar-chevron { font-size: 10px; color: #6e7681; transition: transform 0.2s; }
            .nc-builder-code-bar.open .nc-builder-code-bar-chevron { transform: rotate(180deg); }
            .nc-builder-code-pane {
                height: 0; overflow: hidden; transition: height 0.25s ease; flex-shrink: 0;
            }
            .nc-builder-code-pane.open { height: 220px; }
            .nc-builder-code-inner {
                display: flex; flex-direction: column; height: 220px;
                background: #0d1117; border-top: 1px solid #30363d;
            }
            .nc-builder-code-actions {
                display: flex; gap: 8px; padding: 8px 12px;
                border-bottom: 1px solid #30363d; flex-shrink: 0;
            }
            .nc-builder-code-btn {
                background: #21262d; border: 1px solid #30363d; border-radius: 5px;
                color: #cdd6f4; padding: 4px 12px; font-size: 10px; font-weight: 600;
                cursor: pointer; transition: all 0.15s;
            }
            .nc-builder-code-btn:hover { background: #30363d; }
            .nc-builder-code-btn.green { border-color: rgba(74,222,128,0.4); color: #4ade80; }
            .nc-builder-code-btn.green:hover { background: rgba(74,222,128,0.1); }
            .nc-builder-code-btn.purple { border-color: rgba(102,126,234,0.4); color: #89b4fa; }
            .nc-builder-code-btn.purple:hover { background: rgba(102,126,234,0.1); }
            pre.nc-builder-code-pre {
                flex: 1; overflow: auto; margin: 0;
                padding: 10px 14px; font-size: 10px; line-height: 1.6;
                font-family: 'Fira Code', Consolas, monospace;
                color: #cdd6f4; background: transparent; white-space: pre;
            }
            pre.nc-builder-code-pre::-webkit-scrollbar { width: 6px; height: 6px; }
            pre.nc-builder-code-pre::-webkit-scrollbar-track { background: #0d1117; }
            pre.nc-builder-code-pre::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

            /* Placeholder hint */
            .nc-builder-hint {
                padding: 14px; background: #0d1117; border-radius: 8px;
                border: 1px dashed #30363d; text-align: center;
                color: #6e7681; font-size: 11px; line-height: 1.6;
                margin-bottom: 12px;
            }

            /* No-child hint in props */
            .nc-builder-no-select {
                text-align: center; padding: 24px 12px; color: #6e7681;
            }
            .nc-builder-no-select-icon { font-size: 28px; margin-bottom: 8px; }
        `;
        document.head.appendChild(style);
    }

    // ─── Panel skeleton ────────────────────────────────────────────────────────

    private createPanel(): void {
        this.panel = document.createElement('div');
        this.panel.className = 'nc-builder-root';
        this.panel.id = 'nc-builder-root';
        this.panel.innerHTML = `
            <div class="nc-builder-topbar">
                <span class="nc-builder-topbar-title">⚡ Component Builder</span>
                <span class="nc-builder-topbar-tag" id="ncb-tag-badge">&lt;my-component&gt;</span>
                <div class="nc-builder-topbar-actions">
                    <button class="nc-builder-tb-btn green" id="ncb-btn-open" title="Load a component from src/components/ui/">Open existing</button>
                    <button class="nc-builder-tb-btn" id="ncb-btn-reset" title="Reset canvas">Reset</button>
                    <button class="nc-builder-tb-btn primary" id="ncb-btn-save" title="Save to src/components/ui/">Save file</button>
                    <button class="nc-builder-close" id="ncb-btn-close" title="Close (Esc)">✕</button>
                </div>
            </div>

            <div class="nc-builder-body">
                <!-- Left: Palette -->
                <div class="nc-builder-palette">
                    <div class="nc-builder-palette-search">
                        <input class="nc-builder-search-input" id="ncb-palette-search"
                            placeholder="Search components…" type="search" autocomplete="off" />
                    </div>
                    <div class="nc-builder-palette-list" id="ncb-palette-list"></div>
                </div>

                <!-- Center: Canvas -->
                <div class="nc-builder-canvas-wrap">
                    <div class="nc-builder-canvas-toolbar" id="ncb-canvas-toolbar"></div>
                    <div class="nc-builder-canvas-area">
                        <div class="nc-builder-canvas-host" id="ncb-canvas-host"></div>
                    </div>
                    <!-- Code preview bar -->
                    <div class="nc-builder-code-bar" id="ncb-code-bar">
                        <span class="nc-builder-code-bar-label">⟨/⟩ Generated Code</span>
                        <span class="nc-builder-code-bar-chevron">▲</span>
                    </div>
                    <div class="nc-builder-code-pane" id="ncb-code-pane">
                        <div class="nc-builder-code-inner">
                            <div class="nc-builder-code-actions">
                                <button class="nc-builder-code-btn" id="ncb-code-copy">📋 Copy</button>
                                <button class="nc-builder-code-btn" id="ncb-code-download">⬇ Download</button>
                                <button class="nc-builder-code-btn purple" id="ncb-code-save">💾 Save to Disk</button>
                            </div>
                            <pre class="nc-builder-code-pre" id="ncb-code-pre"></pre>
                        </div>
                    </div>
                </div>

                <!-- Right: Properties -->
                <div class="nc-builder-props">
                    <div class="nc-builder-props-tabs">
                        <div class="nc-builder-props-tab active" data-tab="component">Component</div>
                        <div class="nc-builder-props-tab" data-tab="child">Child</div>
                        <div class="nc-builder-props-tab" data-tab="events">Events</div>
                    </div>
                    <div class="nc-builder-props-body" id="ncb-props-body"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);
        this.bindPanelEvents();
    }

    // ─── Panel-level event wiring ──────────────────────────────────────────────

    private activeTab: 'component' | 'child' | 'events' = 'component';

    private bindPanelEvents(): void {
        if (!this.panel) return;

        this.panel.querySelector('#ncb-btn-close')?.addEventListener('click', () => this.close());
        this.panel.querySelector('#ncb-btn-open')?.addEventListener('click', () => void this.openExistingPicker());
        this.panel.querySelector('#ncb-btn-reset')?.addEventListener('click', () => this.resetState());
        this.panel.querySelector('#ncb-btn-save')?.addEventListener('click', () => this.saveToDisk());
        this.panel.querySelector('#ncb-code-copy')?.addEventListener('click', () => this.copyCode());
        this.panel.querySelector('#ncb-code-download')?.addEventListener('click', () => this.downloadCode());
        this.panel.querySelector('#ncb-code-save')?.addEventListener('click', () => this.saveToDisk());

        // Code bar toggle
        this.panel.querySelector('#ncb-code-bar')?.addEventListener('click', () => {
            this.codePreviewOpen = !this.codePreviewOpen;
            this.updateCodePane();
        });

        // Tabs
        this.panel.querySelectorAll('.nc-builder-props-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const t = (tab as HTMLElement).dataset.tab as 'component' | 'child' | 'events';
                this.activeTab = t;
                this.panel?.querySelectorAll('.nc-builder-props-tab').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                this.renderPropsPanel();
            });
        });

        // Palette search
        this.panel.querySelector('#ncb-palette-search')?.addEventListener('input', (e) => {
            const q = (e.target as HTMLInputElement).value.toLowerCase();
            this.renderPalette(q);
        });

        // Canvas toolbar
        this.panel.querySelector('#ncb-canvas-toolbar')?.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement | HTMLInputElement;
            const key = target.dataset.layoutKey as keyof CanvasLayout;
            if (key) {
                (this.state.layout as any)[key] = target.value;
                this.applyCanvasLayout();
                this.updateCodePane();
            }
        });
    }

    // ─── Full render ──────────────────────────────────────────────────────────

    private renderAll(): void {
        this.renderPalette();
        this.renderCanvasToolbar();
        this.renderCanvas();
        this.renderPropsPanel();
        this.updateCodePane();
        this.updateTagBadge();
        this.syncEventRuntime();
    }

    // ─── Palette ──────────────────────────────────────────────────────────────

    private renderPalette(filter: string = ''): void {
        const list = this.panel?.querySelector('#ncb-palette-list');
        if (!list) return;

        const categories: Record<string, typeof NC_PALETTE> = {};
        for (const item of NC_PALETTE) {
            if (filter && !item.tag.includes(filter) && !item.label.toLowerCase().includes(filter)) continue;
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(item);
        }

        list.innerHTML = '';
        for (const [cat, items] of Object.entries(categories)) {
            const label = document.createElement('div');
            label.className = 'nc-builder-category-label';
            label.textContent = cat;
            list.appendChild(label);

            for (const item of items) {
                const el = document.createElement('div');
                el.className = 'nc-builder-palette-item';
                el.draggable = true;
                el.dataset.tag = item.tag;
                el.innerHTML = `
                    <div class="nc-builder-palette-icon">${item.icon}</div>
                    <div>
                        <div class="nc-builder-palette-label">${item.label}</div>
                        <div class="nc-builder-palette-tag">&lt;${item.tag}&gt;</div>
                    </div>
                `;
                el.addEventListener('dragstart', (e) => {
                    this.dragActive = true;
                    e.dataTransfer?.setData(BUILDER_DND_MIME, item.tag);
                    e.dataTransfer?.setData('text/plain', item.tag);
                    e.dataTransfer!.effectAllowed = 'copy';
                });
                el.addEventListener('dragend', () => {
                    this.dragActive = false;
                });
                list.appendChild(el);
            }
        }
    }

    // ─── Canvas toolbar ───────────────────────────────────────────────────────

    private renderCanvasToolbar(): void {
        const toolbar = this.panel?.querySelector('#ncb-canvas-toolbar');
        if (!toolbar) return;
        const l = this.state.layout;

        toolbar.innerHTML = `
            <label>Direction</label>
            <select class="nc-builder-ctrl-select" data-layout-key="direction">
                ${['row','column','row-reverse','column-reverse'].map(v =>
                    `<option value="${v}" ${l.direction===v?'selected':''}>${v}</option>`).join('')}
            </select>
            <div class="sep"></div>
            <label>Align</label>
            <select class="nc-builder-ctrl-select" data-layout-key="alignItems">
                ${['flex-start','flex-end','center','stretch','baseline'].map(v =>
                    `<option value="${v}" ${l.alignItems===v?'selected':''}>${v}</option>`).join('')}
            </select>
            <div class="sep"></div>
            <label>Justify</label>
            <select class="nc-builder-ctrl-select" data-layout-key="justifyContent">
                ${['flex-start','flex-end','center','space-between','space-around','space-evenly'].map(v =>
                    `<option value="${v}" ${l.justifyContent===v?'selected':''}>${v}</option>`).join('')}
            </select>
            <div class="sep"></div>
            <label>Wrap</label>
            <select class="nc-builder-ctrl-select" data-layout-key="wrap">
                ${['nowrap','wrap','wrap-reverse'].map(v =>
                    `<option value="${v}" ${l.wrap===v?'selected':''}>${v}</option>`).join('')}
            </select>
            <div class="sep"></div>
            <label>Gap</label>
            <input class="nc-builder-ctrl-input" type="text" data-layout-key="gap" value="${l.gap}" placeholder="12px" />
            <div class="sep"></div>
            <label>Padding</label>
            <input class="nc-builder-ctrl-input" type="text" data-layout-key="padding" value="${l.padding}" placeholder="16px" />
        `;
    }

    // ─── Canvas ───────────────────────────────────────────────────────────────

    private renderCanvas(): void {
        const host = this.panel?.querySelector('#ncb-canvas-host') as HTMLElement;
        if (!host) return;

        this.refreshCanvas();
        this.bindCanvasHostEvents(host);
    }

    private bindCanvasHostEvents(host: HTMLElement): void {
        if (this.canvasHostBound) return;
        this.canvasHostBound = true;

        host.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer!.dropEffect = 'copy';
            host.classList.add('drag-over-canvas');
        });
        host.addEventListener('dragleave', (e) => {
            if (!host.contains(e.relatedTarget as Node)) {
                host.classList.remove('drag-over-canvas');
            }
        });
        host.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragActive = false;
            host.classList.remove('drag-over-canvas');
            const raw = this.readDragTag(e);
            if (!raw) return;
            const target = e.target as HTMLElement;
            if (!target.closest('.nc-builder-child-wrap')) {
                try {
                    this.addChild(raw);
                } catch (err) {
                    console.error('[ComponentBuilder] Failed to add child:', err);
                }
            }
        });

        // Wider drop target: entire canvas area (not only the white host card)
        const canvasArea = host.parentElement;
        if (canvasArea && !canvasArea.dataset.ncbDropBound) {
            canvasArea.dataset.ncbDropBound = '1';
            canvasArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            });
            canvasArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dragActive = false;
                const raw = this.readDragTag(e);
                if (!raw) return;
                if ((e.target as HTMLElement).closest('.nc-builder-child-wrap')) return;
                try {
                    this.addChild(raw);
                } catch (err) {
                    console.error('[ComponentBuilder] Failed to add child:', err);
                }
            });
        }
    }

    private syncEventRuntime(): void {
        this.clearEventRuntime();

        const host = this.panel?.querySelector('#ncb-canvas-host') as HTMLElement | null;
        if (!host) return;

        const watchedNames = new Set<string>();
        for (const ev of this.state.events) {
            if (ev.trigger) watchedNames.add(ev.trigger);
            if (ev.name) watchedNames.add(ev.name);

            if (!ev.trigger || !ev.name) continue;

            const bridge: EventListener = ((event: Event) => {
                if (!this.matchesTriggerTag(event, ev.triggerTag)) return;

                const sourceDetail = (event as CustomEvent).detail;
                const payload: Record<string, any> = {};
                for (const field of ev.payload) {
                    if (!field.key) continue;
                    if (sourceDetail && typeof sourceDetail === 'object' && field.key in sourceDetail) {
                        payload[field.key] = sourceDetail[field.key];
                        continue;
                    }
                    if (field.type === 'boolean') payload[field.key] = false;
                    else if (field.type === 'number') payload[field.key] = 0;
                    else if (field.type === 'object') payload[field.key] = {};
                    else payload[field.key] = '';
                }

                host.dispatchEvent(new CustomEvent(ev.name, {
                    detail: payload,
                    bubbles: ev.bubbles,
                    composed: ev.composed,
                    cancelable: ev.cancelable,
                }));
            }) as EventListener;

            host.addEventListener(ev.trigger, bridge as EventListener);
            this.eventBridgeListeners.set(`bridge:${ev.id}`, { eventName: ev.trigger, handler: bridge });
        }

        for (const eventName of watchedNames) {
            const logger: EventListener = ((event: Event) => {
                if (!(event instanceof CustomEvent)) return;
                this.pushEventLog(event);
            }) as EventListener;

            document.addEventListener(eventName, logger, true);
            this.eventLogListeners.set(eventName, logger);
        }
    }

    private clearEventRuntime(): void {
        const host = this.panel?.querySelector('#ncb-canvas-host') as HTMLElement | null;
        if (host) {
            for (const [, info] of this.eventBridgeListeners.entries()) {
                host.removeEventListener(info.eventName, info.handler);
            }
        }
        this.eventBridgeListeners.clear();

        for (const [eventName, handler] of this.eventLogListeners.entries()) {
            document.removeEventListener(eventName, handler, true);
        }
        this.eventLogListeners.clear();
    }

    private matchesTriggerTag(event: Event, triggerTag: string): boolean {
        if (!triggerTag) return true;
        const needle = triggerTag.toLowerCase();
        const path = typeof (event as any).composedPath === 'function'
            ? (event as any).composedPath() as any[]
            : [];
        for (const n of path) {
            if (n && typeof n.tagName === 'string' && n.tagName.toLowerCase() === needle) {
                return true;
            }
        }
        const target = event.target as HTMLElement | null;
        return !!target && typeof target.tagName === 'string' && target.tagName.toLowerCase() === needle;
    }

    private pushEventLog(event: CustomEvent): void {
        const sourceTag = this.resolveEventSourceTag(event);
        let detail = '{}';
        try {
            detail = JSON.stringify(event.detail ?? {}, null, 2);
        } catch {
            detail = String(event.detail ?? '{}');
        }

        this.eventLog.unshift({
            id: uid(),
            timestamp: new Date().toLocaleTimeString(),
            eventType: event.type,
            sourceTag,
            detail,
        });
        this.eventLog = this.eventLog.slice(0, 40);
        this.renderEventLog();
    }

    private resolveEventSourceTag(event: Event): string {
        const path = typeof (event as any).composedPath === 'function'
            ? (event as any).composedPath() as any[]
            : [];
        for (const n of path) {
            if (n && typeof n.tagName === 'string') {
                return n.tagName.toLowerCase();
            }
        }
        const target = event.target as HTMLElement | null;
        return target?.tagName?.toLowerCase() || 'unknown';
    }

    private renderEventLog(): void {
        const list = this.panel?.querySelector('#ncb-event-log-list') as HTMLElement | null;
        if (!list) return;
        if (this.eventLog.length === 0) {
            list.innerHTML = `<div class="nc-builder-log-empty">No custom events captured yet.</div>`;
            return;
        }

        list.innerHTML = this.eventLog.map(entry => `
            <div class="nc-builder-log-item">
                <div class="nc-builder-log-meta">
                    <span>${this.escapeForHtml(entry.timestamp)}</span>
                    <span class="nc-builder-log-evt">${this.escapeForHtml(entry.eventType)}</span>
                    <span>from</span>
                    <span class="nc-builder-log-src">${this.escapeForHtml(entry.sourceTag)}</span>
                </div>
                <div class="nc-builder-log-detail">${this.escapeForHtml(entry.detail)}</div>
            </div>
        `).join('');
    }

    private escapeForHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private applyCanvasLayout(): void {
        const host = this.panel?.querySelector('#ncb-canvas-host') as HTMLElement;
        if (!host) return;
        const l = this.state.layout;
        host.style.display = 'flex';
        host.style.flexDirection = l.direction;
        host.style.flexWrap = l.wrap;
        host.style.alignItems = l.alignItems;
        host.style.justifyContent = l.justifyContent;
        host.style.gap = l.gap;
        host.style.padding = l.padding;
        host.style.boxSizing = 'border-box';
    }

    private buildChildWrap(child: ChildNode): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'nc-builder-child-wrap';
        wrap.dataset.childId = child.id;
        if (child.id === this.state.selectedChildId) wrap.classList.add('selected');

        // Controls toolbar (shown when selected)
        const controls = document.createElement('div');
        controls.className = 'nc-builder-child-controls';
        controls.innerHTML = `
            <button class="nc-builder-child-ctrl-btn" data-action="up" title="Move left/up">◀</button>
            <button class="nc-builder-child-ctrl-btn" data-action="down" title="Move right/down">▶</button>
            <button class="nc-builder-child-ctrl-btn" data-action="duplicate" title="Duplicate">⧉</button>
            <button class="nc-builder-child-ctrl-btn" data-action="remove" title="Remove" style="color:#ef4444">✕</button>
        `;
        controls.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = (e.target as HTMLElement).dataset.action;
            if (!action) return;
            if (action === 'remove') this.removeChild(child.id);
            else if (action === 'up') this.moveChild(child.id, -1);
            else if (action === 'down') this.moveChild(child.id, 1);
            else if (action === 'duplicate') this.duplicateChild(child.id);
        });
        wrap.appendChild(controls);

        // The actual component element
        const el = document.createElement(child.tag) as HTMLElement;
        for (const [k, attr] of Object.entries(child.attrs)) {
            if (attr.type === 'bool') {
                if (attr.value === true) el.setAttribute(k, '');
            } else if (String(attr.value) !== '') {
                el.setAttribute(k, String(attr.value));
            }
        }
        if (child.classList) el.className = child.classList;
        if (child.nodeId) el.id = child.nodeId;
        if (child.slotContent) el.innerHTML = child.slotContent;

        wrap.appendChild(el);

        // Select on click
        wrap.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectChild(child.id);
        });

        // Drag to reorder within canvas
        wrap.draggable = true;
        wrap.addEventListener('dragstart', (e) => {
            this.dragActive = true;
            this.state.dragSourceId = child.id;
            e.dataTransfer!.effectAllowed = 'move';
            e.dataTransfer?.setData(BUILDER_DND_MIME, `__reorder__:${child.id}`);
            e.dataTransfer?.setData('text/plain', `__reorder__:${child.id}`);
        });
        wrap.addEventListener('dragend', () => {
            this.dragActive = false;
        });
        wrap.addEventListener('dragover', (e) => {
            if (this.state.dragSourceId && this.state.dragSourceId !== child.id) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer!.dropEffect = 'move';
                wrap.classList.add('drag-over');
                this.state.dragOverId = child.id;
            }
        });
        wrap.addEventListener('dragleave', () => {
            wrap.classList.remove('drag-over');
            this.state.dragOverId = null;
        });
        wrap.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragActive = false;
            wrap.classList.remove('drag-over');
            const raw = e.dataTransfer?.getData(BUILDER_DND_MIME) || e.dataTransfer?.getData('text/plain') || '';
            try {
                if (raw.startsWith('__reorder__:')) {
                    const srcId = raw.split(':')[1];
                    this.reorderChild(srcId, child.id);
                } else if (raw && !/[:/\\]/.test(raw)) {
                    // New component dropped ON an existing child — insert before it
                    this.addChildBefore(raw, child.id);
                }
            } catch (err) {
                console.error('[ComponentBuilder] Drop on child failed:', err);
            }
            this.state.dragSourceId = null;
            this.state.dragOverId = null;
        });

        return wrap;
    }

    // ─── Child mutations ──────────────────────────────────────────────────────

    private addChild(tag: string): void {
        const child: ChildNode = {
            id: uid(), tag, attrs: {}, slotContent: this.defaultSlotContent(tag),
            classList: '', nodeId: '',
        };
        this.state.children.push(child);
        this.state.selectedChildId = child.id;
        this.activeTab = 'child';
        this.updateTabActive();
        this.refreshCanvas();
        this.renderPropsPanel();
        this.updateCodePane();
    }

    private addChildBefore(tag: string, beforeId: string): void {
        const idx = this.state.children.findIndex(c => c.id === beforeId);
        const child: ChildNode = {
            id: uid(), tag, attrs: {}, slotContent: this.defaultSlotContent(tag),
            classList: '', nodeId: '',
        };
        if (idx === -1) this.state.children.push(child);
        else this.state.children.splice(idx, 0, child);
        this.state.selectedChildId = child.id;
        this.activeTab = 'child';
        this.updateTabActive();
        this.refreshCanvas();
        this.renderPropsPanel();
        this.updateCodePane();
    }

    private removeChild(id: string): void {
        this.state.children = this.state.children.filter(c => c.id !== id);
        if (this.state.selectedChildId === id) this.state.selectedChildId = null;
        this.refreshCanvas();
        this.renderPropsPanel();
        this.updateCodePane();
    }

    private moveChild(id: string, delta: -1 | 1): void {
        const idx = this.state.children.findIndex(c => c.id === id);
        if (idx === -1) return;
        const newIdx = idx + delta;
        if (newIdx < 0 || newIdx >= this.state.children.length) return;
        const [item] = this.state.children.splice(idx, 1);
        this.state.children.splice(newIdx, 0, item);
        this.refreshCanvas();
        this.updateCodePane();
    }

    private duplicateChild(id: string): void {
        const src = this.state.children.find(c => c.id === id);
        if (!src) return;
        const attrsCopy: ChildNode['attrs'] = {};
        for (const [name, attr] of Object.entries(src.attrs)) {
            attrsCopy[name] = { ...attr };
        }
        const copy: ChildNode = { ...src, attrs: attrsCopy, id: uid() };
        const idx = this.state.children.findIndex(c => c.id === id);
        this.state.children.splice(idx + 1, 0, copy);
        this.state.selectedChildId = copy.id;
        this.refreshCanvas();
        this.updateCodePane();
    }

    private reorderChild(srcId: string, targetId: string): void {
        const srcIdx = this.state.children.findIndex(c => c.id === srcId);
        const targetIdx = this.state.children.findIndex(c => c.id === targetId);
        if (srcIdx === -1 || targetIdx === -1) return;
        const [item] = this.state.children.splice(srcIdx, 1);
        const newTarget = srcIdx < targetIdx ? targetIdx - 1 : targetIdx;
        this.state.children.splice(newTarget, 0, item);
        this.refreshCanvas();
        this.updateCodePane();
    }

    private selectChild(id: string): void {
        this.state.selectedChildId = id;
        this.activeTab = 'child';
        this.updateTabActive();
        this.refreshCanvas();
        this.renderPropsPanel();
    }

    private refreshCanvas(): void {
        const host = this.panel?.querySelector('#ncb-canvas-host') as HTMLElement;
        if (!host) return;
        host.innerHTML = '';
        this.applyCanvasLayout();

        if (this.state.children.length === 0) {
            const hint = document.createElement('div');
            hint.className = 'nc-builder-empty-drop';
            hint.innerHTML = `
                <div class="nc-builder-empty-drop-icon">+</div>
                <div class="nc-builder-empty-drop-text">Drag from the palette, or open a saved component</div>
                <button type="button" class="nc-builder-empty-open" id="ncb-empty-open">Open existing…</button>
            `;
            // pointer-events none on the hint blocks the button — re-enable for the CTA
            hint.style.pointerEvents = 'none';
            const openBtn = hint.querySelector('#ncb-empty-open') as HTMLButtonElement | null;
            if (openBtn) {
                openBtn.style.pointerEvents = 'auto';
                openBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void this.openExistingPicker();
                });
            }
            host.appendChild(hint);
        } else {
            for (const child of this.state.children) {
                try {
                    host.appendChild(this.buildChildWrap(child));
                } catch (err) {
                    console.error(`[ComponentBuilder] Failed to render <${child.tag}>:`, err);
                    const fallback = document.createElement('div');
                    fallback.className = 'nc-builder-child-wrap';
                    fallback.textContent = `<${child.tag}> (failed to render)`;
                    host.appendChild(fallback);
                }
            }
        }
    }

    private defaultSlotContent(tag: string): string {
        const defaults: Record<string, string> = {
            'nc-button': 'Click me', 'nc-badge': 'New', 'nc-chip': 'Tag',
            'nc-alert': 'Alert message', 'nc-card': '', 'nc-div': '',
            'p': 'Paragraph text', 'h2': 'Heading', 'h3': 'Sub-heading',
            'span': 'Text', 'div': '',
        };
        return defaults[tag] ?? '';
    }

    // ─── Properties panel ─────────────────────────────────────────────────────

    private updateTabActive(): void {
        this.panel?.querySelectorAll('.nc-builder-props-tab').forEach(t => {
            t.classList.toggle('active', (t as HTMLElement).dataset.tab === this.activeTab);
        });
    }

    private renderPropsPanel(): void {
        const body = this.panel?.querySelector('#ncb-props-body');
        if (!body) return;
        body.innerHTML = '';

        if (this.activeTab === 'component') {
            body.appendChild(this.buildComponentTab());
        } else if (this.activeTab === 'child') {
            body.appendChild(this.buildChildTab());
        } else {
            body.appendChild(this.buildEventsTab());
        }
    }

    // ── Component tab ──────────────────────────────────────────────────────

    private buildComponentTab(): HTMLElement {
        const root = document.createElement('div');

        root.innerHTML = `<div class="nc-builder-section-title">Component Identity</div>`;

        root.appendChild(this.field('Tag Name', 'text', this.state.componentTag, 'my-component', (v) => {
            this.state.componentTag = v.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'my-component';
            this.updateTagBadge();
            this.state.componentClass = toClassName(this.state.componentTag);
            this.updateCodePane();
        }));

        root.appendChild(this.field('Class Name', 'text', this.state.componentClass, 'MyComponent', (v) => {
            this.state.componentClass = v || 'MyComponent';
            this.updateCodePane();
        }));

        root.appendChild(this.field('Description (comment)', 'text', this.state.componentDesc, 'What does this component do?', (v) => {
            this.state.componentDesc = v;
            this.updateCodePane();
        }));

        // Shadow DOM toggle
        const shadowRow = document.createElement('div');
        shadowRow.className = 'nc-builder-field';
        shadowRow.innerHTML = `<div class="nc-builder-field-label">Shadow DOM</div>`;
        const cb = document.createElement('div');
        cb.className = 'nc-builder-field-checkbox';
        cb.innerHTML = `<input type="checkbox" id="ncb-shadow-dom" ${this.state.useShadowDOM ? 'checked' : ''} />
            <span>Use Shadow DOM encapsulation</span>`;
        (cb.querySelector('#ncb-shadow-dom') as HTMLInputElement).addEventListener('change', (e) => {
            this.state.useShadowDOM = (e.target as HTMLInputElement).checked;
            this.updateCodePane();
        });
        shadowRow.appendChild(cb);
        root.appendChild(shadowRow);

        // Observed attributes
        const sep = document.createElement('div');
        sep.className = 'nc-builder-section-title';
        sep.style.marginTop = '16px';
        sep.textContent = 'Observed Attributes';
        root.appendChild(sep);

        const hint = document.createElement('div');
        hint.className = 'nc-builder-hint';
        hint.textContent = 'These attributes trigger attributeChangedCallback and will appear in observedAttributes.';
        root.appendChild(hint);

        for (let i = 0; i < this.state.observedAttrs.length; i++) {
            const attr = this.state.observedAttrs[i];
            const row = document.createElement('div');
            row.className = 'nc-builder-attr-row';
            row.innerHTML = `
                <input class="nc-builder-attr-name" placeholder="attr-name" value="${attr.name}" data-idx="${i}" data-field="name" />
                <input class="nc-builder-attr-value" placeholder="default" value="${attr.defaultValue}" data-idx="${i}" data-field="default" />
                <button class="nc-builder-remove-btn" data-remove="${i}">✕</button>
            `;
            row.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const t = e.target as HTMLInputElement;
                    const idx2 = Number(t.dataset.idx);
                    if (t.dataset.field === 'name') this.state.observedAttrs[idx2].name = t.value;
                    else this.state.observedAttrs[idx2].defaultValue = t.value;
                    this.updateCodePane();
                });
            });
            row.querySelector(`[data-remove="${i}"]`)?.addEventListener('click', () => {
                this.state.observedAttrs.splice(i, 1);
                this.renderPropsPanel();
                this.updateCodePane();
            });
            root.appendChild(row);
        }

        const addObsBtn = document.createElement('button');
        addObsBtn.className = 'nc-builder-add-btn';
        addObsBtn.textContent = '+ Add Observed Attribute';
        addObsBtn.addEventListener('click', () => {
            this.state.observedAttrs.push({ name: '', defaultValue: '' });
            this.renderPropsPanel();
        });
        root.appendChild(addObsBtn);

        return root;
    }

    // ── Child tab ─────────────────────────────────────────────────────────────

    private buildChildTab(): HTMLElement {
        const root = document.createElement('div');
        const child = this.state.children.find(c => c.id === this.state.selectedChildId);

        if (!child) {
            root.innerHTML = `<div class="nc-builder-no-select">
                <div class="nc-builder-no-select-icon">👆</div>
                Click a component on the canvas to edit it, or drag one from the palette.
            </div>`;
            return root;
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'nc-builder-section-title';
        titleDiv.innerHTML = `&lt;${child.tag}&gt; Properties`;
        root.appendChild(titleDiv);

        // Class & id
        root.appendChild(this.field('class', 'text', child.classList, 'CSS classes (space-separated)', (v) => {
            child.classList = v;
            this.refreshCanvas(); this.updateCodePane();
        }));
        root.appendChild(this.field('id', 'text', child.nodeId, 'Element id (optional)', (v) => {
            child.nodeId = v;
            this.refreshCanvas(); this.updateCodePane();
        }));
        root.appendChild(this.field('Slot / Inner Content', 'text', child.slotContent, 'Text or HTML placed inside the element', (v) => {
            child.slotContent = v;
            this.refreshCanvas(); this.updateCodePane();
        }));

        // Attributes from known catalog or what's already set
        const sep = document.createElement('div');
        sep.className = 'nc-builder-section-title';
        sep.style.marginTop = '16px';
        sep.textContent = 'Attributes';
        root.appendChild(sep);

        // Pre-populate known attrs as quick-set buttons
        const knownAttrs = KNOWN_OBS_ATTRS[child.tag] || [];
        const knownOpts = KNOWN_ATTR_OPTIONS[child.tag] || {};
        const alreadySet = new Set(Object.keys(child.attrs));
        const notYetSet = knownAttrs.filter(a => !alreadySet.has(a));

        if (notYetSet.length > 0) {
            const quickDiv = document.createElement('div');
            quickDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;';
            for (const attrName of notYetSet) {
                const btn = document.createElement('button');
                btn.style.cssText = 'background:#21262d;border:1px dashed #30363d;border-radius:12px;padding:2px 8px;font-size:9px;color:#6e7681;cursor:pointer;';
                btn.textContent = `+ ${attrName}`;
                btn.addEventListener('click', () => {
                    child.attrs[attrName] = {
                        type: inferAttrType(child.tag, attrName),
                        value: inferAttrType(child.tag, attrName) === 'bool' ? false : '',
                    };
                    this.renderPropsPanel();
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                quickDiv.appendChild(btn);
            }
            root.appendChild(quickDiv);
        }

        // Set attributes
        const attrEntries = Object.entries(child.attrs);
        for (let i = 0; i < attrEntries.length; i++) {
            const [attrName, attrDef] = attrEntries[i];
            const options = knownOpts[attrName];

            const row = document.createElement('div');
            row.className = 'nc-builder-attr-row';

            const nameEl = document.createElement('input');
            nameEl.className = 'nc-builder-attr-name';
            nameEl.value = attrName;
            nameEl.placeholder = 'attr-name';
            nameEl.addEventListener('change', (e) => {
                const newName = (e.target as HTMLInputElement).value.trim();
                if (!newName || newName === attrName) return;
                const val = child.attrs[attrName];
                delete child.attrs[attrName];
                child.attrs[newName] = val;
                this.renderPropsPanel();
                this.refreshCanvas();
                this.updateCodePane();
            });

            const typeSel = document.createElement('select');
            typeSel.className = 'nc-builder-field-select';
            typeSel.style.cssText = 'flex:0 0 72px;padding:5px 6px;font-size:10px;';
            typeSel.innerHTML = `
                <option value="text" ${attrDef.type === 'text' ? 'selected' : ''}>text</option>
                <option value="bool" ${attrDef.type === 'bool' ? 'selected' : ''}>bool</option>
            `;
            typeSel.addEventListener('change', (e) => {
                const nextType = (e.target as HTMLSelectElement).value as 'text' | 'bool';
                const prev = child.attrs[attrName];
                child.attrs[attrName] = {
                    type: nextType,
                    value: nextType === 'bool'
                        ? (prev.type === 'bool' ? Boolean(prev.value) : false)
                        : (prev.type === 'text' ? String(prev.value) : ''),
                };
                this.renderPropsPanel();
                this.refreshCanvas();
                this.updateCodePane();
            });

            if (attrDef.type === 'bool') {
                const boolWrap = document.createElement('label');
                boolWrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex:1.5;color:#cdd6f4;font-size:11px;';
                const boolInput = document.createElement('input');
                boolInput.type = 'checkbox';
                boolInput.checked = Boolean(attrDef.value);
                boolInput.style.accentColor = '#667eea';
                boolInput.addEventListener('change', (e) => {
                    child.attrs[attrName].value = (e.target as HTMLInputElement).checked;
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                const boolText = document.createElement('span');
                boolText.textContent = Boolean(attrDef.value) ? 'enabled' : 'disabled';
                boolInput.addEventListener('change', () => {
                    boolText.textContent = Boolean(child.attrs[attrName].value) ? 'enabled' : 'disabled';
                });
                boolWrap.appendChild(boolInput);
                boolWrap.appendChild(boolText);

                const rmBtn = document.createElement('button');
                rmBtn.className = 'nc-builder-remove-btn';
                rmBtn.textContent = '✕';
                rmBtn.addEventListener('click', () => {
                    delete child.attrs[attrName];
                    this.renderPropsPanel();
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                row.appendChild(nameEl);
                row.appendChild(typeSel);
                row.appendChild(boolWrap);
                row.appendChild(rmBtn);
            } else if (options) {
                const sel = document.createElement('select');
                sel.className = 'nc-builder-attr-value nc-builder-field-select';
                sel.style.flex = '1.5';
                sel.innerHTML = `<option value="">— choose —</option>` +
                    options.map(o => `<option value="${o}" ${String(attrDef.value) === o ? 'selected' : ''}>${o}</option>`).join('');
                sel.addEventListener('change', (e) => {
                    child.attrs[attrName].value = (e.target as HTMLSelectElement).value;
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                const rmBtn = document.createElement('button');
                rmBtn.className = 'nc-builder-remove-btn';
                rmBtn.textContent = '✕';
                rmBtn.addEventListener('click', () => {
                    delete child.attrs[attrName];
                    this.renderPropsPanel();
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                row.appendChild(nameEl);
                row.appendChild(typeSel);
                row.appendChild(sel);
                row.appendChild(rmBtn);
            } else {
                const valEl = document.createElement('input');
                valEl.className = 'nc-builder-attr-value';
                valEl.value = String(attrDef.value);
                valEl.placeholder = 'value';
                valEl.addEventListener('input', (e) => {
                    child.attrs[attrName].value = (e.target as HTMLInputElement).value;
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                const rmBtn = document.createElement('button');
                rmBtn.className = 'nc-builder-remove-btn';
                rmBtn.textContent = '✕';
                rmBtn.addEventListener('click', () => {
                    delete child.attrs[attrName];
                    this.renderPropsPanel();
                    this.refreshCanvas();
                    this.updateCodePane();
                });
                row.appendChild(nameEl);
                row.appendChild(typeSel);
                row.appendChild(valEl);
                row.appendChild(rmBtn);
            }
            root.appendChild(row);
        }

        const addAttrBtn = document.createElement('button');
        addAttrBtn.className = 'nc-builder-add-btn';
        addAttrBtn.textContent = '+ Add Attribute';
        addAttrBtn.addEventListener('click', () => {
            child.attrs[`attr-${uid().slice(0,4)}`] = { type: 'text', value: '' };
            this.renderPropsPanel();
            this.updateCodePane();
        });
        root.appendChild(addAttrBtn);

        return root;
    }

    // ── Events tab ────────────────────────────────────────────────────────────

    private buildEventsTab(): HTMLElement {
        const root = document.createElement('div');
        const childTags = [...new Set(this.state.children.map(c => c.tag))];

        const titleDiv = document.createElement('div');
        titleDiv.className = 'nc-builder-section-title';
        titleDiv.textContent = 'Custom Events';
        root.appendChild(titleDiv);

        const hint = document.createElement('div');
        hint.className = 'nc-builder-hint';
        hint.textContent = `Each event is wired using this.on() inside onMount(). The emit() call will bubble + compose by default.`;
        root.appendChild(hint);

        for (const ev of this.state.events) {
            const card = document.createElement('div');
            card.className = 'nc-builder-event-card';

            card.innerHTML = `
                <div class="nc-builder-event-header">
                    <span class="nc-builder-event-name-badge">${ev.name || 'unnamed-event'}</span>
                    <button class="nc-builder-remove-btn" data-ev-remove="${ev.id}">✕ Remove</button>
                </div>
                <div class="nc-builder-field" style="margin-bottom:10px;">
                    <div class="nc-builder-field-label">Event Name</div>
                    <input class="nc-builder-field-input" placeholder="${this.state.componentTag}-action"
                        value="${ev.name}" data-ev-field="name" data-ev-id="${ev.id}" />
                </div>
                <div class="nc-builder-event-trigger-row">
                    <span class="nc-builder-event-trigger-label">Trigger:</span>
                    <input class="nc-builder-field-input" style="flex:1;padding:4px 8px;"
                        placeholder="e.g. nc-button-click" value="${ev.trigger}"
                        data-ev-field="trigger" data-ev-id="${ev.id}" />
                    <span class="nc-builder-event-trigger-label">on</span>
                    <select class="nc-builder-field-select" style="width:auto;padding:4px 8px;"
                        data-ev-field="triggerTag" data-ev-id="${ev.id}">
                        <option value="">— child —</option>
                        ${childTags.map(t => `<option value="${t}" ${ev.triggerTag===t?'selected':''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="nc-builder-section-title" style="font-size:9px;margin-top:8px;">Payload Fields</div>
                <div id="ncb-payload-${ev.id}"></div>
                <button class="nc-builder-add-btn" style="margin-top:6px;" data-add-payload="${ev.id}">+ Add payload field</button>
                <div class="nc-builder-event-options">
                    <label class="nc-builder-event-option-cb">
                        <input type="checkbox" data-ev-field="bubbles" data-ev-id="${ev.id}" ${ev.bubbles?'checked':''} />
                        bubbles
                    </label>
                    <label class="nc-builder-event-option-cb">
                        <input type="checkbox" data-ev-field="composed" data-ev-id="${ev.id}" ${ev.composed?'checked':''} />
                        composed
                    </label>
                    <label class="nc-builder-event-option-cb">
                        <input type="checkbox" data-ev-field="cancelable" data-ev-id="${ev.id}" ${ev.cancelable?'checked':''} />
                        cancelable
                    </label>
                </div>
            `;

            // Payload rows
            const payloadContainer = card.querySelector(`#ncb-payload-${ev.id}`)!;
            this.renderPayloadRows(payloadContainer, ev);

            // Bind inputs
            card.querySelectorAll('[data-ev-field]').forEach(el => {
                const field = (el as HTMLElement).dataset.evField!;
                const evId = (el as HTMLElement).dataset.evId!;
                const eventDef = this.state.events.find(e => e.id === evId);
                if (!eventDef) return;

                if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') {
                    el.addEventListener('change', () => {
                        (eventDef as any)[field] = (el as HTMLInputElement).checked;
                        this.updateCodePane();
                        this.syncEventRuntime();
                    });
                } else {
                    el.addEventListener('input', () => {
                        (eventDef as any)[field] = (el as HTMLInputElement | HTMLSelectElement).value;
                        if (field === 'name') {
                            const badge = card.querySelector('.nc-builder-event-name-badge');
                            if (badge) badge.textContent = eventDef.name || 'unnamed-event';
                        }
                        this.updateCodePane();
                        this.syncEventRuntime();
                    });
                    el.addEventListener('change', () => {
                        (eventDef as any)[field] = (el as HTMLInputElement | HTMLSelectElement).value;
                        this.updateCodePane();
                        this.syncEventRuntime();
                    });
                }
            });

            card.querySelector(`[data-ev-remove="${ev.id}"]`)?.addEventListener('click', () => {
                this.state.events = this.state.events.filter(e => e.id !== ev.id);
                this.renderPropsPanel();
                this.updateCodePane();
                this.syncEventRuntime();
            });

            card.querySelector(`[data-add-payload="${ev.id}"]`)?.addEventListener('click', () => {
                ev.payload.push({ key: '', type: 'string' });
                this.renderPayloadRows(payloadContainer, ev);
                this.updateCodePane();
            });

            root.appendChild(card);
        }

        const addEvBtn = document.createElement('button');
        addEvBtn.className = 'nc-builder-add-btn';
        addEvBtn.textContent = '+ Add Event';
        addEvBtn.addEventListener('click', () => {
            this.state.events.push({
                id: uid(),
                name: `${this.state.componentTag}-action`,
                trigger: '',
                triggerTag: childTags[0] || '',
                payload: [],
                bubbles: true,
                composed: true,
                cancelable: false,
            });
            this.renderPropsPanel();
            this.updateCodePane();
            this.syncEventRuntime();
        });
        root.appendChild(addEvBtn);

        const logBox = document.createElement('div');
        logBox.className = 'nc-builder-log-box';
        logBox.innerHTML = `
            <div class="nc-builder-log-header">
                <span class="nc-builder-log-title">Output Log</span>
                <button class="nc-builder-log-clear" id="ncb-event-log-clear">Clear</button>
            </div>
            <div class="nc-builder-log-list" id="ncb-event-log-list"></div>
        `;
        root.appendChild(logBox);

        logBox.querySelector('#ncb-event-log-clear')?.addEventListener('click', () => {
            this.eventLog = [];
            this.renderEventLog();
        });

        this.renderEventLog();

        return root;
    }

    private renderPayloadRows(container: Element, ev: EventDef): void {
        container.innerHTML = '';
        ev.payload.forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'nc-builder-payload-row';
            row.innerHTML = `
                <input class="nc-builder-payload-key" placeholder="key" value="${p.key}" data-payload-idx="${i}" />
                <select class="nc-builder-payload-type" data-payload-type="${i}">
                    ${(['string','boolean','number','object'] as const).map(t =>
                        `<option value="${t}" ${p.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
                <button class="nc-builder-remove-btn" data-payload-rm="${i}">✕</button>
            `;
            (row.querySelector(`[data-payload-idx="${i}"]`) as HTMLInputElement).addEventListener('input', (e) => {
                ev.payload[i].key = (e.target as HTMLInputElement).value;
                this.updateCodePane();
            });
            (row.querySelector(`[data-payload-type="${i}"]`) as HTMLSelectElement).addEventListener('change', (e) => {
                ev.payload[i].type = (e.target as HTMLSelectElement).value as any;
                this.updateCodePane();
            });
            (row.querySelector(`[data-payload-rm="${i}"]`) as HTMLButtonElement).addEventListener('click', () => {
                ev.payload.splice(i, 1);
                this.renderPayloadRows(container, ev);
                this.updateCodePane();
            });
            container.appendChild(row);
        });
    }

    // ─── Field helper ─────────────────────────────────────────────────────────

    private field(label: string, type: string, value: string, placeholder: string, onChange: (v: string) => void): HTMLElement {
        const div = document.createElement('div');
        div.className = 'nc-builder-field';
        const lbl = document.createElement('div');
        lbl.className = 'nc-builder-field-label';
        lbl.textContent = label;
        const inp = document.createElement('input');
        inp.className = 'nc-builder-field-input';
        inp.type = type;
        inp.value = value;
        inp.placeholder = placeholder;
        inp.addEventListener('input', () => onChange(inp.value));
        div.appendChild(lbl);
        div.appendChild(inp);
        return div;
    }

    // ─── Code generation ──────────────────────────────────────────────────────

    private generateCode(): string {
        return generateBuilderCode(this.state, this.language);
    }

    private updateCodePane(): void {
        const pre = this.panel?.querySelector('#ncb-code-pre');
        if (pre) pre.textContent = this.generateCode();
        const bar = this.panel?.querySelector('#ncb-code-bar');
        if (bar) bar.classList.toggle('open', this.codePreviewOpen);
        const pane = this.panel?.querySelector('#ncb-code-pane');
        if (pane) pane.classList.toggle('open', this.codePreviewOpen);
    }

    // ─── Tag badge ────────────────────────────────────────────────────────────

    private updateTagBadge(): void {
        const badge = this.panel?.querySelector('#ncb-tag-badge');
        if (badge) badge.textContent = `<${this.state.componentTag}>`;
    }

    // ─── Output actions ───────────────────────────────────────────────────────

    private copyCode(): void {
        navigator.clipboard.writeText(this.generateCode()).then(() => {
            const btn = this.panel?.querySelector('#ncb-code-copy') as HTMLButtonElement;
            if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy'; }, 1800); }
        });
    }

    private downloadCode(): void {
        const code = this.generateCode();
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.state.componentTag}.${this.language}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    private async saveToDisk(force = false): Promise<void> {
        const btn = this.panel?.querySelector('#ncb-btn-save') as HTMLButtonElement;
        const tag = this.state.componentTag;
        try {
            await this.ensureProjectLanguage();

            const listRes = await fetch('/api/dev/components');
            if (listRes.ok) {
                const data = await listRes.json() as {
                    language?: 'ts' | 'js';
                    components: { tag: string; file: string; builderOwned?: boolean }[];
                };
                if (data.language === 'js' || data.language === 'ts') this.language = data.language;
                const existing = data.components.find((c) => c.tag === tag);
                if (existing && !force) {
                    if (existing.builderOwned === false) {
                        const ok = window.confirm(
                            `${existing.file} does not look builder-owned (may be hand-edited).\n\nOverwrite anyway?`
                        );
                        if (!ok) return;
                        return this.saveToDisk(true);
                    }
                    const ok = window.confirm(
                        `Overwrite ${existing.file}?\n\nThis replaces the on-disk component with the current builder output.`
                    );
                    if (!ok) return;
                }
            }

            const res = await fetch('/api/dev/component/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tag,
                    className: this.state.componentClass,
                    code: this.generateCode(),
                    force,
                }),
            });
            const data = await res.json() as {
                success?: boolean;
                needsForce?: boolean;
                filePath?: string;
                overwritten?: boolean;
                message?: string;
                language?: 'ts' | 'js';
            };
            if (data.needsForce) {
                const ok = window.confirm(`${data.message || 'File is not builder-owned.'}\n\nForce overwrite?`);
                if (!ok) return;
                return this.saveToDisk(true);
            }
            if (!res.ok || data.success === false) {
                throw new Error(data.message || `Server responded ${res.status}`);
            }
            if (data.language === 'js' || data.language === 'ts') this.language = data.language;
            this.loadedFromDisk = true;
            this.loadedBuilderOwned = true;
            this.updateSaveButtonLabel();
            console.log(`[ComponentBuilder] ${data.overwritten ? 'Updated' : 'Saved'} ${data.filePath}`);
            if (btn) {
                btn.textContent = data.overwritten ? 'Updated!' : 'Saved!';
                setTimeout(() => this.updateSaveButtonLabel(), 2500);
            }
        } catch (err) {
            console.error('[ComponentBuilder] Save failed:', err);
            this.downloadCode(); // graceful fallback → download
            if (btn) { btn.textContent = 'Downloaded fallback'; setTimeout(() => this.updateSaveButtonLabel(), 2500); }
        }
    }

    private updateSaveButtonLabel(): void {
        const btn = this.panel?.querySelector('#ncb-btn-save') as HTMLButtonElement | null;
        if (btn) btn.textContent = this.loadedFromDisk ? '💾 Update File' : '💾 Save File';
    }

    private resetState(): void {
        this.state = this.defaultState();
        this.loadedFromDisk = false;
        this.loadedBuilderOwned = true;
        this.updateSaveButtonLabel();
        this.renderAll();
    }

    private async openExistingPicker(): Promise<void> {
        if (!this.panel) return;
        this.closeOpenPicker();

        const overlay = document.createElement('div');
        overlay.className = 'nc-builder-open-overlay';
        overlay.innerHTML = `
            <div class="nc-builder-open-modal" role="dialog" aria-label="Open existing component">
                <div class="nc-builder-open-header">
                    <span>Open UI component</span>
                    <button type="button" class="nc-builder-open-close" id="ncb-open-close" aria-label="Close">✕</button>
                </div>
                <input class="nc-builder-open-search" id="ncb-open-search" type="search"
                    placeholder="Filter by tag…" autocomplete="off" />
                <div class="nc-builder-open-list" id="ncb-open-list">
                    <div class="nc-builder-open-empty">Loading…</div>
                </div>
            </div>
        `;
        this.panel.appendChild(overlay);
        this.openPickerEl = overlay;

        overlay.querySelector('#ncb-open-close')?.addEventListener('click', () => this.closeOpenPicker());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeOpenPicker();
        });

        const listEl = overlay.querySelector('#ncb-open-list') as HTMLElement;
        const searchEl = overlay.querySelector('#ncb-open-search') as HTMLInputElement;

        try {
            const res = await fetch('/api/dev/components');
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const { components } = await res.json() as {
                components: {
                    tag: string;
                    className: string;
                    file: string;
                    builderGenerated: boolean;
                    description: string;
                }[];
            };

            const renderList = (filter: string) => {
                const q = filter.trim().toLowerCase();
                const items = components.filter((c) =>
                    !q || c.tag.includes(q) || c.className.toLowerCase().includes(q)
                );
                listEl.innerHTML = '';
                if (items.length === 0) {
                    listEl.innerHTML = `<div class="nc-builder-open-empty">${
                        components.length === 0
                            ? 'No components in <code>src/components/ui/</code> yet.<br>Save one from the builder first.'
                            : 'No matches.'
                    }</div>`;
                    return;
                }
                for (const item of items) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'nc-builder-open-item';
                    btn.innerHTML = `
                        <div class="nc-builder-open-item-tag">
                            &lt;${item.tag}&gt;
                            ${item.builderGenerated ? '<span class="nc-builder-open-badge">builder</span>' : ''}
                        </div>
                        <div class="nc-builder-open-item-meta">
                            ${item.className} · ${item.file}
                            ${item.description ? ` · ${item.description}` : ''}
                        </div>
                    `;
                    btn.addEventListener('click', () => void this.loadExistingComponent(item.tag));
                    listEl.appendChild(btn);
                }
            };

            renderList('');
            searchEl.addEventListener('input', () => renderList(searchEl.value));
            searchEl.focus();
        } catch (err) {
            console.error('[ComponentBuilder] Failed to list components:', err);
            listEl.innerHTML = `<div class="nc-builder-open-empty">
                Failed to load component list.<br>
                Restart the app with <code>npm run dev</code> so <code>/api/dev/components</code> is available, then try again.
            </div>`;
        }
    }

    private closeOpenPicker(): void {
        this.openPickerEl?.remove();
        this.openPickerEl = null;
    }

    private async loadExistingComponent(tag: string): Promise<void> {
        try {
            const res = await fetch(`/api/dev/component/${encodeURIComponent(tag)}`);
            if (!res.ok) throw new Error(`Component <${tag}> not found`);
            const meta = await res.json() as { sourceCode?: string; tagName?: string };
            if (!meta.sourceCode) throw new Error('No sourceCode returned');

            await this.ensureProjectLanguage();
            const parsed = parseBuilderSource(meta.sourceCode) as {
                state: BuilderState;
                warnings: string[];
                builderOwned: boolean;
            };

            if (!parsed.builderOwned) {
                const ok = window.confirm(
                    `<${tag}> is not marked builder-owned (may be hand-edited).\n\nLoad into the canvas anyway? Saving may overwrite custom code.`
                );
                if (!ok) return;
            }

            this.state = parsed.state;
            this.loadedFromDisk = true;
            this.loadedBuilderOwned = !!parsed.builderOwned;
            this.closeOpenPicker();
            this.updateSaveButtonLabel();
            this.renderAll();

            if (parsed.warnings.length) {
                console.warn(`[ComponentBuilder] Loaded <${tag}> with warnings:\n- ${parsed.warnings.join('\n- ')}`);
                window.alert(`Loaded <${tag}> with caveats:\n\n• ${parsed.warnings.join('\n• ')}`);
            } else {
                console.log(`[ComponentBuilder] Loaded <${tag}> into the canvas.`);
            }
        } catch (err) {
            console.error('[ComponentBuilder] Load failed:', err);
            window.alert(`Could not load <${tag}>. See console for details.`);
        }
    }
}
