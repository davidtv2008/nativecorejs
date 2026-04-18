/**
 * Dashboard Controller
 * Loads API metrics, drives the signal demo, and wires all dashboard interactions.
 */
import { trackEvents } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import { html } from '@core-utils/templates.js';
import { useState, computed, effect } from '@core/state.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

export async function dashboardController(): Promise<() => void> {

    // -- Setup ---------------------------------------------------------------
    const events    = trackEvents();
    const disposers: Array<() => void> = [];

    // -- DOM refs ------------------------------------------------------------
    const welcomeMsg         = dom.$('#welcome-message');
    const overviewScore      = dom.$('#dashboard-overview-score');
    const deliverySummary    = dom.$('#delivery-summary');
    const usersStat          = dom.$('#stat-users');
    const sessionsStat       = dom.$('#stat-sessions');
    const revenueStat        = dom.$('#stat-revenue');
    const newTodayStat       = dom.$('#stat-new-today');
    const usersRing          = dom.$('#stat-users-ring');
    const sessionsRing       = dom.$('#stat-sessions-ring');
    const revenueRing        = dom.$('#stat-revenue-ring');
    const newTodayRing       = dom.$('#stat-new-today-ring');
    const adoptionHealth     = dom.$('#health-adoption');
    const sessionHealth      = dom.$('#health-sessions');
    const revenueHealth      = dom.$('#health-revenue');
    const activityTimeline   = dom.$('#dashboard-activity-timeline');
    const activityCountBadge = dom.$('#activity-count-badge');
    const metricsTable       = dom.$('#dashboard-metrics-table');
    const signalCompleted    = dom.$('#signal-completed');
    const signalRemaining    = dom.$('#signal-remaining');
    const signalCompletion   = dom.$('#signal-completion');
    const signalProgress     = dom.$('#signal-progress');
    const signalStatus       = dom.$('#signal-status');

    // -- State & computed ----------------------------------------------------
    const completedState  = useState(14);
    const totalState      = useState(18);

    const completionState = computed(() =>
        Math.round((completedState.value / totalState.value) * 100)
    );
    const remainingState = computed(() =>
        Math.max(totalState.value - completedState.value, 0)
    );
    const statusState = computed(() => {
        if (completionState.value >= 90) return { title: 'Release ready',   body: 'Computed delivery status confirms the current workflow is ready for review.',            variant: 'success' };
        if (completionState.value >= 70) return { title: 'On track',        body: 'Computed delivery status updates from local dashboard state.',                            variant: 'info'    };
        return                                  { title: 'Needs attention',  body: 'Completion dipped below the target threshold. Add or finish scope items to recover.',     variant: 'warning' };
    });

    // -- Reactive bindings ---------------------------------------------------
    // effect() auto-tracks completedState, totalState, completionState, remainingState,
    // and statusState. It runs immediately on creation and re-runs whenever any of them
    // changes. No manual .watch() subscriptions or renderSignalDemo() call needed.
    disposers.push(effect(() => {
        if (signalCompleted)  signalCompleted.textContent  = String(completedState.value);
        if (signalRemaining)  signalRemaining.textContent  = String(remainingState.value);
        if (signalCompletion) signalCompletion.textContent = `${completionState.value}%`;
        signalProgress?.setAttribute('value', String(completionState.value));
        if (signalStatus) {
            const s = statusState.value;
            signalStatus.setAttribute('variant', s.variant);
            signalStatus.setAttribute('title',   s.title);
            signalStatus.textContent = s.body;
        }
    }));

    // -- Data loading --------------------------------------------------------
    const loadData = async (forceRefresh = false) => {
        try {
            const data = await api.getCached('/dashboard/stats', {
                ttl: 30,
                revalidate: true,
                forceRefresh,
                queryKey: ['dashboard', 'stats'],
                tags: ['dashboard'],
            });

            if (!data || typeof data !== 'object') throw new Error('Invalid response from server');

            const users    = Number(data.users    ?? 0);
            const sessions = Number(data.sessions ?? 0);
            const revenue  = Number(data.revenue  ?? 0);
            const newToday = Number(data.newToday  ?? 0);

            const userScore     = Math.min(100, Math.round((users    / 1500)  * 100));
            const sessionScore  = Math.min(100, Math.round((sessions / 70)    * 100));
            const revenueScore  = Math.min(100, Math.round((revenue  / 60000) * 100));
            const newTodayScore = Math.min(100, Math.round((newToday / 30)    * 100));
            const overview      = Math.round((userScore + sessionScore + revenueScore) / 3);

            if (usersStat)    usersStat.textContent    = users.toLocaleString();
            if (sessionsStat) sessionsStat.textContent = sessions.toLocaleString();
            if (revenueStat)  revenueStat.textContent  = `$${revenue.toLocaleString()}`;
            if (newTodayStat) newTodayStat.textContent = newToday.toLocaleString();

            usersRing?.setAttribute('value',   String(userScore));
            sessionsRing?.setAttribute('value', String(sessionScore));
            revenueRing?.setAttribute('value',  String(revenueScore));
            newTodayRing?.setAttribute('value', String(newTodayScore));

            adoptionHealth?.setAttribute('value', String(userScore));
            sessionHealth?.setAttribute('value',  String(sessionScore));
            revenueHealth?.setAttribute('value',  String(revenueScore));

            if (overviewScore)   overviewScore.textContent   = `${overview}%`;
            if (deliverySummary) deliverySummary.textContent = `${overview >= 80 ? 'Executive-ready' : 'Needs iteration'} overview`;

            if (activityTimeline) {
                const activities = Array.isArray(data.recentActivity) ? data.recentActivity : [];
                activityCountBadge?.setAttribute('count', String(activities.length));
                activityTimeline.innerHTML = activities.map((item: { message?: string; time?: string }, index: number) => html`
                    <nc-timeline-item
                        title="${index === 0 ? 'Latest event' : 'Workflow update'}"
                        time="${item.time ?? 'Recently'}"
                        status="${index === 0 ? 'active' : 'completed'}"
                        ${index === activities.length - 1 ? 'no-line' : ''}
                    >
                        ${item.message ?? 'Protected activity recorded.'}
                    </nc-timeline-item>
                `).join('');
            }

            if (metricsTable) {
                metricsTable.setAttribute('columns', JSON.stringify([
                    { key: 'metric', label: 'Metric', sortable: true },
                    { key: 'value',  label: 'Value',  sortable: true },
                    { key: 'status', label: 'Status', format: 'badge' },
                ]));
                metricsTable.setAttribute('rows', JSON.stringify([
                    { metric: 'Authenticated users', value: users.toLocaleString(),         status: userScore    >= 80 ? 'Healthy' : 'Watch'  },
                    { metric: 'Active sessions',     value: sessions.toLocaleString(),      status: sessionScore >= 80 ? 'Healthy' : 'Watch'  },
                    { metric: 'Revenue pipeline',    value: `$${revenue.toLocaleString()}`, status: revenueScore >= 80 ? 'Healthy' : 'Watch'  },
                    { metric: 'New today',           value: newToday.toLocaleString(),      status: newTodayScore >= 80 ? 'Strong'  : 'Normal' },
                ]));
            }

        } catch (error: unknown) {
            console.error('Dashboard error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';

            if (deliverySummary) deliverySummary.textContent = 'Data unavailable';
            activityCountBadge?.setAttribute('count', '0');

            if (activityTimeline) {
                activityTimeline.innerHTML = html`
                    <nc-timeline-item title="Dashboard load failed" time="Just now" status="error" no-line>
                        Failed to load dashboard data: ${message}
                    </nc-timeline-item>
                `;
            }

            if (metricsTable) {
                metricsTable.setAttribute('columns', JSON.stringify([
                    { key: 'metric', label: 'Metric' },
                    { key: 'value',  label: 'Value'  },
                    { key: 'status', label: 'Status', format: 'badge' },
                ]));
                metricsTable.setAttribute('rows', JSON.stringify([
                    { metric: 'Dashboard API', value: 'Unavailable', status: 'Error' },
                ]));
            }
        }
    };

    // -- On load -------------------------------------------------------------
    const user = auth.getUser();
    if (user && welcomeMsg) {
        welcomeMsg.textContent = `Welcome back, ${user.name || 'User'}. This workspace demonstrates a cleaner executive layout with authenticated data, core components, and live state patterns.`;
    }

    await loadData();

    // -- Events --------------------------------------------------------------
    events.onClick('#refreshBtn', () => {
        api.invalidateQuery(['dashboard', 'stats'], { exact: true });
        api.invalidateTags('dashboard');
        void loadData(true);
    });
    events.onClick('#signal-complete-btn', () => {
        if (completedState.value < totalState.value) completedState.value += 1;
    });
    events.onClick('#signal-add-btn', () => {
        totalState.value += 1;
    });
    events.onClick('#signal-reset-btn', () => {
        completedState.value = 14;
        totalState.value     = 18;
    });

    // -- Cleanup -------------------------------------------------------------
    return () => {
        completionState.dispose();
        remainingState.dispose();
        statusState.dispose();
        events.cleanup();
        disposers.forEach(d => d());
    };
}
