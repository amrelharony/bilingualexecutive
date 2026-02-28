document.addEventListener('alpine:init', () => {
    Alpine.data('flowCalcComponent', () => ({
        processName: 'Commercial Loan Approval',
        unit: 'hours', // minutes, hours, days
        steps: [
            { id: 1, name: 'Customer Application', work: 1, wait: 0, type: 'Input' },
            { id: 2, name: 'Credit Risk Review', work: 2, wait: 48, type: 'Bottleneck' }, // 2 days waiting
            { id: 3, name: 'Legal Sanctions Check', work: 0.5, wait: 4, type: 'Process' },
            { id: 4, name: 'Final Sign-off', work: 0.2, wait: 24, type: 'Approval' }
        ],
        metrics: null,
        loading: false,

        addStep() {
            this.steps.push({ 
                id: Date.now(), 
                name: 'New Step', 
                work: 1, 
                wait: 0, 
                type: 'Process' 
            });
            this.calculate();
        },

        removeStep(id) {
            this.steps = this.steps.filter(s => s.id !== id);
            this.calculate();
        },

        calculate() {
            Alpine.store('gamification').trackToolUse('flow', 'forge'); Alpine.store('gamification').trackCalculation('Flow Efficiency');
            this.loading = true;
            this.metrics = null;

            // Simulate "Process Mapping"
            setTimeout(() => {
                this.runMath();
                this.loading = false;
            }, 600);
        },

        runMath() {
            const totalWork = this.steps.reduce((acc, s) => acc + parseFloat(s.work), 0);
            const totalWait = this.steps.reduce((acc, s) => acc + parseFloat(s.wait), 0);
            const totalLeadTime = totalWork + totalWait;

            // 1. Flow Efficiency Ratio
            // Formula: (Value Add Time / Total Lead Time) * 100
            const efficiency = totalLeadTime === 0 ? 0 : Math.round((totalWork / totalLeadTime) * 100);

            // 2. Bottleneck Identification
            // Find the step with the highest Wait Time
            if (this.steps.length === 0) return;
            const bottleneckStep = this.steps.reduce((prev, current) => (prev.wait > current.wait) ? prev : current);

            // 3. Diagnosis
            let verdict = "";
            let color = "";
            let analysis = "";

            if (efficiency < 15) {
                verdict = "RESOURCE EFFICIENCY TRAP";
                color = "text-red-500";
                analysis = "Your process is 85%+ waste. You are optimizing for 'keeping people busy' instead of 'moving work'.";
            } else if (efficiency < 40) {
                verdict = "TYPICAL CORPORATE";
                color = "text-yellow-400";
                analysis = "Standard friction. Handoffs and approvals are eating your speed.";
            } else {
                verdict = "LEAN MACHINE";
                color = "text-green-400";
                analysis = "Excellent flow. You have removed most wait states.";
            }

            this.metrics = {
                totalWork,
                totalWait,
                totalLeadTime,
                efficiency,
                bottleneck: bottleneckStep,
                verdict,
                color,
                analysis
            }
        
        },

        generateLeanPrompt() {
            if (!this.metrics) return "Calculate flow first.";
            const m = this.metrics;
            return `ACT AS: Lean Six Sigma Master.
## PROCESS AUDIT: "${this.processName}"
- **Flow Efficiency:** ${m.efficiency}% (Industry Goal: >25%)
- **Total Lead Time:** ${m.totalLeadTime} ${this.unit}
- **Value Added Time:** ${m.totalWork} ${this.unit}
- **Waste (Wait Time):** ${m.totalWait} ${this.unit}

## BOTTLENECK
Step: "${m.bottleneck.name}" (Wait Time: ${m.bottleneck.wait} ${this.unit})

## MISSION
1. Identify the root cause of the wait time at the bottleneck.
2. Propose a way to run steps in parallel instead of sequence.
3. Calculate the cost savings if efficiency improves to 50%.`;
        }
    }));
});
