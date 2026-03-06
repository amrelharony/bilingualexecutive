document.addEventListener('alpine:init', () => {
    Alpine.data('meetingBingoComponent', () => ({
        active: false,
        board: [], // The 5x5 grid
        history: [], // Log of clicked items
        metrics: { score: 0, toxicity: 0, status: "LISTENING" },
        
        // The Tile Database
        library: {
            positive: [
                "Data Overruled Opinion", "Customer Pain Cited", "Tech Explained Simply", "Financial Impact Calculated", 
                "Silo Bridge Built", "Psych Safety Moment", "'I Don't Know' Admitted", "Experiment Proposed",
                "Latency Linked to Revenue", "Manual Work Automating", "No Acronyms Used", "Blocker Removed"
            ],
            negative: [
                "HiPPO Dominated", "Blamed the Vendor", "Analysis Paralysis", "It Worked on My Machine", 
                "We've Always Done It This Way", "Passive Aggression", "Meeting Could Have Been Email", 
                "Tech Jargon Overload", "Scope Creep", "Shadow IT Revealed", "Excel Spreadsheet Opened", "Budget Freeze Cited"
            ]
        },

        startNewGame() {
            Alpine.store('gamification').trackToolUse('bingo', 'sims');
            // 1. Shuffle and Pick
            const pos = [...this.library.positive].sort(() => 0.5 - Math.random());
            const neg = [...this.library.negative].sort(() => 0.5 - Math.random());
            
            // 2. Build 5x5 Grid (Mix of Good and Bad)
            // We want a mix to test the meeting's soul.
            let deck = [
                ...pos.slice(0, 13), 
                ...neg.slice(0, 12)
            ].sort(() => 0.5 - Math.random());

            // 3. Create Board Objects
            this.board = deck.map((text, i) => ({
                id: i,
                text: text,
                type: this.library.positive.includes(text) ? 'good' : 'bad',
                selected: false
            }));

            // 4. Set Free Space (Center)
            this.board[12] = { id: 12, text: "BILINGUAL MINDSET", type: 'neutral', selected: true };

            this.metrics = { score: 0, toxicity: 0, status: "IN SESSION" };
            this.history = [];
            this.active = true;
        },

        toggleTile(index) {
            if (index === 12) return; // Free space locked
            
            const tile = this.board[index];
            tile.selected = !tile.selected;

            this.calculateMetrics();
        },

        calculateMetrics() {
            const selected = this.board.filter(t => t.selected && t.id !== 12);
            
            // 1. Culture Score (Math)
            // Good tiles = +10, Bad tiles = -10
            let rawScore = 0;
            let badCount = 0;
            
            selected.forEach(t => {
                if (t.type === 'good') rawScore += 10;
                else { rawScore -= 10; badCount++; }
            });

            this.metrics.score = rawScore;

            // 2. Toxicity Index (Percentage of bad tiles vs total clicked)
            this.metrics.toxicity = selected.length === 0 ? 0 : Math.round((badCount / selected.length) * 100);

            // 3. Win Condition (Standard Bingo Rules)
            if (this.checkWin()) {
                const wasBingo = this.metrics.status === "BINGO!";
                this.metrics.status = "BINGO!";
                if (!wasBingo) Alpine.store('gamification').trackGameComplete(true);
            } else {
                this.metrics.status = "IN SESSION";
            }
        },

        checkWin() {
            // Indices for Rows, Cols, Diagonals
            const wins = [
                [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // Rows
                [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // Cols
                [0,6,12,18,24], [4,8,12,16,20] // Diagonals
            ];

            return wins.some(pattern => pattern.every(i => this.board[i].selected));
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateCulturePrompt() {
            const selected = this.board.filter(t => t.selected);
            if (selected.length === 0) return "Play the game first.";

            const goodEvents = selected.filter(t => t.type === 'good').map(t => t.text).join(", ");
            const badEvents = selected.filter(t => t.type === 'bad').map(t => t.text).join(", ");
            const score = this.metrics.score;
            const toxicity = this.metrics.toxicity;

            let archetype = "Balanced";
            if (score > 50) archetype = "High-Performance Squad";
            if (toxicity > 60) archetype = "Toxic Bureaucracy";
            if (score < 0 && toxicity < 40) archetype = "Passive / Low Energy";

            return `ACT AS: A Corporate Anthropologist and Agile Coach.

## THE MEETING OBSERVATION REPORT (BINGO DATA)
I observed a team meeting and tracked behavioral signals.
- **Culture Score:** ${score} (Net Positive Behaviors)
- **Toxicity Index:** ${toxicity}% (Percentage of negative behaviors)
- **Meeting Archetype:** "${archetype}"

## OBSERVED BEHAVIORS
- **Positive Signals (Assets):** ${goodEvents || "None observed."}
- **Negative Signals (Liabilities):** ${badEvents || "None observed."}

## YOUR MISSION
Write a **Cultural Retro** for the team leader.
1. **The Mirror:** Describe the "vibe" of the meeting based on the data. Was it a fight? A funeral? A workshop?
2. **The Intervention:** Pick the specific Negative Signal "${(badEvents || '').split(',')[0] || 'Generic Silence'}" and prescribe a "Ritual" to fix it (e.g. "To fix HiPPO dominance, introduce 'Silent Brainstorming'").
3. **The Reinforcement:** How can we double down on the Positive Signals observed?

TONE: Observational, witty, constructive. Reference "Tribal Leadership" concepts.`;
        }
    }));
});
