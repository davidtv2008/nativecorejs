import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, effect, computed } from '@core/state.js';
import { http } from '@core/http.js';
import router from '@core/router.js';

interface Post {
    id: string;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
    slug: string;
}

export async function postsController(): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const scope = dom.view('posts');
    const postList = scope.hook('post-list');
    const searchInput = scope.hook('search') as any;
    const pagination = scope.hook('pagination') as any;
    const empty = scope.hook('empty');

    const allPosts = useState<Post[]>([]);
    const query = useState('');
    const page = useState(1);
    const PAGE_SIZE = 10;

    const filtered = computed(() => {
        const q = query.value.toLowerCase();
        return q
            ? allPosts.value.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.author.toLowerCase().includes(q)
            )
            : allPosts.value;
    });

    const paginated = computed(() => {
        const start = (page.value - 1) * PAGE_SIZE;
        return filtered.value.slice(start, start + PAGE_SIZE);
    });

    disposers.push(
        effect(() => {
            if (!postList) return;
            const posts = paginated.value;

            if (posts.length === 0) {
                postList.innerHTML = '';
                empty?.removeAttribute('hidden');
                return;
            }
            empty?.setAttribute('hidden', '');
            postList.innerHTML = '';

            for (const post of posts) {
                const li = document.createElement('li');
                li.className = 'post-card';
                li.dataset.id = post.id;

                const title = document.createElement('h2');
                title.className = 'post-card__title';
                title.textContent = post.title;

                const meta = document.createElement('p');
                meta.className = 'post-card__meta';
                meta.textContent = `${post.category} · ${post.author} · ${post.date}`;

                const excerpt = document.createElement('p');
                excerpt.className = 'post-card__excerpt';
                excerpt.textContent = post.excerpt;

                li.append(title, meta, excerpt);
                postList.appendChild(li);
            }
            if (pagination) {
                pagination.setAttribute('total', String(filtered.value.length));
                pagination.setAttribute('current', String(page.value));
                pagination.setAttribute('page-size', String(PAGE_SIZE));
            }
        }),
    );

    // Search input
    if (searchInput) {
        events.add(searchInput, 'nc-input', (e: CustomEvent) => {
            query.value = (e.detail as string) ?? '';
            page.value = 1;
        });
    }

    // Pagination
    if (pagination) {
        events.add(pagination, 'nc-page-change', (e: CustomEvent) => {
            page.value = (e.detail as number) ?? 1;
        });
    }

    // Post click
    if (postList) {
        events.add(postList, 'click', (e: Event) => {
            const card = (e.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
            if (!card) return;
            const post = allPosts.value.find(p => p.id === card.dataset.id);
            if (post) router.navigate(`/posts/${post.slug}`);
        });
    }

    // Load
    const result = await http.get<Post[]>('/api/blog/posts');
    if (result.ok && result.data) {
        allPosts.value = result.data;
    }

    return () => {
        filtered.dispose();
        paginated.dispose();
        disposers.forEach(d => d());
        events.cleanup();
    };
}
