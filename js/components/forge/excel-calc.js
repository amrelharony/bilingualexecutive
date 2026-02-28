document.addEventListener('alpine:init', () => {
    Alpine.data('excelCalcComponent', () => ({
        inputs: {
            process_name: '',
            steps: 50,      // Manual copy-pastes/edits per run
            frequency: 12,  // Runs per year
            salary: 75,     // Hourly cost of analyst ($)
            criticality: 2  // 1=Internal, 2=Regulatory, 3=Customer Facing
        },
        result: null,

        calculate() {
            Alpine.store('gamification').trackExcelCalc(); Alpine.store('gamification').trackToolUse('excel', 'forge');
            const i = this.inputs;
            
            // 1. Calculate OpEx Waste (The "Hidden Tax")
            // Assumption: Each manual step takes ~2 mins (finding, copying, checking)
            const hoursPerRun = (i.steps * 2) / 60;
            const annualHours = hoursPerRun * i.frequency;
            const annualCost = Math.round(annualHours * i.salary);

            // 2. Calculate Error Probability (The "Swiss Cheese Model")
            // Industry standard: Human error rate is ~1% per manual action without validation
            // Probability of at least one error = 1 - (0.99 ^ steps)
            const errorProb = Math.round((1 - Math.pow(0.99, i.steps)) * 100);

            // 3. Calculate Risk Exposure (The "Liability Bomb")
            // Base impact cost * Criticality Multiplier
            let baseImpact = 10000; // Cost to fix internal error
            let criticalLabel = "Internal Admin";
            
            if (i.criticality === 2) { 
                baseImpact = 150000;
                criticalLabel = "Regulatory Reporting";
            }
            if (i.criticality === 3) { 
                baseImpact = 2000000;
                criticalLabel = "Customer Facing";
            }
            
            // Weighted Risk = Probability * Impact
            const riskExposure = Math.round((errorProb / 100) * baseImpact);

            // 4. Recommendation Logic
            let verdict = "MONITOR";
            let action = "Standard Data Quality Checks";
            
            if (annualCost > 50000 || errorProb > 80) {
                verdict = "AUTOMATE";
                action = "Migrate to Python/SQL Pipeline immediately.";
            }
            if (i.criticality == 3 && errorProb > 20) {
                verdict = "KILL SWITCH";
                action = "Process is too risky for manual handling. Cease or Re-platform.";
            }

            this.result = {
                annualCost: annualCost,
                annualHours: Math.round(annualHours),
                errorProb: errorProb,
                riskExposure: riskExposure,
                criticalLabel: criticalLabel,
                verdict: verdict,
                action: action
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateExcelPrompt() {
            if (!this.result) return "Please calculate first.";
            const r = this.result;
            const i = this.inputs;

            return `ACT AS: A Chief Financial Officer (CFO) and Risk Officer.

## THE AUDIT FINDINGS (SHADOW IT)
I have audited a manual process named "${i.process_name || 'Untitled Process'}" currently running in Excel.
- **Process Type:** ${r.criticalLabel}
- **Complexity:** ${i.steps} manual touchpoints per run.
- **Calculated Error Probability:** ${r.errorProb}% per run (based on standard human error rates).

## THE FINANCIAL EXPOSURE
1. **Guaranteed Cash Waste:** We are burning **$${r.annualCost.toLocaleString()}** per year in manual labor (${r.annualHours} hours) just to maintain this.
2. **Liability Risk:** Given the criticality, the probabilistic risk exposure is **$${r.riskExposure.toLocaleString()}** (Probability x Impact).

## YOUR MISSION
Write a **"Business Case for Automation"** to secure budget for IT to replace this spreadsheet with a proper Data Product.
1. **The Argument:** Explain why paying an engineer to automate this is cheaper than the risk of keeping it manual.
2. **The "Fat Finger" Scenario:** Describe a hypothetical scenario where a single copy-paste error in this specific process causes a disaster.
3. **The ROI:** If automation costs $25k, calculate the payback period based on the OpEx savings alone.

TONE: Fiscally responsible, risk-averse, urgent.`;
        }
    }));
});
