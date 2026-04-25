/**
 * NcDiv Component - Responsive Container
 * 
 * A flexible container component with built-in responsive grid/flex layouts
 * 
 * Attributes:
 *   - layout: 'grid' | 'flex' | 'grid-auto' | 'block' (default: 'grid-auto')
 *   - cols: '1' | '2' | '3' | '4' (for grid layout)
 *   - direction: 'row' | 'column' (for flex layout)
 *   - gap: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 *   - width: 'full' | 'three-quarters' | 'half' | 'quarter' (default: 'full')
 *   - justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' (for flex/grid)
 *   - align: 'start' | 'center' | 'end' | 'stretch' | 'baseline' (for flex/grid)
 * 
 * Usage:
 *   <nc-div layout="grid-auto">
 *     Card 1</nc-card>
 *     Card 2</nc-card>
 *   </nc-div>
 *   
 *   <nc-div layout="grid" cols="3">
 *     Card 1</nc-card>
 *     Card 2</nc-card>
 *     Card 3</nc-card>
 *   </nc-div>
 *   
 *   <nc-div layout="flex" direction="row" gap="lg" justify="center" align="center">
 *     Flexbox Item 1</nc-card>
 *     Flexbox Item 2</nc-card>
 *   </nc-div>
 */

import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html } from '../../.nativecore/utils/templates.js';

export class NcDiv extends Component {
    static useShadowDOM = true;
    
    // --- Define dropdown options for dev tools ---
    static attributeOptions = {
        layout: ['grid-auto', 'grid', 'flex', 'block'],
        cols: ['1', '2', '3', '4'],
        direction: ['row', 'column'],
        gap: ['sm', 'md', 'lg', 'xl'],
        width: ['full', 'three-quarters', 'half', 'quarter'],
        justify: ['start', 'center', 'end', 'between', 'around', 'evenly'],
        align: ['start', 'center', 'end', 'stretch', 'baseline']
    };
    
    // --- Conditional visibility for attributes based on layout ---
    static attributeConditions = {
        cols: (element: HTMLElement) => {
            const layout = element.getAttribute('layout') || 'grid-auto';
            return layout === 'grid';
        },
        direction: (element: HTMLElement) => {
            const layout = element.getAttribute('layout') || 'grid-auto';
            return layout === 'flex';
        }
    };
    
    // --- Attributes become editable in dev tools sidebar ---
    static get observedAttributes() {
        return ['layout', 'cols', 'direction', 'gap', 'width', 'justify', 'align'];
    }
    
    constructor() {
        super();
    }
    
    template() {
        return html`
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    margin: var(--nc-spacing-lg) 0 !important;
                }
                
                /* Layout: Auto-fit Grid (Recommended) */
                :host([layout="grid-auto"]) {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                }
                
                /* Layout: Fixed Grid */
                :host([layout="grid"]) {
                    display: grid;
                }
                
                :host([layout="grid"][cols="1"]) {
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                }
                
                :host([layout="grid"][cols="2"]) {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                
                :host([layout="grid"][cols="3"]) {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                
                :host([layout="grid"][cols="4"]) {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
                
                /* Layout: Flexbox */
                :host([layout="flex"]) {
                    display: flex;
                    flex-wrap: wrap;
                    flex-direction: column; /* Default to column (vertical stack) */
                }
                
                /* Flex Direction */
                :host([layout="flex"][direction="row"]) {
                    flex-direction: row;
                }
                
                :host([layout="flex"][direction="column"]) {
                    flex-direction: column;
                }
                
                /* Row layout: children can grow with 300px basis */
                :host([layout="flex"][direction="row"]) ::slotted(*) {
                    flex: 1 1 300px;
                    min-width: 0;
                }
                
                /* Column layout (default): children size to content */
                :host([layout="flex"]) ::slotted(*),
                :host([layout="flex"][direction="column"]) ::slotted(*) {
                    flex: 0 1 auto;
                    min-width: 0;
                }
                
                /* Layout: Block */
                :host([layout="block"]) {
                    display: block;
                }
                
                /* Gap Sizes */
                :host([gap="sm"]) {
                    gap: var(--nc-spacing-sm);
                }
                
                :host([gap="md"]) {
                    gap: var(--nc-spacing-md);
                }
                
                :host([gap="lg"]) {
                    gap: var(--nc-spacing-lg);
                }
                
                :host([gap="xl"]) {
                    gap: var(--nc-spacing-xl);
                }
                
                /* Justify Content - Works for both Flex & Grid */
                :host([justify="start"]) {
                    justify-content: flex-start;
                    justify-items: start;
                }
                
                :host([justify="center"]) {
                    justify-content: center;
                    justify-items: center;
                }
                
                :host([justify="end"]) {
                    justify-content: flex-end;
                    justify-items: end;
                }
                
                :host([justify="between"]) {
                    justify-content: space-between;
                }
                
                :host([justify="around"]) {
                    justify-content: space-around;
                }
                
                :host([justify="evenly"]) {
                    justify-content: space-evenly;
                }
                
                /* Align Items - Works for both Flex & Grid */
                :host([align="start"]) {
                    align-items: flex-start;
                    align-content: flex-start;
                }
                
                :host([align="center"]) {
                    align-items: center;
                    align-content: center;
                }
                
                :host([align="end"]) {
                    align-items: flex-end;
                    align-content: flex-end;
                }
                
                :host([align="stretch"]) {
                    align-items: stretch;
                    align-content: stretch;
                }
                
                :host([align="baseline"]) {
                    align-items: baseline;
                    align-content: baseline;
                }
                
                /* Width Options */
                :host([width="full"]) {
                    width: 100%;
                }
                
                :host([width="three-quarters"]) {
                    width: 75%;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                :host([width="half"]) {
                    width: 50%;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                :host([width="quarter"]) {
                    width: 25%;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                /* Responsive: Mobile */
                @media (max-width: 768px) {
                    :host([layout="grid"][cols="2"]),
                    :host([layout="grid"][cols="3"]),
                    :host([layout="grid"][cols="4"]) {
                        grid-template-columns: repeat(1, minmax(0, 1fr));
                    }
                    
                    :host([layout="grid-auto"]) {
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    }
                    
                    /* Full width on mobile for better UX */
                    :host([width="three-quarters"]),
                    :host([width="half"]),
                    :host([width="quarter"]) {
                        width: 100% !important;
                    }
                }
                
                /* Responsive: Tablet */
                @media (min-width: 769px) and (max-width: 1024px) {
                    :host([layout="grid"][cols="3"]),
                    :host([layout="grid"][cols="4"]) {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
            </style>
            
            <slot></slot>
        `;
    }
    
    onMount() {
        // Component logic here
    }
    
    // --- Makes changes instant in dev tools preview ---
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
        }
    }
}

defineComponent('nc-div', NcDiv);


