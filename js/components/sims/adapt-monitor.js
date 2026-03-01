document.addEventListener('alpine:init', () => {
    Alpine.data('adaptMonitorComponent', () => ({
        // The 5 Dimensions of Plasticity
        dimensions: [
            { id: 'learning', label: 'Learning Velocity', val: 5, desc: "Speed from 'Idea' to 'Validated Data'", weight: 1.2 },
            { id: 'decisions', label: 'Decision Latency', val: 5, desc: "Time to make a reversible decision", weight: 1.0 },
            { id: 'safety', label: 'Psychological Safety', val: 5, desc: "Tolerance for failure/bad news", weight: 1.5 }, // Critical Multiplier
            { id: 'funding', label: 'Funding Fluidity', val: 5, desc: "Ability to move budget mid-year", weight: 1.1 },
            { id: 'customer', label: 'Customer Closeness', val: 5, desc: "Layers between Devs and Users", weight: 1.0 }
        ],
        
        result: null,
        chart: null,
        loading: false,

        calculate() {
            Alpine.store('gamification').trackToolUse('adaptation', 'sims');
            Alpine.store('gamification').trackCalculation('Adaptability');
            this.loading = true;
            
            // Simulate "Telemetry Scan"
            setTimeout(() => {
                this.runMath();
                this.loading = false;
                this.$nextTick(() => this.renderRadar());
            }, 800);
        },

        runMath() {
            // 1. CALCULATE WEIGHTED AQ (Adaptability Quotient)
            let totalScore = 0;
            let totalWeight = 0;
            let lowestDim = this.dimensions[0];

            this.dimensions.forEach(d => {
                totalScore += (d.val * d.weight);
                totalWeight += d.weight;
                if (d.val < lowestDim.val) lowestDim = d;
            });

            let aq = (totalScore / totalWeight) * 10; // Scale to 100

            // 2. THE SAFETY VETO (Math Constraint)
            // You cannot be adaptable if people are terrified.
            // If Safety < 4, AQ is capped at 50, regardless of other scores.
            const safetyScore = this.dimensions.find(d => d.id === 'safety').val;
            let penalty = "";
            
            if (safetyScore < 4) {
                aq = Math.min(aq, 45);
                penalty = "SAFETY VETO APPLIED: Fear is freezing the organization.";
            }

            // 3. ARCHETYPE PROFILING
            let archetype = "The Fossil"; // Default
            let color = "text-risk";
            let advice = "Survival is unlikely without radical change.";

            if (aq > 80) {
                archetype = "The Chameleon";
                color = "text-primary";
                advice = "Market Leader. Focus on maintaining edge.";
            } else if (aq > 60) {
                archetype = "The Tanker";
                color = "text-yellow-400";
                advice = "Strong but slow to turn. Vulnerable to agile disruptors.";
            } else if (safetyScore > 7 && aq < 60) {
                archetype = "The Country Club"; // High safety, low output
                color = "text-orange-400";
                advice = "Too comfortable. Needs urgency/performance pressure.";
            }

            this.result = {
                aq: Math.round(aq),
                archetype,
                color,
                penalty,
                weakness: lowestDim.label,
                advice
            };
        },

        renderRadar() {
            const ctx = document.getElementById('adaptChart');
            if (!ctx) return;
            
            // Destroy old instance if exists (requires tracking the instance)
            if (window.adaptChartInstance) window.adaptChartInstance.destroy();

            window.adaptChartInstance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: this.dimensions.map(d => d.label),
                    datasets: [{
                        label: 'Current Plasticity',
                        data: this.dimensions.map(d => d.val),
                        backgroundColor: 'rgba(34, 211, 238, 0.2)', // Cyan opacity
                        borderColor: '#22d3ee', // Cyan
                        pointBackgroundColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Neo-Bank Benchmark',
                        data: [8, 9, 8, 9, 9], // The target
                        backgroundColor: 'transparent',
                        borderColor: '#94a3b8', // Slate
                        borderDash: [5, 5],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        r: {
                            min: 0, max: 10,
                            ticks: { display: false },
                            grid: { color: '#334155' },
                            angleLines: { color: '#334155' },
                            pointLabels: { color: '#e2e8f0', font: { size: 10, family: 'monospace' } }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateChangePrompt() {
            if (!this.result) return "Run analysis first.";
            const r = this.result;
            const scores = this.dimensions.map(d => `- ${d.label}: ${d.val}/10`).join("\n");

            return `ACT AS: An Organizational Design Consultant and Change Management Expert.

## THE ADAPTABILITY AUDIT
I have measured my organization's "Adaptability Quotient" (AQ).
- **AQ Score:** ${r.aq}/100
- **Archetype:** "${r.archetype}"
- **Critical Constraint:** ${r.weakness}
- **Structural Block:** ${r.penalty || "None."}

## DIMENSIONAL DATA
${scores}

## YOUR MISSION
Design a **30-Day Intervention Plan** to break the rigidity.
1. **The Diagnosis:** Explain *why* an organization with this profile fails in the current market (use a biological metaphor).
2. **The "Shock" Therapy:** Propose 1 radical action to fix the "${r.weakness}" (e.g., if Funding is low, propose "VC-style Pitch Days" instead of annual budgets).
3. **The Culture Hack:** Give me a specific meeting ritual to introduce next Monday to signal that "things have changed."

TONE: Urgent, biological (evolutionary), prescriptive.`;
        }
    }));
});
