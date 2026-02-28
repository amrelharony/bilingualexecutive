/**
 * Ultra-Advanced Guestbook — Alpine.store('guestbook')
 * Real-time entries, reactions, threads, sentiment, profanity filter.
 */
document.addEventListener('alpine:init', () => {

    const PER_PAGE = 15;
    const RATE_LIMIT_MS = 30_000;
    const EMOJIS = ['fire', 'heart', 'thumbsup', 'clap', 'rocket', 'lightbulb'];
    const EMOJI_DISPLAY = { fire: '🔥', heart: '❤️', thumbsup: '👍', clap: '👏', rocket: '🚀', lightbulb: '💡' };

    const POSITIVE_WORDS = [
        'amazing', 'awesome', 'beautiful', 'best', 'brilliant', 'cool', 'excellent', 'fantastic',
        'good', 'great', 'happy', 'helpful', 'impressive', 'incredible', 'inspiring', 'like',
        'love', 'nice', 'outstanding', 'perfect', 'remarkable', 'superb', 'terrific', 'thank',
        'thanks', 'useful', 'valuable', 'wonderful', 'wow', 'bravo', 'kudos', 'stellar',
        'exceptional', 'powerful', 'elegant', 'intuitive', 'game-changer', 'top-notch'
    ];
    const NEGATIVE_WORDS = [
        'awful', 'bad', 'boring', 'broken', 'bug', 'confusing', 'crash', 'difficult',
        'disappointing', 'dislike', 'error', 'fail', 'frustrating', 'hate', 'horrible',
        'issue', 'lag', 'missing', 'poor', 'problem', 'slow', 'terrible', 'ugly',
        'useless', 'waste', 'worst', 'annoying', 'clunky'
    ];
    const PROFANITY_LIST = [
        'fuck', 'shit', 'ass', 'damn', 'bitch', 'crap', 'dick', 'piss', 'bastard',
        'hell', 'idiot', 'stupid', 'dumb', 'moron', 'retard', 'slut', 'whore'
    ];

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

    Alpine.store('guestbook', {

        entries: [],
        reactions: {},
        stats: { total_entries: 0, unique_authors: 0, today_entries: 0, positive_count: 0, neutral_count: 0, negative_count: 0 },
        totalCount: 0,
        page: 0,
        loading: false,
        hasMore: true,
        showPanel: false,
        newMessage: '',
        replyingTo: null,
        filter: 'all',
        sortBy: 'newest',
        searchQuery: '',
        lastPostTime: 0,
        _initialized: false,
        _channel: null,
        _reactChannel: null,

        EMOJIS,
        EMOJI_DISPLAY,

        async init() {
            if (this._initialized) return;

            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            this._initialized = true;
            await this.fetchEntries();
            await this.fetchStats();
            this._subscribeRealtime();
        },

        // ── Fetch Entries ──────────────────────────────────────────────
        async fetchEntries(append = false) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            this.loading = true;

            try {
                let query = sb.from('guestbook_entries')
                    .select('*')
                    .is('parent_id', null);

                if (this.filter === 'pinned') query = query.eq('is_pinned', true);
                if (this.filter === 'mine') query = query.eq('user_id', getDeviceId());

                if (this.sortBy === 'newest') query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
                else if (this.sortBy === 'oldest') query = query.order('created_at', { ascending: true });

                const offset = append ? this.entries.length : 0;
                query = query.range(offset, offset + PER_PAGE - 1);

                const { data, error } = await query;
                if (error) throw error;

                if (data) {
                    if (append) {
                        this.entries = [...this.entries, ...data];
                    } else {
                        this.entries = data;
                    }
                    this.hasMore = data.length === PER_PAGE;

                    const entryIds = data.map(e => e.id);
                    if (entryIds.length) await this._fetchReactionsForEntries(entryIds);
                    await this._fetchReplies(entryIds);
                }
            } catch (_) {}
            this.loading = false;
        },

        async _fetchReplies(parentIds) {
            if (!parentIds.length) return;
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('guestbook_entries')
                    .select('*')
                    .in('parent_id', parentIds)
                    .order('created_at', { ascending: true });
                if (data) {
                    data.forEach(reply => {
                        const parent = this.entries.find(e => e.id === reply.parent_id);
                        if (parent) {
                            if (!parent._replies) parent._replies = [];
                            if (!parent._replies.find(r => r.id === reply.id)) {
                                parent._replies.push(reply);
                            }
                        }
                    });
                }
            } catch (_) {}
        },

        async _fetchReactionsForEntries(entryIds) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('guestbook_reactions')
                    .select('*')
                    .in('entry_id', entryIds);
                if (data) {
                    data.forEach(r => {
                        if (!this.reactions[r.entry_id]) this.reactions[r.entry_id] = [];
                        if (!this.reactions[r.entry_id].find(x => x.id === r.id)) {
                            this.reactions[r.entry_id].push(r);
                        }
                    });
                }
            } catch (_) {}
        },

        async fetchStats() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                const { data } = await sb.from('guestbook_stats').select('*').single();
                if (data) this.stats = data;
            } catch (_) {}
        },

        // ── Post Entry ─────────────────────────────────────────────────
        async postEntry() {
            const msg = (this.newMessage || '').trim();
            if (!msg) return;
            if (msg.length > 500) return;

            if (Date.now() - this.lastPostTime < RATE_LIMIT_MS) return;

            if (this._profanityCheck(msg)) {
                this._filteredMessage = true;
                setTimeout(() => { this._filteredMessage = false; }, 3000);
                return;
            }

            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            const gam = Alpine.store('gamification');
            const payload = {
                user_id: getDeviceId(),
                display_name: gam?.displayName || 'Executive',
                avatar_color: gam?.rank?.hex || '#94a3b8',
                rank_title: gam?.rank?.title || 'Intern',
                message: msg,
                sentiment: this._analyzeSentiment(msg),
                parent_id: this.replyingTo || null,
                device_type: detectDevice(),
            };

            const wasReply = !!this.replyingTo;
            try {
                const { error } = await sb.from('guestbook_entries').insert(payload);
                if (error) throw error;
                this.newMessage = '';
                this.replyingTo = null;
                this.lastPostTime = Date.now();
                gam?.trackAction?.('Guestbook post');
                if (!wasReply) await this.fetchEntries();
                this.fetchStats();
            } catch (_) {}
        },

        async deleteEntry(entryId) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            try {
                await sb.from('guestbook_entries')
                    .delete()
                    .eq('id', entryId)
                    .eq('user_id', getDeviceId());
                this.entries = this.entries.filter(e => e.id !== entryId);
                this.fetchStats();
            } catch (_) {}
        },

        // ── Reactions ──────────────────────────────────────────────────
        async toggleReaction(entryId, emoji) {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;
            const userId = getDeviceId();
            const existing = (this.reactions[entryId] || []).find(r => r.user_id === userId && r.emoji === emoji);

            try {
                if (existing) {
                    await sb.from('guestbook_reactions').delete().eq('id', existing.id);
                    this.reactions[entryId] = (this.reactions[entryId] || []).filter(r => r.id !== existing.id);
                } else {
                    const { data } = await sb.from('guestbook_reactions')
                        .insert({ entry_id: entryId, user_id: userId, emoji })
                        .select()
                        .single();
                    if (data) {
                        if (!this.reactions[entryId]) this.reactions[entryId] = [];
                        this.reactions[entryId].push(data);
                    }
                }
            } catch (_) {}
        },

        getReactionCount(entryId, emoji) {
            return (this.reactions[entryId] || []).filter(r => r.emoji === emoji).length;
        },

        hasMyReaction(entryId, emoji) {
            const userId = getDeviceId();
            return (this.reactions[entryId] || []).some(r => r.user_id === userId && r.emoji === emoji);
        },

        getTotalReactions(entryId) {
            return (this.reactions[entryId] || []).length;
        },

        // ── Load More ──────────────────────────────────────────────────
        async loadMore() {
            if (!this.hasMore || this.loading) return;
            await this.fetchEntries(true);
        },

        // ── Refresh (filter/sort change) ───────────────────────────────
        async refresh() {
            this.page = 0;
            this.hasMore = true;
            await this.fetchEntries();
        },

        // ── Realtime ───────────────────────────────────────────────────
        _subscribeRealtime() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            this._channel = sb.channel('guestbook-entries')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'guestbook_entries' },
                    (payload) => {
                        if (!payload.new) return;
                        const entry = payload.new;
                        if (entry.parent_id) {
                            const parent = this.entries.find(e => e.id === entry.parent_id);
                            if (parent) {
                                if (!parent._replies) parent._replies = [];
                                if (!parent._replies.find(r => r.id === entry.id)) {
                                    parent._replies.push(entry);
                                }
                            }
                        } else {
                            if (!this.entries.find(e => e.id === entry.id)) {
                                this.entries.unshift(entry);
                            }
                        }
                        this.stats.total_entries = (this.stats.total_entries || 0) + 1;
                        this.stats.today_entries = (this.stats.today_entries || 0) + 1;
                    }
                )
                .on('postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'guestbook_entries' },
                    (payload) => {
                        if (!payload.old) return;
                        this.entries = this.entries.filter(e => e.id !== payload.old.id);
                        this.entries.forEach(e => {
                            if (e._replies) e._replies = e._replies.filter(r => r.id !== payload.old.id);
                        });
                    }
                )
                .subscribe();

            this._reactChannel = sb.channel('guestbook-reactions')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'guestbook_reactions' },
                    (payload) => {
                        if (payload.eventType === 'INSERT' && payload.new) {
                            const r = payload.new;
                            if (!this.reactions[r.entry_id]) this.reactions[r.entry_id] = [];
                            if (!this.reactions[r.entry_id].find(x => x.id === r.id)) {
                                this.reactions[r.entry_id].push(r);
                            }
                        } else if (payload.eventType === 'DELETE' && payload.old) {
                            const r = payload.old;
                            if (this.reactions[r.entry_id]) {
                                this.reactions[r.entry_id] = this.reactions[r.entry_id].filter(x => x.id !== r.id);
                            }
                        }
                    }
                )
                .subscribe();
        },

        // ── Sentiment Analysis ─────────────────────────────────────────
        _analyzeSentiment(text) {
            const lower = text.toLowerCase();
            const words = lower.split(/\W+/);
            let score = 0;
            words.forEach(w => {
                if (POSITIVE_WORDS.includes(w)) score++;
                if (NEGATIVE_WORDS.includes(w)) score--;
            });
            if (score > 0) return 'positive';
            if (score < 0) return 'negative';
            return 'neutral';
        },

        // ── Profanity Filter ───────────────────────────────────────────
        _profanityCheck(text) {
            const lower = text.toLowerCase();
            return PROFANITY_LIST.some(word => {
                const regex = new RegExp('\\b' + word + '\\b', 'i');
                return regex.test(lower);
            });
        },

        _filteredMessage: false,

        // ── Computed ───────────────────────────────────────────────────
        get filteredEntries() {
            let result = [...this.entries];
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                result = result.filter(e =>
                    (e.message || '').toLowerCase().includes(q) ||
                    (e.display_name || '').toLowerCase().includes(q)
                );
            }
            return result;
        },

        get isRateLimited() {
            return Date.now() - this.lastPostTime < RATE_LIMIT_MS;
        },

        get rateLimitRemaining() {
            const remaining = Math.ceil((RATE_LIMIT_MS - (Date.now() - this.lastPostTime)) / 1000);
            return Math.max(0, remaining);
        },

        isMyEntry(entry) {
            return entry.user_id === getDeviceId();
        },

        sentimentIcon(sentiment) {
            if (sentiment === 'positive') return 'fa-face-smile';
            if (sentiment === 'negative') return 'fa-face-frown';
            return 'fa-face-meh';
        },

        sentimentColor(sentiment) {
            if (sentiment === 'positive') return '#22c55e';
            if (sentiment === 'negative') return '#ef4444';
            return '#94a3b8';
        },

        timeAgo(isoStr) {
            const diff = Date.now() - new Date(isoStr).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return mins + 'm ago';
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return hrs + 'h ago';
            const days = Math.floor(hrs / 24);
            if (days < 30) return days + 'd ago';
            return Math.floor(days / 30) + 'mo ago';
        },

        togglePanel() {
            this.showPanel = !this.showPanel;
        },
    });
});
