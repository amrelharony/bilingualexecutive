document.addEventListener('alpine:init', () => {
    Alpine.data('vendorNegotiatorComponent', () => ({
        step: 'input', // input, analysis, sim
        inputs: {
            vendorName: '',
            spend: 1000000, // Annual spend
            model: 'tm', // tm (Time & Material), fixed, outcome
            dependency: 8, // 1-10 (How hard to replace?)
            quality: 5 // 1-10 (Current satisfaction)
        },
        analysis: {},
        
        // Simulation State
        sim: {
            active: false,
            round: 0,
            trust: 50,
            savings: 0,
            history: [],
            vendorMood: "Neutral"
        },

        // Deterministic Logic Engine
        analyze() {
            if (!this.inputs.vendorName) return alert("Enter vendor name.");
            
            const i = this.inputs;
            
            // 1. Calculate Leverage Score (Who has the power?)
            // High Spend + Low Dependency = High Leverage (You win)
            // Low Spend + High Dependency = Low Leverage (Vendor wins)
            let leverage = (i.spend / 100000) - (i.dependency * 5) + 50;
            leverage = Math.max(0, Math.min(100, leverage));

            // 2. Identify the Trap
            let trap = "";
            let strategy = "";
            
            if (i.model === 'tm') {
                trap = "The Efficiency Paradox. The longer they take, the more you pay.";
                strategy = "Move to Capacity-Based Funding with SLOs.";
            } else if (i.model === 'fixed') {
                trap = "The Change Request Trap. Low initial price, high cost for every change.";
                strategy = "Shift to 'Money for Nothing, Change for Free' Agile contracts.";
            } else {
                trap = "Measurement Risk. Are you measuring the right outcome?";
                strategy = "Tighten the definition of 'Done'.";
            }

            // 3. Financial Exposure
            const wasteFactor = (10 - i.quality) * 0.10; // 10% waste for every point of bad quality
            const wasteAmount = Math.round(i.spend * wasteFactor);

            this.analysis = {
                leverage: Math.round(leverage),
                waste: wasteAmount,
                trap: trap,
                strategy: strategy,
                readiness: leverage > 60 ? "READY TO RENEGOTIATE" : "WEAK POSITION"
            };

            this.step = 'analysis';
        },

        // --- SIMULATION ENGINE ---
        startSim() {
            this.step = 'sim';
            this.sim = { active: true, round: 1, trust: 50, savings: 0, history: [], vendorMood: "Skeptical" };
            this.addSimMessage('bot', `(Account Manager): We appreciate your business, but our margins are tight. We actually need to discuss a 5% rate hike for inflation.`);
        },

        makeMove(moveType) {
            let reply = "";
            let trustChange = 0;
            let savingsChange = 0;

            // Game Theory Logic
            if (moveType === 'hardball') {
                // Aggressive: High risk, high reward
                if (this.analysis.leverage > 60) {
                    reply = "Okay, okay. We can waive the hike. But we can't lower rates.";
                    trustChange = -10;
                    savingsChange = 5; // Saved the 5% hike
                } else {
                    reply = "I'm afraid that's not possible. If you can't pay, we may need to offboard.";
                    trustChange = -30;
                    savingsChange = 0;
                }
            } else if (moveType === 'partnership') {
                // Collaborative: Builds trust, unlocks value
                reply = "That's interesting. If you can commit to a 3-year term, we could look at an Outcome-based rebate model.";
                trustChange = +20;
                savingsChange = 10;
            } else if (moveType === 'threaten') {
                // Threaten to leave
                if (this.inputs.dependency > 7) {
                    reply = "We know your stack is built on our proprietary code. Moving would cost you double.";
                    trustChange = -50;
                    savingsChange = 0;
                } else {
                    reply = "Let's not be hasty. What if we offered a volume discount?";
                    trustChange = -10;
                    savingsChange = 15;
                }
            }

            this.sim.trust = Math.max(0, Math.min(100, this.sim.trust + trustChange));
            this.sim.savings += savingsChange;
            this.sim.round++;
            
            // Add to chat
            let userText = "";
            if (moveType === 'hardball') userText = "I reject the hike. Efficiency has been poor.";
            if (moveType === 'partnership') userText = "Let's shift the model. I'll pay more for 'Results', less for 'Hours'.";
            if (moveType === 'threaten') userText = "I'm issuing an RFP to your competitors tomorrow.";

            this.addSimMessage('user', userText);
            setTimeout(() => this.addSimMessage('bot', reply), 600);
        },

        addSimMessage(role, text) {
            this.sim.history.push({ role, text });
            // Auto-scroll logic would go here
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateNegotiationPrompt() {
            Alpine.store('gamification').trackToolUse('vendor', 'forge'); Alpine.store('gamification').trackPromptGenerated('forge');
            const a = this.analysis;
            const i = this.inputs;

            return `ACT AS: A Chief Procurement Officer and Agile Coach.

## THE CONTRACT AUDIT
I am renegotiating a contract with "${i.vendorName}".
- **Current Model:** ${i.model === 'tm' ? "Time & Materials (Body Shop)" : "Fixed Price (Waterfall)"}
- **Annual Spend:** $${i.spend.toLocaleString()}
- **Performance:** ${i.quality}/10 Quality Score.
- **My Leverage:** ${a.leverage}/100.

## THE PROBLEM
We are trapped in "${a.trap}". 
We estimate we are wasting $${a.waste.toLocaleString()} annually on friction and rework.

## YOUR MISSION
Draft a **Negotiation Script** for the upcoming renewal meeting.
1. **The Opener:** A script to shut down their request for a rate hike by using our Quality data.
2. **The Pivot:** Specific language to propose shifting from "Headcount" to "${a.strategy}".
3. **The Clause:** Draft a specific "Service Level Objective (SLO)" clause that penalizes them if they ship bugs, instead of paying them to fix the bugs they wrote.

TONE: Professional, firm, collaborative but demanding.`;
        }
    }));
});
