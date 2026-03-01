/**
 * Ultra-Advanced Presence System — Alpine.store('presence')
 * Real-time user presence, activity feed, and live stats
 * via Supabase Realtime channels + heartbeat polling.
 */
document.addEventListener('alpine:init', () => {

    const HEARTBEAT_MS = 30_000;
    const IDLE_AFTER_MS = 120_000;
    const STALE_THRESHOLD_MS = 180_000;
    const FEED_MAX = 80;
    const SESSION_KEY = 'bilingual_presence_session';

    const TOOL_LABELS = {
        dashboard: 'Dashboard', assessment: 'Assessment', talent: 'Talent Matrix',
        matrix: 'Matrix Builder', compass: 'Strategic Compass', lighthouse: 'Lighthouse',
        strategy: 'Strategy Forge', governance: 'Governance', compliance: 'Compliance',
        library: 'Library', flashcards: 'Flashcards', culture: 'Cultural Radar',
        daily: 'Daily Feed', datagov: 'Data Governance', excel: 'Excel Factory',
        case: 'Case Study', wargames: 'War Games', escape: 'Excel Escape',
        architect: 'Solution Architect', risk: 'Risk Engine', benchmark: 'Benchmark',
        canvas: 'Canvas Builder', auditor: 'Excel Auditor', feed: 'News Feed',
        ebook: 'E-Book Reader'
    };

    const STATUS_META = {
        online:  { label: 'Online',       color: '#22c55e', icon: 'fa-circle',          pulse: true },
        idle:    { label: 'Idle',          color: '#f59e0b', icon: 'fa-clock',           pulse: false },
        busy:    { label: 'Busy',          color: '#ef4444', icon: 'fa-circle-minus',    pulse: false },
        dnd:     { label: 'Do Not Disturb',color: '#8b5cf6', icon: 'fa-bell-slash',      pulse: false },
        offline: { label: 'Offline',       color: '#64748b', icon: 'fa-circle-xmark',    pulse: false },
    };

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

    function getDeviceId() {
        let id = localStorage.getItem('bilingual_device_id');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('bilingual_device_id', id);
        }
        return id;
    }

    Alpine.store('presence', {

        // ── State ──────────────────────────────────────────────────────
        sessionId: null,
        userId: null,
        myStatus: 'online',
        onlineUsers: [],
        activityFeed: [],
        liveStats: { online_count: 0, idle_count: 0, busy_count: 0, daily_unique: 0, most_popular_tool: null, avg_focus_mins: 0 },

        showPanel: false,
        panelTab: 'users',
        isConnected: false,

        _heartbeatTimer: null,
        _idleTimer: null,
        _channel: null,
        _feedChannel: null,
        _initialized: false,
        _idleResetHandler: null,
        _visibilityHandler: null,
        _beforeUnloadHandler: null,
        _pagehideHandler: null,
        _lastActivity: Date.now(),
        _focusStart: Date.now(),
        _pagesVisited: 0,
        _actionsCount: 0,
        _currentTool: null,
        _currentGroup: 'radar',

        STATUS_META,
        TOOL_LABELS,

        // ── Init ───────────────────────────────────────────────────────
        async init() {
            if (this._initialized) return;

            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            this._initialized = true;

            this.userId = getDeviceId();
            this._focusStart = Date.now();

            await this._upsertSession('online');
            await this._fetchOnlineUsers();
            await this._fetchActivityFeed();
            await this._fetchLiveStats();
            await this._postFeedEvent('join');

            this._startHeartbeat();
            this._startIdleDetection();
            this._subscribeRealtime();
            this._setupVisibilityHandlers();
            this._setupBeforeUnload();
        },

        // ── Session CRUD ───────────────────────────────────────────────
        async _upsertSession(status) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            const gam = Alpine.store('gamification');
            const payload = {
                user_id: this.userId,
                display_name: gam?.displayName || 'Executive',
                status: status || this.myStatus,
                current_tool: this._currentTool,
                current_group: this._currentGroup,
                rank_title: gam?.rank?.title || 'Intern',
                rank_hex: gam?.rank?.hex || '#94a3b8',
                xp: gam?.xp || 0,
                prestige: gam?.prestige || 0,
                device_type: detectDevice(),
                browser: detectBrowser(),
                last_heartbeat: new Date().toISOString(),
                last_action: this._lastActionLabel || null,
                last_action_at: new Date().toISOString(),
                focus_duration_mins: Math.floor((Date.now() - this._focusStart) / 60000),
                pages_visited: this._pagesVisited,
                actions_count: this._actionsCount,
            };

            try {
                const { data } = await sb.from('presence_sessions')
                    .upsert(payload, { onConflict: 'user_id' })
                    .select('id')
                    .single();
                if (data) this.sessionId = data.id;
                this.isConnected = true;
            } catch (_) {
                this.isConnected = false;
            }
        },

        async _goOffline() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                await sb.from('presence_sessions')
                    .update({ status: 'offline', last_heartbeat: new Date().toISOString() })
                    .eq('user_id', this.userId);
            } catch (_) {}
            this._postFeedEvent('leave');
        },

        // ── Heartbeat ──────────────────────────────────────────────────
        _startHeartbeat() {
            this._heartbeatTimer = setInterval(() => {
                this._upsertSession();
                this._fetchOnlineUsers();
                this._fetchLiveStats();
            }, HEARTBEAT_MS);
        },

        // ── Idle Detection ─────────────────────────────────────────────
        _startIdleDetection() {
            this._idleResetHandler = () => {
                this._lastActivity = Date.now();
                if (this.myStatus === 'idle') {
                    this.myStatus = 'online';
                    this._upsertSession('online');
                }
            };

            ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
                document.addEventListener(evt, this._idleResetHandler, { passive: true })
            );

            this._idleTimer = setInterval(() => {
                if (this.myStatus === 'dnd' || this.myStatus === 'busy') return;
                if (Date.now() - this._lastActivity > IDLE_AFTER_MS && this.myStatus !== 'idle') {
                    this.myStatus = 'idle';
                    this._upsertSession('idle');
                }
            }, 15_000);
        },

        // ── Supabase Realtime ──────────────────────────────────────────
        _subscribeRealtime() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            this._channel = sb.channel('presence-sessions')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'presence_sessions' },
                    (payload) => this._handleSessionChange(payload)
                )
                .subscribe();

            this._feedChannel = sb.channel('presence-feed')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'presence_activity_feed' },
                    (payload) => {
                        if (payload.new) {
                            this.activityFeed.unshift(payload.new);
                            if (this.activityFeed.length > FEED_MAX) this.activityFeed.pop();
                        }
                    }
                )
                .subscribe();
        },

        _handleSessionChange(payload) {
            const record = payload.new;
            if (!record) return;

            const idx = this.onlineUsers.findIndex(u => u.user_id === record.user_id);
            if (record.status === 'offline') {
                if (idx >= 0) this.onlineUsers.splice(idx, 1);
            } else {
                if (idx >= 0) {
                    this.onlineUsers.splice(idx, 1, record);
                } else {
                    this.onlineUsers.push(record);
                }
            }

            this._recalcStats();
        },

        _recalcStats() {
            const now = Date.now();
            const active = this.onlineUsers.filter(u =>
                u.status !== 'offline' && new Date(u.last_heartbeat).getTime() > now - STALE_THRESHOLD_MS
            );
            this.liveStats.online_count = active.filter(u => u.status === 'online').length;
            this.liveStats.idle_count = active.filter(u => u.status === 'idle').length;
            this.liveStats.busy_count = active.filter(u => u.status === 'busy').length;
        },

        // ── Fetchers ───────────────────────────────────────────────────
        async _fetchOnlineUsers() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
                const { data } = await sb.from('presence_sessions')
                    .select('*')
                    .neq('status', 'offline')
                    .gte('last_heartbeat', cutoff)
                    .order('xp', { ascending: false })
                    .limit(100);
                if (data) this.onlineUsers = data;
            } catch (_) {}
        },

        async _fetchActivityFeed() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('presence_activity_feed')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(FEED_MAX);
                if (data) this.activityFeed = data;
            } catch (_) {}
        },

        async _fetchLiveStats() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('presence_live_stats')
                    .select('*')
                    .single();
                if (data) this.liveStats = data;
            } catch (_) {}
        },

        // ── Activity Feed Posts ────────────────────────────────────────
        async _postFeedEvent(eventType, eventData = {}) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            const gam = Alpine.store('gamification');
            try {
                await sb.from('presence_activity_feed').insert({
                    user_id: this.userId,
                    display_name: gam?.displayName || 'Executive',
                    event_type: eventType,
                    event_data: eventData,
                });
            } catch (_) {}
        },

        // ── Visibility / Unload ────────────────────────────────────────
        _setupVisibilityHandlers() {
            this._visibilityHandler = () => {
                if (document.hidden) {
                    if (this.myStatus === 'online') {
                        this.myStatus = 'idle';
                        this._upsertSession('idle');
                    }
                } else {
                    this._lastActivity = Date.now();
                    if (this.myStatus === 'idle') {
                        this.myStatus = 'online';
                        this._upsertSession('online');
                    }
                }
            };
            document.addEventListener('visibilitychange', this._visibilityHandler);
        },

        _setupBeforeUnload() {
            this._beforeUnloadHandler = () => { this._goOffline(); };
            this._pagehideHandler = () => { this._goOffline(); };
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
            window.addEventListener('pagehide', this._pagehideHandler);
        },

        // ── Public API (called from components) ────────────────────────
        trackToolSwitch(toolId, groupId) {
            const prevTool = this._currentTool;
            this._currentTool = toolId;
            this._currentGroup = groupId || this._currentGroup;
            this._pagesVisited++;
            this._lastActionLabel = 'Switched to ' + (TOOL_LABELS[toolId] || toolId);

            if (prevTool && prevTool !== toolId) {
                this._postFeedEvent('tool_switch', {
                    from: TOOL_LABELS[prevTool] || prevTool,
                    to: TOOL_LABELS[toolId] || toolId,
                });
            }
            this._upsertSession();
        },

        trackAction(label) {
            this._actionsCount++;
            this._lastActionLabel = label;
            this._lastActivity = Date.now();
        },

        trackRankUp(newRank) {
            this._postFeedEvent('rank_up', {
                rank: newRank.title,
                hex: newRank.hex,
            });
            this._upsertSession();
        },

        trackAchievement(achievement) {
            this._postFeedEvent('achievement', {
                name: achievement.name || achievement,
                icon: achievement.icon || 'fa-trophy',
            });
        },

        trackPrestige(level) {
            this._postFeedEvent('prestige', { level });
            this._upsertSession();
        },

        trackMilestone(label, value) {
            this._postFeedEvent('milestone', { label, value });
        },

        trackStreak(days) {
            if (days > 0 && days % 7 === 0) {
                this._postFeedEvent('streak', { days });
            }
        },

        setStatus(status) {
            if (!STATUS_META[status]) return;
            this.myStatus = status;
            this._upsertSession(status);
        },

        togglePanel() {
            this.showPanel = !this.showPanel;
        },

        // ── Computed Helpers ───────────────────────────────────────────
        get totalOnline() {
            return this.onlineUsers.filter(u => u.status !== 'offline').length;
        },

        get onlineSorted() {
            return [...this.onlineUsers]
                .filter(u => u.status !== 'offline')
                .sort((a, b) => {
                    const order = { online: 0, busy: 1, dnd: 2, idle: 3 };
                    return (order[a.status] ?? 4) - (order[b.status] ?? 4) || (b.xp - a.xp);
                });
        },

        get feedFormatted() {
            return this.activityFeed.map(item => {
                const ago = this._timeAgo(item.created_at);
                let icon = 'fa-circle-info';
                let message = '';
                let color = '#94a3b8';
                const d = item.event_data || {};

                switch (item.event_type) {
                    case 'join':
                        icon = 'fa-right-to-bracket'; color = '#22c55e';
                        message = `joined the platform`; break;
                    case 'leave':
                        icon = 'fa-right-from-bracket'; color = '#64748b';
                        message = `went offline`; break;
                    case 'tool_switch':
                        icon = 'fa-arrow-right-arrow-left'; color = '#3b82f6';
                        message = `switched to ${d.to || 'a tool'}`; break;
                    case 'rank_up':
                        icon = 'fa-ranking-star'; color = d.hex || '#f59e0b';
                        message = `ranked up to ${d.rank || 'new rank'}`; break;
                    case 'achievement':
                        icon = d.icon || 'fa-trophy'; color = '#f59e0b';
                        message = `unlocked "${d.name || 'Achievement'}"`; break;
                    case 'prestige':
                        icon = 'fa-gem'; color = '#a855f7';
                        message = `reached Prestige ${d.level || '?'}`; break;
                    case 'milestone':
                        icon = 'fa-flag-checkered'; color = '#06b6d4';
                        message = `${d.label || 'Milestone'}: ${d.value || ''}`; break;
                    case 'streak':
                        icon = 'fa-fire'; color = '#f97316';
                        message = `hit a ${d.days}-day streak!`; break;
                }

                return { ...item, icon, message, color, ago };
            });
        },

        _timeAgo(isoStr) {
            const diff = Date.now() - new Date(isoStr).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return mins + 'm ago';
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return hrs + 'h ago';
            return Math.floor(hrs / 24) + 'd ago';
        },

        formatDuration(mins) {
            if (!mins || mins < 1) return '<1m';
            if (mins < 60) return mins + 'm';
            return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
        },

        // ── Cleanup ────────────────────────────────────────────────────
        destroy() {
            clearInterval(this._heartbeatTimer);
            clearInterval(this._idleTimer);
            if (this._channel) this._channel.unsubscribe();
            if (this._feedChannel) this._feedChannel.unsubscribe();

            if (this._idleResetHandler) {
                ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
                    document.removeEventListener(evt, this._idleResetHandler)
                );
            }
            if (this._visibilityHandler) document.removeEventListener('visibilitychange', this._visibilityHandler);
            if (this._beforeUnloadHandler) window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            if (this._pagehideHandler) window.removeEventListener('pagehide', this._pagehideHandler);
        },
    });
});
