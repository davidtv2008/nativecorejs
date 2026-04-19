# Chapter 36 — Framework Comparison

This chapter provides an honest, pattern-by-pattern comparison between NativeCoreJS and four mainstream frameworks: React, Vue 3, Svelte, and Lit. For each of the 10 most common SPA patterns, you will find equivalent code in all five frameworks. Numbers of lines of code are approximate and focus on the functional surface — imports are collapsed for readability.

---

## How to Use This Chapter

Each comparison shows the pattern in NativeCoreJS first, then the alternatives. Read horizontally if you are migrating from another framework. Read vertically if you want to understand the philosophy behind each approach.

Scoring legend:  ✦ = meaningful advantage  ✧ = roughly equivalent  ✦✦ = clear winner

---

## 1. Reactive State

### NativeCoreJS
```typescript
const [count, setCount] = useState(0);
count.value;                      // read
setCount(prev => prev + 1);       // update
effect(() => console.log(count.value)); // reactive effect
```
`useState` is explicit and inspectable. The reactive graph is built lazily through `effect` / `computed` — no proxies, no magic assignment.

### React
```tsx
const [count, setCount] = useState(0);
count;                            // read (just a plain number)
setCount(prev => prev + 1);
useEffect(() => console.log(count), [count]);
```
Similar ergonomics. `useEffect` deps array is a runtime footgun React can't type-check.

### Vue 3
```vue
const count = ref(0);
count.value;
count.value++;
watchEffect(() => console.log(count.value));
```
Very close to NativeCoreJS — both use `.value`. Composition API is the best prior art for NativeCoreJS's design.

### Svelte
```svelte
let count = 0;
count++;
$: console.log(count);
```
Fewest lines. Compiler magic means the developer doesn't control when effects run.

### Lit
```typescript
@state() count = 0;
this.count++;   // triggers re-render of lit-html template
```
State is tied to the component — no module-level reactive state without additional setup.

**Verdict:** ✧ NativeCoreJS, Vue 3, and Svelte all deliver excellent reactivity. NativeCoreJS wins on explicitness and being runtime-agnostic (works without a build step).

---

## 2. Component Definition

### NativeCoreJS
```typescript
class MyButton extends Component {
    template() { return `<button class="btn">${this.getAttribute('label')}</button>`; }
    onMount() { this.on('click', 'button', () => this.emitEvent('nc-click')); }
}
defineComponent('my-button', MyButton);
```

### React
```tsx
function MyButton({ label, onClick }: { label: string; onClick: () => void }) {
    return <button className="btn" onClick={onClick}>{label}</button>;
}
```

### Vue 3
```vue
<template><button class="btn" @click="$emit('click')">{{ label }}</button></template>
<script setup lang="ts">
const props = defineProps<{ label: string }>();
const emit = defineEmits<{ (e: 'click'): void }>();
</script>
```

### Svelte
```svelte
<script lang="ts">
  let { label } = $props();
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>
<button class="btn" on:click={() => dispatch('click')}>{label}</button>
```

### Lit
```typescript
@customElement('my-button')
class MyButton extends LitElement {
    @property() label = '';
    render() { return html`<button @click=${() => this.dispatchEvent(new Event('click'))}>${this.label}</button>`; }
}
```

**Verdict:** ✦ NativeCoreJS and Lit are the only frameworks that produce real, standards-compliant Web Components. React/Vue/Svelte components exist only inside their own runtimes.

---

## 3. List Rendering

### NativeCoreJS (keyed reconciliation)
```typescript
// In template()
const items = this.getAttribute('items') ?? '[]';
const list = JSON.parse(items) as Task[];
return `<ul>${list.map(t => `<li key="${t.id}">${escapeHTML(t.title)}</li>`).join('')}</ul>`;
```

### React
```tsx
{items.map(t => <li key={t.id}>{t.title}</li>)}
```

### Vue 3
```html
<li v-for="t in items" :key="t.id">{{ t.title }}</li>
```

### Svelte
```svelte
{#each items as t (t.id)}
  <li>{t.title}</li>
{/each}
```

### Lit
```typescript
${repeat(items, t => t.id, t => html`<li>${t.title}</li>`)}
```

**Verdict:** ✧ All frameworks handle keyed list rendering. NativeCoreJS's `key=` attribute on children activates the `reconcileByKey()` algorithm automatically — equivalent performance.

---

## 4. Routing

### NativeCoreJS
```typescript
router.register('/tasks/:id', 'src/views/task.html', taskController);
router.navigate('/tasks/42');
```

### React (React Router v7)
```tsx
<Route path="/tasks/:id" element={<TaskPage />} />
// navigate
const navigate = useNavigate();
navigate('/tasks/42');
```

### Vue 3 (Vue Router)
```typescript
{ path: '/tasks/:id', component: TaskPage }
router.push('/tasks/42');
```

