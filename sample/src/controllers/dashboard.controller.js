/**
 * Dashboard Controller
 * Loads API metrics, drives the signal demo, and wires all dashboard interactions.
 */
import { wireContents, wireAttributes } from '@core-utils/wires.js';
import { trackEvents } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import { html } from '@core-utils/templates.js';
import { useState, computed, effect } from '@core/state.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';
export async function dashboardController() {
    // Setup
    const events = trackEvents();
    // Wires
    // Text bindings -> [wire-content] in dashboard.html
    const { welcomeMessage, overviewScore, deliverySummary, statUsers, statSessions, statRevenue, statNewToday, } = wireContents();
    // Attribute bindings -> [wire-attribute] in dashboard.html
    const { usersRingValue, sessionsRingValue, revenueRingValue, newTodayRingValue, adoptionValue, sessionsHealthValue, revenueHealthValue, activityCount, } = wireAttributes();
    // DOM refs that need richer HTML rendering
    const activityTimeline = dom.$('#dashboard-activity-timeline');
    const metricsTable = dom.$('#dashboard-metrics-table');
    // Local signal lab state
    const completedState = useState(14);
    const totalState = useState(18);
    const completionState = computed(() => Math.round((completedState.value / totalState.value) * 100));
    const remainingState = computed(() => Math.max(totalState.value - completedState.value, 0));
    const statusState = computed(() => {
        if (completionState.value >= 90)
            return { title: 'Release ready', body: 'Computed delivery status confirms the current workflow is ready for review.', variant: 'success' };
        if (completionState.value >= 70)
            return { title: 'On track', body: 'Computed delivery status updates from local dashboard state.', variant: 'info' };
        return { title: 'Needs attention', body: 'Completion dipped below the target threshold. Add or finish scope items to recover.', variant: 'warning' };
    });
    // Reactive signal-lab bindings
    // effect() auto-tracks dependencies and auto-registers cleanup.
    const signalCompleted = dom.$('#signal-completed');
    const signalRemaining = dom.$('#signal-remaining');
    const signalCompletion = dom.$('#signal-completion');
    const signalProgress = dom.$('#signal-progress');
    const signalStatus = dom.$('#signal-status');
    effect(() => {
        if (signalCompleted)
            signalCompleted.textContent = String(completedState.value);
        if (signalRemaining)
            signalRemaining.textContent = String(remainingState.value);
        if (signalCompletion)
            signalCompletion.textContent = `${completionState.value}%`;
        signalProgress?.setAttribute('value', String(completionState.value));
        if (signalStatus) {
            const s = statusState.value;
            signalStatus.setAttribute('variant', s.variant);
            signalStatus.setAttribute('title', s.title);
            signalStatus.textContent = s.body;
        }
    });
    // Data loading
    const loadData = async (forceRefresh = false) => {
        try {
            const data = await api.getCached('/dashboard/stats', {
                ttl: 30,
                revalidate: true,
                forceRefresh,
                queryKey: ['dashboard', 'stats'],
                tags: ['dashboard'],
            });
            if (!data || typeof data !== 'object')
                throw new Error('Invalid response from server');
            const users = Number(data.users ?? 0);
            const sessions = Number(data.sessions ?? 0);
            const revenue = Number(data.revenue ?? 0);
            const newToday = Number(data.newToday ?? 0);
            const userScore = Math.min(100, Math.round((users / 1500) * 100));
            const sessionScore = Math.min(100, Math.round((sessions / 70) * 100));
            const revenueScore = Math.min(100, Math.round((revenue / 60000) * 100));
            const newTodayScore = Math.min(100, Math.round((newToday / 30) * 100));
            const overview = Math.round((userScore + sessionScore + revenueScore) / 3);
            statUsers.value = users.toLocaleString();
            statSessions.value = sessions.toLocaleString();
            statRevenue.value = `$${revenue.toLocaleString()}`;
            statNewToday.value = newToday.toLocaleString();
            usersRingValue.value = String(userScore);
            sessionsRingValue.value = String(sessionScore);
            revenueRingValue.value = String(revenueScore);
            newTodayRingValue.value = String(newTodayScore);
            adoptionValue.value = String(userScore);
            sessionsHealthValue.value = String(sessionScore);
            revenueHealthValue.value = String(revenueScore);
            overviewScore.value = `${overview}%`;
            deliverySummary.value = `${overview >= 80 ? 'Executive-ready' : 'Needs iteration'} overview`;
            if (activityTimeline) {
                const activities = Array.isArray(data.recentActivity) ? data.recentActivity : [];
                activityCount.value = String(activities.length);
                activityTimeline.innerHTML = activities.map((item, index) => html `
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
                    { key: 'value', label: 'Value', sortable: true },
                    { key: 'status', label: 'Status', format: 'badge' },
                ]));
                metricsTable.setAttribute('rows', JSON.stringify([
                    { metric: 'Authenticated users', value: users.toLocaleString(), status: userScore >= 80 ? 'Healthy' : 'Watch' },
                    { metric: 'Active sessions', value: sessions.toLocaleString(), status: sessionScore >= 80 ? 'Healthy' : 'Watch' },
                    { metric: 'Revenue pipeline', value: `$${revenue.toLocaleString()}`, status: revenueScore >= 80 ? 'Healthy' : 'Watch' },
                    { metric: 'New today', value: newToday.toLocaleString(), status: newTodayScore >= 80 ? 'Strong' : 'Normal' },
                ]));
            }
        }
        catch (error) {
            console.error('Dashboard error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            deliverySummary.value = 'Data unavailable';
            activityCount.value = '0';
            if (activityTimeline) {
                activityTimeline.innerHTML = html `
                    <nc-timeline-item title="Dashboard load failed" time="Just now" status="error" no-line>
                        Failed to load dashboard data: ${message}
                    </nc-timeline-item>
                `;
            }
            if (metricsTable) {
                metricsTable.setAttribute('columns', JSON.stringify([
                    { key: 'metric', label: 'Metric' },
                    { key: 'value', label: 'Value' },
                    { key: 'status', label: 'Status', format: 'badge' },
                ]));
                metricsTable.setAttribute('rows', JSON.stringify([
                    { metric: 'Dashboard API', value: 'Unavailable', status: 'Error' },
                ]));
            }
        }
    };
    // On load
    const user = auth.getUser();
    if (user) {
        welcomeMessage.value = `Welcome back, ${user.name || 'User'}. This workspace demonstrates a cleaner executive layout with authenticated data, core components, and live state patterns.`;
    }
    await loadData();
    // Events
    events.onClick('#refreshBtn', () => {
        api.invalidateQuery(['dashboard', 'stats'], { exact: true });
        api.invalidateTags('dashboard');
        void loadData(true);
    });
    events.onClick('#signal-complete-btn', () => {
        if (completedState.value < totalState.value)
            completedState.value += 1;
    });
    events.onClick('#signal-add-btn', () => {
        totalState.value += 1;
    });
    events.onClick('#signal-reset-btn', () => {
        completedState.value = 14;
        totalState.value = 18;
    });
    // Cleanup
    // wire*, effect(), and computed() bindings auto-dispose via PageCleanupRegistry.
    // Return cleanup only for tracked DOM events/listeners.
    return () => {
        events.cleanup();
    };
}
