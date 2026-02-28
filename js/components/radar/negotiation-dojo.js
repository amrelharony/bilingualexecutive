document.addEventListener('alpine:init', () => {
    Alpine.data('negotiationDojoComponent', () => ({
        active: false,
        gameOver: false,
        result: null, // 'win' or 'lose'
        finalMessage: null,
        
        // The State Machine
        currentScenario: null,
        currentNode: 'start',
        metrics: { trust: 50, leverage: 50, patience: 3 }, // The "Math"
        history: [], // Tracks user choices for the prompt

        // THE DATA (Branching Logic)
        scenarios: [
            {
                id: 'cloud',
                title: 'The Cloud Skeptic',
                opponent: 'CFO Marcus Steel',
                role: 'Chief Digital Officer',
                intro: 'You need $10M for Cloud Migration. The CFO hates OpEx spikes.',
                nodes: {
                    'start': {
                        text: "I see a $10M request for AWS. Our data centers are paid for. Why should I rent computers when I own them?",
                        options: [
                            { text: "It provides elasticity and microservices scalability.", impact: { trust: -10, leverage: 0, patience: -1 }, next: 'tech_trap', analysis: "Used Jargon. CFO tuned out." },
                            { text: "It shifts us from CapEx to OpEx, aligning cost with revenue.", impact: { trust: +20, leverage: +10, patience: 0 }, next: 'financial_hook', analysis: "Spoke CFO language (CapEx/OpEx)." }
                        ]
                    },
                    'tech_trap': {
                        text: "I don't care about 'elasticity'. I care about the P&L. You have 2 minutes before I reject this.",
                        options: [
                            { text: "If we don't migrate, we risk a security breach costing $50M.", impact: { trust: -10, leverage: +20, patience: -1 }, next: 'fear_tactic', analysis: "Fear mongering. Risky but high leverage." },
                            { text: "My apologies. Let me show you the ROI model. We break even in 18 months.", impact: { trust: +10, leverage: +5, patience: +1 }, next: 'financial_hook', analysis: "Pivot to logic. Good recovery." }
                        ]
                    },
                    'financial_hook': {
                        text: "18 months is too long. The Board wants efficiency now. Can you do it for $5M?",
                        options: [
                            { text: "Impossible. We need the full amount.", impact: { trust: 0, leverage: -10, patience: -1 }, next: 'standoff', analysis: "Stubbornness without data reduced leverage." },
                            { text: "We can do a $5M 'Lighthouse' pilot, but it delays full savings by a year.", impact: { trust: +20, leverage: +20, patience: 0 }, next: 'win', analysis: "The 'Anchor' Trade-off. Perfect Bilingual move." }
                        ]
                    },
                    'fear_tactic': {
                        text: "Are you threatening the bank? That sounds like a failure of your current leadership.",
                        options: [
                            { text: "It's not a threat, it's market reality.", impact: { trust: -20, leverage: 0, patience: -1 }, next: 'lose', analysis: "Argumentative. Lost the room." },
                            { text: "It's a quantified risk. I'm asking for insurance.", impact: { trust: +10, leverage: +10, patience: 0 }, next: 'financial_hook', analysis: "Re-framed risk as insurance." }
                        ]
                    },
                    'standoff': {
                        text: "Then we are at an impasse. I'm cutting the budget to $2M. Take it or leave it.",
                        options: [
                            { text: "I resign.", impact: { trust: 0, leverage: 0, patience: 0 }, next: 'lose', analysis: "Emotional quit." },
                            { text: "I'll take the $2M for the Mobile App only. But you own the legacy risk.", impact: { trust: +10, leverage: +10, patience: 0 }, next: 'win', analysis: "Calculated compromise." }
                        ]
                    }
                }
            }
        ],

        start(index) {
            Alpine.store('gamification').trackToolUse('roleplay', 'radar');
            this.active = true;
            this.gameOver = false;
            this.currentScenario = this.scenarios[index];
            this.currentNode = 'start';
            this.metrics = { trust: 50, leverage: 50, patience: 3 };
            this.history = [];
        },

        choose(option) {
            // 1. Math Logic
            this.metrics.trust += option.impact.trust;
            this.metrics.leverage += option.impact.leverage;
            this.metrics.patience += option.impact.patience;

            // 2. Log History
            this.history.push({
                stage: this.currentNode,
                choice: option.text,
                reasoning: option.analysis,
                impact: option.impact
            });

            // 3. Win/Lose Condition Checks
            if (this.metrics.patience <= 0 || this.metrics.trust <= 0) {
                this.finishGame('lose', "Negotiation Failed. You lost the room.");
                return;
            }
            
            if (option.next === 'win') {
                this.finishGame('win', "Deal Closed. You secured the budget.");
                return;
            }
            
            if (option.next === 'lose') {
                this.finishGame('lose', "Proposal Rejected.");
                return;
            }

            // 4. Advance
            this.currentNode = option.next;
        },

        finishGame(result, msg) {
            Alpine.store('gamification').trackGameComplete(result === 'win');
            this.gameOver = true;
            this.result = result;
            this.finalMessage = msg;
        },

        restart() {
            this.active = false;
            this.gameOver = false;
            this.history = [];
        },

        // --- NEW: ADVANCED PROMPT GENERATOR ---
        generateNegotiationPrompt() {
            if (!this.currentScenario || !this.result) return "Complete the simulation to generate prompt.";
            const s = this.currentScenario;
            const path = this.history.map((h, i) => 
                `Step ${i+1}: When asked about [${h.stage}], I chose: "${h.choice}". (Impact: Trust ${h.impact.trust > 0 ? '+' : ''}${h.impact.trust})`
            ).join("\n");

            return `ACT AS: A Hostage Negotiator and Executive Coach (Chris Voss Style).

## THE SIMULATION RECORD
I just completed a high-stakes negotiation with ${s.opponent} (${s.role}).
- **Outcome:** ${this.result.toUpperCase()}
- **Final Metrics:** Trust (${this.metrics.trust}/100), Leverage (${this.metrics.leverage}/100).

## MY DECISION PATH
${path}

## YOUR COACHING ANALYSIS
1. **The Psychology:** Analyze *why* my specific choices led to this outcome. Did I use "Tactical Empathy" or did I trigger "Amygdala Hijack"?
2. **The Pivot Point:** Identify the exact moment the negotiation turned in my favor (or fell apart).
3. **Advanced Technique:** Teach me one advanced technique (e.g., "The Ackerman Bargain" or "Labeling") that I could have used in Step 2 to get a better result.

TONE: Direct, psychological, actionable.`;
        }
    }));
});
