document.addEventListener('alpine:init', () => {

    const STORAGE_KEYS = {
        SPACED_REP: 'bilingual_spaced_rep',
        NOTES: 'bilingual_chapter_notes',
        BOOKMARKS: 'bilingual_bookmarks',
        ACTIVITY: 'bilingual_activity_log',
        QUIZ_SCORES: 'bilingual_quiz_scores',
        ANALYTICS: 'bilingual_analytics',
    };

    function loadJSON(key, fallback = {}) {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch { return fallback; }
    }

    function saveJSON(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }

    function localDateKey(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function todayKey() { return localDateKey(new Date()); }

    // ──────────────────────────────────────────────────────
    //  ALPINE STORE: academy
    // ──────────────────────────────────────────────────────
    Alpine.store('academy', {

        // ── Panel toggle (only one open at a time) ─────────
        togglePanel(name) {
            if (name === 'search') { this.toggleSearch(); return; }
            const panels = ['analyticsOpen', 'knowledgeGraphOpen', 'heatmapOpen'];
            const isOpening = !this[name];
            panels.forEach(p => { if (p !== name) this[p] = false; });
            this.search.active = false;
            this[name] = isOpening;
            if (name === 'analyticsOpen' && isOpening) {
                setTimeout(() => { if (this.analyticsOpen) this.renderAnalyticsCharts(); }, 200);
            }
        },

        toggleSearch() {
            const opening = !this.search.active;
            if (opening) {
                this.analyticsOpen = false;
                this.knowledgeGraphOpen = false;
                this.heatmapOpen = false;
            }
            this.search.active = opening;
        },

        get anyPanelOpen() {
            return this.analyticsOpen || this.knowledgeGraphOpen || this.heatmapOpen || this.search.active;
        },

        // ── Feature 1: Analytics Dashboard ──────────────────
        analyticsOpen: false,
        analyticsCharts: {},

        get completionRate() {
            const all = this._allChapters();
            if (!all.length) return 0;
            return Math.round(all.filter(c => c.status === 'completed').length / all.length * 100);
        },
        get completedCount() { return this._allChapters().filter(c => c.status === 'completed').length; },
        get totalChapters() { return this._allChapters().length; },

        getTimeSpent() { return loadJSON(STORAGE_KEYS.ANALYTICS, { timePerChapter: {} }).timePerChapter; },
        getQuizScores() { return loadJSON(STORAGE_KEYS.QUIZ_SCORES, {}); },

        trackTimeSpent(chapterId, seconds) {
            const data = loadJSON(STORAGE_KEYS.ANALYTICS, { timePerChapter: {} });
            data.timePerChapter[chapterId] = (data.timePerChapter[chapterId] || 0) + seconds;
            saveJSON(STORAGE_KEYS.ANALYTICS, data);
        },

        renderAnalyticsCharts() {
            if (typeof Chart === 'undefined') return;
            setTimeout(() => {
                // Completion Donut
                const donutEl = document.getElementById('analyticsDonut');
                if (donutEl) {
                    if (this.analyticsCharts.donut) this.analyticsCharts.donut.destroy();
                    const completed = this.completedCount;
                    const remaining = this.totalChapters - completed;
                    this.analyticsCharts.donut = new Chart(donutEl, {
                        type: 'doughnut',
                        data: {
                            labels: ['Completed', 'Remaining'],
                            datasets: [{ data: [completed, remaining], backgroundColor: ['#4ade80', '#334155'], borderWidth: 0 }]
                        },
                        options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } }, cutout: '70%' }
                    });
                }

                // Time Bar Chart
                const barEl = document.getElementById('analyticsTimeBar');
                if (barEl) {
                    if (this.analyticsCharts.bar) this.analyticsCharts.bar.destroy();
                    const time = this.getTimeSpent();
                    const labels = Array.from({ length: 10 }, (_, i) => `Ch ${i + 1}`);
                    const values = labels.map((_, i) => Math.round((time[i + 1] || 0) / 60));
                    this.analyticsCharts.bar = new Chart(barEl, {
                        type: 'bar',
                        data: { labels, datasets: [{ label: 'Minutes', data: values, backgroundColor: '#4ade80', borderRadius: 4 }] },
                        options: { responsive: true, scales: { y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } } }, plugins: { legend: { display: false } } }
                    });
                }

                // Quiz Score Radar
                const radarEl = document.getElementById('analyticsQuizRadar');
                if (radarEl) {
                    if (this.analyticsCharts.radar) this.analyticsCharts.radar.destroy();
                    const scores = this.getQuizScores();
                    const labels = Array.from({ length: 10 }, (_, i) => `Ch ${i + 1}`);
                    const values = labels.map((_, i) => scores[i + 1]?.best || 0);
                    this.analyticsCharts.radar = new Chart(radarEl, {
                        type: 'radar',
                        data: { labels, datasets: [{ label: 'Best Score %', data: values, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.15)', pointBackgroundColor: '#f472b6' }] },
                        options: { responsive: true, scales: { r: { min: 0, max: 100, grid: { color: '#1e293b' }, angleLines: { color: '#1e293b' }, pointLabels: { color: '#94a3b8', font: { size: 9 } }, ticks: { display: false } } }, plugins: { legend: { display: false } } }
                    });
                }
            }, 100);
        },

        // ── Feature 2: Spaced Repetition (SM-2) ────────────
        spacedRep: { cards: {} },

        getCardState(chapterId, cardIdx) {
            const cards = loadJSON(STORAGE_KEYS.SPACED_REP, {});
            const key = `${chapterId}_${cardIdx}`;
            return cards[key] || { ease: 2.5, interval: 1, repetitions: 0, nextReview: todayKey(), status: 'new' };
        },

        gradeFlashcard(chapterId, cardIdx, grade) {
            const cards = loadJSON(STORAGE_KEYS.SPACED_REP, {});
            const key = `${chapterId}_${cardIdx}`;
            const card = cards[key] || { ease: 2.5, interval: 1, repetitions: 0, nextReview: todayKey(), status: 'new' };

            if (grade >= 3) {
                if (card.repetitions === 0) card.interval = 1;
                else if (card.repetitions === 1) card.interval = 6;
                else card.interval = Math.round(card.interval * card.ease);
                card.repetitions++;
                card.status = card.repetitions >= 5 ? 'mastered' : 'review';
            } else {
                card.repetitions = 0;
                card.interval = 1;
                card.status = 'learning';
            }

            card.ease = Math.max(1.3, card.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
            const next = new Date();
            next.setDate(next.getDate() + card.interval);
            card.nextReview = localDateKey(next);
            card.lastGrade = grade;

            cards[key] = card;
            saveJSON(STORAGE_KEYS.SPACED_REP, cards);
            this.logActivity('flashcard_review');
        },

        getDueCount(chapterId, deckLength) {
            const cards = loadJSON(STORAGE_KEYS.SPACED_REP, {});
            const today = todayKey();
            let due = 0;
            for (let i = 0; i < deckLength; i++) {
                const key = `${chapterId}_${i}`;
                const c = cards[key];
                if (!c || c.nextReview <= today) due++;
            }
            return due;
        },

        getRetentionStats(chapterId, deckLength) {
            const cards = loadJSON(STORAGE_KEYS.SPACED_REP, {});
            let mastered = 0, learning = 0, newCount = 0;
            for (let i = 0; i < deckLength; i++) {
                const c = cards[`${chapterId}_${i}`];
                if (!c || c.status === 'new') newCount++;
                else if (c.status === 'mastered') mastered++;
                else learning++;
            }
            return { mastered, learning, new: newCount, total: deckLength };
        },

        // ── Feature 3: Chapter Quizzes ──────────────────────
        quiz: { active: false, chapterId: null, currentQ: 0, answers: [], score: null, passed: null, answered: false, selectedIdx: null },

        quizData: {
            1: [
                { q: "What is the 'Fintech Tsunami'?", opts: ["A new banking regulation", "The unbundling of banking by agile competitors", "A type of cryptocurrency", "A merger strategy"], correct: 1, explain: "Fintech companies are dismantling the universal bank model by offering specialized, superior services." },
                { q: "What does 'Interchange Zero' refer to?", opts: ["Free ATM withdrawals", "Neobanks subsidizing payments to acquire users cheaply", "Zero-fee wire transfers", "Blockchain settlement"], correct: 1, explain: "Neobanks use interchange-zero strategies to acquire customers at near-zero cost." },
                { q: "What is 'lazy loyalty' in banking?", opts: ["Customer retention through rewards", "Customers staying due to switching friction, not satisfaction", "Brand loyalty programs", "Employee retention strategy"], correct: 1, explain: "Traditional banks rely on switching costs rather than genuine customer satisfaction." },
                { q: "Which model is described as 'dead'?", opts: ["Digital-only banking", "The Universal Bank model", "Open banking", "Investment banking"], correct: 1, explain: "The book argues the one-size-fits-all universal bank is being dismantled." },
                { q: "What is the 'Dumb Pipe' risk?", opts: ["Network infrastructure failure", "Banks becoming invisible commodity utilities", "Data pipeline errors", "API rate limiting"], correct: 1, explain: "Banks risk becoming invisible infrastructure while fintechs own the customer relationship." }
            ],
            2: [
                { q: "How should banks treat data according to the book?", opts: ["Like oil (hoard it)", "Like water (it must flow)", "Like gold (lock it away)", "Like sand (it's everywhere)"], correct: 1, explain: "Data must flow through the organization to create value, not be hoarded." },
                { q: "What is a 'Data Swamp'?", opts: ["A data lake with poor governance", "A type of database", "An analytics tool", "A backup strategy"], correct: 0, explain: "A Data Swamp is what happens when a Data Lake lacks proper governance and quality controls." },
                { q: "What architecture is recommended for data?", opts: ["Monolithic warehouse", "Data Mesh with domain ownership", "Single centralized lake", "Flat file system"], correct: 1, explain: "Data Mesh assigns ownership to domain teams rather than centralizing everything." },
                { q: "Why do monolithic data warehouses fail?", opts: ["Too expensive", "They create bottlenecks and single points of failure", "Not enough storage", "Too fast"], correct: 1, explain: "Centralized ownership creates bottlenecks as every team depends on one data team." },
                { q: "What is domain-oriented data ownership?", opts: ["IT owns all data", "Each business domain owns and serves its data", "External vendors manage data", "Data is unowned"], correct: 1, explain: "Domain teams own, produce, and serve their data as a product." }
            ],
            3: [
                { q: "What is 'Cultural Debt'?", opts: ["Financial obligations", "Accumulated organizational dysfunction that slows change", "Technical debt in culture apps", "HR budget deficit"], correct: 1, explain: "Cultural debt is the hidden cost of dysfunctional behaviors and processes." },
                { q: "What does a 'Watermelon Report' look like?", opts: ["Green outside, red inside", "All red", "All green", "Yellow throughout"], correct: 0, explain: "Green on the outside (looks fine) but red on the inside (hiding real problems)." },
                { q: "What kills psychological safety?", opts: ["Too much autonomy", "Punishing failure", "Remote work", "Flat hierarchies"], correct: 1, explain: "When failure is punished, people hide problems instead of surfacing them early." },
                { q: "What is the HiPPO effect?", opts: ["A data analysis method", "Highest Paid Person's Opinion dominates decisions", "A hiring framework", "A testing protocol"], correct: 1, explain: "HiPPO: decisions driven by the highest-paid person rather than data." },
                { q: "How does the book recommend making decisions?", opts: ["By committee vote", "By data, not by hierarchy", "By external consultants", "By senior leadership only"], correct: 1, explain: "Data-driven decision making removes bias and hierarchy from the process." }
            ],
            4: [
                { q: "What's the difference between Project and Product?", opts: ["Budget vs revenue", "Temporary vs long-lived teams that iterate", "Waterfall vs scrum", "Internal vs external"], correct: 1, explain: "Projects disband after delivery; Products have long-lived teams that continuously improve." },
                { q: "What does 'Fund teams, not projects' mean?", opts: ["Pay people more", "Invest in persistent teams rather than temporary initiatives", "Outsource projects", "Reduce headcount"], correct: 1, explain: "Persistent teams accumulate knowledge; project teams lose it when they disband." },
                { q: "What is the 'Metro Map' strategy?", opts: ["A subway navigation tool", "Gradual modernization through parallel tracks", "A project management tool", "A testing framework"], correct: 1, explain: "Modernize gradually through parallel tracks rather than risky big-bang rewrites." },
                { q: "Why do big-bang transformations fail?", opts: ["Too cheap", "Too much risk concentrated in one massive change", "Not enough people", "Too fast"], correct: 1, explain: "Concentrating all risk in one large change creates catastrophic failure potential." },
                { q: "What is a 'Value Stream'?", opts: ["Revenue forecast", "End-to-end flow of delivering value to customers", "A type of meeting", "Financial reporting"], correct: 1, explain: "A value stream maps the complete flow from concept to customer value delivery." }
            ],
            5: [
                { q: "What is 'Governance as Code'?", opts: ["Writing legal documents", "Automating compliance checks in CI/CD pipelines", "A programming language", "Manual audit processes"], correct: 1, explain: "Embed governance rules as automated checks rather than manual review boards." },
                { q: "What are 'Gatekeepers' in the context of governance?", opts: ["Security guards", "Manual review boards that create bottlenecks", "API gateways", "Access controls"], correct: 1, explain: "Manual review boards slow everything down and become organizational bottlenecks." },
                { q: "What should replace Gatekeepers?", opts: ["More managers", "Guardrails — automated policy checks", "External auditors", "No governance"], correct: 1, explain: "Automated guardrails enforce rules without creating human bottlenecks." },
                { q: "Complete the quote: 'If it's not automated...'", opts: ["...it's artisan", "...it's not governed", "...it's manual", "...it's agile"], correct: 1, explain: "Manual governance is unreliable; true governance must be automated and consistent." },
                { q: "Where should compliance checks run?", opts: ["In board meetings", "In the CI/CD pipeline", "Annually", "On paper"], correct: 1, explain: "Embedding checks in the pipeline ensures every change is validated automatically." }
            ],
            6: [
                { q: "What is a 'Bilingual Executive'?", opts: ["Someone who speaks two languages", "A leader fluent in both business and technology", "A translator", "A consultant"], correct: 1, explain: "A leader who can bridge the gap between business strategy and technical execution." },
                { q: "What is the 'Translation Gap'?", opts: ["Language barrier", "The disconnect between business and technology leaders", "A software bug", "A skills gap"], correct: 1, explain: "Business and tech speak different languages, causing billions in failed transformations." },
                { q: "What do Bankers optimize for?", opts: ["Speed and agility", "Stability, compliance, and predictable returns", "Innovation", "Market share"], correct: 1, explain: "Bankers prioritize stability and regulatory compliance above all else." },
                { q: "What do Technologists optimize for?", opts: ["Regulatory compliance", "Speed, cloud-native architecture, and agility", "Cost reduction", "Headcount"], correct: 1, explain: "Tech leaders push for velocity, modern architecture, and iterative delivery." },
                { q: "How does a Bilingual Executive 'link Code to Cash'?", opts: ["By coding financial software", "By translating technical decisions into business impact metrics", "By reducing IT costs", "By hiring developers"], correct: 1, explain: "They express technical investments in terms of revenue, risk reduction, and ROI." }
            ],
            7: [
                { q: "What is a 'Lighthouse Pilot'?", opts: ["A navigation system", "A small, visible project that proves transformation value", "A testing tool", "A hiring program"], correct: 1, explain: "A lighthouse pilot demonstrates value at small scale before organization-wide rollout." },
                { q: "Why must a pilot be visible?", opts: ["For marketing", "To build political capital and inspire wider adoption", "For compliance", "For documentation"], correct: 1, explain: "Visibility creates momentum and proves the new way of working actually works." },
                { q: "What is the biggest risk of a pilot?", opts: ["Success", "It stays a pilot and never scales", "Cost", "Timeline"], correct: 1, explain: "Many pilots succeed but never scale because there's no plan for broader adoption." },
                { q: "How should pilot success be measured?", opts: ["By committee opinion", "By predefined business KPIs", "By team satisfaction", "By lines of code"], correct: 1, explain: "Define measurable business outcomes before starting so success is objective." },
                { q: "What makes a good pilot candidate?", opts: ["The biggest project", "A bounded problem with measurable outcomes and visible impact", "The cheapest option", "A legacy system"], correct: 1, explain: "Choose problems that are bounded, measurable, and visible to leadership." }
            ],
            8: [
                { q: "What is a 'Zombie Project'?", opts: ["A horror game", "A project that is dead but no one will kill it", "An archived repo", "A backup system"], correct: 1, explain: "Zombie projects consume resources but will never deliver value." },
                { q: "Why do zombie projects survive?", opts: ["They're valuable", "Sunk cost fallacy and political protection", "They're almost done", "Legal requirements"], correct: 1, explain: "People protect their investments even when the project is clearly failing." },
                { q: "How should you kill a zombie project?", opts: ["Slowly", "Make killing fast, clean, and celebrated", "Secretly", "By committee"], correct: 1, explain: "Celebrate the decision to stop wasting resources — it frees capacity for real value." },
                { q: "What is the 'Sunk Cost Fallacy'?", opts: ["A financial strategy", "Continuing investment because of past spending, not future value", "A budgeting method", "A cost reduction technique"], correct: 1, explain: "Past investment is irrelevant — only future value matters for continuation decisions." },
                { q: "What question kills zombie projects?", opts: ["How much did we spend?", "Would we start this project today knowing what we know now?", "Who approved this?", "When will it be done?"], correct: 1, explain: "If you wouldn't start it today, you shouldn't continue it." }
            ],
            9: [
                { q: "What technology will reshape banking most?", opts: ["Blockchain only", "AI Agents and embedded finance", "Virtual reality", "Quantum computing"], correct: 1, explain: "AI agents and embedded finance will fundamentally change how banking services are delivered." },
                { q: "What is 'Embedded Finance'?", opts: ["Finance inside banks", "Financial services embedded in non-financial platforms", "Embedded systems", "Internal tools"], correct: 1, explain: "Banking services delivered where customers already are — inside other apps and platforms." },
                { q: "What is the risk of not adapting?", opts: ["Lower profits", "Becoming an invisible utility (Dumb Pipe)", "Higher costs", "Losing employees"], correct: 1, explain: "Banks that don't adapt become invisible commodity infrastructure behind fintech interfaces." },
                { q: "How will AI Agents change banking?", opts: ["Replace all humans", "Automate routine decisions and personalize services at scale", "Eliminate branches", "Reduce security"], correct: 1, explain: "AI agents handle routine work while humans focus on complex, relationship-driven tasks." },
                { q: "What is the 'Platform' model for banks?", opts: ["A social media strategy", "Banks as platforms enabling third-party services", "A type of core banking system", "A testing environment"], correct: 1, explain: "Banks become platforms that enable an ecosystem of services rather than doing everything internally." }
            ],
            10: [
                { q: "What does 'Day 1' refer to?", opts: ["Company founding", "Your first 90 days leading transformation", "Monday", "January 1st"], correct: 1, explain: "The playbook for a new leader's first 90 days driving digital transformation." },
                { q: "What should you do in the first 30 days?", opts: ["Launch a major project", "Listen, observe, and map the political landscape", "Fire underperformers", "Rewrite strategy"], correct: 1, explain: "The first 30 days are for listening, understanding, and building relationships." },
                { q: "What kind of people should you hire?", opts: ["Mercenaries (just for money)", "Missionaries (believe in the mission)", "Only externals", "Only internals"], correct: 1, explain: "Missionaries care about the mission and will fight through obstacles; mercenaries leave when it gets hard." },
                { q: "What questions should Board Directors ask?", opts: ["How much did we spend on IT?", "How fast can we deliver value to customers?", "How many people are in IT?", "What vendors do we use?"], correct: 1, explain: "Shift board conversations from cost-center thinking to value-delivery speed." },
                { q: "What is the ultimate sign of transformation success?", opts: ["Cost reduction", "Business and tech speaking the same language at the same table", "New technology", "More headcount"], correct: 1, explain: "True success is when the wall between business and technology disappears." }
            ]
        },

        startQuiz(chapterId) {
            this.quiz = { active: true, chapterId, currentQ: 0, answers: [], score: null, passed: null, answered: false, selectedIdx: null };
            this.logActivity('quiz_start');
        },

        submitQuizAnswer(optIdx) {
            if (this.quiz.answered) return;
            this.quiz.selectedIdx = optIdx;
            this.quiz.answered = true;
            const q = this.quizData[this.quiz.chapterId]?.[this.quiz.currentQ];
            this.quiz.answers.push({ selected: optIdx, correct: q?.correct, isCorrect: optIdx === q?.correct });
        },

        nextQuizQuestion() {
            const totalQs = this.quizData[this.quiz.chapterId]?.length || 5;
            if (this.quiz.currentQ < totalQs - 1) {
                this.quiz.currentQ++;
                this.quiz.answered = false;
                this.quiz.selectedIdx = null;
            } else {
                this.finishQuiz();
            }
        },

        finishQuiz() {
            const correct = this.quiz.answers.filter(a => a.isCorrect).length;
            const totalQs = this.quizData[this.quiz.chapterId]?.length || 5;
            this.quiz.score = correct;
            this.quiz.passed = correct >= Math.ceil(totalQs * 0.8);
            const scores = loadJSON(STORAGE_KEYS.QUIZ_SCORES, {});
            const prev = scores[this.quiz.chapterId]?.best || 0;
            const pct = totalQs > 0 ? Math.round(correct / totalQs * 100) : 0;
            scores[this.quiz.chapterId] = { best: Math.max(prev, pct), last: pct, attempts: (scores[this.quiz.chapterId]?.attempts || 0) + 1 };
            saveJSON(STORAGE_KEYS.QUIZ_SCORES, scores);
            this.logActivity('quiz_complete');
            try { Alpine.store('gamification')?.trackAction?.('Quiz completed'); } catch {}
        },

        closeQuiz() { this.quiz = { active: false, chapterId: null, currentQ: 0, answers: [], score: null, passed: null, answered: false, selectedIdx: null }; },

        getCurrentQuizQuestion() {
            return this.quizData[this.quiz.chapterId]?.[this.quiz.currentQ] || null;
        },

        // ── Feature 4: Video Timestamps ─────────────────────
        timestampsOpen: false,

        timestamps: {
            1: [{ t: 0, l: "Introduction" }, { t: 75, l: "The Universal Bank is Dead" }, { t: 210, l: "Neobank Strategies" }, { t: 420, l: "Dumb Pipe Risk Score" }, { t: 600, l: "Key Takeaways" }],
            2: [{ t: 0, l: "Introduction" }, { t: 90, l: "Data Swamp Problem" }, { t: 240, l: "Data Mesh Architecture" }, { t: 450, l: "Domain Ownership" }, { t: 620, l: "Action Items" }],
            3: [{ t: 0, l: "Introduction" }, { t: 80, l: "What is Cultural Debt?" }, { t: 200, l: "Watermelon Reports" }, { t: 380, l: "Psychological Safety" }, { t: 550, l: "Fixing the Culture" }],
            4: [{ t: 0, l: "Introduction" }, { t: 100, l: "Project vs Product" }, { t: 250, l: "Fund Teams Not Projects" }, { t: 400, l: "The Metro Map Strategy" }, { t: 580, l: "Value Streams" }],
            5: [{ t: 0, l: "Introduction" }, { t: 85, l: "The Gatekeeper Problem" }, { t: 220, l: "Guardrails vs Gatekeepers" }, { t: 380, l: "CI/CD Governance" }, { t: 540, l: "Automation Mandate" }],
            6: [{ t: 0, l: "Introduction" }, { t: 95, l: "The Translation Gap" }, { t: 230, l: "Speaking Both Languages" }, { t: 390, l: "Linking Code to Cash" }, { t: 560, l: "Career Playbook" }],
            7: [{ t: 0, l: "Introduction" }, { t: 90, l: "What Makes a Good Pilot" }, { t: 240, l: "Visibility & Political Capital" }, { t: 400, l: "Scaling Beyond the Pilot" }, { t: 570, l: "Success Metrics" }],
            8: [{ t: 0, l: "Introduction" }, { t: 80, l: "Identifying Zombies" }, { t: 210, l: "Sunk Cost Fallacy" }, { t: 360, l: "The Kill Ritual" }, { t: 520, l: "Freeing Capacity" }],
            9: [{ t: 0, l: "Introduction" }, { t: 100, l: "AI Agents in Banking" }, { t: 260, l: "Embedded Finance" }, { t: 420, l: "Platform Banking" }, { t: 580, l: "Future Architecture" }],
            10: [{ t: 0, l: "Introduction" }, { t: 85, l: "First 30 Days" }, { t: 220, l: "Missionaries vs Mercenaries" }, { t: 380, l: "Board-Level Questions" }, { t: 540, l: "The Day 1 Checklist" }]
        },

        getTimestamps(chapterId) { return this.timestamps[chapterId] || []; },

        getCurrentTimestampLabel(chapterId, currentTime) {
            const ts = this.timestamps[chapterId] || [];
            let current = ts[0]?.l || '';
            for (const t of ts) { if (currentTime >= t.t) current = t.l; }
            return current;
        },

        // ── Feature 5: Note-Taking ──────────────────────────
        notes: { active: false, chapterId: null, content: '', preview: false, lastSaved: null },
        _noteTimer: null,

        openNotes(chapterId) {
            const allNotes = loadJSON(STORAGE_KEYS.NOTES, {});
            this.notes = { active: true, chapterId, content: allNotes[chapterId] || '', preview: false, lastSaved: null };
        },

        saveNote() {
            if (!this.notes.chapterId) return;
            const allNotes = loadJSON(STORAGE_KEYS.NOTES, {});
            allNotes[this.notes.chapterId] = this.notes.content;
            saveJSON(STORAGE_KEYS.NOTES, allNotes);
            this.notes.lastSaved = new Date().toLocaleTimeString();
            this.logActivity('note_save');
        },

        closeNotes() { this.saveNote(); this.notes.active = false; },

        hasNotes(chapterId) {
            const allNotes = loadJSON(STORAGE_KEYS.NOTES, {});
            return !!(allNotes[chapterId]?.trim());
        },

        exportNotesAsPdf() {
            if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') return;
            const allNotes = loadJSON(STORAGE_KEYS.NOTES, {});
            const chapters = this._allChapters();
            const chaptersWithNotes = chapters.filter(ch => allNotes[ch.id]?.trim());
            if (chaptersWithNotes.length === 0) return;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('Academy Notes', 20, 20);
            doc.setFontSize(10);
            doc.text('The Bilingual Executive Toolkit', 20, 28);
            let y = 40;
            chaptersWithNotes.forEach(ch => {
                const note = allNotes[ch.id];
                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`Chapter ${ch.id}: ${ch.title}`, 20, y);
                y += 8;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(note, 170);
                lines.forEach(line => {
                    if (y > 275) { doc.addPage(); y = 20; }
                    doc.text(line, 20, y);
                    y += 5;
                });
                y += 10;
            });
            doc.save('Academy_Notes.pdf');
        },

        // ── Feature 6: AI Tutor ─────────────────────────────
        aiTutor: { active: false, chapterId: null, question: '', prompt: '' },

        starterQuestions: {
            1: ["How does the fintech tsunami affect my bank specifically?", "What is my bank's dumb pipe risk score?", "How can I identify our lazy loyalty problem?"],
            2: ["How do I start a Data Mesh in my organization?", "What's the first step to fix our data swamp?", "How do I convince leadership to invest in data quality?"],
            3: ["How do I measure cultural debt in my team?", "What rituals can fix watermelon reporting?", "How do I build psychological safety?"],
            4: ["How do I transition from project to product funding?", "What does a value stream look like in banking?", "How do I convince the CFO to fund teams not projects?"],
            5: ["How do I automate compliance checks?", "What governance guardrails should we implement first?", "How do I remove manual approval bottlenecks?"],
            6: ["How do I become a bilingual executive?", "How do I translate tech decisions into business impact?", "What should I learn first — tech or business?"],
            7: ["What makes a good lighthouse pilot for my bank?", "How do I ensure my pilot scales?", "How do I measure pilot success?"],
            8: ["How do I identify zombie projects in my portfolio?", "How do I build a zombie-killing process?", "What do I do with freed-up capacity?"],
            9: ["How should my bank prepare for AI agents?", "What embedded finance opportunities exist for us?", "How do I build a platform banking strategy?"],
            10: ["What should I do in my first week as transformation lead?", "How do I identify missionaries in my team?", "What questions should I bring to the board?"]
        },

        openAiTutor(chapterId) {
            this.aiTutor = { active: true, chapterId, question: '', prompt: '' };
        },

        generateTutorPrompt() {
            const ch = this._allChapters().find(c => c.id === this.aiTutor.chapterId);
            if (!ch) return;
            this.aiTutor.prompt = `ACT AS: A senior banking transformation coach and expert on "${ch.title}" from "The Bilingual Executive" book.

## CONTEXT
The student is studying Chapter ${ch.id}: "${ch.title}" — ${ch.desc}
This chapter is part of a curriculum that teaches banking leaders to bridge the gap between business strategy and technology execution.

## STUDENT'S QUESTION
"${this.aiTutor.question}"

## YOUR MISSION
1. Answer the question directly using concepts from this chapter.
2. Provide a concrete, actionable example from banking/fintech.
3. Connect it to a real-world scenario the student might face.
4. Suggest one follow-up exercise they can do this week.

TONE: Expert but accessible. Use analogies. Be specific to banking, not generic.`;
            this.logActivity('ai_tutor');
        },

        closeAiTutor() { this.aiTutor.active = false; },

        // ── Feature 7: Search & Bookmarks ───────────────────
        search: { active: false, query: '', results: [] },
        bookmarks: [],

        initBookmarks() { this.bookmarks = loadJSON(STORAGE_KEYS.BOOKMARKS, []); },

        toggleBookmark(chapterId) {
            const idx = this.bookmarks.indexOf(chapterId);
            if (idx >= 0) this.bookmarks.splice(idx, 1);
            else this.bookmarks.push(chapterId);
            saveJSON(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
        },

        isBookmarked(chapterId) { return this.bookmarks.includes(chapterId); },

        searchAcademy(query) {
            if (!query?.trim()) { this.search.results = []; return; }
            const q = query.toLowerCase();
            const chapters = this._allChapters();
            this.search.results = chapters.filter(ch => {
                if (ch.title.toLowerCase().includes(q) || ch.desc.toLowerCase().includes(q) || `chapter ${ch.id}`.includes(q)) return true;
                const quiz = this.quizData[ch.id] || [];
                return quiz.some(item => item.q.toLowerCase().includes(q) || item.opts.some(o => o.toLowerCase().includes(q)));
            }).map(ch => ({ id: ch.id, title: ch.title, desc: ch.desc, status: ch.status }));
        },

        // ── Feature 8: Knowledge Graph ──────────────────────
        knowledgeGraphOpen: false,

        graphNodes: [
            { id: 1, x: 15, y: 15, label: "Fintech Tsunami", group: 1 },
            { id: 2, x: 50, y: 15, label: "Data as Engine", group: 1 },
            { id: 3, x: 85, y: 15, label: "Cultural Debt", group: 1 },
            { id: 4, x: 15, y: 50, label: "Agile Strategy", group: 2 },
            { id: 5, x: 40, y: 50, label: "Governance", group: 2 },
            { id: 6, x: 65, y: 50, label: "Bilingual Exec", group: 2 },
            { id: 7, x: 15, y: 85, label: "Lighthouse", group: 3 },
            { id: 8, x: 40, y: 85, label: "Kill Zombies", group: 3 },
            { id: 9, x: 65, y: 85, label: "Future Bank", group: 3 },
            { id: 10, x: 90, y: 85, label: "Day 1 Playbook", group: 3 }
        ],

        graphEdges: [
            { from: 1, to: 2, label: "Data drives response" },
            { from: 1, to: 4, label: "Agility required" },
            { from: 2, to: 5, label: "Needs governance" },
            { from: 3, to: 6, label: "Culture enables" },
            { from: 4, to: 7, label: "Start small" },
            { from: 5, to: 7, label: "Guardrails for pilot" },
            { from: 6, to: 10, label: "Leadership ready" },
            { from: 7, to: 8, label: "Free capacity" },
            { from: 8, to: 9, label: "Invest freed resources" },
            { from: 9, to: 10, label: "Execute vision" },
            { from: 3, to: 4, label: "Culture before process" },
            { from: 2, to: 9, label: "Data powers AI" }
        ],

        // ── Feature 9: Activity Heatmap ─────────────────────
        heatmapOpen: false,

        logActivity(type) {
            const log = loadJSON(STORAGE_KEYS.ACTIVITY, {});
            const today = todayKey();
            if (!log[today]) log[today] = { actions: 0, types: [] };
            log[today].actions++;
            if (!log[today].types.includes(type)) log[today].types.push(type);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 400);
            const cutoffKey = localDateKey(cutoff);
            for (const k of Object.keys(log)) {
                if (k < cutoffKey) delete log[k];
            }
            saveJSON(STORAGE_KEYS.ACTIVITY, log);
        },

        getHeatmapData() {
            const log = loadJSON(STORAGE_KEYS.ACTIVITY, {});
            const weeks = [];
            const today = new Date();
            const dow = today.getDay();
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - dow));
            for (let w = 52; w >= 0; w--) {
                const week = [];
                for (let d = 0; d < 7; d++) {
                    const date = new Date(endOfWeek);
                    date.setDate(endOfWeek.getDate() - (w * 7 + (6 - d)));
                    if (date > today) {
                        week.push({ date: '', count: -1 });
                    } else {
                        const key = localDateKey(date);
                        week.push({ date: key, count: log[key]?.actions || 0 });
                    }
                }
                weeks.push(week);
            }
            return weeks;
        },

        getActivityStreak() {
            const log = loadJSON(STORAGE_KEYS.ACTIVITY, {});
            let streak = 0;
            const d = new Date();
            const todayStr = todayKey();
            if (log[todayStr]?.actions > 0) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                d.setDate(d.getDate() - 1);
            }
            while (true) {
                const key = localDateKey(d);
                if (log[key]?.actions > 0) { streak++; d.setDate(d.getDate() - 1); }
                else break;
            }
            return streak;
        },

        getTotalActiveDays() {
            const log = loadJSON(STORAGE_KEYS.ACTIVITY, {});
            return Object.keys(log).filter(k => log[k]?.actions > 0).length;
        },

        heatmapColor(count) {
            if (count < 0) return 'bg-transparent';
            if (count === 0) return 'bg-white/[0.04]';
            if (count <= 2) return 'bg-emerald-900/60';
            if (count <= 5) return 'bg-emerald-700/70';
            if (count <= 10) return 'bg-emerald-500/80';
            return 'bg-emerald-400';
        },

        // ── Feature 10: Certificate Generator ───────────────
        certificate: { showModal: false, name: '' },

        get isCertificateEligible() { return this.completedCount === this.totalChapters && this.totalChapters > 0; },

        generateCertificate() {
            if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') return;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape' });
            const w = doc.internal.pageSize.getWidth();
            const h = doc.internal.pageSize.getHeight();
            const name = this.certificate.name?.trim() || 'Executive Leader';

            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, w, h, 'F');

            doc.setDrawColor(74, 222, 128);
            doc.setLineWidth(1.5);
            doc.rect(10, 10, w - 20, h - 20);
            doc.rect(14, 14, w - 28, h - 28);

            doc.setTextColor(74, 222, 128);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('CERTIFICATE OF COMPLETION', w / 2, 35, { align: 'center' });

            doc.setTextColor(241, 245, 249);
            doc.setFontSize(28);
            doc.text('The Bilingual Executive Academy', w / 2, 55, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('This certifies that', w / 2, 75, { align: 'center' });

            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(244, 114, 182);
            doc.text(name, w / 2, 92, { align: 'center' });
            doc.setFont('helvetica', 'normal');

            doc.setFontSize(11);
            doc.setTextColor(148, 163, 184);
            doc.text('has successfully completed all 10 chapters of', w / 2, 108, { align: 'center' });
            doc.text('"The Bilingual Executive: How to Build the Agile Bank"', w / 2, 116, { align: 'center' });

            const quizScores = this.getQuizScores();
            const avgScore = Object.values(quizScores).reduce((sum, s) => sum + (s.best || 0), 0) / Math.max(Object.keys(quizScores).length, 1);
            doc.text(`Average Quiz Score: ${Math.round(avgScore)}%  |  Chapters: 10/10  |  Date: ${new Date().toLocaleDateString()}`, w / 2, 132, { align: 'center' });

            const certId = `BEA-${Date.now().toString(36).toUpperCase()}`;
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Certificate ID: ${certId}`, w / 2, h - 20, { align: 'center' });

            doc.save(`Bilingual_Executive_Certificate_${name.replace(/\s+/g, '_')}.pdf`);
            this.logActivity('certificate_generated');
        },

        // ── Helpers ─────────────────────────────────────────
        _allChapters() {
            try {
                if (this._metroMapRef) return this._metroMapRef.flatMap(p => p.chapters);
            } catch {}
            return [];
        },

        init() {
            this.initBookmarks();
            this.logActivity('session_start');
        }
    });
});