### Svelte (SvelteKit)
```
// File-based: src/routes/tasks/[id]/+page.svelte
goto('/tasks/42');
```

### Lit (lit-router or custom)
```typescript
// No batteries-included router. Requires a third-party package.
```

**Verdict:** ✦ NativeCoreJS's router is more capable out-of-the-box than Lit's ecosystem. Feature-parity with React Router and Vue Router, including middleware, loaders, caching, and prefetching.

---

## 5. Data Fetching

### NativeCoreJS (route loader)
```typescript
router.register('/tasks', 'tasks.html', tasksController, {
    loader: (params, signal) => fetch('/api/tasks', { signal }).then(r => r.json())
});

// In controller — loaderData is the resolved value
export async function tasksController(params, state, loaderData) {
    const tasks = loaderData as Task[];
}
```

### React (React Router loader)
```typescript
export async function loader({ request }) {
    return fetch('/api/tasks', { signal: request.signal }).then(r => r.json());
}
// In component
const tasks = useLoaderData<Task[]>();
```

### Vue 3 (Pinia + setup)
```typescript
const taskStore = useTaskStore();
onMounted(() => taskStore.fetchTasks());
// or with vue-query
const { data } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
```

### Svelte (SvelteKit load function)
```typescript
export async function load({ fetch }) {
    return { tasks: await fetch('/api/tasks').then(r => r.json()) };
}
```

### Lit
```typescript
// No standard pattern. Usually a property bound to a Reactive Controller.
```

**Verdict:** ✦ NativeCoreJS's `loader` pattern matches React Router and SvelteKit — cancellable via AbortSignal, runs before controller, type-safe.

---

## 6. Form Handling

### NativeCoreJS
```typescript
// Use nc-form + nc-input + nc-field components
// Validation via HTML5 constraint API + nc-form validation events
const form = this.$<HTMLFormElement>('nc-form');
form?.addEventListener('nc-submit', async (e: CustomEvent<FormData>) => {
    await api.post('/api/tasks', Object.fromEntries(e.detail));
});
```

### React
```tsx
// React Hook Form (popular third-party)
const { register, handleSubmit } = useForm<FormValues>();
<form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('title', { required: true })} />
</form>
```

### Vue 3
```html
<form @submit.prevent="onSubmit">
    <input v-model="title" required />
</form>
```

### Svelte
```svelte
<form on:submit|preventDefault={onSubmit}>
    <input bind:value={title} required />
</form>
```

### Lit
```typescript
<form @submit=${this.onSubmit}>
    <input name="title" required />
</form>
```

**Verdict:** ✧ NativeCoreJS leans on HTML5 form APIs with enhanced `nc-form` / `nc-field` components. Vue and Svelte two-way binding is marginally more concise. React requires a library for production form handling.

---

## 7. Global State Management

### NativeCoreJS (built-in)
```typescript
const store = createStore('cart', { items: [], total: 0 });
store.set({ items: [...store.get().items, newItem] });
store.watch(state => updateCartBadge(state.items.length));
```

### React (Zustand — popular third-party)
```typescript
const useCart = create<CartState>(set => ({
    items: [], total: 0,
    addItem: (item) => set(s => ({ items: [...s.items, item] }))
}));
const { items } = useCart();
```

### Vue 3 (Pinia — official)
```typescript
const useCartStore = defineStore('cart', { state: () => ({ items: [], total: 0 }) });
const cart = useCartStore();
cart.items.push(newItem);
```

### Svelte (built-in writable stores)
```typescript
const cart = writable({ items: [], total: 0 });
$cart.items; // reactive in Svelte components via $
```

### Lit (no standard)
```typescript
// Requires a third-party solution: MobX, Jotai, Zustand, etc.
```

**Verdict:** ✦ NativeCoreJS (built-in), Vue/Pinia (official add-on), and Svelte (built-in) all include global state. React requires a third-party library. NativeCoreJS is the only one where stores are visible in dev-tools at `globalThis.__NC_STORES__`.

---

## 8. Testing

### NativeCoreJS
```typescript
import { mountComponent, waitFor, fireEvent } from 'nativecorejs/testing';

test('button emits nc-click', async () => {
    const el = mountComponent('<my-button label="Save"></my-button>');
    await waitFor(() => el.shadowRoot?.querySelector('button'));
    const events: CustomEvent[] = [];
    el.addEventListener('nc-click', (e: Event) => events.push(e as CustomEvent));
    fireEvent(el.shadowRoot!.querySelector('button')!, 'click');
    expect(events).toHaveLength(1);
});
```

### React (React Testing Library)
```tsx
render(<MyButton label="Save" onClick={fn} />);
await screen.findByRole('button', { name: 'Save' });
userEvent.click(screen.getByRole('button'));
expect(fn).toHaveBeenCalledOnce();
```

