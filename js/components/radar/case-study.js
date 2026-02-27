document.addEventListener('alpine:init', () => {
    Alpine.data('caseStudySimulator', () => ({
        active: false,
        step: 0,
        gameOver: false,
        finalMessage: "",
        metrics: { politicalCapital: 50, velocity: 10, risk: 50 },
        history: [],
        scenarios: [
            {
                id: 0,
                title: "The $30M Zombie",
                context: "You are Sarah, the new CDO. 'Project Olympus' is 18 months late, $30M over budget, and has delivered zero value. The CFO wants to save it.",
                question: "What is your first move?",
                choices: [
                    {
                        text: "Try to fix it. Hire consultants to audit the code.",
                        outcome: "failure",
                        feedback: "Sunk Cost Fallacy. You wasted another $5M. The Board lost faith.",
                        impact: { politicalCapital: -20, velocity: -5, risk: +10 }
                    },
                    {
                        text: "Kill it immediately. Reallocate budget to a pilot.",
                        outcome: "success",
                        feedback: "Bilingual Move. You stopped the bleeding and freed up resources.",
                        impact: { politicalCapital: -10, velocity: +20, risk: -10 }
                    }
                ]
            },
            {
                id: 1,
                title: "The Risk Wall",
                context: "Your 'Instant Loan' pilot is ready. The CRO blocks it: 'I don't trust code. I need a human analyst to sign off every loan.'",
                question: "How do you respond?",
                choices: [
                    {
                        text: "Escalate to the CEO. Complaining about the CRO.",
                        outcome: "failure",
                        feedback: "Political Trap. You made an enemy of Risk. They will block everything.",
                        impact: { politicalCapital: -30, velocity: 0, risk: 0 }
                    },
                    {
                        text: "The 'Red Screen' Demo. Show automated policy checks.",
                        outcome: "success",
                        feedback: "Bilingual Move. You proved the code is stricter than a human.",
                        impact: { politicalCapital: +20, velocity: +30, risk: -20 }
                    }
                ]
            },
            {
                id: 2,
                title: "The Demo Day",
                context: "90 Days are up. The app works. The Board expects a status report explaining delays.",
                question: "How do you present?",
                choices: [
                    {
                        text: "A 20-slide Strategy Deck on the 'Roadmap'.",
                        outcome: "neutral",
                        feedback: "Innovation Theater. They don't believe you. Just another PowerPoint.",
                        impact: { politicalCapital: 0, velocity: 0, risk: 0 }
                    },
                    {
                        text: "Live Demo. Ask the Chairman to apply right now.",
                        outcome: "success",
                        feedback: "Moment of Truth. The loan approves in 3 minutes. Culture shifts.",
                        impact: { politicalCapital: +50, velocity: +20, risk: 0 }
                    }
                ]
            }
        ],
        start() {
            Alpine.store('gamification').trackToolUse('simulator', 'radar');
            this.active = true;
            this.step = 0;
            this.gameOver = false;
            this.metrics = { politicalCapital: 50, velocity: 20, risk: 50 };
            this.history = [];
        },
        makeChoice(choiceIndex) {
            const currentScenario = this.scenarios[this.step];
            const choice = currentScenario.choices[choiceIndex];
            
            this.metrics.politicalCapital += choice.impact.politicalCapital;
            this.metrics.velocity += choice.impact.velocity;
            this.metrics.risk += choice.impact.risk;
            
            this.history.push({
                step: this.step + 1,
                scenario: currentScenario.title,
                decision: choice.text,
                result: choice.outcome
            });

            if (this.metrics.politicalCapital <= 0) {
                this.endGame("Fired. You lost the support of the Board.");
                return;
            }
            if (this.step < this.scenarios.length - 1) {
                this.step++;
            } else {
                this.endGame("Victory! You have navigated the Clay Layer.");
            }
        },
        endGame(message) {
            Alpine.store('gamification').trackGameComplete(message.includes('WIN') || message.includes('Success') || message.includes('Victory'));
            this.gameOver = true;
            this.finalMessage = message;
        },

        // --- NEW: SIMULATOR AI PROMPT ---
        generateSimulatorPrompt() {
            const m = this.metrics;
            // Format the history for the AI
            const decisionLog = this.history.map(h => 
                `turn ${h.step}: On "${h.scenario}", I chose to "${h.decision}". Result: ${h.result.toUpperCase()}.`
            ).join("\n");

            let profile = "";
            if(m.politicalCapital > 80) profile = "Master Politician (High Trust)";
            else if (m.politicalCapital < 20) profile = "Dead Man Walking (Zero Trust)";
            else profile = "Average Operator";

            return `ACT AS: The Chairman of the Board conducting a Performance Review.

## SIMULATION DATA (THE MERIDIAN PROTOCOL)
I have just completed a 90-day turnaround simulation as the new CDO.
- **FINAL OUTCOME:** ${this.finalMessage}
- **Political Capital:** ${m.politicalCapital}% (${profile})
- **Velocity Score:** ${m.velocity}
- **Risk Exposure:** ${m.risk}%

## MY DECISION LOG
${decisionLog}

## YOUR ASSESSMENT
1. **The Verdict:** Analyze my decision-making style based on the logs. Am I too reckless? Too cautious? Or truly Bilingual?
2. **The Blind Spot:** Identify one critical mistake I made (or a risk I ignored) based on the logs.
3. **The Coaching:** Give me one mental model to improve my executive decision-making.

TONE: Senior, direct, mentorship-focused.`;
        }
    }));
});
