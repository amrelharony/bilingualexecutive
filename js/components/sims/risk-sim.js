document.addEventListener('alpine:init', () => {
    Alpine.data('riskSimComponent', () => ({
        active: false,
        round: 0,
        
        // The Math State
        metrics: {
            trust: 50,    // Marcus's confidence in you (0-100)
            velocity: 50, // Time-to-Market speed (0-100)
            patience: 3   // Lives remaining
        },
        
        history: [],
        currentObjection: null,
        outcome: false,

        // The Opponent (Marcus) Logic
        scenarios: [
            {
                round: 1,
                topic: "The Cloud Waiver",
                objection: "You want to put PII in the public cloud? I can't sign this off. The regulator will eat us alive.",
                mood: "Skeptical"
            },
            {
                round: 2,
                topic: "The AI Hallucination",
                objection: "This Chatbot feature... what if it promises a refund we can't honor? I need a human in the loop for every transaction.",
                mood: "Defensive"
            },
            {
                round: 3,
                topic: "The Deployment Speed",
                objection: "You want to release daily? Our governance process requires a 2-week CAB (Change Advisory Board) review.",
                mood: "Bureaucratic"
            }
        ],

        // Your Deck (The Options)
        cards: [
            { 
                id: 'data', 
                label: 'The Data Shield', 
                desc: 'Show logs/evidence.', 
                icon: 'fa-database',
                math: { trust: +20, velocity: -10 }, 
                response: "Fine. The data looks solid. But gathering this took time." 
            },
            { 
                id: 'policy', 
                label: 'The Policy Loophole', 
                desc: 'Cite specific regulation.', 
                icon: 'fa-book-open',
                math: { trust: +10, velocity: 0 }, 
                response: "Technically you are correct, though I don't like it." 
            },
            { 
                id: 'speed', 
                label: 'The Competitor Threat', 
                desc: 'Fear of missing out.', 
                icon: 'fa-bolt',
                math: { trust: -10, velocity: +20 }, 
                response: "I don't care what Revolut is doing! We are a bank, not a startup." 
            },
            { 
                id: 'pilot', 
                label: 'The Ring-Fence', 
                desc: 'Limit exposure (Sandbox).', 
                icon: 'fa-box',
                math: { trust: +15, velocity: +5 }, 
                response: "A contained blast radius? Smart. That I can work with." 
            }
        ],

        start() {
            Alpine.store('gamification').trackToolUse('risksim', 'sims');
            this.active = true;
            this.round = 0;
            this.metrics = { trust: 40, velocity: 60, patience: 3 }; // Starting stats
            this.history = [];
            this.outcome = null;
            this.loadRound();
        },

        loadRound() {
            if (this.round >= this.scenarios.length) {
                this.endGame();
                return;
            }
            this.currentObjection = this.scenarios[this.round];
        },

        playCard(cardId) {
            const card = this.cards.find(c => c.id === cardId);
            const scenario = this.currentObjection;

            // 1. Apply Math
            this.metrics.trust += card.math.trust;
            this.metrics.velocity += card.math.velocity;
            
            // 2. Determine Success of Turn
            let turnResult = "Neutral";
            // Specific logic: 'speed' card always hurts trust on round 1 (Cloud)
            if (this.round === 0 && cardId === 'speed') {
                this.metrics.trust -= 10; 
                card.response = "Reckless! I'm flagging this to the CEO.";
            }
            // Specific logic: 'pilot' card is super effective on round 2 (AI)
            if (this.round === 1 && cardId === 'pilot') {
                this.metrics.trust += 10;
                card.response = "Exactly. A sandbox is the only way I'd approve AI.";
            }

            // 3. Log History
            this.history.push({
                round: this.round + 1,
                topic: scenario.topic,
                objection: scenario.objection,
                tactic: card.label,
                outcome: card.response,
                stats: { ...this.metrics }
            });

            // 4. Check Fail State
            if (this.metrics.trust <= 0) {
                this.outcome = { status: "FIRED", msg: "Marcus shut down the project. You lost all credibility." };
                return;
            }

            // 5. Advance
            this.round++;
            this.loadRound();
        },

        endGame() {
            const m = this.metrics;
            let status = "APPROVED";
            let msg = "Project Green-lit.";
            let archetype = "The Bilingual Executive";

            if (m.trust < 50) {
                status = "CONDITIONAL APPROVAL";
                msg = "Approved, but with heavy audit shackles. You moved too fast.";
                archetype = "The Cowboy";
            } else if (m.velocity < 40) {
                status = "DELAYED";
                msg = "Safe, but you missed the market window. Too cautious.";
                archetype = "The Bureaucrat";
            } else {
                msg = "Perfect balance of Risk and Speed. The Golden Path.";
            }

            this.outcome = { status, msg, archetype };
            Alpine.store('gamification').trackGameComplete(status === 'APPROVED');
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateCoachingPrompt() {
            if (!this.outcome) return "Complete simulation first.";
            
            const path = this.history.map(h => `Round ${h.round} (${h.topic}): I used "${h.tactic}". Result: Trust ${h.stats.trust}, Velocity ${h.stats.velocity}.`).join("\n");

            return `ACT AS: An Executive Coach for Product Leaders.

## THE SIMULATION REPORT
I just engaged in a simulated negotiation with a Chief Risk Officer (Marcus).
- **Final Result:** ${this.outcome.status}
- **My Archetype:** "${this.outcome.archetype}"
- **Ending Metrics:** Trust (${this.metrics.trust}/100) vs Speed (${this.metrics.velocity}/100).

## MY DECISION PATH
${path}

## YOUR COACHING
1. **Psychological Analysis:** Based on my card choices, do I lean too much on "Asking for Permission" (Data/Policy) or "Asking for Forgiveness" (Speed)?
2. **The "Marcus" Perspective:** Explain *why* the Risk Officer reacted the way he did to my specific choices.
3. **Real World Application:** Give me a specific script to use in my next real Steering Committee meeting to gain Trust without sacrificing Speed.

TONE: Constructive, psychological, tactical.`;
        }
    }));
});