### Vue 3 (Vue Test Utils)
```typescript
const wrapper = mount(MyButton, { props: { label: 'Save' } });
await wrapper.find('button').trigger('click');
expect(wrapper.emitted('click')).toHaveLength(1);
```

### Svelte (svelte-testing-library)
```typescript
const { getByRole } = render(MyButton, { props: { label: 'Save' } });
fireEvent.click(getByRole('button'));
```

### Lit
```typescript
const el = await fixture<MyButton>(html`<my-button label="Save"></my-button>`);
el.shadowRoot?.querySelector('button')?.click();
await el.updateComplete;
```

**Verdict:** ✧ All frameworks have capable testing stories. NativeCoreJS's `mountComponent` + `waitFor` + `fireEvent` API is closest to React Testing Library's idiom.

---

## 9. Accessibility

### NativeCoreJS
```typescript
import { trapFocus, announce, roving } from 'nativecorejs';

// Trap focus in a modal
trapFocus(modalEl);

// Announce to screen readers
announce('Task saved', 'polite');

// Roving tabindex for a listbox
const release = roving(listEl, '[role=option]');
```

Built-in: `trapFocus`, `announce`, `roving` in `src/a11y/index.ts`. Used by `nc-modal` and `nc-drawer` automatically.

### React
No built-in a11y utilities — use `focus-trap-react`, `aria-live` portals, or `@radix-ui/react`.

### Vue 3
No built-in a11y utilities beyond template directives.

### Svelte
No built-in a11y utilities — compiler warns on some violations but doesn't provide utilities.

### Lit
No built-in a11y utilities — use `aria-query` or separate packages.

**Verdict:** ✦✦ NativeCoreJS ships production-grade a11y utilities built-in. No other framework in this comparison does.

---

## 10. Production Build and Deployment

### NativeCoreJS
```bash
npm run build:full   # compile + SSG pre-render → _deploy/
# Upload _deploy/ to Cloudflare Pages, Netlify, or S3+CloudFront
```
Zero config. `_deploy/` is a fully self-contained static folder.

### React (Vite)
```bash
vite build           # outputs dist/
# Requires SPA redirect config on the host (_redirects or equivalent)
```

### Vue 3 (Vite)
```bash
vite build           # outputs dist/
```

### Svelte (SvelteKit)
```bash
npm run build        # outputs .svelte-kit/output/
# Requires adapter (adapter-static, adapter-cloudflare, adapter-node, etc.)
```

### Lit (Vite)
```bash
vite build
```

**Verdict:** ✦ NativeCoreJS's `build:full` is the most complete out-of-the-box pipeline: compile → minify → SSG pre-render → `_deploy/` with `_redirects`, `_headers`, `manifest.json`, `sitemap.xml`, and `robots.txt` all in place.

---

## Summary Scorecard

| Pattern | NativeCoreJS | React | Vue 3 | Svelte | Lit |
|---|---|---|---|---|---|
| Reactive state | ✦ | ✦ | ✦ | ✦ | ✧ |
| Component definition | ✦ (standards) | ✦ | ✦ | ✦ | ✦ (standards) |
| List rendering | ✦ | ✦ | ✦ | ✦ | ✦ |
| Routing | ✦ (built-in) | ✦ (library) | ✦ (library) | ✦ (framework) | ✧ (manual) |
| Data fetching | ✦ (loaders) | ✦ (RR7) | ✧ | ✦ (SK) | ✧ |
| Form handling | ✧ | ✧ (library) | ✦ | ✦ | ✧ |
| Global state | ✦ (built-in) | ✧ (library) | ✦ (Pinia) | ✦ (built-in) | ✧ (library) |
| Testing | ✦ | ✦ | ✦ | ✦ | ✧ |
| Accessibility | ✦✦ (built-in) | ✧ (library) | ✧ (library) | ✧ | ✧ |
| Prod build | ✦✦ (built-in SSG) | ✧ | ✧ | ✦ (adapters) | ✧ |

NativeCoreJS wins or ties on 9 of 10 patterns — and the patterns where React or Vue have a larger ecosystem are ones where NativeCoreJS's built-in capabilities are competitive for most projects.

The cases where a mainstream framework is clearly preferable:

- **Very large ecosystem of 3rd-party UI libraries** — React wins. If your project requires a specific commercial React component library, React is the pragmatic choice.
- **File-based routing and SSR at the framework level** — SvelteKit and Next.js provide tighter opinionated SSR than NativeCoreJS's SSG story.
- **Largest available talent pool** — React. Hiring is faster in React markets.

---

**Back:** [Chapter 35 — Enterprise Architecture](./35-enterprise-architecture.md)  
**Next:** [Ebook Index](./README.md)
