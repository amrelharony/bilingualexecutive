document.addEventListener('alpine:init', () => {
    Alpine.data('cognitiveLoadComponent', () => ({
        inputs: {
            teamSize: 6,
            interruptions: 15, // Context switches per day per person
            meetings: 12, // Hours per week in meetings
            tools: 8, // Number of tools required to ship one feature
            ambiguity: 5 // 1-10 (1=Clear Specs, 10="Figure it out")
        },
        result: null,
        loading: false,

        calculate() {
            Alpine.store('gamification').trackToolUse('cognitive', 'sims');
            Alpine.store('gamification').trackCalculation('Cognitive Load');
            this.loading = true;
            
            // Simulate "Neural Processing" visual delay
            setTimeout(() => {
                this.runMath();
                this.loading = false;
            }, 800);
        },

        runMath() {
            const i = this.inputs;

            // 1. COMPUTE LOAD VECTORS
            
            // A. Context Switch Tax (The "Sawtooth Effect")
            // Research: It takes ~23 mins to refocus. 
            // Formula: Interruptions * 0.2 hrs * Impact Factor
            const switchLoad = (i.interruptions * 3) / 100; // Normalized 0-1.0

            // B. Meeting Tax (Fragmented Time)
            // 40 hour work week. >20 hours is critical.
            const meetingLoad = (i.meetings / 30); // Normalized

            // C. Tooling Friction (The "Toggle Tax")
            // >5 tools creates heavy friction
            const toolLoad = (i.tools / 15); // Normalized

            // D. Ambiguity (Decision Fatigue)
            const ambiguityLoad = (i.ambiguity / 10);

            // 2. TOTAL COGNITIVE LOAD INDEX (0-100)
            // Weighted: Interruptions (35%), Ambiguity (30%), Meetings (20%), Tools (15%)
            let rawScore = (switchLoad * 35) + (ambiguityLoad * 30) + (meetingLoad * 20) + (toolLoad * 15);
            rawScore = rawScore * 2.5; // Scale to 100
            const loadScore = Math.min(100, Math.round(rawScore));

            // 3. FINANCIAL IMPACT (THE "COGNITIVE TAX")
            // Assumption: Avg blended rate $80/hr. 
            // Wasted time = Re-focus time + Useless meetings + Tool toggling
            // Refocus time = Interruptions * 15mins
            const dailyWastedHours = (i.interruptions * 0.25) + (i.meetings / 5 * 0.2) + (i.tools * 0.05); 
            const weeklyWaste = dailyWastedHours * 5;
            const annualCost = Math.round(weeklyWaste * 50 * 80 * i.teamSize); // 50 weeks, $80/hr

            // 4. DIAGNOSIS
            let zone = "FLOW STATE";
            let color = "text-green-400";
            let diagnosis = "The team has space for Deep Work.";
            
            if (loadScore > 80) {
                zone = "BURNOUT ZONE";
                color = "text-risk";
                diagnosis = "Cognitive capacity is exceeded. Innovation is impossible.";
            } else if (loadScore > 50) {
                zone = "FRAGMENTED";
                color = "text-yellow-400";
                diagnosis = "Efficiency is bleeding out via context switching.";
            }

            this.result = {
                score: loadScore,
                zone,
                color,
                diagnosis,
                annualTax: annualCost
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generatePsychPrompt() {
            if (!this.result) return "Run analysis first.";
            const r = this.result;
            const i = this.inputs;

            return `ACT AS: An Organizational Psychologist and Team Topologies Expert.

## THE COGNITIVE LOAD AUDIT
I have measured the mental overhead of my software team (${i.teamSize} people).
- **Cognitive Load Index:** ${r.score}/100 (${r.zone})
- **Financial "Cognitive Tax":** $${r.annualTax.toLocaleString()}/year (Cost of lost focus).

## THE STRESSORS
1. **Context Switching:** ${i.interruptions} interruptions/day (The "Sawtooth" Effect).
2. **Ambiguity:** ${i.ambiguity}/10 (Decision Fatigue).
3. **Tool Chain:** ${i.tools} disjointed tools to ship one feature.
4. **Meeting Load:** ${i.meetings} hours/week.

## YOUR MISSION
Write a **"Deep Work" Preservation Strategy** for this team.
1. **The Architecture Fix:** Explain how "Conway's Law" might be causing the high ambiguity/interruptions (e.g. Dependencies on other teams).
2. **The Ritual:** Propose a specific team ritual (e.g. "No-Meeting Wednesdays" or "Async-First Mornings") to lower the score by 20 points.
3. **The Tool Rationalization:** Give a ruthless heuristic for killing one of the ${i.tools} tools.

TONE: Scientific, empathetic, efficiency-focused. Use terms like "Extraneous Load" and "Flow Efficiency".`;
        }
    }));
});
