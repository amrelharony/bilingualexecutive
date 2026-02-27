document.addEventListener('alpine:init', () => {
    Alpine.data('finOpsAuditorComponent', () => ({
        input: "FEAT-101: Build new Mobile Login module\nBUG-202: Fix crash on payment screen\nCHORE: Update server dependencies\nSPIKE: Research Blockchain feasibility\nFEAT-105: Refactor database for 10x scale",
        sensitivity: 50, // 0 = Conservative, 100 = Aggressive
        analysis: null,
        stats: { ratio: 0, totalValue: 0, capexValue: 0 },

        // The Keyword Dictionary (IAS 38 Logic)
        rules: {
            capex: ['new', 'build', 'create', 'launch', 'feature', 'scale', 'module', 'architecture', 'implement'],
            opex: ['fix', 'bug', 'repair', 'maintain', 'support', 'patch', 'update', 'training', 'research', 'spike', 'meeting']
        },

        analyze() {
            Alpine.store('gamification').trackToolUse('capex', 'forge'); Alpine.store('gamification').trackCalculation('FinOps Audit');
            if (!this.input.trim()) return alert("Please paste ticket list.");
            
            const lines = this.input.split('\n').filter(l => l.trim().length > 0);
            let processed = [];
            let totalVal = 0;
            let capexVal = 0;
            
            // Assume average cost per ticket for simulation (e.g., 1 Story Point = $1,000)
            const costPerTicket = 1000; 

            lines.forEach(line => {
                const lower = line.toLowerCase();
                
                // 1. Scoring Logic
                let capScore = 0;
                let opScore = 0;
                
                this.rules.capex.forEach(w => { if(lower.includes(w)) capScore++; });
                this.rules.opex.forEach(w => { if(lower.includes(w)) opScore++; });

                // 2. Apply Sensitivity (The "CFO Mood" Slider)
                // High sensitivity makes it easier to claim CapEx (Aggressive)
                // Low sensitivity defaults to OpEx (Conservative)
                let threshold = 0;
                if (this.sensitivity > 50) capScore += 0.5; // Bias towards Asset
                if (this.sensitivity < 50) opScore += 0.5; // Bias towards Expense

                // 3. Verdict
                let type = "OpEx";
                let reason = "Routine Maintenance (Expense)";
                let confidence = "High";

                if (capScore > opScore) {
                    type = "CapEx";
                    reason = "Creates Future Economic Benefit (Asset)";
                } else if (capScore === opScore) {
                    type = "Review";
                    reason = "Ambiguous. Requires manual check.";
                    confidence = "Low";
                }

                // 4. Financials
                totalVal += costPerTicket;
                if (type === "CapEx") capexVal += costPerTicket;

                processed.push({ ticket: line, type, reason, confidence });
            });

            this.stats.totalValue = totalVal;
            this.stats.capexValue = capexVal;
            this.stats.ratio = totalVal === 0 ? 0 : Math.round((capexVal / totalVal) * 100);
            this.analysis = processed;
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateAuditorPrompt() {
            if (!this.analysis) return "Run analysis first.";
            
            const s = this.stats;
            const riskLevel = this.sensitivity > 70 ? "HIGH (Aggressive Accounting)" : "LOW (Conservative)";
            
            // Sample 5 tickets for the prompt
            const sample = this.analysis.slice(0, 5).map(i => `- ${i.ticket} -> ${i.type}`).join("\n");

            return `ACT AS: A Big 4 External Auditor (KPMG/Deloitte style).

## THE INTERNAL AUDIT REPORT (IAS 38 CHECK)
I have classified our software engineering labor for Capitalization.
- **Total Labor Spend:** $${s.totalValue.toLocaleString()} (Simulated)
- **Capitalization Rate:** ${s.ratio}% (Industry Benchmark: 30-50%)
- **Accounting Stance:** ${riskLevel}

## SAMPLE DATA
${sample}
... (and ${this.analysis.length - 5} more items)

## YOUR MISSION
Write an **Audit Defense Memo** for the CTO to sign.
1. **The Justification:** Explain why our Capitalization Rate of ${s.ratio}% is justified given we are building "New Assets" vs "Maintenance".
2. **The Red Flags:** If the rate is >60%, warn us about the specific risk of "improperly capitalizing maintenance" which inflates profit artificially.
3. **The Policy:** Write a 1-sentence "Golden Rule" for developers to use when naming Jira tickets so they pass audit (e.g., "Don't use the word 'Fix' if you are actually rebuilding").

TONE: Compliance-focused, protective, financially literate.`;
        }
    }));
});
