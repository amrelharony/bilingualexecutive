document.addEventListener('alpine:init', () => {
    Alpine.data('dataGovComponent', () => ({
        isLive: false,
        interval: null,
        selectedProduct: null,
        activeIncident: null, // Stores current failure data
        
        // The Data Asset Portfolio
        products: [
            { 
                id: 'cust360', 
                name: "Customer 360", 
                owner: "Marketing Squad", 
                criticality: "HIGH",
                costPerMinute: 500, // $ lost per minute of downtime
                slo: { freshness: 99.9, accuracy: 99.9 },
                status: 'healthy'
            },
            { 
                id: 'risk_engine', 
                name: "Credit Risk Engine", 
                owner: "Risk Squad", 
                criticality: "CRITICAL",
                costPerMinute: 2000, 
                slo: { freshness: 99.9, accuracy: 99.9 },
                status: 'healthy'
            },
            { 
                id: 'payments', 
                name: "Real-Time Payments", 
                owner: "Payments Tribe", 
                criticality: "CRITICAL",
                costPerMinute: 5000, 
                slo: { freshness: 99.9, accuracy: 99.9 },
                status: 'healthy'
            }
        ],

        toggleSim() {
            if (this.isLive) {
                clearInterval(this.interval);
                this.isLive = false;
            } else {
                this.isLive = true;
                this.interval = setInterval(() => this.tick(), 1000);
            }
        },

        tick() {
            // 1. Healthy Fluctuation
            this.products.forEach(p => {
                if (p.status === 'healthy') {
                    // Tiny variations to look alive
                    p.slo.freshness = Math.min(100, Math.max(98, p.slo.freshness + (Math.random() - 0.5)));
                    p.slo.accuracy = Math.min(100, Math.max(99, p.slo.accuracy + (Math.random() - 0.5)));
                } else if (p.status === 'critical' && this.activeIncident) {
                    if (this.activeIncident.type === 'schema') p.slo.accuracy = Math.max(0, p.slo.accuracy - 5);
                    if (this.activeIncident.type === 'latency') p.slo.freshness = Math.max(0, p.slo.freshness - 8);
                    
                    this.activeIncident.totalCost += p.costPerMinute / 60; // Add cost per second
                }
            });
        },

        injectFailure(type) {
            if (!this.isLive) this.toggleSim();
            
            // Target a random product
            const target = this.products[Math.floor(Math.random() * this.products.length)];
            target.status = 'critical';
            this.selectedProduct = target;

            this.activeIncident = {
                product: target.name,
                owner: target.owner,
                type: type, // 'schema' or 'latency'
                startTime: new Date().toLocaleTimeString(),
                totalCost: 0,
                errorMsg: type === 'schema' ? "ERR_NULL_POINTER: 'Credit_Score' field missing in stream." : "ERR_TIMEOUT: Kafka Consumer Lag > 5000ms."
            };
        },

        repair() {
            if (this.selectedProduct) {
                this.selectedProduct.status = 'healthy';
                this.selectedProduct.slo.freshness = 99.9;
                this.selectedProduct.slo.accuracy = 99.9;
                // Keep the incident data for the report, but mark resolved in UI
            }
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateRCAPrompt() {
            if (!this.activeIncident) return "No incident to report.";
            Alpine.store('gamification').trackToolUse('datagov', 'radar');
            Alpine.store('gamification').trackPromptGenerated('radar');
            const inc = this.activeIncident;
            const cost = Math.round(inc.totalCost).toLocaleString();

            return `ACT AS: A Site Reliability Engineer (SRE) and Data Product Owner.

## THE INCIDENT REPORT (ROOT CAUSE ANALYSIS)
A data failure occurred in the "${inc.product}" product.
- **Incident Type:** ${inc.type === 'schema' ? "Schema Drift (Breaking Change)" : "Latency Spike (Data Freshness Failure)"}
- **Error Log:** "${inc.errorMsg}"
- **Business Impact:** Service degraded. Estimated financial loss: $${cost} (based on downtime duration).
- **Owner:** ${inc.owner}

## YOUR MISSION
Draft a **"5 Whys" Post-Mortem Email** to the Executive Committee.
1. **The Executive Summary:** Explain what broke and the financial impact in plain English (no tech jargon).
2. **The Root Cause:** Explain that this wasn't just "bad luck", it was a lack of Governance (e.g., "We pushed code without checking the data contract").
3. **The Fix:** Propose a specific automated guardrail (e.g., "Implement Schema Registry checks in CI/CD") to ensure this never happens again.

TONE: Accountable, transparent, systems-thinking (blame the process, not the person).`;
        }
    }));
});
