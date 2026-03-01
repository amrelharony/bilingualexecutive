/**
 * Visitor Stats Engine — Alpine.store('visitorStats')
 * Automatic event tracking + on-demand analytics dashboard.
 */
document.addEventListener('alpine:init', () => {

    function getDeviceId() {
        let id = localStorage.getItem('bilingual_device_id');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('bilingual_device_id', id);
        }
        return id;
    }

    function detectDevice() {
        const ua = navigator.userAgent;
        if (/Mobi|Android/i.test(ua)) return 'mobile';
        if (/Tablet|iPad/i.test(ua)) return 'tablet';
        return 'desktop';
    }

    function detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg'))     return 'Edge';
        if (ua.includes('Chrome'))  return 'Chrome';
        if (ua.includes('Safari'))  return 'Safari';
        return 'Other';
    }

    function generateSessionId() {
        return 'ses_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    const TOOL_LABELS = {
        dashboard: 'Dashboard', assessment: 'Agile Audit', talent: 'Talent Radar',
        matrix: 'Matrix Builder', compass: 'Strategic Compass', lighthouse: 'Lighthouse',
        strategy: 'Strategy Forge', governance: 'Governance', compliance: 'Compliance',
        library: 'Exec Library', flashcards: 'Flashcards', culture: 'Debt Monitor',
        daily: 'Daily Feed', datagov: 'Data Health', excel: 'Excel Auditor',
        simulator: 'Case Study', whatif: 'War Games', escaperoom: 'Excel Escape',
        canvas: 'Data Product', feed: 'Daily Insight', stats: 'Visitor Stats',
        kpi: 'Outcome Gen', roi: 'Pilot ROI', squad: 'Squad Builder',
        repair: 'Repair Kit', vendor: 'Vendor Coach', capex: 'FinOps Audit',
        legacy: 'Legacy Code', flow: 'Flow Efficiency', adr: 'Decision Log',
        ticker: 'Meeting Tax', future: 'Future Bank', roleplay: 'Negotiation',
        conway: 'Conway Sim', risksim: 'Risk Dojo', bingo: 'Bingo',
        regsim: 'Reg Impact', shadow: 'Shadow IT', detector: 'AI Risk Scan',
        cognitive: 'Brain Load', sprintcheck: 'Sprint Check', adaptation: 'Adaptability',
        dt_tracker: 'ROI Tracker', dumbpipe: 'Utility Risk',
        translator: 'Translator', board: 'Board Guide', glossary: 'Glossary',
    };

    Alpine.store('visitorStats', {

        sessionId: null,
        _initialized: false,
        _sessionStart: null,

        summary: { total_unique_visitors: 0, today_visitors: 0, week_visitors: 0, month_visitors: 0, total_tool_uses: 0, total_page_views: 0, total_sessions: 0 },
        toolPopularity: [],
        dailyTrend: [],
        hourlyDist: [],
        deviceBreakdown: [],
        browserBreakdown: [],
        dashboardLoaded: false,
        dashboardLoading: false,

        TOOL_LABELS,

        async init() {
            if (this._initialized) return;

            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            this._initialized = true;

            this.sessionId = generateSessionId();
            this._sessionStart = Date.now();

            await this.trackEvent('session_start', {});
            this._setupUnloadTracking();
        },

        // ── Event Tracking ─────────────────────────────────────────────
        async trackEvent(eventType, eventData = {}) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                await sb.from('visitor_analytics').insert({
                    user_id: getDeviceId(),
                    session_id: this.sessionId,
                    event_type: eventType,
                    event_data: eventData,
                    device_type: detectDevice(),
                    browser: detectBrowser(),
                    screen_width: window.innerWidth || null,
                });
            } catch (_) {}
        },

        trackToolUse(toolId) {
            this.trackEvent('tool_use', {
                tool_id: toolId,
                tool_label: TOOL_LABELS[toolId] || toolId,
            });
        },

        _unloadHandler: null,
        _pagehideHandler: null,
        _setupUnloadTracking() {
            const sendEnd = () => {
                const duration = Date.now() - this._sessionStart;
                const appStore = Alpine.store('app');
                if (!appStore?.supabase) return;
                const payload = JSON.stringify({
                    user_id: getDeviceId(),
                    session_id: this.sessionId,
                    event_type: 'session_end',
                    event_data: { duration_ms: duration },
                    device_type: detectDevice(),
                    browser: detectBrowser(),
                    screen_width: window.innerWidth || null,
                });
                const url = appStore.supabaseUrl + '/rest/v1/visitor_analytics';
                const key = appStore.supabaseKey;
                try {
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': key,
                            'Authorization': 'Bearer ' + key,
                            'Prefer': 'return=minimal',
                        },
                        body: payload,
                        keepalive: true,
                    });
                } catch (_) {}
            };
            this._unloadHandler = sendEnd;
            this._pagehideHandler = sendEnd;
            window.addEventListener('beforeunload', this._unloadHandler);
            window.addEventListener('pagehide', this._pagehideHandler);
        },

        // ── Dashboard Data Fetchers ────────────────────────────────────
        async fetchDashboard() {
            if (this.dashboardLoaded || this.dashboardLoading) return;
            this.dashboardLoading = true;

            await Promise.all([
                this._fetchSummary(),
                this._fetchToolPopularity(),
                this._fetchDailyTrend(),
                this._fetchHourlyDist(),
                this._fetchDeviceBreakdown(),
                this._fetchBrowserBreakdown(),
            ]);

            this.dashboardLoaded = true;
            this.dashboardLoading = false;
        },

        async refreshDashboard() {
            this.dashboardLoaded = false;
            this.dashboardLoading = false;
            await this.fetchDashboard();
        },

        async _fetchSummary() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('visitor_stats_summary').select('*').single();
                if (data) this.summary = data;
            } catch (_) {}
        },

        async _fetchToolPopularity() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('visitor_tool_popularity').select('*');
                if (data) this.toolPopularity = data;
            } catch (_) {}
        },

        async _fetchDailyTrend() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('visitor_daily_trend').select('*');
                if (data) this.dailyTrend = data;
            } catch (_) {}
        },

        async _fetchHourlyDist() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('visitor_hourly_distribution').select('*');
                if (data) this.hourlyDist = data;
            } catch (_) {}
        },

        async _fetchDeviceBreakdown() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('visitor_device_breakdown').select('*');
                if (data) this.deviceBreakdown = data;
            } catch (_) {}
        },

        async _fetchBrowserBreakdown() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('visitor_browser_breakdown').select('*');
                if (data) this.browserBreakdown = data;
            } catch (_) {}
        },

        // ── Computed Helpers ───────────────────────────────────────────
        get maxDailyVisitors() {
            return Math.max(1, ...this.dailyTrend.map(d => d.visitors || 0));
        },

        get maxHourlyCount() {
            return Math.max(1, ...this.hourlyDist.map(h => h.event_count || 0));
        },

        get maxToolUses() {
            return Math.max(1, ...this.toolPopularity.map(t => t.use_count || 0));
        },

        get totalDeviceUsers() {
            return Math.max(1, this.deviceBreakdown.reduce((sum, d) => sum + (d.unique_users || 0), 0));
        },

        get totalBrowserUsers() {
            return Math.max(1, this.browserBreakdown.reduce((sum, b) => sum + (b.unique_users || 0), 0));
        },

        deviceIcon(type) {
            if (type === 'mobile') return 'fa-mobile-screen';
            if (type === 'tablet') return 'fa-tablet-screen-button';
            return 'fa-desktop';
        },

        formatDay(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },

        formatHour(h) {
            if (h === 0) return '12 AM';
            if (h === 12) return '12 PM';
            return h < 12 ? h + ' AM' : (h - 12) + ' PM';
        },
    });
});
