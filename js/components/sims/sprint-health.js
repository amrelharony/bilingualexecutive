document.addEventListener('alpine:init', () => {
    Alpine.data('sprintHealthComponent', () => ({
        inputs: {
            day: 5,           // Current day (1-10)
            plannedPts: 40,   // Committed points
            completedPts: 10, // Done so far
            addedPts: 0,      // Scope creep
            blockers: 1,      // 0=None, 1=Minor, 2=Major
            mood: 7           // 1-10 Team Morale
        },
        analysis: null,
        loading: false,

        calculate() {
            Alpine.store('gamification').trackToolUse('sprintcheck', 'sims');
            Alpine.store('gamification').trackCalculation('Sprint Health');
            this.loading = true;
            
            // Simulate "Vital Signs Scan"
            setTimeout(() => {
                this.runDiagnostics();
                this.loading = false;
            }, 600);
        },

        runDiagnostics() {
            const i = this.inputs;
            const totalScope = parseInt(i.plannedPts, 10) + parseInt(i.addedPts, 10);
            
            const timeElapsedPct = (i.day / 10);
            const idealCompletion = totalScope * timeElapsedPct;
            
            const delta = parseInt(i.completedPts, 10) - idealCompletion;
            const driftPct = totalScope === 0 ? 0 : (delta / totalScope) * 100;

            const plannedPts = parseInt(i.plannedPts, 10);
            const creepPct = plannedPts === 0 ? 0 : (parseInt(i.addedPts, 10) / plannedPts) * 100;

            // 4. PROBABILITY ENGINE (Weighted Score 0-100)
            // Weights: Velocity (40%), Mood (30%), Creep (20%), Blockers (10%)
            
            let velocityScore = 100;
            if (driftPct < 0) velocityScore = Math.max(0, 100 - (Math.abs(driftPct) * 2)); // Penalty for being behind
            
            let moodScore = i.mood * 10;
            
            let creepScore = Math.max(0, 100 - (creepPct * 2)); // Penalty for adding scope
            
            let blockerScore = i.blockers === 0 ? 100 : (i.blockers === 1 ? 50 : 0);

            // Weighted Average
            const probability = (velocityScore * 0.4) + (moodScore * 0.3) + (creepScore * 0.2) + (blockerScore * 0.1);

            // 5. DIAGNOSIS
            let weather = "Sunny";
            let color = "text-green-400";
            let prescription = "Stay the course. Protect the team from interference.";

            if (probability < 40) {
                weather = "Hurricane";
                color = "text-red-500";
                prescription = "EMERGENCY: Descope immediately. Cut 30% of the backlog today.";
            } else if (probability < 70) {
                weather = "Turbulence";
                color = "text-orange-400";
                prescription = "Risk of carry-over. Focus on finishing 'In Progress' before starting new.";
            } else if (creepPct > 10) {
                weather = "Foggy";
                color = "text-yellow-400";
                prescription = "Scope Creep detected. Reject any new requests.";
            }

            this.analysis = {
                score: Math.round(probability),
                weather,
                color,
                prescription,
                drift: Math.round(driftPct),
                creep: Math.round(creepPct),
                completionRate: Math.round((i.completedPts / totalScope) * 100)
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateStandupPrompt() {
            if (!this.analysis) return "Run diagnostics first.";
            const a = this.analysis;
            const i = this.inputs;

            return `ACT AS: An Agile Coach and Crisis Manager.

## THE SPRINT DIAGNOSTIC REPORT
I have run a health check on the current sprint (Day ${i.day}/10).
- **Success Probability:** ${a.score}% (${a.weather})
- **Velocity Drift:** ${a.drift > 0 ? "+" : ""}${a.drift}% vs Ideal Trend.
- **Scope Creep:** ${a.creep}% added work.
- **Team Morale:** ${i.mood}/10.
- **Blocker Status:** ${i.blockers === 2 ? "CRITICAL STOP" : (i.blockers === 1 ? "Drag" : "Clear")}.

## THE PRESCRIPTION
"${a.prescription}"

## YOUR MISSION
Write a **"Standup Intervention Script"** for tomorrow morning.
1. **The Reality Check:** A script to show the team the data without blaming them (e.g., "Math says we are 20% behind").
2. **The Hard Choice:** A specific question to ask the Product Owner about what to cut *today* to save the sprint goal.
3. **The Morale Boost:** A 1-sentence rally cry acknowledging the hard work despite the ${a.weather} conditions.

TONE: Urgent, supportive, data-driven.`;
        }
    }));
});
