document.addEventListener('alpine:init', () => {
    Alpine.data('adrBuilderComponent', () => ({
        title: '',
        status: 'PROPOSED', // PROPOSED, ACCEPTED, REJECTED
        
        // The Criteria (Rows) - Weight is 1-5
        criteria: [
            { id: 1, label: 'Development Speed', weight: 5 },
            { id: 2, label: 'Scalability', weight: 4 },
            { id: 3, label: 'Cost to Maintain', weight: 3 }
        ],

        // The Options (Columns) - Scores are 1-5
        options: [
            { 
                id: 1, 
                name: 'Option A: Monolith', 
                scores: { 1: 5, 2: 2, 3: 5 }, // criteriaID: score
                total: 0 
            },
            { 
                id: 2, 
                name: 'Option B: Microservices', 
                scores: { 1: 2, 2: 5, 3: 2 }, 
                total: 0 
            }
        ],

        winner: null,

        // Demo Data
        loadDemo() {
            this.title = "Database Selection for New Payments Service";
            this.criteria = [
                { id: 1, label: 'ACID Compliance', weight: 5 },
                { id: 2, label: 'Write Throughput', weight: 4 },
                { id: 3, label: 'Team Familiarity', weight: 3 }
            ];
            this.options = [
                { id: 1, name: 'PostgreSQL', scores: { 1: 5, 2: 3, 3: 5 }, total: 0 },
                { id: 2, name: 'DynamoDB', scores: { 1: 3, 2: 5, 3: 2 }, total: 0 },
                { id: 3, name: 'Mongo (NoSQL)', scores: { 1: 2, 2: 4, 3: 4 }, total: 0 }
            ];
            this.calculate();
        },

        addCriteria() {
            const id = Date.now();
            this.criteria.push({ id, label: 'New Criteria', weight: 3 });
            // Init scores for existing options
            this.options.forEach(o => o.scores[id] = 3);
            this.calculate();
        },

        addOption() {
            const id = Date.now();
            let newScores = {};
            this.criteria.forEach(c => newScores[c.id] = 3);
            this.options.push({ id, name: 'New Option', scores: newScores, total: 0 });
            this.calculate();
        },

        calculate() {
            let maxScore = -1;
            let winningOption = null;

            this.options.forEach(opt => {
                let sum = 0;
                this.criteria.forEach(crit => {
                    const s = parseInt(opt.scores[crit.id] || 0, 10);
                    const w = parseInt(crit.weight || 0, 10);
                    sum += (s * w);
                });
                opt.total = sum;

                if (sum > maxScore) {
                    maxScore = sum;
                    winningOption = opt;
                }
            });

            this.winner = winningOption;
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateADRPrompt() {
            Alpine.store('gamification').trackToolUse('adr', 'forge'); Alpine.store('gamification').trackPromptGenerated('forge');
            if (!this.winner) return "Complete the matrix first.";

            const critList = this.criteria.map(c => `- ${c.label} (Weight: ${c.weight})`).join("\n");
            
            const optList = this.options.map(o => {
                const isWinner = o.id === this.winner.id ? "(SELECTED)" : "";
                return `### Option: ${o.name} ${isWinner}\n- Weighted Score: ${o.total}\n- Strengths/Weaknesses based on criteria scores.`;
            }).join("\n\n");

            return `ACT AS: A Principal Software Architect.

## THE ARCHITECTURE DECISION (ADR)
I need to document a formal decision record for: "${this.title}".

## THE DECISION MATRIX (MATH)
We evaluated options based on weighted criteria:
${critList}

## THE EVALUATION
${optList}

## YOUR MISSION
Write a standard **Architecture Decision Record (ADR)** in Markdown.
1. **Context:** Briefly explain why we need to make this decision.
2. **The Decision:** State clearly that we are choosing **${this.winner.name}**.
3. **The Justification:** Use the math above to explain *why* it won (e.g., "While Option B had better scalability, Option A won due to higher Team Familiarity scores").
4. **Consequences:** List the trade-offs (Negatives) of the winning choice that we must mitigate.

TONE: Technical, objective, permanent record.`;
        }
    }));
});
