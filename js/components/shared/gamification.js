// js/components/shared/gamification.js
// Ultra-Advanced Gamification Engine for The Bilingual Executive Toolkit

document.addEventListener('alpine:init', () => {

    const STORAGE_KEY = 'bilingual_gamification';
    const SYNC_INTERVAL = 30000;

    // ── Rank Definitions ──────────────────────────────────────────────
    const RANKS = [
        { level: 1,  title: 'Intern',         xp: 0,       icon: 'fa-id-badge',       color: 'slate',   hex: '#94a3b8' },
        { level: 2,  title: 'Analyst',         xp: 200,     icon: 'fa-chart-line',     color: 'zinc',    hex: '#a1a1aa' },
        { level: 3,  title: 'Associate',       xp: 600,     icon: 'fa-briefcase',      color: 'blue',    hex: '#60a5fa' },
        { level: 4,  title: 'Manager',         xp: 1500,    icon: 'fa-people-group',   color: 'cyan',    hex: '#22d3ee' },
        { level: 5,  title: 'Senior Manager',  xp: 3500,    icon: 'fa-user-tie',       color: 'teal',    hex: '#2dd4bf' },
        { level: 6,  title: 'Director',        xp: 7000,    icon: 'fa-chess-rook',     color: 'green',   hex: '#4ade80' },
        { level: 7,  title: 'Vice President',  xp: 12000,   icon: 'fa-crown',          color: 'emerald', hex: '#34d399' },
        { level: 8,  title: 'SVP',             xp: 20000,   icon: 'fa-gem',            color: 'amber',   hex: '#fbbf24' },
        { level: 9,  title: 'EVP',             xp: 35000,   icon: 'fa-star',           color: 'orange',  hex: '#fb923c' },
        { level: 10, title: 'C-Suite',         xp: 55000,   icon: 'fa-building-columns', color: 'rose',  hex: '#f472b6' },
        { level: 11, title: 'Board Member',    xp: 80000,   icon: 'fa-landmark',       color: 'purple',  hex: '#a78bfa' },
        { level: 12, title: 'Chairman',        xp: 120000,  icon: 'fa-trophy',         color: 'yellow',  hex: '#facc15' },
    ];

    // ── Achievement Definitions ───────────────────────────────────────
    const TIER_XP = { bronze: 25, silver: 75, gold: 150, platinum: 200 };

    const ACHIEVEMENTS = [
        // Scholar (Academy)
        { id: 'first_lesson',    name: 'First Lesson',     desc: 'Complete 1 chapter',             tier: 'bronze',   category: 'scholar',    icon: 'fa-book-open',       check: s => s.chaptersCompleted.length >= 1 },
        { id: 'halfway',         name: 'Halfway There',    desc: 'Complete 5 chapters',            tier: 'silver',   category: 'scholar',    icon: 'fa-book-open',       check: s => s.chaptersCompleted.length >= 5 },
        { id: 'valedictorian',   name: 'Valedictorian',    desc: 'Complete all 10 chapters',       tier: 'gold',     category: 'scholar',    icon: 'fa-graduation-cap',  check: s => s.chaptersCompleted.length >= 10 },
        { id: 'speed_reader',    name: 'Speed Reader',     desc: 'View 3 PDFs',                   tier: 'bronze',   category: 'scholar',    icon: 'fa-file-pdf',        check: s => s.pdfsViewed >= 3 },
        { id: 'flash_memory',    name: 'Flash Memory',     desc: 'Complete 50 flashcards',         tier: 'silver',   category: 'scholar',    icon: 'fa-bolt',            check: s => s.flashcardsCompleted >= 50 },

        // Strategist (Radar)
        { id: 'risk_aware',      name: 'Risk Aware',       desc: 'Use any Radar tool',             tier: 'bronze',   category: 'strategist', icon: 'fa-bullseye',        check: s => s.radarToolsUsed.length >= 1 },
        { id: 'full_scan',       name: 'Full Scan',        desc: 'Use 5 different Radar tools',    tier: 'silver',   category: 'strategist', icon: 'fa-satellite-dish',  check: s => s.radarToolsUsed.length >= 5 },
        { id: 'strategic_oracle',name: 'Strategic Oracle',  desc: 'Use all 11 Radar tools',        tier: 'gold',     category: 'strategist', icon: 'fa-eye',             check: s => s.radarToolsUsed.length >= 11 },
        { id: 'cultural_guard',  name: 'Cultural Guardian', desc: 'Submit 5 cultural check-ins',   tier: 'silver',   category: 'strategist', icon: 'fa-shield-halved',   check: s => s.culturalCheckins >= 5 },

        // Architect (Forge)
        { id: 'first_build',     name: 'First Build',       desc: 'Use any Forge tool',            tier: 'bronze',   category: 'architect',  icon: 'fa-hammer',          check: s => s.forgeToolsUsed.length >= 1 },
        { id: 'master_builder',  name: 'Master Builder',    desc: 'Use 7 Forge tools',             tier: 'silver',   category: 'architect',  icon: 'fa-screwdriver-wrench', check: s => s.forgeToolsUsed.length >= 7 },
        { id: 'industrial',      name: 'Industrial Complex',desc: 'Use all 13 Forge tools',        tier: 'gold',     category: 'architect',  icon: 'fa-industry',        check: s => s.forgeToolsUsed.length >= 13 },
        { id: 'excel_killer',    name: 'Excel Killer',      desc: 'Calculate Excel waste 3 times', tier: 'silver',   category: 'architect',  icon: 'fa-file-excel',      check: s => s.excelCalcs >= 3 },

        // Commander (Sims)
        { id: 'first_blood',     name: 'First Blood',      desc: 'Complete any simulation',        tier: 'bronze',   category: 'commander',  icon: 'fa-gamepad',         check: s => s.gamesCompleted >= 1 },
        { id: 'war_hero',        name: 'War Hero',         desc: 'Win 5 games across sims',        tier: 'silver',   category: 'commander',  icon: 'fa-medal',           check: s => s.gamesWon >= 5 },
        { id: 'undefeated',      name: 'Undefeated',       desc: 'Win 10 games without losing',    tier: 'gold',     category: 'commander',  icon: 'fa-shield',          check: s => s.gamesWon >= 10 && s.gamesLost === 0 },
        { id: 'escape_artist',   name: 'Escape Artist',    desc: 'Score 90%+ in Excel Escape',     tier: 'platinum', category: 'commander',  icon: 'fa-door-open',       check: s => s.escapeHighScore >= 90 },

        // Dedication
        { id: 'streak_3',        name: 'Streak Starter',   desc: '3-day streak',                   tier: 'bronze',   category: 'dedication', icon: 'fa-fire',            check: s => s.bestStreak >= 3 },
        { id: 'streak_7',        name: 'On Fire',          desc: '7-day streak',                   tier: 'silver',   category: 'dedication', icon: 'fa-fire-flame-curved', check: s => s.bestStreak >= 7 },
        { id: 'streak_14',       name: 'Unstoppable',      desc: '14-day streak',                  tier: 'gold',     category: 'dedication', icon: 'fa-meteor',          check: s => s.bestStreak >= 14 },
        { id: 'streak_30',       name: 'Legendary',        desc: '30-day streak',                  tier: 'platinum', category: 'dedication', icon: 'fa-dragon',          check: s => s.bestStreak >= 30 },
        { id: 'night_owl',       name: 'Night Owl',        desc: 'Use app after 10 PM',            tier: 'bronze',   category: 'dedication', icon: 'fa-moon',            check: s => s.nightOwl },
        { id: 'early_bird',      name: 'Early Bird',       desc: 'Use app before 7 AM',            tier: 'bronze',   category: 'dedication', icon: 'fa-sun',             check: s => s.earlyBird },

        // Mastery
        { id: 'polyglot',        name: 'Polyglot',         desc: 'Reach "Fluent" in Daily Feed',   tier: 'silver',   category: 'mastery',    icon: 'fa-language',        check: s => s.fluencyReached },
        { id: 'bookworm',        name: 'Bookworm',         desc: 'Mark 5 books as read',           tier: 'silver',   category: 'mastery',    icon: 'fa-book',            check: s => s.booksRead >= 5 },
        { id: 'prompt_eng',      name: 'Prompt Engineer',  desc: 'Generate 50 AI prompts',         tier: 'gold',     category: 'mastery',    icon: 'fa-robot',           check: s => s.promptsGenerated >= 50 },
        { id: 'calculator',      name: 'Calculator',       desc: 'Run 20 calculations',            tier: 'silver',   category: 'mastery',    icon: 'fa-calculator',      check: s => s.calculationsRun >= 20 },
        { id: 'team_player',     name: 'Team Player',      desc: 'Join a team',                    tier: 'bronze',   category: 'mastery',    icon: 'fa-people-group',    check: s => s.teamJoined },
        { id: 'centurion',       name: 'Centurion',        desc: 'Earn 10,000 total XP',           tier: 'gold',     category: 'mastery',    icon: 'fa-coins',           check: s => s.totalXpEarned >= 10000 },
        { id: 'mogul',           name: 'Mogul',            desc: 'Earn 50,000 total XP',           tier: 'platinum', category: 'mastery',    icon: 'fa-sack-dollar',     check: s => s.totalXpEarned >= 50000 },
        { id: 'explorer',        name: 'Explorer',         desc: 'Use 20 different tools',         tier: 'silver',   category: 'mastery',    icon: 'fa-compass',         check: s => s.uniqueToolsUsed >= 20 },
        { id: 'completionist',   name: 'Completionist',    desc: 'Use all 38 tools',               tier: 'platinum', category: 'mastery',    icon: 'fa-check-double',    check: s => s.uniqueToolsUsed >= 38 },
        { id: 'quiz_master',     name: 'Quiz Master',      desc: 'Complete 30 daily quizzes',      tier: 'gold',     category: 'mastery',    icon: 'fa-brain',           check: s => s.quizzesCompleted >= 30 },

        // Prestige
        { id: 'prestige_1',      name: 'Prestige I',       desc: 'Prestige for the first time',    tier: 'platinum', category: 'prestige',   icon: 'fa-star',            check: s => s.prestige >= 1 },
        { id: 'prestige_3',      name: 'Prestige III',     desc: 'Reach Prestige level 3',         tier: 'platinum', category: 'prestige',   icon: 'fa-ranking-star',    check: s => s.prestige >= 3 },
        { id: 'prestige_5',      name: 'Prestige V',       desc: 'Reach max Prestige',             tier: 'platinum', category: 'prestige',   icon: 'fa-sun',             check: s => s.prestige >= 5 },

        // Social / Engagement
        { id: 'daily_3',         name: 'Quest Seeker',     desc: 'Complete 3 daily quests',         tier: 'bronze',  category: 'dedication', icon: 'fa-scroll',          check: s => s.questsCompleted >= 3 },
        { id: 'daily_20',        name: 'Quest Champion',   desc: 'Complete 20 daily quests',        tier: 'silver',  category: 'dedication', icon: 'fa-scroll',          check: s => s.questsCompleted >= 20 },
        { id: 'weekly_4',        name: 'Weekly Warrior',   desc: 'Complete 4 weekly challenges',    tier: 'gold',    category: 'dedication', icon: 'fa-calendar-check',  check: s => s.weeklyCompleted >= 4 },
        { id: 'tool_chain_3',    name: 'Combo Starter',    desc: 'Trigger a 3-tool combo',          tier: 'bronze',  category: 'mastery',    icon: 'fa-link',            check: s => s.maxCombo >= 3 },
        { id: 'tool_chain_5',    name: 'Chain Master',     desc: 'Trigger a 5-tool combo',          tier: 'silver',  category: 'mastery',    icon: 'fa-link',            check: s => s.maxCombo >= 5 },
    ];

    // ── Quest Pool ────────────────────────────────────────────────────
    const QUEST_POOL = [
        { id: 'q_chapter',   text: 'Complete a chapter in Academy',            category: 'academy',  stat: 'chaptersCompletedToday', target: 1 },
        { id: 'q_radar2',    text: 'Use 2 different Radar tools',              category: 'radar',    stat: 'radarUsedToday',         target: 2 },
        { id: 'q_forge_ai',  text: 'Generate an AI prompt from any Forge tool',category: 'forge',    stat: 'forgePromptsToday',      target: 1 },
        { id: 'q_quiz80',    text: 'Score 80%+ on the Daily Quiz',             category: 'academy',  stat: 'quizHighScoreToday',     target: 80 },
        { id: 'q_calc',      text: 'Run a calculation in any tool',            category: 'forge',    stat: 'calcsToday',             target: 1 },
        { id: 'q_sim',       text: 'Complete a simulation game',               category: 'sims',     stat: 'simsCompletedToday',     target: 1 },
        { id: 'q_pdf',       text: 'View a PDF or infographic',                category: 'academy',  stat: 'pdfsViewedToday',        target: 1 },
        { id: 'q_new_tool',  text: 'Use a tool you haven\'t tried before',     category: 'any',      stat: 'newToolsToday',          target: 1 },
        { id: 'q_prompt3',   text: 'Generate 3 AI prompts',                    category: 'any',      stat: 'promptsToday',           target: 3 },
        { id: 'q_streak',    text: 'Maintain your streak today',               category: 'any',      stat: 'activeToday',            target: 1 },
        { id: 'q_flashcard', text: 'Complete 10 flashcards',                   category: 'academy',  stat: 'flashcardsToday',        target: 10 },
        { id: 'q_games2',    text: 'Play 2 different games',                   category: 'sims',     stat: 'gamesPlayedToday',       target: 2 },
    ];

    const WEEKLY_POOL = [
        { id: 'w_tools10',   text: 'Use 10 different tools this week',         stat: 'weeklyToolsUsed',    target: 10 },
        { id: 'w_streak7',   text: 'Maintain a 7-day streak',                  stat: 'streak',             target: 7 },
        { id: 'w_prompts10', text: 'Generate 10 AI prompts this week',         stat: 'weeklyPrompts',      target: 10 },
        { id: 'w_chapters3', text: 'Complete 3 chapters this week',            stat: 'weeklyChapters',     target: 3 },
        { id: 'w_games5',    text: 'Win 5 games this week',                    stat: 'weeklyGamesWon',     target: 5 },
    ];

    // ── Helper: seeded random for deterministic daily quests ──────────
    function seededRandom(seed) {
        let s = seed;
        return function() {
            s = (s * 16807 + 0) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function dateSeed(dateStr) {
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
            hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function todayStr() {
        return new Date().toISOString().split('T')[0];
    }

    function weekId() {
        const d = new Date();
        const start = new Date(d.getFullYear(), 0, 1);
        const diff = d - start;
        const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
        return `${d.getFullYear()}-W${week}`;
    }

    // ── Default State Factory ─────────────────────────────────────────
    function defaultState() {
        return {
            xp: 0,
            prestige: 0,
            streak: 0,
            bestStreak: 0,
            lastActiveDate: null,
            displayName: 'Executive',
            unlockedAchievements: [],
            toolsUsed: [],
            chaptersCompleted: [],
            radarToolsUsed: [],
            forgeToolsUsed: [],
            simsToolsUsed: [],

            promptsGenerated: 0,
            calculationsRun: 0,
            gamesCompleted: 0,
            gamesWon: 0,
            gamesLost: 0,
            pdfsViewed: 0,
            flashcardsCompleted: 0,
            culturalCheckins: 0,
            booksRead: 0,
            excelCalcs: 0,
            escapeHighScore: 0,
            quizzesCompleted: 0,
            questsCompleted: 0,
            weeklyCompleted: 0,
            maxCombo: 0,
            totalXpEarned: 0,
            nightOwl: false,
            earlyBird: false,
            fluencyReached: false,
            teamJoined: false,

            heatmap: {},
            dailyQuestDate: null,
            dailyQuests: [],
            weeklyQuestId: null,
            weeklyQuest: null,

            todayStats: {
                date: null,
                chaptersCompletedToday: 0,
                radarUsedToday: 0,
                forgePromptsToday: 0,
                quizHighScoreToday: 0,
                calcsToday: 0,
                simsCompletedToday: 0,
                pdfsViewedToday: 0,
                newToolsToday: 0,
                promptsToday: 0,
                activeToday: 0,
                flashcardsToday: 0,
                gamesPlayedToday: 0,
            },

            weeklyStats: {
                weekId: null,
                weeklyToolsUsed: 0,
                weeklyPrompts: 0,
                weeklyChapters: 0,
                weeklyGamesWon: 0,
            },

            comboHistory: [],
            supabaseId: null,
            dirty: false,
        };
    }

    // ── The Store ─────────────────────────────────────────────────────
    Alpine.store('gamification', {

        ...defaultState(),

        RANKS,
        ACHIEVEMENTS,
        showProfile: false,
        pendingToasts: [],
        leaderboard: [],
        leaderboardLoading: false,
        _initialized: false,

        init() {
            if (this._initialized) return;
            this._initialized = true;

            this._load();
            this._updateStreak();
            this._resetTodayIfNeeded();
            this._resetWeeklyIfNeeded();
            this._generateDailyQuests();
            this._generateWeeklyQuest();
            this._checkTimeAchievements();
            this._recordActivity();
            this._startSyncTimer();
        },

        // ── Rank Getters ──────────────────────────────────────────────
        get rank() {
            let r = RANKS[0];
            for (const rank of RANKS) {
                if (this.xp >= rank.xp) r = rank;
            }
            return r;
        },

        get nextRank() {
            const idx = RANKS.findIndex(r => r.level === this.rank.level);
            return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
        },

        get rankProgress() {
            if (!this.nextRank) return 100;
            const current = this.xp - this.rank.xp;
            const needed = this.nextRank.xp - this.rank.xp;
            return Math.min(100, Math.round((current / needed) * 100));
        },

        get xpToNext() {
            if (!this.nextRank) return 0;
            return this.nextRank.xp - this.xp;
        },

        // ── Skill Tree Scores ─────────────────────────────────────────
        get skillTree() {
            return {
                strategic: Math.round((this.radarToolsUsed.length / 11) * 100),
                technical: Math.round((this.forgeToolsUsed.length / 13) * 100),
                battle:    Math.round((this.simsToolsUsed.length / 9) * 100),
                knowledge: Math.round((this.chaptersCompleted.length / 10) * 100),
            };
        },

        get uniqueToolsUsed() {
            return this.toolsUsed.length;
        },

        // ── Multipliers ───────────────────────────────────────────────
        get streakMultiplier() {
            return 1 + Math.min(this.streak, 30) * 0.02;
        },

        get comboMultiplier() {
            const now = Date.now();
            const recent = this.comboHistory.filter(t => now - t < 600000);
            if (recent.length >= 5) return 2.0;
            if (recent.length >= 3) return 1.5;
            return 1.0;
        },

        get comboCount() {
            const now = Date.now();
            return this.comboHistory.filter(t => now - t < 600000).length;
        },

        get isPowerHour() {
            const h = new Date().getHours();
            return h >= 6 && h < 7;
        },

        get totalMultiplier() {
            let m = this.streakMultiplier * this.comboMultiplier;
            if (this.isPowerHour) m *= 2;
            return Math.round(m * 100) / 100;
        },

        // ── Core XP Award ─────────────────────────────────────────────
        awardXP(amount, source, category) {
            const oldRank = this.rank.level;
            const multiplied = Math.round(amount * this.totalMultiplier);

            this.xp += multiplied;
            this.totalXpEarned += multiplied;

            this._recordActivity();
            this.comboHistory.push(Date.now());
            // Prune combo history beyond 10 min
            const now = Date.now();
            this.comboHistory = this.comboHistory.filter(t => now - t < 600000);

            if (this.comboHistory.length > this.maxCombo) {
                this.maxCombo = this.comboHistory.length;
            }

            this._queueToast({
                type: 'xp',
                amount: multiplied,
                source,
                multiplier: this.totalMultiplier > 1 ? this.totalMultiplier : null,
            });

            const newRank = this.rank.level;
            if (newRank > oldRank) {
                this._queueToast({ type: 'rankup', rank: this.rank });
                Alpine.store('presence')?.trackRankUp(this.rank);
            }

            this._checkAllAchievements();
            this._checkDailyQuests();
            this._checkWeeklyQuest();
            this.dirty = true;
            this._save();
        },

        // ── Stat Tracking Methods (called by components) ─────────────
        trackToolUse(toolId, group) {
            if (!this.toolsUsed.includes(toolId)) {
                this.toolsUsed.push(toolId);
                this.todayStats.newToolsToday++;
                this.weeklyStats.weeklyToolsUsed++;
                this.awardXP(50, `First: ${toolId}`, group);
            } else {
                this.awardXP(15, toolId, group);
            }

            if (group === 'radar' && !this.radarToolsUsed.includes(toolId)) {
                this.radarToolsUsed.push(toolId);
                this.todayStats.radarUsedToday++;
            }
            if (group === 'forge' && !this.forgeToolsUsed.includes(toolId)) {
                this.forgeToolsUsed.push(toolId);
            }
            if (group === 'sims' && !this.simsToolsUsed.includes(toolId)) {
                this.simsToolsUsed.push(toolId);
            }
        },

        trackChapterComplete(chapterId) {
            if (!this.chaptersCompleted.includes(chapterId)) {
                this.chaptersCompleted.push(chapterId);
                this.todayStats.chaptersCompletedToday++;
                this.weeklyStats.weeklyChapters++;
                this.awardXP(100, `Chapter ${chapterId}`, 'academy');
            }
        },

        trackPromptGenerated(source) {
            this.promptsGenerated++;
            this.todayStats.promptsToday++;
            this.weeklyStats.weeklyPrompts++;
            if (source && source.startsWith('forge')) this.todayStats.forgePromptsToday++;
            this.awardXP(20, 'AI Prompt', 'prompt');
        },

        trackCalculation(source) {
            this.calculationsRun++;
            this.todayStats.calcsToday++;
            this.awardXP(15, source || 'Calculation', 'calc');
        },

        trackGameComplete(won) {
            this.gamesCompleted++;
            this.todayStats.simsCompletedToday++;
            this.todayStats.gamesPlayedToday++;
            if (won) {
                this.gamesWon++;
                this.weeklyStats.weeklyGamesWon++;
                this.awardXP(125, 'Game Won', 'sims');
            } else {
                this.gamesLost++;
                this.awardXP(75, 'Game Completed', 'sims');
            }
        },

        trackAssessment() {
            this.awardXP(40, 'Assessment', 'radar');
        },

        trackTeamJoin() {
            this.teamJoined = true;
            this.awardXP(30, 'Team Joined', 'social');
        },

        trackBookRead() {
            this.booksRead++;
            this.awardXP(20, 'Book Read', 'academy');
        },

        trackPdfView() {
            this.pdfsViewed++;
            this.todayStats.pdfsViewedToday++;
            this.awardXP(10, 'PDF Viewed', 'academy');
        },

        trackFlashcard() {
            this.flashcardsCompleted++;
            this.todayStats.flashcardsToday++;
            if (this.flashcardsCompleted % 10 === 0) {
                this.awardXP(15, 'Flashcards x10', 'academy');
            }
        },

        trackQuizComplete(score) {
            this.quizzesCompleted++;
            if (score > this.todayStats.quizHighScoreToday) {
                this.todayStats.quizHighScoreToday = score;
            }
            this.awardXP(25, 'Daily Quiz', 'academy');
        },

        trackCulturalCheckin() {
            this.culturalCheckins++;
            this.awardXP(15, 'Culture Check', 'radar');
        },

        trackExcelCalc() {
            this.excelCalcs++;
            this.trackCalculation('Excel Audit');
        },

        trackEscapeScore(score) {
            if (score > this.escapeHighScore) this.escapeHighScore = score;
        },

        trackFluencyReached() {
            this.fluencyReached = true;
            this._save();
        },

        // ── Prestige ──────────────────────────────────────────────────
        canPrestige() {
            return this.rank.level === 12 && this.prestige < 5;
        },

        doPrestige() {
            if (!this.canPrestige()) return;
            this.prestige++;
            this.xp = 0;
            this._queueToast({ type: 'prestige', level: this.prestige });
            Alpine.store('presence')?.trackPrestige(this.prestige);
            this._checkAllAchievements();
            this.dirty = true;
            this._save();
        },

        // ── Daily Quests ──────────────────────────────────────────────
        _generateDailyQuests() {
            const today = todayStr();
            if (this.dailyQuestDate === today && this.dailyQuests.length > 0) return;

            const rng = seededRandom(dateSeed(today));
            const shuffled = [...QUEST_POOL].sort(() => rng() - 0.5);
            this.dailyQuests = shuffled.slice(0, 3).map(q => ({
                ...q,
                completed: false,
            }));
            this.dailyQuestDate = today;
            this._save();
        },

        _checkDailyQuests() {
            let changed = false;
            for (const quest of this.dailyQuests) {
                if (quest.completed) continue;
                const val = this.todayStats[quest.stat] || 0;
                if (val >= quest.target) {
                    quest.completed = true;
                    this.questsCompleted++;
                    changed = true;
                    this._queueToast({ type: 'quest', quest });
                    this.awardXP(35, 'Daily Quest', 'quest');
                }
            }
            if (changed) this._save();
        },

        // ── Weekly Quest ──────────────────────────────────────────────
        _generateWeeklyQuest() {
            const wk = weekId();
            if (this.weeklyQuestId === wk && this.weeklyQuest) return;

            const rng = seededRandom(dateSeed(wk));
            const idx = Math.floor(rng() * WEEKLY_POOL.length);
            this.weeklyQuest = { ...WEEKLY_POOL[idx], completed: false };
            this.weeklyQuestId = wk;
            this._save();
        },

        _checkWeeklyQuest() {
            if (!this.weeklyQuest || this.weeklyQuest.completed) return;
            const val = this.weeklyStats[this.weeklyQuest.stat] ?? this[this.weeklyQuest.stat] ?? 0;
            if (val >= this.weeklyQuest.target) {
                this.weeklyQuest.completed = true;
                this.weeklyCompleted++;
                this._queueToast({ type: 'weekly', quest: this.weeklyQuest });
                this.awardXP(150, 'Weekly Challenge', 'quest');
                this._save();
            }
        },

        get dailyQuestsProgress() {
            if (!this.dailyQuests.length) return [];
            return this.dailyQuests.map(q => ({
                ...q,
                current: Math.min(this.todayStats[q.stat] || 0, q.target),
                progress: Math.min(100, Math.round(((this.todayStats[q.stat] || 0) / q.target) * 100)),
            }));
        },

        get weeklyQuestProgress() {
            if (!this.weeklyQuest) return null;
            const val = this.weeklyStats[this.weeklyQuest.stat] ?? this[this.weeklyQuest.stat] ?? 0;
            return {
                ...this.weeklyQuest,
                current: Math.min(val, this.weeklyQuest.target),
                progress: Math.min(100, Math.round((val / this.weeklyQuest.target) * 100)),
            };
        },

        // ── Achievement Checking ──────────────────────────────────────
        _checkAllAchievements() {
            const stats = this._buildAchievementStats();
            for (const a of ACHIEVEMENTS) {
                if (this.unlockedAchievements.includes(a.id)) continue;
                try {
                    if (a.check(stats)) {
                        this.unlockedAchievements.push(a.id);
                        this._queueToast({ type: 'achievement', achievement: a });
                        Alpine.store('presence')?.trackAchievement(a);
                        this.xp += TIER_XP[a.tier];
                        this.totalXpEarned += TIER_XP[a.tier];
                    }
                } catch (_) { /* stat not yet tracked */ }
            }
        },

        _buildAchievementStats() {
            return {
                chaptersCompleted: this.chaptersCompleted,
                pdfsViewed: this.pdfsViewed,
                flashcardsCompleted: this.flashcardsCompleted,
                radarToolsUsed: this.radarToolsUsed,
                forgeToolsUsed: this.forgeToolsUsed,
                simsToolsUsed: this.simsToolsUsed,
                culturalCheckins: this.culturalCheckins,
                excelCalcs: this.excelCalcs,
                gamesCompleted: this.gamesCompleted,
                gamesWon: this.gamesWon,
                gamesLost: this.gamesLost,
                escapeHighScore: this.escapeHighScore,
                bestStreak: this.bestStreak,
                nightOwl: this.nightOwl,
                earlyBird: this.earlyBird,
                fluencyReached: this.fluencyReached,
                booksRead: this.booksRead,
                promptsGenerated: this.promptsGenerated,
                calculationsRun: this.calculationsRun,
                teamJoined: this.teamJoined,
                totalXpEarned: this.totalXpEarned,
                uniqueToolsUsed: this.toolsUsed.length,
                quizzesCompleted: this.quizzesCompleted,
                prestige: this.prestige,
                questsCompleted: this.questsCompleted,
                weeklyCompleted: this.weeklyCompleted,
                maxCombo: this.maxCombo,
                streak: this.streak,
            };
        },

        getAchievementStatus(id) {
            return this.unlockedAchievements.includes(id);
        },

        get achievementsByCategory() {
            const cats = {};
            for (const a of ACHIEVEMENTS) {
                if (!cats[a.category]) cats[a.category] = [];
                cats[a.category].push({
                    ...a,
                    unlocked: this.unlockedAchievements.includes(a.id),
                });
            }
            return cats;
        },

        get achievementCount() {
            return this.unlockedAchievements.length;
        },

        // ── Streak Management ─────────────────────────────────────────
        _updateStreak() {
            const today = todayStr();
            if (this.lastActiveDate === today) return;

            if (this.lastActiveDate) {
                const last = new Date(this.lastActiveDate);
                const now = new Date(today);
                const diffDays = Math.floor((now - last) / 86400000);

                if (diffDays === 1) {
                    this.streak++;
                    Alpine.store('presence')?.trackStreak(this.streak);
                    if (this.streak > 1) Alpine.store('haptics')?.fire('streak');
                    const bonus = Math.min(this.streak, 30) * 2;
                    this.xp += bonus;
                    this.totalXpEarned += bonus;
                } else if (diffDays > 1) {
                    this.streak = 1;
                }
            } else {
                this.streak = 1;
            }

            if (this.streak > this.bestStreak) this.bestStreak = this.streak;
            this.lastActiveDate = today;
            this.todayStats.activeToday = 1;
            this._save();
        },

        // ── Time-based Achievements ───────────────────────────────────
        _checkTimeAchievements() {
            const h = new Date().getHours();
            if (h >= 22 || h < 4) this.nightOwl = true;
            if (h >= 4 && h < 7) this.earlyBird = true;
        },

        // ── Activity Heatmap ──────────────────────────────────────────
        _recordActivity() {
            const today = todayStr();
            this.heatmap[today] = (this.heatmap[today] || 0) + 1;

            // Prune to last 90 days
            const keys = Object.keys(this.heatmap).sort();
            if (keys.length > 90) {
                for (const k of keys.slice(0, keys.length - 90)) {
                    delete this.heatmap[k];
                }
            }
        },

        get heatmapData() {
            const days = [];
            const now = new Date();
            for (let i = 89; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                days.push({
                    date: key,
                    count: this.heatmap[key] || 0,
                    day: d.getDay(),
                    label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                });
            }
            return days;
        },

        heatmapColor(count) {
            if (count === 0) return 'bg-white/5';
            if (count <= 3) return 'bg-green-900/50';
            if (count <= 7) return 'bg-green-600/60';
            return 'bg-green-400/80';
        },

        // ── Today Stats Reset ─────────────────────────────────────────
        _resetTodayIfNeeded() {
            const today = todayStr();
            if (this.todayStats.date !== today) {
                this.todayStats = {
                    date: today,
                    chaptersCompletedToday: 0,
                    radarUsedToday: 0,
                    forgePromptsToday: 0,
                    quizHighScoreToday: 0,
                    calcsToday: 0,
                    simsCompletedToday: 0,
                    pdfsViewedToday: 0,
                    newToolsToday: 0,
                    promptsToday: 0,
                    activeToday: 0,
                    flashcardsToday: 0,
                    gamesPlayedToday: 0,
                };
                this._save();
            }
        },

        _resetWeeklyIfNeeded() {
            const wk = weekId();
            if (this.weeklyStats.weekId !== wk) {
                this.weeklyStats = {
                    weekId: wk,
                    weeklyToolsUsed: 0,
                    weeklyPrompts: 0,
                    weeklyChapters: 0,
                    weeklyGamesWon: 0,
                };
                this._save();
            }
        },

        // ── Toast Queue ───────────────────────────────────────────────
        _queueToast(toast) {
            this.pendingToasts.push({ ...toast, id: Date.now() + Math.random(), shown: false });
            const hapticMap = { xp: 'xp', rankup: 'rankUp', achievement: 'achievement',
                                quest: 'success', weekly: 'success', prestige: 'prestige' };
            Alpine.store('haptics')?.fire(hapticMap[toast.type] || 'tap');
        },

        popToast() {
            const t = this.pendingToasts.shift();
            return t || null;
        },

        // ── Persistence ───────────────────────────────────────────────
        _save() {
            const data = {};
            for (const key of Object.keys(defaultState())) {
                data[key] = this[key];
            }
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (_) { /* quota exceeded fallback */ }
        },

        _load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const data = JSON.parse(raw);
                const defaults = defaultState();
                for (const key of Object.keys(defaults)) {
                    if (data[key] !== undefined) {
                        this[key] = data[key];
                    }
                }
            } catch (_) { /* corrupted data */ }
        },

        // ── Supabase Sync ─────────────────────────────────────────────
        _syncTimerId: null,
        _startSyncTimer() {
            if (this._syncTimerId) clearInterval(this._syncTimerId);
            this._syncTimerId = setInterval(() => {
                if (this.dirty) this.pushToSupabase();
            }, SYNC_INTERVAL);
        },

        async pushToSupabase() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            try {
                const payload = {
                    user_id: this.supabaseId || this._getDeviceId(),
                    display_name: this.displayName,
                    xp: this.xp,
                    rank: this.rank.level,
                    prestige: this.prestige,
                    streak: this.streak,
                    achievements: this.unlockedAchievements,
                    stats: {
                        tools_used: this.toolsUsed,
                        chapters_completed: this.chaptersCompleted,
                        prompts_generated: this.promptsGenerated,
                        games_won: this.gamesWon,
                        total_xp_earned: this.totalXpEarned,
                    },
                    activity_heatmap: this.heatmap,
                    updated_at: new Date().toISOString(),
                };

                const { data, error } = await sb
                    .from('gamification_profiles')
                    .upsert(payload, { onConflict: 'user_id' })
                    .select()
                    .single();

                if (!error && data) {
                    this.supabaseId = data.user_id;
                    this.dirty = false;
                }
            } catch (_) { /* network error, will retry */ }
        },

        async pullFromSupabase() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            try {
                const deviceId = this._getDeviceId();
                const { data, error } = await sb
                    .from('gamification_profiles')
                    .select('*')
                    .eq('user_id', deviceId)
                    .single();

                if (!error && data && data.xp > this.xp) {
                    this.xp = data.xp;
                    this.prestige = data.prestige;
                    this.streak = data.streak;
                    this.unlockedAchievements = data.achievements || [];
                    if (data.stats) {
                        this.toolsUsed = data.stats.tools_used || [];
                        this.chaptersCompleted = data.stats.chapters_completed || [];
                        this.promptsGenerated = data.stats.prompts_generated || 0;
                        this.gamesWon = data.stats.games_won || 0;
                        this.totalXpEarned = data.stats.total_xp_earned || 0;
                    }
                    this._save();
                }
            } catch (_) { /* offline */ }
        },

        async fetchLeaderboard() {
            const sb = Alpine.store('app')?.supabase;
            if (!sb) return;

            this.leaderboardLoading = true;
            try {
                const { data, error } = await sb
                    .from('gamification_profiles')
                    .select('display_name, xp, rank, prestige')
                    .order('xp', { ascending: false })
                    .limit(20);

                if (!error && data) {
                    this.leaderboard = data;
                }
            } catch (_) { /* offline */ }
            this.leaderboardLoading = false;
        },

        _getDeviceId() {
            let id = localStorage.getItem('bilingual_device_id');
            if (!id) {
                id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('bilingual_device_id', id);
            }
            return id;
        },

        // ── Display Name ──────────────────────────────────────────────
        setDisplayName(name) {
            this.displayName = (name || 'Executive').slice(0, 20);
            this.dirty = true;
            this._save();
        },

        // ── Reset (dev/debug) ─────────────────────────────────────────
        resetAll() {
            const defaults = defaultState();
            for (const key of Object.keys(defaults)) {
                this[key] = defaults[key];
            }
            localStorage.removeItem(STORAGE_KEY);
        },
    });

    // ── Profile Page Component ────────────────────────────────────────
    Alpine.data('gamificationProfile', () => ({
        activeTab: 'overview',
        chartInstance: null,
        _themeHandler: null,

        init() {
            this._themeHandler = () => {
                if (this.chartInstance) this.renderSkillChart();
            };
            window.addEventListener('theme-changed', this._themeHandler);
        },

        destroy() {
            if (this._themeHandler) window.removeEventListener('theme-changed', this._themeHandler);
            if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }
        },

        get g() { return Alpine.store('gamification'); },

        renderSkillChart() {
            this.$nextTick(() => {
                const canvas = document.getElementById('skillRadarChart');
                if (!canvas) return;

                if (this.chartInstance) this.chartInstance.destroy();

                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
                const labelColor = isLight ? '#334155' : 'rgba(255,255,255,0.7)';
                const accentColor = isLight ? '#15803d' : '#4ade80';
                const accentBg = isLight ? 'rgba(21,128,61,0.15)' : 'rgba(74,222,128,0.15)';
                const pointBorder = isLight ? '#fff' : '#fff';

                const skills = this.g.skillTree;
                this.chartInstance = new Chart(canvas, {
                    type: 'radar',
                    data: {
                        labels: ['Strategic Vision', 'Technical Mastery', 'Battle Readiness', 'Knowledge Capital'],
                        datasets: [{
                            label: 'Competency',
                            data: [skills.strategic, skills.technical, skills.battle, skills.knowledge],
                            backgroundColor: accentBg,
                            borderColor: accentColor,
                            borderWidth: 2,
                            pointBackgroundColor: accentColor,
                            pointBorderColor: pointBorder,
                            pointRadius: 4,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { display: false },
                                grid: { color: gridColor },
                                angleLines: { color: gridColor },
                                pointLabels: {
                                    color: labelColor,
                                    font: { size: 11, family: 'Inter', weight: isLight ? '600' : '400' },
                                },
                            },
                        },
                        plugins: {
                            legend: { display: false },
                        },
                    },
                });
            });
        },
    }));
});
