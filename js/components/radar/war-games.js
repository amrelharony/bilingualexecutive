document.addEventListener('alpine:init', () => {
    Alpine.data('warGamesComponent', () => ({
        active: false,
        gameOver: false,
        result: null, // 'victory', 'bankruptcy', 'regulatory_shutdown'
        finalMessage: null,
        
        // State
        currentScenario: null,
        currentNode: 'start',
        metrics: { capital: 100, innovation: 20, stability: 80 },
        history: [],

        // THE SCENARIOS (Branching Logic)
        scenarios: [
            {
                id: 'core',
                title: 'Operation: Open Heart',
                brief: 'The Board demands we replace the 40-year-old Core Banking System. It is risky, expensive, and necessary.',
                nodes: {
                    'start': {
                        text: "Our legacy vendor just raised prices by 40%. The Core is stable but inflexible. We cannot launch new products. What is the strategy?",
                        options: [
                            { text: "Big Bang Replacement. Buy a modern SaaS core and migrate everything in one weekend.", impact: { capital: -60, innovation: +50, stability: -40 }, next: 'big_bang', analysis: "High Risk / High Reward." },
                            { text: "Hollow out the Core. Build a side-car 'Neobank' stack and migrate slowly.", impact: { capital: -30, innovation: +20, stability: -10 }, next: 'strangler', analysis: "The Strangler Fig Pattern." }
                        ]
                    },
                    'big_bang': {
                        text: "Migration Weekend is approaching. Testing shows a 15% error rate in account balances. The Board is watching.",
                        options: [
                            { text: "Delay the launch by 3 months to fix bugs.", impact: { capital: -20, innovation: 0, stability: +20 }, next: 'delay_pain', analysis: "Prudent but expensive." },
                            { text: "Launch anyway. We'll fix errors in post-production support.", impact: { capital: 0, innovation: +10, stability: -50 }, next: 'crash', analysis: "Reckless gambling." }
                        ]
                    },
                    'strangler': {
                        text: "The new 'Side-Car' stack is live and customers love it. But maintaining two parallel banks is draining our OpEx budget.",
                        options: [
                            { text: "Cut funding to the Legacy maintenance team to save cash.", impact: { capital: +10, innovation: 0, stability: -30 }, next: 'outage', analysis: "Created technical debt." },
                            { text: "Accelerate migration. Offer customers $50 bonus to switch to the new stack manually.", impact: { capital: -20, innovation: +10, stability: +10 }, next: 'victory', analysis: "Customer-led migration." }
                        ]
                    },
                    'delay_pain': {
                        text: "The delay burned cash, but the system is stable. However, a competitor just launched the features we were building.",
                        options: [
                            { text: "Stay the course. Reliability is our brand.", impact: { capital: -10, innovation: -10, stability: +10 }, next: 'victory', analysis: "Slow and steady survival." },
                            { text: "Rush a feature update immediately after launch.", impact: { capital: -10, innovation: +20, stability: -20 }, next: 'crash', analysis: "Destabilized the platform." }
                        ]
                    },
                    'outage': {
                        text: "Disaster! The under-funded legacy core crashed on payday. 2 million customers cannot access funds.",
                        options: [
                            { text: "Blame the vendor publicly.", impact: { capital: 0, innovation: 0, stability: -20 }, next: 'shutdown', analysis: "Weak leadership." },
                            { text: "Roll back everything to the old state.", impact: { capital: -20, innovation: -40, stability: +30 }, next: 'stagnation', analysis: "Retreat to safety." }
                        ]
                    },
                    'crash': { text: "CRITICAL FAILURE. Data corruption detected. Regulators have entered the building.", options: [], next: 'shutdown' },
                    'shutdown': { text: "GAME OVER. The banking license has been suspended.", options: [], next: 'end' },
                    'victory': { text: "SUCCESS. Transformation complete. We are bruised but modern.", options: [], next: 'end' },
                    'stagnation': { text: "SURVIVAL. We survived, but we are now a zombie bank with no innovation.", options: [], next: 'end' }
                }
            }
        ],

        start(index) {
            Alpine.store('gamification').trackToolUse('whatif', 'radar');
            this.active = true;
            this.gameOver = false;
            this.currentScenario = this.scenarios[index];
            this.currentNode = 'start';
            this.metrics = { capital: 100, innovation: 20, stability: 80 };
            this.history = [];
        },

        choose(option) {
            // 1. Math Engine
            this.metrics.capital += option.impact.capital;
            this.metrics.innovation += option.impact.innovation;
            this.metrics.stability += option.impact.stability;

            // 2. Log Decision
            this.history.push({
                situation: this.currentScenario.nodes[this.currentNode].text,
                decision: option.text,
                rationale: option.analysis,
                impact: option.impact
            });

            // 3. Check for immediate failures
            if (this.metrics.capital <= 0) {
                this.finishGame('bankruptcy', "INSOLVENCY. You ran out of money.");
                return;
            }
            if (this.metrics.stability <= 20) {
                this.finishGame('regulatory_shutdown', "INTERVENTION. Regulators seized the bank due to risk.");
                return;
            }

            // 4. Handle End States
            if (['shutdown', 'end', 'crash', 'stagnation'].includes(option.next)) {
                // Map node ID to result type
                let res = 'victory';
                if (option.next === 'crash' || option.next === 'shutdown') res = 'regulatory_shutdown';
                if (option.next === 'stagnation') res = 'stagnation';
                
                // Update text for the final screen
                this.currentNode = option.next;
                const endNode = this.currentScenario.nodes[option.next];
                this.finishGame(res, endNode?.text || '');
            } else {
                // Advance
                this.currentNode = option.next;
            }
        },

        finishGame(result, msg) {
            Alpine.store('gamification').trackGameComplete(result === 'victory');
            this.gameOver = true;
            this.result = result;
            this.finalMessage = msg;
        },

        restart() {
            this.active = false;
            this.gameOver = false;
            this.history = [];
        },

        // --- NEW: STRATEGIC POST-MORTEM PROMPT ---
        generateWarGamePrompt() {
            if (!this.currentScenario || !this.result) return "Complete the simulation first.";
            const decisionPath = this.history.map((h, i) => 
                `Turn ${i+1}: ${h.decision} (Intent: ${h.rationale})`
            ).join("\n");

            return `ACT AS: A McKinsey Senior Partner conducting a Strategic Post-Mortem.

## WAR GAME RESULTS
I just simulated a Bank Transformation Strategy ("${this.currentScenario.title}").
- **FINAL OUTCOME:** ${this.result.toUpperCase()}
- **Ending Metrics:** Capital (${this.metrics.capital}), Innovation (${this.metrics.innovation}), Stability (${this.metrics.stability}).

## THE DECISION CHAIN
${decisionPath}

## YOUR ANALYSIS
1. **The Fatal Flaw (or Winning Move):** Identify the single decision that sealed my fate. Was it a math error or a cultural error?
2. **Alternative History:** If you were the CEO, which turn would you have played differently and why?
3. **The Executive Lesson:** Give me one "Law of Corporate Strategy" that applies to this specific run (e.g. "Conway's Law" or "The Sunk Cost Fallacy").

TONE: Brutally honest, high-level strategic insight.`;
        }
    }));
});
