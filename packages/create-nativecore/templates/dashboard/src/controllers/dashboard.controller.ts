import { dom } from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, effect } from '@core/state.js';
import { http } from '@core/http.js';

interface DashboardStats {
    users: number;
    revenue: number;
    sessions: number;
    errorRate: string;
}

interface ActivityItem {
    id: string;
    message: string;
    time: string;
}

export async function dashboardController(): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    const scope = dom.view('dashboard');
    const statUsers = scope.hook('stat-users');
    const statRevenue = scope.hook('stat-revenue');
    const statSessions = scope.hook('stat-sessions');
    const statErrors = scope.hook('stat-errors');
    const activityList = scope.hook('activity-list');
    const snackbar = scope.hook('snackbar') as any;

    // Skeletons
    const skeletons = [
        scope.hook('skeleton-users'),
        scope.hook('skeleton-revenue'),
        scope.hook('skeleton-sessions'),
        scope.hook('skeleton-errors'),
    ];

    const stats = useState<DashboardStats | null>(null);
    const activity = useState<ActivityItem[]>([]);
    const loading = useState(true);

    // Reactive stat cards
    disposers.push(
        effect(() => {
            const s = stats.value;
            if (!s) return;
            if (statUsers) statUsers.textContent = s.users.toLocaleString();
            if (statRevenue) statRevenue.textContent = `$${s.revenue.toLocaleString()}`;
            if (statSessions) statSessions.textContent = s.sessions.toLocaleString();
            if (statErrors) statErrors.textContent = s.errorRate;
            skeletons.forEach(el => el?.setAttribute('hidden', ''));
        }),

        effect(() => {
            if (!activityList || activity.value.length === 0) return;
            activityList.innerHTML = '';
            for (const item of activity.value) {
                const li = document.createElement('li');
                li.className = 'activity-item';
                const msg = document.createElement('span');
                msg.className = 'activity-msg';
                msg.textContent = item.message;
                const time = document.createElement('time');
                time.className = 'activity-time';
                time.textContent = item.time;
                li.append(msg, time);
                activityList.appendChild(li);
            }
        }),
    );

    // Load data
    const [statsResult, activityResult] = await Promise.all([
        http.get<DashboardStats>('/api/dashboard/stats'),
        http.get<ActivityItem[]>('/api/dashboard/activity'),
    ]);

    if (statsResult.ok && statsResult.data) {
        stats.value = statsResult.data;
    } else {
        snackbar?.setAttribute('message', 'Could not load stats');
        snackbar?.setAttribute('variant', 'danger');
        snackbar?.setAttribute('open', '');
    }

    if (activityResult.ok && activityResult.data) {
        activity.value = activityResult.data;
    }

    loading.value = false;

    return () => {
        disposers.forEach(d => d());
        events.cleanup();
    };
}
