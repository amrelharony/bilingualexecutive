document.addEventListener('alpine:init', () => {
    Alpine.data('culturalMonitorComponent', () => ({
        history: [],
        isCheckinOpen: false,
        answers: { q1: null, q2: null, q3: null },
        chartInstance: null,

        init() {
            try {
                const saved = localStorage.getItem('bilingual_culture_history');
                if (saved) this.history = JSON.parse(saved);
            } catch (e) { console.error("Load Error", e); }
        },

        submitCheckin() {
            Alpine.store('gamification').trackCulturalCheckin();
            Alpine.store('gamification').trackToolUse('culture', 'radar');
            let debt = 0;
            // Q1: Bad News Shared? (If No, Fear exists = High Debt)
            if (this.answers.q1 === 'no') debt += 40; 
            // Q2: HiPPO Override? (If Yes, Ego exists = High Debt)
            if (this.answers.q2 === 'yes') debt += 30;
            // Q3: Shipped Value? (If No, Stagnation = High Debt)
            if (this.answers.q3 === 'no') debt += 30;

            const entry = {
                date: new Date().toLocaleDateString(),
                score: debt,
                timestamp: Date.now()
            };

            this.history.push(entry);
            if (this.history.length > 10) this.history.shift();
            
            localStorage.setItem('bilingual_culture_history', JSON.stringify(this.history));
            
            this.isCheckinOpen = false;
            this.answers = { q1: null, q2: null, q3: null };
            this.renderChart();
        },

        get currentScore() {
            if (this.history.length === 0) return 0;
            return this.history[this.history.length - 1].score;
        },

        get status() {
            const s = this.currentScore;
            if (s < 30) return { label: "HEALTHY", color: "text-primary", desc: "High safety. Fast flow." };
            if (s < 70) return { label: "AT RISK", color: "text-warn", desc: "Friction is building. Intervene now." };
            return { label: "TOXIC", color: "text-risk", desc: "Culture of fear. Transformation stalled." };
        },

        get recommendation() {
            const s = this.currentScore;
            if (s < 30) return "Keep reinforcing the 'No Jargon' rule.";
            if (s < 70) return "Run a 'Bad News' Audit. Ask teams what they are hiding.";
            return "Emergency: Kill a 'Zombie Project' publicly to restore trust.";
        },

        // --- NEW: AI PROMPT GENERATOR ---
        generateCulturePrompt() {
            const s = this.currentScore;
            
            // 1. Analyze Trend
            let trend = "No historical data yet";
            if (this.history.length >= 2) {
                const prev = this.history[this.history.length - 2].score;
                if (s > prev) trend = "⚠️ WORSENING. Fear is increasing.";
                else if (s < prev) trend = "✅ IMPROVING. Safety is returning.";
                else trend = "STAGNANT. We are stuck.";
            }

            // 2. Select Context
            let context = "";
            if (s >= 70) context = "My team is paralyzed by fear (High Debt). They hide bad news and wait for orders.";
            else if (s >= 30) context = "My team is experiencing friction. We have pockets of agility, but 'HiPPO' (Highest Paid Person's Opinion) often overrides data.";
            else context = "My team is performing well (Low Debt), but I need to prevent complacency.";

            return `ACT AS: An Organizational Psychologist and Agile Transformation Coach.

## THE DATA (CULTURAL DEBT MONITOR)
I track my team's "Cultural Debt" (friction, fear, and lack of flow).
- **CURRENT DEBT SCORE:** ${s}% (0% is perfect, 100% is toxic)
- **TREND:** ${trend}

## THE DIAGNOSIS
${context}

## YOUR MISSION
Design a **"Psychological Safety Intervention"** for my next team meeting.
1. **The Root Cause:** Based on the score of ${s}%, explain *why* innovation is failing (reference "Westrum Organizational Culture").
2. **The Ritual:** Propose 1 specific, non-cringe ritual to lower this debt (e.g., "The Pre-Mortem", "Failure Cake", or "Red Carding").
3. **The Script:** Write the exact opening 3 sentences I should say to the team to authorize candor and vulnerability.

TONE: Empathetic, scientifically grounded, but actionable.`;
        },

        reset() {
            if(confirm("Clear all history?")) {
                this.history = [];
                localStorage.removeItem('bilingual_culture_history');
                if(this.chartInstance) this.chartInstance.destroy();
            }
        },

        renderChart() {
            // (Chart rendering logic remains the same)
            if (typeof Chart === 'undefined') return;
            setTimeout(() => {
                const ctx = document.getElementById('debtChart');
                if (!ctx) return;
                if (this.chartInstance) this.chartInstance.destroy();
                const color = this.currentScore > 50 ? '#f87171' : '#4ade80';
                this.chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: this.history.map(h => h.date),
                        datasets: [{
                            label: 'Debt %',
                            data: this.history.map(h => h.score),
                            borderColor: color,
                            backgroundColor: color + '20',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: { scales: { y: { min: 0, max: 100 }, x: { display: false } }, plugins: { legend: { display: false } } }
                });
            }, 100);
        }
    }));
});
