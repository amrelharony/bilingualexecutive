document.addEventListener('alpine:init', () => {
    Alpine.data('interrogationComponent', () => ({
        inputs: [
            "Week 1: Development is progressing well. We are 90% complete with the backend.",
            "Week 2: Still targeting launch. Just a few minor integration nuances to iron out. 95% complete.",
            "Week 3: Almost there. Just waiting on a 3rd party vendor API key. Dashboard is Green."
        ],
        loading: false,
        result: null,

        // The Pattern Library
        patterns: {
            vagueness: ["progressing", "hoping", "aiming", "believe", "anticipate", "trying", "should be"],
            stagnancy: ["90%", "95%", "99%", "almost done", "finalizing", "polishing", "tweaking"],
            deflection: ["waiting on", "dependency", "vendor", "client", "3rd party", "external"],
            passive: ["mistakes were made", "challenges were encountered", "it was decided"]
        },

        analyze() {
            Alpine.store('gamification').trackToolUse('interrogation', 'sims');
            this.loading = true;
            this.result = null;

            // Simulate processing "Forensic Scan"
            setTimeout(() => {
                this.runForensics();
                this.loading = false;
            }, 1000);
        },

        runForensics() {
            Alpine.store('gamification').trackCalculation('Interrogation');
            let bsScore = 0;
            let flags = [];
            const fullText = this.inputs.join(" ").toLowerCase();

            // 1. THE "90% PARADOX" (Stagnancy Check)
            // If "90%" or "95%" appears in multiple weeks, it's a lie.
            let stagCount = 0;
            this.inputs.forEach((week, idx) => {
                if (this.patterns.stagnancy.some(p => week.toLowerCase().includes(p))) stagCount++;
            });

            if (stagCount >= 2) {
                bsScore += 40;
                flags.push("The Zeno's Paradox: Stuck at 'Almost Done' for multiple weeks.");
            }

            // 2. HAPPY TALK FILTER (Vagueness)
            let vagueCount = 0;
            this.patterns.vagueness.forEach(word => {
                if (fullText.includes(word)) vagueCount++;
            });
            
            if (vagueCount > 0) {
                bsScore += (vagueCount * 10);
                flags.push(`Vague Assurance: Used low-confidence words ${vagueCount} times (e.g. 'hoping', 'trying').`);
            }

            // 3. THE BLAME GAME (Deflection)
            const hasDeflection = this.patterns.deflection.some(w => fullText.includes(w));
            if (hasDeflection) {
                bsScore += 20;
                flags.push("External Blaming: Shifting responsibility to vendors/dependencies.");
            }

            // 4. LENGTH MISMATCH
            // If reports get shorter over time, they are hiding something.
            if (this.inputs[2].length < this.inputs[0].length * 0.5) {
                bsScore += 15;
                flags.push("Silence Protocol: Updates are shrinking. Information is being withheld.");
            }

            // Calculate Verdict
            bsScore = Math.min(100, bsScore);
            let verdict = "TRUE GREEN";
            let color = "text-primary";

            if (bsScore > 75) { verdict = "WATERMELON (CRITICAL)"; color = "text-risk"; }
            else if (bsScore > 40) { verdict = "AMBER (WARNING)"; color = "text-yellow-500"; }

            this.result = {
                bsScore,
                verdict,
                color,
                red_flags: flags.length > 0 ? flags : ["No linguistic deception detected."]
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateInterrogationPrompt() {
            if (!this.result) return "Run scan first.";
            
            const r = this.result;
            const flags = r.red_flags.join("\n- ");
            const context = this.inputs.map((t, i) => `Week ${i+1}: "${t}"`).join("\n");

            return `ACT AS: A Forensic Project Auditor (The "Wolf" of Project Management).

## THE EVIDENCE (STATUS REPORTS)
I have flagged a project for "Watermelon Reporting" (Green on the outside, Red on the inside).
- **Deception Score:** ${r.bsScore}/100
- **Verdict:** ${r.verdict}

## DETECTED PATTERNS
- ${flags}

## REPORT TRANSCRIPT
${context}

## YOUR MISSION
Write a **"Gemba Walk" Interrogation Script** for my meeting with this Project Manager.
1. **The Trap:** Don't ask "Is it on track?". Ask a question that forces them to reveal the blocker (e.g., "Show me the specific test case that failed yesterday").
2. **The Translation:** Translate their vague update into what is likely *actually* happening (e.g., "99% done" usually means "The integration is broken").
3. **The Ultimatum:** Give me the exact wording to demand a "Red Status" report by EOD.

TONE: Skeptical, experienced, piercing.`;
        }
    }));
});
