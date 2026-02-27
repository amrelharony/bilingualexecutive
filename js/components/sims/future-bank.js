document.addEventListener('alpine:init', () => {
    Alpine.data('futureBankComponent', () => ({
        activeScenario: null,
        year: 2026,
        metrics: { profit: 0, customers: 0, efficiency: 0, techDebt: 0 },
        isPlaying: false,
        timer: null,
        activeEvent: null, // Stores the current crisis
        decisionLog: [],   // Tracks user choices for the AI prompt
        
        // The 3 Core Paths
        scenarios: [
            {
                id: 'ai_first',
                title: 'The Bionic Bank',
                icon: 'fa-robot',
                color: 'text-purple-400',
                desc: 'Aggressive automation. High initial cost (J-Curve), exponential payoff.',
                baseGrowth: 1.15, 
                efficiencyGain: 0.05, 
                riskFactor: 0.2 
            },
            {
                id: 'partnership',
                title: 'The Invisible Bank',
                icon: 'fa-handshake',
                color: 'text-green-400',
                desc: 'Embedded Finance. Low brand visibility, massive volume via Partners.',
                baseGrowth: 1.25, 
                efficiencyGain: 0.02, 
                riskFactor: 0.1
            },
            {
                id: 'fortress',
                title: 'The Legacy Fortress',
                icon: 'fa-shield-halved',
                color: 'text-risk',
                desc: 'Defensive posture. Cost cutting and compliance focus.',
                baseGrowth: 1.03, 
                efficiencyGain: -0.01, 
                riskFactor: 0.05
            }
        ],

        // The Crisis Database (Triggered at specific years)
        events: {
            2027: {
                title: "CRISIS: THE CLOUD OUTAGE",
                desc: "A major vendor outage has taken down mobile banking for 4 hours. The regulator is on the phone.",
                choices: [
                    { label: "Public Apology & Refund", effect: "churn_reduction", cost: 50, debt: 0, msg: "Expensive, but saved the brand." },
                    { label: "Blame the Vendor", effect: "churn_increase", cost: 0, debt: 0, msg: "Saved cash, but customers are angry." },
                    { label: "Accelerate Multi-Cloud", effect: "debt_reduction", cost: 200, debt: -15, msg: "Strategic pivot. High cost, long-term stability." }
                ]
            },
            2029: {
                title: "OPPORTUNITY: THE FINTECH CRASH",
                desc: "Interest rates spiked. A major Neo-Bank competitor is insolvent. Assets are cheap.",
                choices: [
                    { label: "Acquire for Tech Stack", effect: "tech_boost", cost: 500, debt: -20, msg: "Bought their code to replace ours." },
                    { label: "Acquire for Customers", effect: "growth_boost", cost: 300, debt: 10, msg: "Bought their users. Integration will be messy." },
                    { label: "Let them Die", effect: "efficiency", cost: 0, debt: 0, msg: "Preserved capital. Conservative play." }
                ]
            }
        },

        selectScenario(id) {
            Alpine.store('gamification').trackToolUse('future', 'sims');
            this.activeScenario = this.scenarios.find(s => s.id === id);
            this.year = 2026;
            this.decisionLog = [];
            // Reset Metrics
            this.metrics = { 
                profit: 1000, // $1.0B
                customers: 5, // 5M
                efficiency: 60, // Cost/Income Ratio
                techDebt: 20 // Index 0-100
            };
            this.playSimulation();
        },

        playSimulation() {
            this.isPlaying = true;
            this.activeEvent = null;
            if (this.timer) clearInterval(this.timer);

            this.timer = setInterval(() => {
                // Check for Events BEFORE advancing year
                if ((this.year === 2027 || this.year === 2029) && !this.isEventResolved(this.year)) {
                    this.triggerEvent(this.year);
                    return; // Pause loop
                }

                if (this.year < 2030) {
                    this.year++;
                    this.calculateYearlyMath();
                } else {
                    clearInterval(this.timer);
                    this.isPlaying = false;
                    Alpine.store('gamification').trackGameComplete(true);
                }
            }, 1500);
        },

        triggerEvent(year) {
            clearInterval(this.timer); // Pause Time
            if (!this.events[year]) return;
            this.activeEvent = { ...this.events[year], year: year };
        },

        resolveEvent(choice) {
            // 1. Apply Immediate Effects
            this.metrics.profit -= choice.cost;
            this.metrics.techDebt = Math.max(0, this.metrics.techDebt + choice.debt);
            
            // 2. Apply Special Effects
            if (choice.effect === 'churn_increase') this.metrics.customers *= 0.9;
            if (choice.effect === 'churn_reduction') this.metrics.customers *= 1.05; // Loyalty boost
            if (choice.effect === 'growth_boost') this.metrics.customers += 1.5; // +1.5M users
            if (choice.effect === 'tech_boost') this.metrics.efficiency -= 5; 

            // 3. Log for AI
            this.decisionLog.push({ year: this.activeEvent.year, event: this.activeEvent.title, decision: choice.label, outcome: choice.msg });

            // 4. Resume
            this.activeEvent = null;
            this.playSimulation();
        },

        isEventResolved(year) {
            return this.decisionLog.some(d => d.year === year);
        },

        calculateYearlyMath() {
            const s = this.activeScenario;
            
            // J-Curve Logic
            let growth = s.baseGrowth;
            if (s.id === 'ai_first' && this.year === 2027) growth = 0.9; // The dip
            if (s.id === 'ai_first' && this.year >= 2029) growth = 1.35; // The rocket

            this.metrics.profit = Math.round(this.metrics.profit * growth);
            
            // Efficiency Drifts
            this.metrics.efficiency = Math.max(30, this.metrics.efficiency - (s.efficiencyGain * 100));
            
            // Tech Debt Drifts (Fortress rots, others improve slightly)
            if (s.id === 'fortress') this.metrics.techDebt += 5;
            else this.metrics.techDebt = Math.max(5, this.metrics.techDebt - 2);
        },

        // --- PROMPT GENERATOR ---
        generateFuturePrompt() {
            if (!this.activeScenario) return "Start simulation first.";
            const s = this.activeScenario;
            const m = this.metrics;
            
            const decisions = this.decisionLog.map(d => `In ${d.year}, faced with "${d.event}", I chose to "${d.decision}".`).join("\n");

            return `ACT AS: A Wall Street Analyst writing a "Sell-Side Report" on this Bank in 2030.

## STRATEGY & EXECUTION REVIEW (2026-2030)
The CEO chose the "${s.title}" strategy (${s.desc}).
Key Decisions made during the timeline:
${decisions}

## 2030 FINANCIAL RESULTS
- **Net Profit:** $${(m.profit/1000).toFixed(1)} Billion
- **Efficiency Ratio:** ${m.efficiency.toFixed(0)}%
- **Customer Base:** ${(m.customers).toFixed(1)} Million
- **Technical Debt:** ${m.techDebt}/100

## YOUR ANALYSIS
1. **The Verdict:** Is this bank a "Buy", "Hold", or "Sell"? Why?
2. **The "Crisis Management" Score:** Analyze how my decision in the 2027/2029 crises impacted the final P&L.
3. **The 2035 Outlook:** Given the high/low Tech Debt, will this bank survive the *next* wave of disruption (Quantum Computing)?

TONE: Professional, financial, ruthlessly objective.`;
        }
    }));
});
