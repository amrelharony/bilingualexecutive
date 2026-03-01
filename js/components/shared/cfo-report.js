document.addEventListener('alpine:init', () => {
    Alpine.data('cfoReportComponent', () => ({
        inputs: {
            projectName: 'Cloud Migration Phase 1',
            initialCost: 500000, 
            monthlyCost: 20000,  
            monthlyHardSavings: 45000, 
            teamSize: 10,
            efficiencyGain: 15, 
            avgSalary: 120000, 
            confidence: 80 
        },
        results: null,
        loading: false, // Ensure this defaults to false

        calculate() {
            // UI Feedback
            this.loading = true;
            
            // Simulate calculation delay
            setTimeout(() => {
                this.runFinancialModel();
                this.loading = false;
            }, 800);
        },

        runFinancialModel() {
            const i = this.inputs;
            
            // 1. Calculate Soft Benefits Value
            const monthlySalaryLoad = (i.teamSize * i.avgSalary) / 12;
            const rawSoftSavings = monthlySalaryLoad * (i.efficiencyGain / 100);
            const adjustedSoftSavings = rawSoftSavings * (i.confidence / 100);

            // 2. Build the Timeline (24 Months)
            let balance = -i.initialCost;
            let month = 0;
            let paybackMonth = null;
            let dataPoints = [];
            let minPoint = -i.initialCost;

            for (month = 1; month <= 24; month++) {
                const monthlyNet = (i.monthlyHardSavings + adjustedSoftSavings) - i.monthlyCost;
                balance += monthlyNet;
                dataPoints.push(Math.round(balance));
                
                if (balance >= 0 && paybackMonth === null) {
                    paybackMonth = month;
                }
                if (balance < minPoint) minPoint = balance;
            }

            // 3. Final Metrics
            const totalValue = balance;
            const roi = ((balance + i.initialCost) / i.initialCost) * 100;
            const hardOnlyMonthly = i.monthlyHardSavings - i.monthlyCost;
            const isHardPositive = hardOnlyMonthly > 0;

            // 4. Strategic Verdict
            let verdict = "";
            let color = "";
            
            if (paybackMonth === null) {
                verdict = "MONEY PIT";
                color = "text-red-500";
            } else if (paybackMonth <= 12) {
                verdict = "SLAM DUNK";
                color = "text-green-400";
            } else if (!isHardPositive) {
                verdict = "STRATEGIC BET";
                color = "text-yellow-400";
            } else {
                verdict = "SOLID INVESTMENT";
                color = "text-blue-400";
            }

            this.results = {
                payback: paybackMonth ? `${paybackMonth} Months` : "> 2 Years",
                roi24: Math.round(roi),
                endingBalance: Math.round(balance),
                softContribution: Math.round((adjustedSoftSavings * 24)),
                hardContribution: Math.round(((i.monthlyHardSavings - i.monthlyCost) * 24) - i.initialCost),
                verdict,
                color,
                chartData: dataPoints,
                minPoint 
            };
        },

        // Advanced Prompt
        generateCFOReport() {
            if (!this.results) return "Run calculation first.";
            Alpine.store('gamification').trackToolUse('dt_tracker', 'radar');
            Alpine.store('gamification').trackPromptGenerated('radar');
            const r = this.results;
            const i = this.inputs;

            const hardStatus = i.monthlyHardSavings > i.monthlyCost 
                ? "positive cash flow on Hard Savings alone" 
                : "dependent on Soft Benefits (Efficiency) to break even";

            return `ACT AS: A Chief Financial Officer (CFO).

## THE INVESTMENT CASE: "${i.projectName}"
I have modeled the P&L for this initiative over a 24-month horizon.
- **Initial Outlay:** $${i.initialCost.toLocaleString()}
- **Break-Even Point:** ${r.payback}
- **2-Year ROI:** ${r.roi24}% (Net Value: $${r.endingBalance.toLocaleString()})
- **Financial Profile:** The project is ${hardStatus}.

## VALUE COMPOSITION
- **Hard P&L Impact:** $${r.hardContribution.toLocaleString()} (Cost Reductions - Running Costs)
- **Strategic Value:** $${r.softContribution.toLocaleString()} (Efficiency Gains @ ${i.confidence}% Confidence)

## YOUR MISSION
Write a **Board Investment Memo** defending this spend.
1. **The J-Curve Defense:** Explain why the initial dip in cash flow (down to $${r.minPoint.toLocaleString()}) is a necessary "Construction Cost".
2. **The "Soft" Defense:** The model attributes $${r.softContribution.toLocaleString()} to "Efficiency". Translate this into concrete business value (e.g., "Developer hours freed up").
3. **The Risk Mitigation:** Propose a "Stage-Gate" funding model.

TONE: Fiscally responsible, forward-looking, rigorous.`;
        }
    }));
});
