document.addEventListener('alpine:init', () => {
    Alpine.data('dailyFeedComponent', () => ({
        // Content State
        currentLesson: null,
        weekCache: [],
        lastFetchDate: null,
        loading: false,
        
        // User Progress & Math
        streak: 0,
        lastCompletedDate: null,
        isCompletedToday: false,
        quizState: 'pending',
        
        // Advanced Telemetry
        history: [], // Stores { date, result, term }
        fluencyScore: 0, // 0-1000 (ELO style)
        fluencyLevel: "Novice", // Novice, Apprentice, Fluent, Native
        notificationPermission: 'default',

        // Fallback Data
        fallbackData: [
            {
                term: "Idempotency",
                pronounce: "eye-dem-po-ten-see",
                definition: "Making the same API call multiple times produces the same result.",
                analogy: "Like pressing a 'Call Elevator' button. Pressing it 10 times doesn't send 10 elevators.",
                impact: "Prevents double-charging customers on slow networks.",
                quiz: { q: "If a user clicks 'Pay' 5 times, how many charges occur?", options: ["5 Charges", "1 Charge", "System Crash"], correct: 1 }
            }
        ],

        init() {
            // 1. Load Deep State
            const saved = JSON.parse(localStorage.getItem('bilingual_feed_v3') || '{}');
            this.streak = saved.streak || 0;
            this.lastCompletedDate = saved.lastCompletedDate;
            this.weekCache = saved.weekCache || [];
            this.lastFetchDate = saved.lastFetchDate;
            this.history = saved.history || [];
            this.fluencyScore = saved.fluencyScore || 0;
            this.updateLevel();

            // 2. Check Streak & Decay
            const today = new Date().toDateString();
            if (this.lastCompletedDate === today) {
                this.isCompletedToday = true;
            } else if (this.lastCompletedDate) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (this.lastCompletedDate !== yesterday.toDateString()) {
                    this.streak = 0; 
                    this.applyDecay(); // Penalty for breaking streak
                }
            }

            // 3. Check Notifications
            if ("Notification" in window) {
                this.notificationPermission = Notification.permission;
                this.checkSchedule();
            }

            this.loadContent();
        },

        // --- NOTIFICATION LOGIC ---
        requestNotify() {
            if (!("Notification" in window)) {
                alert("This browser does not support desktop notifications");
            } else {
                Notification.requestPermission().then(permission => {
                    this.notificationPermission = permission;
                    if (permission === "granted") {
                        new Notification("Bilingual Exec", { body: "Daily notifications enabled for 9:00 AM!" });
                    }
                });
            }
        },

        checkSchedule() {
            // Logic: If it's after 9am, user hasn't played, and we haven't notified today
            const now = new Date();
            const isAfterNine = now.getHours() >= 9;
            const lastNotify = localStorage.getItem('last_notify_date');
            const today = now.toDateString();

            if (this.notificationPermission === 'granted' && isAfterNine && !this.isCompletedToday && lastNotify !== today) {
                this.sendNotification();
                localStorage.setItem('last_notify_date', today);
            }
        },

        sendNotification() {
            // Note: On mobile, this only works if the app is "open" or backgrounded in a specific way.
            // True background push requires a server (Firebase/Supabase Edge Functions).
            // This is a "Local Notification" simulation.
            new Notification("Daily Wisdom Ready", {
                body: "Your executive briefing is ready. Keep your streak alive!",
                icon: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
                tag: "daily-insight"
            });
        },

        // --- CONTENT LOGIC ---
        async loadContent() {
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;

            if (this.weekCache.length === 0 || !this.lastFetchDate || (now - this.lastFetchDate > oneWeek)) {
                await this.fetchWeeklyBatch();
            }

            const dayIndex = new Date().getDay(); 
            this.currentLesson = this.weekCache[dayIndex] || this.weekCache[0] || this.fallbackData[0];
        },

        async fetchWeeklyBatch() {
            this.loading = true;
            const prompt = `
                ACT AS: A Tech Coach.
                TASK: Generate 7 "Micro-Lessons" on Tech/Banking terms.
                OUTPUT JSON ONLY (Array of 7 objects):
                [ { "term": "...", "pronounce": "...", "definition": "...", "analogy": "...", "impact": "...", "quiz": { "q": "...", "options": ["..."], "correct": 0 } } ]
            `;
            try {
                let rawText = await this.askSecureAI(prompt, "Generate Weekly Feed");
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                this.weekCache = JSON.parse(rawText);
                this.lastFetchDate = Date.now();
                this.saveState();
            } catch (e) {
                this.weekCache = this.fallbackData;
            } finally {
                this.loading = false;
            }
        },

        async askSecureAI(prompt, context) {
            console.log("Mock AI Call:", prompt);
            return JSON.stringify(this.fallbackData); // Return fallback data so app doesn't crash
        },

        // --- ADVANCED MATH ENGINE ---
        submitAnswer(index) {
            if (this.quizState !== 'pending') return;

            const isCorrect = index === this.currentLesson.quiz.correct;
            this.quizState = isCorrect ? 'correct' : 'wrong';
            
            // Calculate Score Impact
            this.calculateFluency(isCorrect);
            
            // Save History
            this.history.push({
                date: new Date().toISOString(),
                term: this.currentLesson.term,
                result: isCorrect ? 'win' : 'loss'
            });

            if (isCorrect && !this.isCompletedToday) {
                this.streak++;
                this.isCompletedToday = true;
                this.lastCompletedDate = new Date().toDateString();
            }
            Alpine.store('gamification').trackQuizComplete(Math.round(this.fluencyScore / 10));
            if (this.fluencyLevel === 'Fluent' || this.fluencyLevel === 'Native Speaker') {
                Alpine.store('gamification').trackFluencyReached();
            }
            this.saveState();
        },

        calculateFluency(isCorrect) {
            // Base points
            let delta = 0;
            
            if (isCorrect) {
                // Reward Formula: Base (10) + Streak Bonus (logarithmic)
                // We use Math.log to prevent runaway scores on long streaks
                const streakBonus = Math.round(Math.log(this.streak + 1) * 5);
                delta = 10 + streakBonus;
            } else {
                // Penalty: Flat -15 (Pain of failure)
                delta = -15;
            }

            this.fluencyScore = Math.max(0, this.fluencyScore + delta);
            this.updateLevel();
        },

        applyDecay() {
            // Ebbinghaus Forgetting Curve Simulation
            // Lose 5% of knowledge every day you miss
            this.fluencyScore = Math.floor(this.fluencyScore * 0.95);
            this.updateLevel();
        },

        updateLevel() {
            const s = this.fluencyScore;
            if (s < 100) this.fluencyLevel = "Novice";
            else if (s < 300) this.fluencyLevel = "Apprentice";
            else if (s < 600) this.fluencyLevel = "Fluent";
            else this.fluencyLevel = "Native Speaker";
        },

        saveState() {
            localStorage.setItem('bilingual_feed_v3', JSON.stringify({
                streak: this.streak,
                lastCompletedDate: this.lastCompletedDate,
                weekCache: this.weekCache,
                lastFetchDate: this.lastFetchDate,
                history: this.history,
                fluencyScore: this.fluencyScore
            }));
        },

        generateDeepDivePrompt() {
            if (!this.currentLesson) return "";
            return `ACT AS: A CTO. TEACH ME: "${this.currentLesson.term}". 1. How do I spot a fake expert? 2. What is the ROI?`;
        }
    }));
});
