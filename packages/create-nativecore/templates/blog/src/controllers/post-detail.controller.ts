import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { http } from '@core/http.js';
import router from '@core/router.js';

interface PostDetail {
    id: string;
    title: string;
    category: string;
    author: string;
    authorAvatar?: string;
    date: string;
    body: string;
}

export async function postDetailController(params: Record<string, string>): Promise<() => void> {
    const events = trackEvents();
    const scope = dom.data('post-detail');

    const skeleton = scope.hook('skeleton');
    const article = scope.hook('post');
    const titleEl = scope.hook('title');
    const bodyEl = scope.hook('body');
    const dateEl = scope.hook('date');
    const categoryEl = scope.hook('category') as any;
    const authorNameEl = scope.hook('author-name');
    const authorAvatarEl = scope.hook('author-avatar') as any;
    const btnBack = scope.hook('btn-back');

    if (btnBack) {
        events.add(btnBack, 'click', () => router.navigate('/posts'));
    }

    const { slug } = params;
    const result = await http.get<PostDetail>(`/api/blog/posts/${slug}`);

    skeleton?.setAttribute('hidden', '');

    if (result.ok && result.data) {
        const post = result.data;
        if (titleEl) titleEl.textContent = post.title;
        if (bodyEl) bodyEl.innerHTML = post.body;
        if (dateEl) dateEl.textContent = post.date;
        if (categoryEl) categoryEl.setAttribute('label', post.category);
        if (authorNameEl) authorNameEl.textContent = post.author;
        if (authorAvatarEl && post.authorAvatar) authorAvatarEl.setAttribute('src', post.authorAvatar);
        article?.removeAttribute('hidden');
    } else {
        router.navigate('/posts');
    }

    return () => events.cleanup();
}
