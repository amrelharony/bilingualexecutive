document.addEventListener('alpine:init', () => {
    Alpine.data('regSimulatorComponent', () => ({
        selectedReg: null,
        inputs: {
            legacyScore: 50, // 0-100 (How old is your tech?)
            cloudAdoption: 30, // 0-100 (How much is on cloud?)
            dataGovernance: 40 // 0-100 (How organized is data?)
        },
        analysis: null,
        loading: false,

        // The Regulation Database
        regulations: [
            {
                id: 'psd3',
                name: "PSD3 / PSR",
                focus: "Payments & Fraud",
                desc: "Stricter Strong Customer Authentication (SCA) and API performance parity.",
                impactVector: { api: 0.9, security: 0.8, data: 0.3, infra: 0.2 }, // Weights
                baseCost: 2000000 // $2M base implementation
            },
            {
                id: 'aiact',
                name: "EU AI Act",
                focus: "Model Governance",
                desc: "Categorization of 'High Risk' AI. Mandatory human oversight and data lineage.",
                impactVector: { api: 0.2, security: 0.4, data: 0.9, infra: 0.5 },
                baseCost: 1500000
            },
            {
                id: 'dora',
                name: "DORA",
                focus: "Operational Resilience",
                desc: "Digital Operational Resilience Act. ICT risk management and 3rd party auditing.",
                impactVector: { api: 0.4, security: 0.7, data: 0.5, infra: 0.9 },
                baseCost: 3000000
            },
            {
                id: 'basel4',
                name: "Basel IV",
                focus: "Capital & Risk",
                desc: "Standardized approach for credit risk. Heavy data aggregation requirements.",
                impactVector: { api: 0.3, security: 0.2, data: 1.0, infra: 0.4 },
                baseCost: 5000000
            }
        ],

        simulate() {
            Alpine.store('gamification').trackToolUse('regsim', 'sims');
            if (!this.selectedReg) return alert("Select a regulation.");
            
            this.loading = true;
            this.analysis = null;

            // Simulate "Impact Analysis"
            setTimeout(() => {
                this.runImpactMath();
                this.loading = false;
            }, 1000);
        },

        runImpactMath() {
            const reg = this.selectedReg;
            const i = this.inputs;

            // 1. Calculate Multipliers based on Organization Health
            // High Legacy = Higher Cost (Harder to change)
            const legacyMult = 1 + (i.legacyScore / 100); 
            
            // Low Governance = Higher Risk (Harder to report)
            const govMult = 1 + ((100 - i.dataGovernance) / 100);

            // 2. Calculate Total Cost
            const estCost = reg.baseCost * legacyMult * govMult;

            // 3. Calculate "Blast Radius" (Systems Affected)
            // We generate a heat score (0-100) for each domain based on Reg Vector vs Org State
            const systems = [
                { name: "API Gateway", heat: reg.impactVector.api * 100 },
                { name: "Core Banking (Legacy)", heat: reg.impactVector.infra * i.legacyScore },
                { name: "Data Lake", heat: reg.impactVector.data * (150 - i.dataGovernance) }, // Poor gov makes this hotter
                { name: "IAM / Security", heat: reg.impactVector.security * 100 }
            ];

            // 4. Calculate Fine Exposure (The "Stick")
            // Arbitrary revenue base of $1B for simulation
            const maxFine = 1000000000 * 0.04; // 4% of turnover (GDPR/AI Act standard)
            const exposure = maxFine * (1 - (i.dataGovernance / 200)); // Better gov reduces prob

            this.analysis = {
                cost: Math.round(estCost),
                exposure: Math.round(exposure),
                timeline: Math.round(12 * legacyMult), // Months
                systems: systems.sort((a,b) => b.heat - a.heat),
                complexity: legacyMult > 1.5 ? "EXTREME" : "MANAGEABLE"
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateCompliancePrompt() {
            if (!this.analysis) return "Run simulation first.";
            const a = this.analysis;
            const r = this.selectedReg;
            const sysList = a.systems.map(s => `- **${s.name}:** Impact Level ${Math.round(s.heat)}/100`).join("\n");

            return `ACT AS: A Chief Compliance Officer (CCO) and CTO.

## THE REGULATORY IMPACT ASSESSMENT
We are preparing for **${r.name}** (${r.focus}).
- **Estimated Implementation Cost:** $${a.cost.toLocaleString()}
- **Timeline:** ${a.timeline} Months
- **Technical Complexity:** ${a.complexity} (Due to ${this.inputs.legacyScore}% Legacy Debt).

## THE "BLAST RADIUS" (IMPACTED SYSTEMS)
${sysList}

## YOUR MISSION
Draft a **Compliance Roadmap** for the Board.
1. **The Gap Analysis:** Explain why our current setup (Low Data Governance, High Legacy) makes compliance with ${r.name} specifically difficult.
2. **The "Must-Do" Projects:** Define the top 3 technical initiatives we must fund immediately to avoid the fine exposure of ~$${(a.exposure/1000000).toFixed(1)}M.
3. **The Opportunity:** How can we use this mandatory spend to actually modernize the bank (e.g. "Use DORA to finally move to Cloud")?

TONE: Urgent, strategic, turning "Red Tape" into "Transformation".`;
        }
    }));
});
