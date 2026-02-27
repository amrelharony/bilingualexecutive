document.addEventListener('alpine:init', () => {
    Alpine.data('legacyScannerComponent', () => ({
        input: "IF ORDER-AMT > CUST-CREDIT-LIMIT\n    MOVE 'Y' TO REJECT-FLAG\n    PERFORM REJECT-ROUTINE\n    GO TO EXIT-PARA\nELSE\n    COMPUTE NEW-BAL = OLD-BAL + ORDER-AMT\nEND-IF.",
        loading: false,
        analysis: null,
        
        // Configuration
        targetAudience: 'ceo', // ceo (Simple), cto (Technical), compliance (Risk)
        language: 'detect',    // detect, cobol, sql

        // The Pattern Matcher
        patterns: {
            cobol: {
                keywords: ['PERFORM', 'MOVE', 'PIC', 'IDENTIFICATION DIVISION', 'COMP-3'],
                risks: [
                    { pattern: /GO\s*TO/i, score: 20, label: "Spaghetti Code (GOTO)" },
                    { pattern: /HARD-CODED/i, score: 15, label: "Hardcoded Values" },
                    { pattern: /DATE/i, score: 5, label: "Date Arithmetic Risk" }
                ]
            },
            sql: {
                keywords: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'UNION'],
                risks: [
                    { pattern: /CURSOR/i, score: 25, label: "Performance Killer (Cursor)" },
                    { pattern: /DROP\s+TABLE/i, score: 50, label: "Destructive Command" },
                    { pattern: /SELECT\s+\*/i, score: 10, label: "Inefficient Query (Select *)" }
                ]
            },
            business: {
                // Words that imply money or rules
                keywords: ['AMT', 'BAL', 'INT', 'RATE', 'TAX', 'LIMIT', 'CREDIT', 'DEBIT', 'FEE']
            }
        },

        analyze() {
            Alpine.store('gamification').trackToolUse('legacy', 'forge'); Alpine.store('gamification').trackPromptGenerated('forge');
            if (!this.input.trim()) return alert("Paste some code first.");
            
            this.loading = true;
            this.analysis = null;

            // Simulate processing delay
            setTimeout(() => {
                this.runHeuristics();
                this.loading = false;
            }, 800);
        },

        runHeuristics() {
            const code = this.input.toUpperCase();
            let detectedLang = "Generic";
            let riskScore = 0;
            let businessValue = 0;
            let flaws = [];

            // 1. Detect Language
            const cobolMatches = this.patterns.cobol.keywords.filter(k => code.includes(k)).length;
            const sqlMatches = this.patterns.sql.keywords.filter(k => code.includes(k)).length;
            
            if (cobolMatches > sqlMatches) detectedLang = "COBOL (Mainframe)";
            else if (sqlMatches > cobolMatches) detectedLang = "SQL (Database)";

            // 2. Risk Scanning
            const activeRules = detectedLang.includes("COBOL") ? this.patterns.cobol.risks : this.patterns.sql.risks;
            
            activeRules.forEach(rule => {
                if (rule.pattern.test(code)) {
                    riskScore += rule.score;
                    flaws.push(rule.label);
                }
            });

            // 3. Business Value Scanning (Density of financial terms)
            this.patterns.business.keywords.forEach(word => {
                // Count occurrences
                const count = (code.match(new RegExp(word, "g")) || []).length;
                businessValue += (count * 10);
            });

            // 4. Determine Archetype
            let archetype = "Utility Script"; // Low Risk, Low Value
            if (riskScore > 50 && businessValue > 50) archetype = "THE BLACK BOX (Critical & Dangerous)";
            else if (riskScore > 50) archetype = "TECHNICAL DEBT (Refactor Now)";
            else if (businessValue > 50) archetype = "CORE LOGIC (Golden Rule)";

            this.analysis = {
                language: detectedLang,
                riskScore: Math.min(100, riskScore),
                bizScore: Math.min(100, businessValue),
                flaws: flaws,
                archetype: archetype
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateTranslatorPrompt() {
            if (!this.analysis) return "Run analysis first.";
            
            const a = this.analysis;
            const audience = this.targetAudience === 'ceo' ? "Non-Technical CEO" : (this.targetAudience === 'compliance' ? "Risk Auditor" : "Modern Java Developer");
            const goal = this.targetAudience === 'ceo' ? "Explain the financial impact." : (this.targetAudience === 'compliance' ? "Find the regulatory gaps." : "Rewrite this in Python.");

            return `ACT AS: A Senior Mainframe Modernization Architect.

## THE SOURCE CODE ANALYSIS
I have scanned a block of legacy code.
- **Language:** ${a.language}
- **Complexity Archetype:** "${a.archetype}"
- **Detected Technical Risks:** ${a.flaws.join(", ") || "None detected (Clean code)"}

## INPUT CODE
"""
${this.input}
"""

## YOUR MISSION
Translate this code for a **${audience}**.
1. **The Plain English Translation:** ${goal}
2. **The Business Rule:** Extract the exact logic (e.g., "If credit < 500, reject"). Ignore syntax.
3. **The Modernization Path:** If we rewrote this today, would it be a Microservice, a Database Trigger, or a Config Rule?

TONE: Authoritative, cynical about legacy, clear about value.`;
        }
    }));
});
