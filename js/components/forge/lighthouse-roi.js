document.addEventListener('alpine:init', () => {
    Alpine.data('lighthouseRoiComponent', () => ({
        inputs: {
            name: '',
            duration_weeks: 12,
            squad_cost_per_week: 15000,
            software_cost: 25000, // One-time Lic/Setup
            revenue_generated: 0, // Annual
            cost_avoided: 150000, // Annual
            old_cycle_time: 20,   // Weeks
            new_cycle_time: 2     // Weeks
        },
        results: null,

        calculate() {
            Alpine.store('gamification').trackToolUse('roi', 'forge'); Alpine.store('gamification').trackCalculation('Lighthouse ROI');
            if (!this.inputs.name) return alert("Please name the project.");
            
            const i = this.inputs;
            
            // 1. COSTS (Investment)
            const laborCost = i.duration_weeks * i.squad_cost_per_week;
            const totalInvestment = laborCost + parseInt(i.software_cost, 10);
            
            // 2. RETURNS (Annualized Value)
            const annualValue = parseInt(i.revenue_generated, 10) + parseInt(i.cost_avoided, 10);
            const netProfit1Year = annualValue - totalInvestment;
            
            // 3. ROI %
            const roiPercent = Math.round(((annualValue - totalInvestment) / totalInvestment) * 100);

            // 4. Payback Period (Months)
            // (Investment / Monthly Value)
            const monthlyValue = annualValue / 12;
            let paybackMonths = (totalInvestment / monthlyValue).toFixed(1);
            if (monthlyValue <= 0) paybackMonths = "Never";

            // 5. Cost of Delay (CoD)
            // Value per week lost if we delay launch
            const weeklyValue = Math.round(annualValue / 52);

            // 6. Speed Multiplier
            const speedFactor = (i.old_cycle_time / i.new_cycle_time).toFixed(1);

            // 7. Verdict Logic
            let verdict = "MARGINAL";
            let color = "text-yellow-500";
            
            if (roiPercent > 300 && paybackMonths < 6) {
                verdict = "NO BRAINER";
                color = "text-green-400";
            } else if (roiPercent < 0) {
                verdict = "MONEY PIT";
                color = "text-red-500";
            }

            this.results = {
                totalInvestment,
                annualValue,
                netProfit1Year,
                roiPercent,
                paybackMonths,
                weeklyValue, // Cost of Delay
                speedFactor,
                verdict,
                color
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateROIPrompt() {
            if (!this.results) return "Calculate metrics first.";
            const r = this.results;
            const i = this.inputs;

            return `ACT AS: A Chief Financial Officer (CFO) and Strategy Consultant.

## THE INVESTMENT CASE (DATA)
I am pitching a technology pilot ("${i.name}"). Here are the hard numbers:
- **Total Ask (CapEx/OpEx):** $${r.totalInvestment.toLocaleString()}
- **Projected 1-Year ROI:** ${r.roiPercent}%
- **Payback Period:** ${r.paybackMonths} Months
- **Agile Velocity Gain:** ${r.speedFactor}x faster than legacy process.

## THE HIDDEN METRIC: COST OF DELAY
We lose **$${r.weeklyValue.toLocaleString()} in value every single week** we wait to approve this.

## YOUR MISSION
Write a **"Board Defense Script"** to secure funding.
1. **The "No Brainer" Hook:** Summarize the ROI and Payback period in one aggressive sentence.
2. **The Speed Defense:** Explain why the ${r.speedFactor}x speed increase creates "Compound Strategic Value" beyond just the money.
3. **The "Cost of Inaction" closing:** Use the Cost of Delay ($${r.weeklyValue.toLocaleString()}/week) to make *doing nothing* sound more expensive than *doing something*.

TONE: Fiscally conservative but strategically aggressive. Use terms like "Free Cash Flow" and "Asset Velocity".`;
        }
    }));
});
